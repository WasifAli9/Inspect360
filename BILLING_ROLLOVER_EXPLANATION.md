# Billing Rollover & Credit Grant Explanation

## Overview
This document explains how inspection credits are granted during billing rollover/renewal and how pricing works.

---

## 🔑 Key Finding: Credits Granted = TOTAL (Tier + Additional Inspections)

### Answer to Your Question:
**During billing rollover, the system grants the TOTAL number of inspection credits that the user originally chose**, which includes:
- ✅ **Tier's included inspections** (e.g., Professional tier = 75 included)
- ✅ **Additional inspections** the user selected beyond the tier (e.g., +10 additional = 85 total)

**NOT just the tier's base included amount.**

---

## 📋 Detailed Flow

### 1. Initial Payment (First Subscription)

**Location:** `server/routes.ts` lines 16468-16533

**What Happens:**
1. User selects tier (e.g., Professional = 75 included) + additional inspections (e.g., +10 = 85 total)
2. Frontend sends `requestedInspections = 85` (TOTAL) to checkout
3. Checkout stores `requestedInspections: "85"` in Stripe session metadata
4. When payment completes:
   - `actualInspections = requestedInspections` (85) or tier default if not provided
   - **`inspectionQuotaIncluded` is set to `actualInspections` (85)** in `instanceSubscriptions` table
   - **Credits granted = 85** (the TOTAL)

**Code Reference:**
```typescript
// Line 16470: actualInspections = requestedInspections (TOTAL)
const actualInspections = (!isNaN(parsedRequested)) ? parsedRequested : (tier.includedInspections || 0);

// Line 16476: Store TOTAL in database
inspectionQuotaIncluded: actualInspections,  // 85 (not just 75)

// Line 16528: Grant TOTAL credits
await subService.grantCredits(
  user.organizationId,
  actualInspections,  // 85 credits granted
  "plan_inclusion",
  renewalDate
);
```

---

### 2. Automatic Renewal (Stripe Webhook: `invoice.paid`)

**Location:** `server/routes.ts` lines 17010-17050

**What Happens:**
1. Stripe automatically charges customer on renewal date
2. Webhook receives `invoice.paid` event
3. System processes renewal:
   - **Reads `inspectionQuotaIncluded` from `instanceSubscriptions` table** (which is 85)
   - Processes rollover (unused credits from previous cycle)
   - Expires old `plan_inclusion` batches
   - **Grants new credits = `inspectionQuotaIncluded` (85)** - the TOTAL

**Code Reference:**
```typescript
// Line 17012: Get TOTAL from database (not tier default)
const quotaToGrant = instanceSub.inspectionQuotaIncluded || 0;  // 85

// Line 17042: Grant TOTAL credits
await subService.grantCredits(
  organizationId,
  quotaToGrant,  // 85 credits (TOTAL, not just tier's 75)
  "plan_inclusion",
  periodEnd
);
```

---

### 3. Monthly Reset (Manual/Cron Job)

**Location:** `server/monthlyResetService.ts` lines 36-67

**What Happens:**
1. Scheduled job runs (e.g., 1st of each month)
2. For each active subscription:
   - Processes rollover (unused credits)
   - **Reads `inspectionQuotaIncluded` from `instanceSubscriptions` table** (85)
   - Expires old `plan_inclusion` batches
   - **Grants new credits = `inspectionQuotaIncluded` (85)** - the TOTAL

**Code Reference:**
```typescript
// Line 36: Check if quota exists
if (instanceSub.inspectionQuotaIncluded > 0) {  // 85

// Line 61: Grant TOTAL credits
await subscriptionService.grantCredits(
  organizationId,
  instanceSub.inspectionQuotaIncluded,  // 85 credits (TOTAL)
  "plan_inclusion",
  instanceSub.subscriptionRenewalDate
);
```

---

## 💰 Pricing Structure

### How Pricing Works:

**Location:** `server/routes.ts` lines 2129-2180 (checkout endpoint)

**Pricing Components:**
1. **Tier Base Price** - Fixed monthly/annual price for the tier
   - Example: Professional tier = £299/month
   - Stored in: `subscription_tiers.basePriceMonthly` (in pence: 29900)

2. **Additional Inspections Price** - Per-inspection cost for extras beyond tier
   - Example: 10 additional × £5.50 = £55.00
   - Formula: `additionalInspections × PER_INSPECTION_PRICE` (550 pence each)
   - Calculated in frontend and sent to backend

3. **Module Costs** - Additional monthly fees for enabled modules
   - Example: Maintenance module = £50/month
   - Stored in: `module_pricing.priceMonthly` (in pence)

**Total Price Calculation:**
```
Total Monthly = Tier Price + Additional Inspections Cost + Module Costs
Example: £299 + £55 + £50 = £404/month
```

**What Gets Charged:**
- ✅ **Initial Payment:** Total price (tier + additional + modules)
- ✅ **Renewal:** Same total price (tier + additional + modules)
- ✅ **Credits Granted:** TOTAL inspections (tier included + additional)

---

## 🔄 Rollover Logic

**Location:** `server/subscriptionService.ts` lines 207-265

**What Happens During Rollover:**
1. **Expires old rolled batches** from previous cycles
2. **Finds last cycle's unused credits** (non-rolled batches that expired)
3. **Creates new rolled batch** with remaining unused credits
4. **Marks original batch as consumed**

**Important:** Rollover only preserves **unused credits** from the previous cycle. The new cycle grants the **full quota** (`inspectionQuotaIncluded`).

**Example:**
- Previous cycle: 85 credits granted, 20 used, 65 remaining
- Rollover: 65 credits rolled over to new cycle
- New cycle: 85 credits granted (full quota) + 65 rolled = **150 total credits**

---

## 📊 Summary Table

| Event | Credits Granted | Source |
|-------|----------------|--------|
| **Initial Payment** | TOTAL (tier + additional) | `requestedInspections` from checkout |
| **Automatic Renewal** | TOTAL (tier + additional) | `inspectionQuotaIncluded` from database |
| **Monthly Reset** | TOTAL (tier + additional) | `inspectionQuotaIncluded` from database |

**Key Point:** The system **remembers** the total number of inspections the user selected (tier + additional) and grants that same amount on every renewal/reset.

---

## 🎯 Example Scenario

**User Selection:**
- Tier: Professional (75 included)
- Additional: +10 inspections
- **Total: 85 inspections/month**
- Price: £299 (tier) + £55 (additional) = £354/month

**What Happens:**

1. **Initial Payment:**
   - Charged: £354/month
   - `inspectionQuotaIncluded` = 85 (stored in database)
   - Credits granted: 85

2. **First Renewal (1 month later):**
   - Charged: £354/month (same price)
   - Credits granted: 85 (same total)
   - If 20 were unused from previous cycle: 85 new + 20 rolled = 105 total

3. **Monthly Reset:**
   - Credits granted: 85 (same total)
   - Unused credits rolled over

**Result:** User always gets 85 credits per cycle (not just 75), and always pays £354/month.

---

## ✅ Conclusion

- **Credits Granted:** TOTAL (tier included + additional inspections)
- **Pricing:** Tier price + Additional inspections cost + Module costs
- **Rollover:** Preserves unused credits, but grants full quota each cycle
- **Consistency:** System remembers and grants the same total amount on every renewal

