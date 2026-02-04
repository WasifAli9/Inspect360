# Billing System Review: Addon Pack Credit Reset Behavior

## Question
**Do addon pack credits reset when the plan expires?**

## Answer
**YES - Addon pack credits DO reset when the plan expires (UPDATED)**

**Status:** ✅ **IMPLEMENTED** - Addon pack credits now expire and reset with the subscription plan.

## Detailed Analysis

### 1. How Addon Pack Credits Are Granted

**Location:** `server/routes.ts` (lines 18287-18298)

When an addon pack is purchased, credits are granted with:
- **Source:** `"addon_pack"`
- **Expiration Date:** `undefined` (NO expiration date)
- **Metadata:** Links to the addon purchase record

```typescript
const creditBatch = await subService.grantCredits(
  user.organizationId,
  quantity,
  "addon_pack",
  undefined, // No expiration date for addon packs
  {
    addonPurchaseId: addonPurchase.id,
    adminNotes: `Addon pack purchase via Stripe session: ${sessionId}`,
    createdBy: user.id
  },
  pricePerInspection
);
```

### 2. Credit Expiry Logic

**Location:** `server/subscriptionService.ts` (lines 210-236)

The `processCreditExpiry` function only expires batches that:
1. Have a remaining quantity > 0
2. **AND** have an `expiresAt` date set
3. **AND** that date has passed (`expiresAt <= now`)

```typescript
const expiredBatches = allBatches.filter(
  b => b.remainingQuantity > 0 && b.expiresAt && b.expiresAt <= now
);
```

**Since addon pack credits have `expiresAt = undefined`, they are NOT expired by this function.**

### 3. Monthly Reset Logic

**Location:** `server/monthlyResetService.ts` (lines 39-55)

The monthly reset service specifically targets only `plan_inclusion` batches:

```typescript
// Expire all existing plan_inclusion batches
const existingBatches = await storage.getCreditBatchesByOrganization(organizationId);
const planBatches = existingBatches.filter(b => 
  b.grantSource === 'plan_inclusion' && 
  b.remainingQuantity > 0
);
```

**Addon pack batches (`grantSource === 'addon_pack'`) are explicitly excluded from this reset.**

### 4. Credit Consumption Order

**Location:** `server/subscriptionService.ts` (lines 59-134)

Credits are consumed using FIFO (First In, First Out) logic:
- Plan-included credits are consumed first
- Addon pack credits are consumed after plan credits are exhausted

This ensures purchased addon pack credits are preserved until plan credits are used.

## Summary

| Credit Type | Expiration Date | Reset on Plan Expiry? | Behavior |
|------------|-----------------|----------------------|----------|
| **Plan-Included Credits** | Set to renewal date | ✅ **YES** | Reset to tier quota at each billing cycle |
| **Addon Pack Credits** | Set to subscription renewal date | ✅ **YES** | Reset with subscription plan (monthly or annual) |

## Implementation Details

### 1. Credit Granting with Expiration

**Location:** `server/routes.ts` (lines 18281-18330)

When addon pack credits are granted, they now receive an expiration date based on the subscription renewal date:

```typescript
// Calculate expiration date based on subscription renewal date
let expiresAt: Date | undefined = undefined;
if (instanceSub.subscriptionRenewalDate) {
  expiresAt = new Date(instanceSub.subscriptionRenewalDate);
} else {
  // If no renewal date set, calculate based on billing cycle
  const renewalDate = new Date();
  if (instanceSub.billingCycle === "annual") {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  } else {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }
  expiresAt = renewalDate;
}

await subService.grantCredits(
  user.organizationId,
  quantity,
  "addon_pack",
  expiresAt, // Expire with subscription plan
  // ...
);
```

### 2. Monthly Reset Service

**Location:** `server/monthlyResetService.ts` (lines 39-75)

The monthly reset service now also expires addon pack credits:

```typescript
// Also expire all addon_pack batches - they should reset with the subscription plan
const addonPackBatches = existingBatches.filter(b => 
  b.grantSource === 'addon_pack' && 
  b.remainingQuantity > 0
);

for (const batch of addonPackBatches) {
  await storage.expireCreditBatch(batch.id);
  await storage.createCreditLedgerEntry({
    organizationId,
    source: "expiry" as any,
    quantity: -batch.remainingQuantity,
    batchId: batch.id,
    notes: `Expired ${batch.remainingQuantity} addon pack credits due to subscription plan reset (no rollover)`
  });
}
```

### 3. Credit Expiry Logic

**Location:** `server/subscriptionService.ts` (lines 210-236)

The `processCreditExpiry` function automatically expires all batches (including addon packs) where `expiresAt <= now`, ensuring addon pack credits expire at the subscription renewal date.

## Design Rationale

This behavior ensures:

1. **Consistent billing cycle** - All credits (plan and addon) reset together at the subscription renewal
2. **Fair usage** - Prevents accumulation of unused addon pack credits across billing cycles
3. **Simplified management** - All credits follow the same expiration rules
4. **Monthly/Annual alignment** - Addon pack credits expire based on the subscription's billing cycle (monthly or annual)

## Verification

To verify this behavior:
1. Purchase an addon pack and note the credit balance and expiration date
2. Check that the expiration date matches the subscription renewal date
3. Wait for the plan renewal date to pass
4. Verify that both plan-included AND addon pack credits are reset
5. Check the credit ledger for expiry entries for both credit types

## Conclusion

**Addon pack credits DO reset when the plan expires.** They now expire at the subscription renewal date (monthly or annual) and are reset along with plan-included credits during the monthly reset process.

