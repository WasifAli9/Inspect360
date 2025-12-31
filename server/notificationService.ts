import { storage } from "./storage";
import { sendNotificationToUser } from "./websocket";

export class NotificationService {
  /**
   * Send quota usage alert to organization owner
   */
  async sendQuotaUsageAlert(
    organizationId: string,
    usagePercent: number,
    used: number,
    total: number
  ): Promise<void> {
    try {
      const org = await storage.getOrganization(organizationId);
      if (!org || !org.ownerId) return;

      const owner = await storage.getUser(org.ownerId);
      if (!owner) return;

      let title: string;
      let message: string;
      let type: string;

      if (usagePercent >= 100) {
        title = "Inspection Quota Exceeded";
        message = `You've used all ${total} of your monthly inspection quota. Please purchase additional inspections to continue.`;
        type = "quota_exceeded";
      } else if (usagePercent >= 80) {
        title = "Inspection Quota Warning";
        message = `You've used ${used} of ${total} inspections (${Math.round(usagePercent)}%). Consider purchasing additional inspections.`;
        type = "quota_warning";
      } else {
        return; // Don't send alerts below 80%
      }

      const notification = await storage.createNotification({
        userId: owner.id,
        organizationId,
        type,
        title,
        message,
        data: {
          used,
          total,
          usagePercent,
          actionUrl: "/billing"
        }
      });

      sendNotificationToUser(owner.id, {
        id: notification.id,
        type,
        title,
        message,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
        isRead: false
      });
    } catch (error) {
      console.error("Error sending quota usage alert:", error);
    }
  }

  /**
   * Send module usage limit alert
   */
  async sendModuleUsageLimitAlert(
    organizationId: string,
    moduleName: string,
    used: number,
    limit: number,
    usagePercent: number
  ): Promise<void> {
    try {
      const org = await storage.getOrganization(organizationId);
      if (!org || !org.ownerId) return;

      const owner = await storage.getUser(org.ownerId);
      if (!owner) return;

      let title: string;
      let message: string;
      let type: string;

      if (usagePercent >= 100) {
        title = `${moduleName} Usage Limit Reached`;
        message = `You've reached your limit of ${limit} for ${moduleName}. Additional usage will incur overage charges.`;
        type = "module_limit_exceeded";
      } else if (usagePercent >= 90) {
        title = `${moduleName} Usage Warning`;
        message = `You've used ${used} of ${limit} (${Math.round(usagePercent)}%) for ${moduleName}. Approaching limit.`;
        type = "module_limit_warning";
      } else {
        return; // Don't send alerts below 90%
      }

      const notification = await storage.createNotification({
        userId: owner.id,
        organizationId,
        type,
        title,
        message,
        data: {
          moduleName,
          used,
          limit,
          usagePercent,
          actionUrl: "/billing"
        }
      });

      sendNotificationToUser(owner.id, {
        id: notification.id,
        type,
        title,
        message,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
        isRead: false
      });
    } catch (error) {
      console.error("Error sending module usage limit alert:", error);
    }
  }

  /**
   * Send subscription renewal reminder
   */
  async sendRenewalReminder(
    organizationId: string,
    renewalDate: Date,
    daysUntilRenewal: number
  ): Promise<void> {
    try {
      const org = await storage.getOrganization(organizationId);
      if (!org || !org.ownerId) return;

      const owner = await storage.getUser(org.ownerId);
      if (!owner) return;

      const notification = await storage.createNotification({
        userId: owner.id,
        organizationId,
        type: "renewal_reminder",
        title: "Subscription Renewal Upcoming",
        message: `Your subscription will renew in ${daysUntilRenewal} day(s) on ${renewalDate.toLocaleDateString()}.`,
        data: {
          renewalDate: renewalDate.toISOString(),
          daysUntilRenewal,
          actionUrl: "/billing"
        }
      });

      sendNotificationToUser(owner.id, {
        id: notification.id,
        type: "renewal_reminder",
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
        isRead: false
      });
    } catch (error) {
      console.error("Error sending renewal reminder:", error);
    }
  }

  /**
   * Send payment failed alert
   */
  async sendPaymentFailedAlert(
    organizationId: string,
    amount: number,
    currency: string,
    retryDate?: Date
  ): Promise<void> {
    try {
      const org = await storage.getOrganization(organizationId);
      if (!org || !org.ownerId) return;

      const owner = await storage.getUser(org.ownerId);
      if (!owner) return;

      const notification = await storage.createNotification({
        userId: owner.id,
        organizationId,
        type: "payment_failed",
        title: "Payment Failed",
        message: retryDate
          ? `Your payment of ${currency} ${(amount / 100).toFixed(2)} failed. We'll retry on ${retryDate.toLocaleDateString()}. Please update your payment method.`
          : `Your payment of ${currency} ${(amount / 100).toFixed(2)} failed. Please update your payment method.`,
        data: {
          amount,
          currency,
          retryDate: retryDate?.toISOString(),
          actionUrl: "/billing"
        }
      });

      sendNotificationToUser(owner.id, {
        id: notification.id,
        type: "payment_failed",
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
        isRead: false
      });
    } catch (error) {
      console.error("Error sending payment failed alert:", error);
    }
  }

  /**
   * Send admin notification about pricing override
   */
  async sendAdminPricingOverrideAlert(
    adminUserId: string,
    organizationId: string,
    overrideType: "subscription" | "module",
    details: any
  ): Promise<void> {
    try {
      const org = await storage.getOrganization(organizationId);
      if (!org) return;

      const notification = await storage.createNotification({
        userId: adminUserId,
        organizationId,
        type: "admin_override_applied",
        title: `Pricing Override Applied - ${org.name}`,
        message: `A ${overrideType} pricing override was applied for ${org.name}. Reason: ${details.reason || "Not specified"}`,
        data: {
          overrideType,
          organizationId,
          organizationName: org.name,
          ...details
        }
      });

      sendNotificationToUser(adminUserId, {
        id: notification.id,
        type: "admin_override_applied",
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
        isRead: false
      });
    } catch (error) {
      console.error("Error sending admin pricing override alert:", error);
    }
  }

  /**
   * Send overage charges alert
   */
  async sendOverageChargesAlert(
    organizationId: string,
    moduleName: string,
    overageAmount: number,
    currency: string
  ): Promise<void> {
    try {
      const org = await storage.getOrganization(organizationId);
      if (!org || !org.ownerId) return;

      const owner = await storage.getUser(org.ownerId);
      if (!owner) return;

      const notification = await storage.createNotification({
        userId: owner.id,
        organizationId,
        type: "overage_charges",
        title: "Overage Charges Incurred",
        message: `You've exceeded the usage limit for ${moduleName}. Overage charges of ${currency} ${(overageAmount / 100).toFixed(2)} have been added to your invoice.`,
        data: {
          moduleName,
          overageAmount,
          currency,
          actionUrl: "/billing"
        }
      });

      sendNotificationToUser(owner.id, {
        id: notification.id,
        type: "overage_charges",
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
        isRead: false
      });
    } catch (error) {
      console.error("Error sending overage charges alert:", error);
    }
  }

  /**
   * Check and send quota alerts for an organization
   */
  async checkAndSendQuotaAlerts(organizationId: string): Promise<void> {
    try {
      const balance = await storage.getCreditBalance(organizationId);
      const instanceSub = await storage.getInstanceSubscription(organizationId);
      
      if (!instanceSub) return;

      const totalAvailable = balance.total;
      const quotaIncluded = instanceSub.inspectionQuotaIncluded || 0;
      const used = quotaIncluded - totalAvailable;
      const usagePercent = quotaIncluded > 0 ? (used / quotaIncluded) * 100 : 0;

      // Send alert if above 80% threshold
      if (usagePercent >= 80) {
        await this.sendQuotaUsageAlert(organizationId, usagePercent, used, quotaIncluded);
      }
    } catch (error) {
      console.error("Error checking quota alerts:", error);
    }
  }
}

export const notificationService = new NotificationService();

