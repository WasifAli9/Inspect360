/**
 * Pro-Rata Billing Service
 * Calculates prorated prices for module purchases mid-billing-cycle
 */

export interface ProRataResult {
  proratedPrice: number; // in minor units (pence/cents)
  fullPrice: number; // in minor units
  remainingDays: number;
  totalDaysInCycle: number;
  isProrated: boolean;
}

/**
 * Calculate remaining days in the current billing cycle
 */
export function calculateRemainingDays(
  subscriptionStartDate: Date | string,
  subscriptionRenewalDate: Date | string | null | undefined,
  billingCycle: "monthly" | "annual",
  currentDate: Date = new Date()
): number {
  const start = typeof subscriptionStartDate === 'string' 
    ? new Date(subscriptionStartDate) 
    : subscriptionStartDate;
  
  const now = currentDate;
  
  // If renewal date is provided, use it
  if (subscriptionRenewalDate) {
    const renewal = typeof subscriptionRenewalDate === 'string' 
      ? new Date(subscriptionRenewalDate) 
      : subscriptionRenewalDate;
    
    const msRemaining = renewal.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  }
  
  // Otherwise, calculate based on billing cycle
  if (billingCycle === "annual") {
    // Calculate next renewal date (1 year from start)
    const nextRenewal = new Date(start);
    nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
    
    // Days remaining until renewal
    const msRemaining = nextRenewal.getTime() - now.getTime();
    return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  } else {
    // Monthly: Calculate next renewal (1 month from start)
    const nextRenewal = new Date(start);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    
    const msRemaining = nextRenewal.getTime() - now.getTime();
    return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  }
}

/**
 * Calculate total days in a billing cycle
 */
export function getTotalDaysInCycle(billingCycle: "monthly" | "annual"): number {
  return billingCycle === "annual" ? 365 : 30;
}

/**
 * Calculate pro-rated price for a module purchase
 * Formula: (Full Price × Remaining Days) / Total Days in Cycle
 */
export function calculateProratedPrice(
  fullPrice: number, // in minor units (pence/cents)
  remainingDays: number,
  billingCycle: "monthly" | "annual"
): number {
  if (remainingDays <= 0) {
    return fullPrice; // No proration needed if cycle has ended
  }
  
  const totalDaysInCycle = getTotalDaysInCycle(billingCycle);
  
  // Pro-rated amount = (full price × remaining days) / total days
  const proratedAmount = Math.round((fullPrice * remainingDays) / totalDaysInCycle);
  
  // Ensure we don't charge more than full price (safety check)
  return Math.min(proratedAmount, fullPrice);
}

/**
 * Main function to calculate pro-rata pricing for a module purchase
 */
export function calculateProRata(
  fullPrice: number,
  subscriptionStartDate: Date | string,
  subscriptionRenewalDate: Date | string | null | undefined,
  billingCycle: "monthly" | "annual",
  currentDate: Date = new Date()
): ProRataResult {
  const remainingDays = calculateRemainingDays(
    subscriptionStartDate,
    subscriptionRenewalDate,
    billingCycle,
    currentDate
  );
  
  const totalDaysInCycle = getTotalDaysInCycle(billingCycle);
  
  // Only prorate if there are remaining days and it's not a new subscription
  const isProrated = remainingDays > 0 && remainingDays < totalDaysInCycle;
  
  const proratedPrice = isProrated
    ? calculateProratedPrice(fullPrice, remainingDays, billingCycle)
    : fullPrice;
  
  return {
    proratedPrice,
    fullPrice,
    remainingDays,
    totalDaysInCycle,
    isProrated
  };
}

/**
 * Calculate pro-rata pricing with consistent date priority
 * Always prioritizes instanceSubscriptions dates over legacy subscription dates
 * 
 * @param fullPrice - Full price in minor units (pence/cents)
 * @param organizationId - Organization ID
 * @param billingCycle - Billing cycle (monthly/annual)
 * @param storage - Storage service instance
 * @returns ProRataResult with prorated pricing, or null if no subscription found
 */
export async function calculateProRataWithPriority(
  fullPrice: number,
  organizationId: string,
  billingCycle: "monthly" | "annual",
  storage: any
): Promise<{ result: ProRataResult; source: "instanceSubscriptions" | "legacySubscription" } | null> {
  // Priority 1: Use instanceSubscriptions (source of truth - updated on tier changes)
  const instanceSub = await storage.getInstanceSubscription(organizationId);
  
  if (instanceSub?.subscriptionStartDate && instanceSub?.subscriptionRenewalDate && 
      instanceSub.billingCycle === billingCycle && instanceSub.subscriptionStatus === "active") {
    const result = calculateProRata(
      fullPrice,
      instanceSub.subscriptionStartDate,
      instanceSub.subscriptionRenewalDate,
      billingCycle
    );
    
    return { result, source: "instanceSubscriptions" };
  }
  
  // Priority 2: Fall back to legacy subscription (only if instanceSubscriptions doesn't have data)
  const existingSub = await storage.getSubscriptionByOrganization(organizationId);
  
  if (existingSub?.stripeSubscriptionId && existingSub.billingInterval === billingCycle) {
    const startDate = existingSub.currentPeriodStart || existingSub.billingCycleAnchor || existingSub.createdAt;
    const renewalDate = existingSub.currentPeriodEnd;
    
    if (startDate && renewalDate) {
      const result = calculateProRata(
        fullPrice,
        startDate,
        renewalDate,
        billingCycle
      );
      
      return { result, source: "legacySubscription" };
    }
  }
  
  // No subscription found - return null (no proration)
  return null;
}

