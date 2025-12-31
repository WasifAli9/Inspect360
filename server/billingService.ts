import { storage } from "./storage";
import { db } from "./db";
import { instanceModules, instanceSubscriptions, moduleLimits, invoices, creditNotes } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { subscriptionService } from "./subscriptionService";

export class BillingService {
  /**
   * Calculate and update overage charges for a module
   */
  async calculateModuleOverage(instanceModuleId: string, organizationId?: string): Promise<number> {
    const instanceModule = await db.select()
      .from(instanceModules)
      .where(eq(instanceModules.id, instanceModuleId))
      .limit(1);

    if (!instanceModule[0] || !instanceModule[0].usageLimit) {
      return 0; // No limit set, no overage
    }

    const usage = instanceModule[0].currentUsage || 0;
    const limit = instanceModule[0].usageLimit;

    if (usage <= limit) {
      return 0; // No overage
    }

    // Get module limits to find overage pricing
    const moduleLimitsList = await db.select()
      .from(moduleLimits)
      .where(eq(moduleLimits.moduleId, instanceModule[0].moduleId));

    if (moduleLimitsList.length === 0) {
      return 0; // No overage pricing configured
    }

    const moduleLimit = moduleLimitsList[0];
    const overageUnits = usage - limit;
    const overageCharge = overageUnits * moduleLimit.overagePrice;

    // Update overage charges in instance module
    await db.update(instanceModules)
      .set({ overageCharges: overageCharge })
      .where(eq(instanceModules.id, instanceModuleId));

    // Send notification if overage was incurred and organizationId provided
    if (organizationId && overageCharge > 0) {
      const modules = await storage.getMarketplaceModules();
      const module = modules.find(m => m.id === instanceModule[0].moduleId);
      const instanceSub = await storage.getInstanceSubscription(organizationId);
      const currency = instanceSub?.registrationCurrency || "GBP";
      
      const { notificationService } = await import("./notificationService");
      await notificationService.sendOverageChargesAlert(
        organizationId,
        module?.name || "Unknown Module",
        overageCharge,
        currency
      );
    }

    return overageCharge;
  }

  /**
   * Calculate overage charges for all enabled modules in an organization
   */
  async calculateAllModuleOverages(organizationId: string): Promise<number> {
    const instanceSub = await storage.getInstanceSubscription(organizationId);
    if (!instanceSub) {
      return 0;
    }

    const enabledModules = await db.select()
      .from(instanceModules)
      .where(and(
        eq(instanceModules.instanceId, instanceSub.id),
        eq(instanceModules.isEnabled, true)
      ));

    let totalOverage = 0;

      for (const module of enabledModules) {
        if (module.usageLimit && (module.currentUsage || 0) > module.usageLimit) {
          const overage = await this.calculateModuleOverage(module.id, organizationId);
          totalOverage += overage;
        }
      }

    return totalOverage;
  }

  /**
   * Reset monthly usage counters for an organization
   * This should be called by a scheduled job on billing cycle reset
   */
  async resetMonthlyUsage(organizationId: string): Promise<void> {
    const instanceSub = await storage.getInstanceSubscription(organizationId);
    if (!instanceSub) {
      return;
    }

    // Reset module usage counters
    await db.update(instanceModules)
      .set({
        currentUsage: 0,
        overageCharges: 0
      })
      .where(eq(instanceModules.instanceId, instanceSub.id));

    // Note: Inspection usage reset is handled by the credit system
    // via the billing cycle reset in subscriptionService.processRollover()
  }

  /**
   * Reset monthly usage for all active subscriptions
   * Called by scheduled job
   */
  async resetAllMonthlyUsage(): Promise<number> {
    const activeSubscriptions = await db.select()
      .from(instanceSubscriptions)
      .where(eq(instanceSubscriptions.subscriptionStatus, "active"));

    let resetCount = 0;

    for (const sub of activeSubscriptions) {
      const org = await storage.getOrganization(sub.organizationId);
      if (org) {
        await this.resetMonthlyUsage(sub.organizationId);
        resetCount++;
      }
    }

    return resetCount;
  }

  /**
   * Generate comprehensive invoice data for an organization
   */
  async generateInvoiceData(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any> {
    const instanceSub = await storage.getInstanceSubscription(organizationId);
    if (!instanceSub) {
      throw new Error("Instance subscription not found");
    }

    const org = await storage.getOrganization(organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Get tier pricing
    const pricingService = (await import("./pricingService")).pricingService;
    const tierPrice = await pricingService.calculateInstancePrice(
      organizationId,
      instanceSub.billingCycle
    );

    // Get module pricing and usage
    const enabledModules = await storage.getInstanceModules(instanceSub.id);
    const modules = await storage.getMarketplaceModules();
    
    const moduleCharges = await Promise.all(
      enabledModules
        .filter(im => im.isEnabled)
        .map(async (im) => {
          const module = modules.find(m => m.id === im.moduleId);
          if (!module) return null;

          const modulePrice = await pricingService.calculateModulePrice(
            organizationId,
            module.id,
            instanceSub.billingCycle
          );

          // Calculate overage if applicable
          const overageCharge = await this.calculateModuleOverage(im.id, organizationId);

          return {
            moduleId: module.id,
            moduleName: module.name,
            basePrice: modulePrice,
            overageCharge: overageCharge,
            usage: im.currentUsage || 0,
            limit: im.usageLimit || null,
            total: modulePrice + overageCharge
          };
        })
    );

    // Get add-on pack purchases in this period
    const addonPurchases = await storage.getInstanceAddonPurchases(instanceSub.id);
    const periodAddons = addonPurchases.filter(p => {
      const purchaseDate = p.purchaseDate || new Date();
      return purchaseDate >= periodStart && purchaseDate <= periodEnd;
    });

    const addonTotal = periodAddons.reduce((sum, p) => sum + (p.totalPrice || 0), 0);

    // Calculate totals
    const subtotal = tierPrice + moduleCharges.reduce((sum, m) => sum + (m?.total || 0), 0) + addonTotal;
    
    // Apply annual discount if annual billing
    let discount = 0;
    if (instanceSub.billingCycle === "annual") {
      // Annual discount is already baked into tier pricing, but we can show it
      const tier = instanceSub.currentTierId ? await storage.getSubscriptionTier(instanceSub.currentTierId) : null;
      if (tier && tier.annualDiscountPercentage) {
        discount = Math.round(subtotal * (parseFloat(tier.annualDiscountPercentage.toString()) / 100));
      }
    }

    const total = subtotal - discount;

    return {
      organizationId,
      organizationName: org.name,
      periodStart,
      periodEnd,
      billingCycle: instanceSub.billingCycle,
      currency: instanceSub.registrationCurrency,
      subscription: {
        tierId: instanceSub.currentTierId,
        tierPrice,
        overrideApplied: !!(instanceSub.overrideMonthlyFee || instanceSub.overrideAnnualFee)
      },
      modules: moduleCharges.filter(m => m !== null),
      addonPacks: periodAddons.map(p => ({
        packId: p.packId,
        quantity: p.quantity,
        totalPrice: p.totalPrice
      })),
      subtotal,
      discount,
      total,
      generatedAt: new Date()
    };
  }

  /**
   * Generate and store an invoice
   */
  async generateInvoice(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any> {
    const invoiceData = await this.generateInvoiceData(organizationId, periodStart, periodEnd);
    const instanceSub = await storage.getInstanceSubscription(organizationId);
    
    if (!instanceSub) {
      throw new Error("Instance subscription not found");
    }

    // Generate invoice number (format: INV-YYYYMMDD-XXXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    // Calculate due date (30 days from now for monthly, or based on billing cycle)
    const dueDate = new Date();
    if (instanceSub.billingCycle === "annual") {
      dueDate.setDate(dueDate.getDate() + 30); // 30 days for annual
    } else {
      dueDate.setDate(dueDate.getDate() + 15); // 15 days for monthly
    }

    const [invoice] = await db.insert(invoices).values({
      organizationId,
      instanceSubscriptionId: instanceSub.id,
      invoiceNumber,
      periodStart,
      periodEnd,
      billingCycle: instanceSub.billingCycle,
      currencyCode: instanceSub.registrationCurrency,
      lineItems: {
        subscription: invoiceData.subscription,
        modules: invoiceData.modules,
        addonPacks: invoiceData.addonPacks
      },
      subtotal: invoiceData.subtotal,
      discount: invoiceData.discount,
      total: invoiceData.total,
      status: "draft",
      dueDate
    }).returning();

    return invoice;
  }

  /**
   * Create a credit note for downgrades or refunds
   */
  async createCreditNote(
    organizationId: string,
    invoiceId: string | null,
    reason: "downgrade" | "refund" | "adjustment" | "other",
    amount: number,
    currency: string,
    description: string,
    createdBy?: string
  ): Promise<any> {
    // Generate credit note number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const creditNoteNumber = `CN-${dateStr}-${randomSuffix}`;

    const [creditNote] = await db.insert(creditNotes).values({
      organizationId,
      invoiceId: invoiceId || null,
      creditNoteNumber,
      reason,
      amount: Math.round(amount * 100), // Convert to minor units
      currencyCode: currency,
      description,
      status: "issued",
      createdBy: createdBy || null
    }).returning();

    return creditNote;
  }

  /**
   * Apply credit note to an invoice
   */
  async applyCreditNote(creditNoteId: string, invoiceId: string): Promise<void> {
    const creditNote = await db.select()
      .from(creditNotes)
      .where(eq(creditNotes.id, creditNoteId))
      .limit(1);

    if (!creditNote[0] || creditNote[0].status !== "issued") {
      throw new Error("Credit note not found or already applied");
    }

    const invoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice[0]) {
      throw new Error("Invoice not found");
    }

    // Update credit note
    await db.update(creditNotes)
      .set({
        status: "applied",
        appliedToInvoiceId: invoiceId,
        appliedAt: new Date()
      })
      .where(eq(creditNotes.id, creditNoteId));

    // Reduce invoice total (if not already paid)
    if (invoice[0].status !== "paid") {
      const newTotal = Math.max(0, invoice[0].total - creditNote[0].amount);
      await db.update(invoices)
        .set({ total: newTotal })
        .where(eq(invoices.id, invoiceId));
    }
  }

  /**
   * Track extensive inspection usage
   */
  async trackExtensiveInspection(
    inspectionId: string,
    extensiveTypeId: string,
    organizationId: string
  ): Promise<void> {
    // Update inspection record
    const { inspections } = await import("@shared/schema");
    await db.update(inspections)
      .set({ extensiveInspectionTypeId: extensiveTypeId })
      .where(eq(inspections.id, inspectionId));

    // Get pricing for this extensive inspection type
    const instanceSub = await storage.getInstanceSubscription(organizationId);
    if (!instanceSub || !instanceSub.currentTierId) {
      return;
    }

    const extensivePricing = await storage.getExtensiveInspectionPricing(
      extensiveTypeId,
      instanceSub.currentTierId,
      instanceSub.registrationCurrency
    );

    if (extensivePricing) {
      // Store pricing info for billing (could create a separate tracking table)
      // For now, this is tracked via the inspection record
      console.log(`[Extensive Inspection] Tracked ${extensiveTypeId} for inspection ${inspectionId}, price: ${extensivePricing.pricePerInspection}`);
    }
  }
}

export const billingService = new BillingService();

