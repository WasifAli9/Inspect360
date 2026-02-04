import { storage } from "./storage";
import { db } from "./db";
import { instanceModules, instanceSubscriptions, moduleLimits, invoices, creditNotes } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { subscriptionService } from "./subscriptionService";

export class BillingService {
  /**
   * Calculate and update overage charges for a module
   * Uses database transaction with row-level locking to prevent race conditions
   */
  async calculateModuleOverage(instanceModuleId: string, organizationId?: string): Promise<number> {
    // Use transaction with row-level locking (SELECT FOR UPDATE) to prevent race conditions
    return await db.transaction(async (tx) => {
      // Lock the row for update to prevent concurrent modifications
      // Using raw SQL with proper table reference for SELECT FOR UPDATE
      // Note: Using table name from schema (drizzle will handle the actual table name)
      const lockedModule = await tx.execute(sql`
        SELECT id, "moduleId", "currentUsage", "usageLimit", "overageCharges"
        FROM ${instanceModules}
        WHERE id = ${instanceModuleId}
        FOR UPDATE
      `);

      if (!lockedModule.rows || lockedModule.rows.length === 0) {
        return 0; // Module not found
      }

      const moduleRow = lockedModule.rows[0] as any;
      const usage = Number(moduleRow.currentUsage) || 0;
      const limit = Number(moduleRow.usageLimit);
      const moduleId = moduleRow.moduleId;

      if (!limit || usage <= limit) {
        return 0; // No limit set or no overage
      }

      // Get module limits to find overage pricing
      const moduleLimitsList = await tx.select()
        .from(moduleLimits)
        .where(eq(moduleLimits.moduleId, moduleId));

      if (moduleLimitsList.length === 0) {
        return 0; // No overage pricing configured
      }

      const moduleLimit = moduleLimitsList[0];
      const overageUnits = usage - limit;
      const overageCharge = overageUnits * moduleLimit.overagePrice;

      // Update overage charges in instance module (within transaction)
      await tx.update(instanceModules)
        .set({ overageCharges: overageCharge })
        .where(eq(instanceModules.id, instanceModuleId));

      // Store moduleId for notification (outside transaction)
      const notificationModuleId = moduleId;

      // Send notification if overage was incurred and organizationId provided
      // Do this outside transaction to avoid long-running transaction
      if (organizationId && overageCharge > 0) {
        // Use setImmediate to send notification after transaction commits
        setImmediate(async () => {
          try {
            const modules = await storage.getMarketplaceModules();
            const module = modules.find(m => m.id === notificationModuleId);
            const instanceSub = await storage.getInstanceSubscription(organizationId);
            const currency = instanceSub?.registrationCurrency || "GBP";
            
            const { notificationService } = await import("./notificationService");
            await notificationService.sendOverageChargesAlert(
              organizationId,
              module?.name || "Unknown Module",
              overageCharge,
              currency
            );
          } catch (error) {
            console.error(`[BillingService] Failed to send overage notification:`, error);
            // Don't throw - notification failure shouldn't break the transaction
          }
        });
      }

      return overageCharge;
    });
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
    // via the billing cycle reset in subscriptionService.processCreditExpiry()
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
   * 
   * CURRENCY HANDLING:
   * - All prices are returned in the instance's registration currency
   * - pricingService methods handle currency conversion automatically (GBP -> instance currency)
   * - Prices stored in database are in GBP, but converted on retrieval
   * - Invoice currency matches instanceSub.registrationCurrency
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

    // Get tier pricing (automatically converted to instance currency by pricingService)
    const pricingService = (await import("./pricingService")).pricingService;
    const tierPrice = await pricingService.calculateInstancePrice(
      organizationId,
      instanceSub.billingCycle
    );

    // Get module pricing and usage
    // Note: calculateModulePrice() handles currency conversion automatically
    const enabledModules = await storage.getInstanceModules(instanceSub.id);
    const modules = await storage.getMarketplaceModules();
    
    const moduleCharges = await Promise.all(
      enabledModules
        .filter(im => im.isEnabled)
        .map(async (im) => {
          const module = modules.find(m => m.id === im.moduleId);
          if (!module) return null;

          // Module price is automatically converted to instance currency
          const modulePrice = await pricingService.calculateModulePrice(
            organizationId,
            module.id,
            instanceSub.billingCycle
          );

          // Calculate overage if applicable
          // Note: Overage charges are in the same currency as module pricing
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

    // Get active bundles and their charges
    // Note: Bundle prices are stored in instanceBundles table at purchase time
    // Prices are already in the instance's currency
    const activeBundles = await storage.getInstanceBundles(instanceSub.id);
    const bundles = await storage.getModuleBundles();
    
    const bundleCharges = await Promise.all(
      activeBundles
        .filter(b => b.isActive)
        .map(async (b) => {
          const bundle = bundles.find(bundle => bundle.id === b.bundleId);
          
          // Use stored bundle pricing (already in instance currency)
          // If stored pricing is not available, calculate from bundle pricing table
          let bundlePrice = 0;
          if (b.bundlePriceMonthly && b.bundlePriceAnnual) {
            // Use stored pricing (already in correct currency)
            bundlePrice = instanceSub.billingCycle === "annual" 
              ? b.bundlePriceAnnual 
              : b.bundlePriceMonthly;
          } else {
            // Fallback: calculate from bundle pricing table (handles currency conversion)
            const bundlePricing = await storage.getBundlePricing(
              b.bundleId, 
              instanceSub.registrationCurrency
            );
            if (bundlePricing) {
              bundlePrice = instanceSub.billingCycle === "annual"
                ? bundlePricing.priceAnnual
                : bundlePricing.priceMonthly;
            }
          }

          return {
            bundleId: b.bundleId,
            bundleName: bundle?.name || "Unknown Bundle",
            price: bundlePrice,
            total: bundlePrice
          };
        })
    );

    // Calculate totals
    const bundleTotal = bundleCharges.reduce((sum, b) => sum + b.total, 0);
    const subtotal = tierPrice + 
      moduleCharges.reduce((sum, m) => sum + (m?.total || 0), 0) + 
      bundleTotal + 
      addonTotal;
    
    // Apply annual discount if annual billing
    // Note: Annual discount should only apply to tier price, not modules/addons/bundles
    // Modules and add-ons are already priced correctly for annual billing
    let discount = 0;
    if (instanceSub.billingCycle === "annual") {
      const tier = instanceSub.currentTierId ? await storage.getSubscriptionTier(instanceSub.currentTierId) : null;
      if (tier && tier.annualDiscountPercentage) {
        // Only apply discount to tier price, not modules/addons/bundles
        discount = Math.round(tierPrice * (parseFloat(tier.annualDiscountPercentage.toString()) / 100));
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
      bundles: bundleCharges,
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

    // Send invoice generated notification
    try {
      const { notificationService } = await import("./notificationService");
      await notificationService.sendInvoiceGeneratedNotification(
        organizationId,
        "", // invoiceId will be set after creation
        invoiceData.total,
        instanceSub.registrationCurrency || "GBP",
        undefined, // invoiceNumber will be set after creation
        periodEnd
      );
    } catch (notifError) {
      console.error("Error sending invoice generated notification:", notifError);
      // Don't fail invoice generation if notification fails
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

    // Send invoice generated notification with actual invoice details
    try {
      const { notificationService } = await import("./notificationService");
      await notificationService.sendInvoiceGeneratedNotification(
        organizationId,
        invoice.id,
        invoiceData.total,
        instanceSub.registrationCurrency || "GBP",
        invoiceNumber,
        dueDate
      );
    } catch (notifError) {
      console.error("Error sending invoice generated notification:", notifError);
      // Don't fail invoice generation if notification fails
    }

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
    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      const creditNote = await tx.select()
        .from(creditNotes)
        .where(eq(creditNotes.id, creditNoteId))
        .limit(1);

      if (!creditNote[0] || creditNote[0].status !== "issued") {
        throw new Error("Credit note not found or already applied");
      }

      const invoice = await tx.select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice[0]) {
        throw new Error("Invoice not found");
      }

      // Validate currency match
      if (creditNote[0].currencyCode !== invoice[0].currencyCode) {
        throw new Error(`Currency mismatch: Credit note is ${creditNote[0].currencyCode}, invoice is ${invoice[0].currencyCode}`);
      }

      // Validate organization match
      if (creditNote[0].organizationId !== invoice[0].organizationId) {
        throw new Error("Credit note and invoice must belong to the same organization");
      }

      // Update credit note
      await tx.update(creditNotes)
        .set({
          status: "applied",
          appliedToInvoiceId: invoiceId,
          appliedAt: new Date()
        })
        .where(eq(creditNotes.id, creditNoteId));

      // Reduce invoice total (if not already paid)
      if (invoice[0].status !== "paid") {
        const newTotal = Math.max(0, invoice[0].total - creditNote[0].amount);
        await tx.update(invoices)
          .set({ 
            total: newTotal,
            // Update subtotal if credit note is applied
            // Note: We keep subtotal unchanged, only reduce total
          })
          .where(eq(invoices.id, invoiceId));
        
        // If invoice total becomes 0 or negative, mark as paid
        if (newTotal <= 0) {
          await tx.update(invoices)
            .set({ 
              status: "paid",
              paidAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
        }
      } else {
        // If invoice is already paid, create a refund/credit entry
        // This could be handled by creating a negative invoice item in Stripe
        console.log(`[Credit Note] Invoice ${invoiceId} is already paid. Credit note ${creditNoteId} applied but may need manual refund processing.`);
      }
    });
  }

  /**
   * Get credit notes for an organization
   */
  async getCreditNotes(organizationId: string, status?: "issued" | "applied" | "cancelled"): Promise<any[]> {
    const conditions: any[] = [eq(creditNotes.organizationId, organizationId)];
    if (status) {
      conditions.push(eq(creditNotes.status, status));
    }
    
    return await db.select()
      .from(creditNotes)
      .where(and(...conditions))
      .orderBy(creditNotes.createdAt);
  }

  /**
   * Get credit note by ID
   */
  async getCreditNoteById(creditNoteId: string): Promise<any | null> {
    const [note] = await db.select()
      .from(creditNotes)
      .where(eq(creditNotes.id, creditNoteId))
      .limit(1);
    return note || null;
  }

  /**
   * Cancel a credit note (if not yet applied)
   */
  async cancelCreditNote(creditNoteId: string): Promise<void> {
    const creditNote = await db.select()
      .from(creditNotes)
      .where(eq(creditNotes.id, creditNoteId))
      .limit(1);

    if (!creditNote[0]) {
      throw new Error("Credit note not found");
    }

    if (creditNote[0].status !== "issued") {
      throw new Error("Only issued credit notes can be cancelled");
    }

    await db.update(creditNotes)
      .set({ status: "cancelled" })
      .where(eq(creditNotes.id, creditNoteId));
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

