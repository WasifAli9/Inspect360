import { billingService } from "./billingService";
import { storage } from "./storage";
import { db } from "./db";
import { instanceSubscriptions } from "@shared/schema";
import { eq, lte, and } from "drizzle-orm";

/**
 * Monthly Reset Service
 * 
 * This service handles resetting usage counters and billing cycle operations.
 * Should be called by a scheduled job (cron, node-cron, AWS EventBridge, etc.)
 * 
 * Example cron schedule: "0 0 1 * *" (1st of every month at midnight)
 */
export class MonthlyResetService {
  /**
   * Reset usage counters for a single organization
   */
  async resetOrganizationUsage(organizationId: string): Promise<void> {
    try {
      // Reset module usage counters
      await billingService.resetMonthlyUsage(organizationId);

      // Handle inspection quota reset via subscription service
      const instanceSub = await storage.getInstanceSubscription(organizationId);
      if (instanceSub && instanceSub.subscriptionRenewalDate) {
        const { subscriptionService } = await import("./subscriptionService");
        
        // Process credit expiry which expires all unused credits (no rollover)
        await subscriptionService.processCreditExpiry(
          organizationId,
          instanceSub.subscriptionRenewalDate
        );

        // Reset inspection quota to tier quota (not append)
        if (instanceSub.inspectionQuotaIncluded > 0 && instanceSub.subscriptionStatus === "active") {
          console.log(`[Monthly Reset] Resetting inspection quota for org ${organizationId} to ${instanceSub.inspectionQuotaIncluded}`);
          
          // Expire all existing plan_inclusion batches (including any that weren't expired by processCreditExpiry)
          const existingBatches = await storage.getCreditBatchesByOrganization(organizationId);
          const planBatches = existingBatches.filter(b => 
            b.grantSource === 'plan_inclusion' && 
            b.remainingQuantity > 0
          );
          
          for (const batch of planBatches) {
            await storage.expireCreditBatch(batch.id);
            await storage.createCreditLedgerEntry({
              organizationId,
              source: "expiry" as any,
              quantity: -batch.remainingQuantity,
              batchId: batch.id,
              notes: `Expired ${batch.remainingQuantity} credits due to monthly quota reset (no rollover)`
            });
          }
          
          // Grant new quota
          await subscriptionService.grantCredits(
            organizationId,
            instanceSub.inspectionQuotaIncluded,
            "plan_inclusion",
            instanceSub.subscriptionRenewalDate
          );
          
          console.log(`[Monthly Reset] Granted ${instanceSub.inspectionQuotaIncluded} credits to org ${organizationId}`);
        }
      }

      console.log(`[Monthly Reset] Reset usage for organization ${organizationId}`);
    } catch (error) {
      console.error(`[Monthly Reset] Error resetting usage for organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Process monthly reset for all subscriptions that need it
   * Checks subscriptions where renewal_date has passed
   */
  async processMonthlyResets(): Promise<{ processed: number; errors: number }> {
    const now = new Date();
    let processed = 0;
    let errors = 0;

    try {
      // Get all active subscriptions where renewal date has passed or is today
      const subscriptionsToReset = await db.select()
        .from(instanceSubscriptions)
        .where(
          and(
            eq(instanceSubscriptions.subscriptionStatus, "active"),
            lte(instanceSubscriptions.subscriptionRenewalDate, now)
          )
        );

      for (const sub of subscriptionsToReset) {
        try {
          await this.resetOrganizationUsage(sub.organizationId);
          processed++;

          // Update renewal date to next cycle
          const nextRenewalDate = new Date(sub.subscriptionRenewalDate || now);
          if (sub.billingCycle === "monthly") {
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
          } else {
            nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
          }

          await storage.updateInstanceSubscription(sub.id, {
            subscriptionRenewalDate: nextRenewalDate
          });
        } catch (error) {
          console.error(`[Monthly Reset] Error processing subscription ${sub.id}:`, error);
          errors++;
        }
      }

      console.log(`[Monthly Reset] Processed ${processed} subscriptions, ${errors} errors`);
      return { processed, errors };
    } catch (error) {
      console.error("[Monthly Reset] Error processing monthly resets:", error);
      throw error;
    }
  }

  /**
   * Reset all active subscriptions (manual trigger, use with caution)
   */
  async resetAllActiveSubscriptions(): Promise<number> {
    return await billingService.resetAllMonthlyUsage();
  }
}

export const monthlyResetService = new MonthlyResetService();

