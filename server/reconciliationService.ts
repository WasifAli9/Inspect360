import { storage } from "./storage";
import { db } from "./db";
import { invoices, organizations } from "@shared/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient";

export interface ReconciliationDiscrepancy {
  type: "missing_in_stripe" | "missing_in_db" | "amount_mismatch" | "status_mismatch" | "date_mismatch";
  severity: "critical" | "warning" | "info";
  description: string;
  dbInvoiceId?: string;
  stripeInvoiceId?: string;
  dbAmount?: number;
  stripeAmount?: number;
  dbStatus?: string;
  stripeStatus?: string;
  organizationId: string;
  organizationName?: string;
}

export interface ReconciliationReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalDbInvoices: number;
    totalStripeInvoices: number;
    matched: number;
    discrepancies: number;
    totalDbAmount: number;
    totalStripeAmount: number;
    amountDifference: number;
  };
  discrepancies: ReconciliationDiscrepancy[];
  matchedInvoices: Array<{
    dbInvoiceId: string;
    stripeInvoiceId: string;
    amount: number;
    currency: string;
    status: string;
    date: Date;
  }>;
}

export class ReconciliationService {
  /**
   * Reconcile invoices between database and Stripe
   */
  async reconcileInvoices(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ReconciliationReport> {
    const stripe = await getUncachableStripeClient();
    const now = new Date();
    const periodStart = startDate || new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = endDate || new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Get all invoices from database
    const dbConditions: any[] = [
      isNotNull(invoices.stripeInvoiceId),
      gte(invoices.createdAt, periodStart),
      lte(invoices.createdAt, periodEnd)
    ];
    if (organizationId) {
      dbConditions.push(eq(invoices.organizationId, organizationId));
    }

    const dbInvoices = await db.select()
      .from(invoices)
      .where(and(...dbConditions));

    // Get organizations for lookup
    const orgIds = [...new Set(dbInvoices.map(inv => inv.organizationId))];
    const orgs = await Promise.all(orgIds.map(id => storage.getOrganization(id)));
    const orgMap = new Map(orgs.filter(o => o).map(o => [o!.id, o!]));

    // Get Stripe invoices
    const stripeInvoices: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: any = {
        limit: 100,
        created: {
          gte: Math.floor(periodStart.getTime() / 1000),
          lte: Math.floor(periodEnd.getTime() / 1000)
        }
      };

      if (organizationId) {
        const org = orgMap.get(organizationId);
        if (org?.stripeCustomerId) {
          params.customer = org.stripeCustomerId;
        }
      }

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const response = await stripe.invoices.list(params);
      stripeInvoices.push(...response.data);
      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Create maps for quick lookup
    const dbInvoiceMap = new Map(dbInvoices.map(inv => [inv.stripeInvoiceId, inv]));
    const stripeInvoiceMap = new Map(stripeInvoices.map(inv => [inv.id, inv]));

    // Find discrepancies
    const discrepancies: ReconciliationDiscrepancy[] = [];
    const matchedInvoices: ReconciliationReport["matchedInvoices"] = [];

    // Check database invoices against Stripe
    for (const dbInvoice of dbInvoices) {
      if (!dbInvoice.stripeInvoiceId) continue;

      const stripeInvoice = stripeInvoiceMap.get(dbInvoice.stripeInvoiceId);
      const org = orgMap.get(dbInvoice.organizationId);

      if (!stripeInvoice) {
        discrepancies.push({
          type: "missing_in_stripe",
          severity: "critical",
          description: `Invoice ${dbInvoice.invoiceNumber} exists in database but not found in Stripe`,
          dbInvoiceId: dbInvoice.id,
          stripeInvoiceId: dbInvoice.stripeInvoiceId,
          organizationId: dbInvoice.organizationId,
          organizationName: org?.name
        });
        continue;
      }

      // Compare amounts (convert Stripe amount from cents to minor units)
      const dbAmount = dbInvoice.total;
      const stripeAmount = stripeInvoice.amount_paid || stripeInvoice.total || 0;

      if (Math.abs(dbAmount - stripeAmount) > 1) { // Allow 1 cent difference for rounding
        discrepancies.push({
          type: "amount_mismatch",
          severity: "critical",
          description: `Amount mismatch for invoice ${dbInvoice.invoiceNumber}: DB=${dbAmount / 100}, Stripe=${stripeAmount / 100}`,
          dbInvoiceId: dbInvoice.id,
          stripeInvoiceId: stripeInvoice.id,
          dbAmount: dbAmount / 100,
          stripeAmount: stripeAmount / 100,
          organizationId: dbInvoice.organizationId,
          organizationName: org?.name
        });
      }

      // Compare status
      const dbStatus = dbInvoice.status;
      let stripeStatus = "draft";
      if (stripeInvoice.paid) {
        stripeStatus = "paid";
      } else if (stripeInvoice.void) {
        stripeStatus = "cancelled";
      } else if (stripeInvoice.status === "open") {
        stripeStatus = "sent";
      } else if (stripeInvoice.status === "draft") {
        stripeStatus = "draft";
      }

      if (dbStatus !== stripeStatus) {
        discrepancies.push({
          type: "status_mismatch",
          severity: "warning",
          description: `Status mismatch for invoice ${dbInvoice.invoiceNumber}: DB=${dbStatus}, Stripe=${stripeStatus}`,
          dbInvoiceId: dbInvoice.id,
          stripeInvoiceId: stripeInvoice.id,
          dbStatus,
          stripeStatus,
          organizationId: dbInvoice.organizationId,
          organizationName: org?.name
        });
      }

      // Check date mismatch (if created dates differ significantly)
      const dbDate = dbInvoice.createdAt;
      const stripeDate = new Date(stripeInvoice.created * 1000);
      const dateDiff = Math.abs(dbDate.getTime() - stripeDate.getTime());
      if (dateDiff > 24 * 60 * 60 * 1000) { // More than 24 hours difference
        discrepancies.push({
          type: "date_mismatch",
          severity: "info",
          description: `Date mismatch for invoice ${dbInvoice.invoiceNumber}: DB=${dbDate.toISOString()}, Stripe=${stripeDate.toISOString()}`,
          dbInvoiceId: dbInvoice.id,
          stripeInvoiceId: stripeInvoice.id,
          organizationId: dbInvoice.organizationId,
          organizationName: org?.name
        });
      }

      // If no discrepancies, it's matched
      if (!discrepancies.some(d => d.dbInvoiceId === dbInvoice.id)) {
        matchedInvoices.push({
          dbInvoiceId: dbInvoice.id,
          stripeInvoiceId: stripeInvoice.id,
          amount: dbAmount / 100,
          currency: dbInvoice.currencyCode,
          status: dbStatus || "draft",
          date: dbDate || new Date()
        });
      }
    }

    // Check for Stripe invoices not in database
    for (const stripeInvoice of stripeInvoices) {
      if (!dbInvoiceMap.has(stripeInvoice.id)) {
        // Try to find organization by customer ID
        let orgId: string | undefined;
        let orgName: string | undefined;
        
        if (stripeInvoice.customer) {
          const orgsWithCustomer = await db.select()
            .from(organizations)
            .where(eq(organizations.stripeCustomerId, stripeInvoice.customer as string))
            .limit(1);
          if (orgsWithCustomer.length > 0) {
            orgId = orgsWithCustomer[0].id;
            orgName = orgsWithCustomer[0].name;
          }
        }

        discrepancies.push({
          type: "missing_in_db",
          severity: "critical",
          description: `Stripe invoice ${stripeInvoice.number || stripeInvoice.id} not found in database`,
          stripeInvoiceId: stripeInvoice.id,
          stripeAmount: (stripeInvoice.amount_paid || stripeInvoice.total || 0) / 100,
          organizationId: orgId || "unknown",
          organizationName: orgName
        });
      }
    }

    // Calculate summary
    const totalDbAmount = dbInvoices.reduce((sum, inv) => sum + inv.total, 0) / 100;
    const totalStripeAmount = stripeInvoices.reduce((sum, inv) => sum + (inv.amount_paid || inv.total || 0), 0) / 100;
    const matched = matchedInvoices.length;
    const discrepancyCount = discrepancies.length;

    return {
      period: {
        start: periodStart,
        end: periodEnd
      },
      summary: {
        totalDbInvoices: dbInvoices.length,
        totalStripeInvoices: stripeInvoices.length,
        matched,
        discrepancies: discrepancyCount,
        totalDbAmount,
        totalStripeAmount,
        amountDifference: totalDbAmount - totalStripeAmount
      },
      discrepancies,
      matchedInvoices
    };
  }

  /**
   * Reconcile a specific organization
   */
  async reconcileOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<ReconciliationReport> {
    return this.reconcileInvoices(organizationId, startDate, endDate);
  }

  /**
   * Get reconciliation summary for dashboard
   */
  async getReconciliationSummary(organizationId?: string): Promise<{
    lastReconciliation?: Date;
    totalDiscrepancies: number;
    criticalDiscrepancies: number;
    lastPeriodMatched: number;
    lastPeriodTotal: number;
  }> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const report = await this.reconcileInvoices(organizationId, periodStart, periodEnd);

    return {
      lastReconciliation: new Date(),
      totalDiscrepancies: report.summary.discrepancies,
      criticalDiscrepancies: report.discrepancies.filter(d => d.severity === "critical").length,
      lastPeriodMatched: report.summary.matched,
      lastPeriodTotal: report.summary.totalDbInvoices
    };
  }
}

export const reconciliationService = new ReconciliationService();

