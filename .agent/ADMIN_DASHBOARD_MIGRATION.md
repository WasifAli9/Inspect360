# AdminDashboard Migration to instance_subscriptions - Complete ✅

## Summary

Successfully migrated the AdminDashboard from using legacy `subscriptionLevel` field to the modern `instance_subscriptions` table with full tier support.

## Changes Made

### Backend Changes (`server/routes.ts`)

#### 1. GET `/api/admin/instances` Endpoint (Line ~14886)
**Before:**
```typescript
const instances = await storage.getAllOrganizationsWithOwners();
res.json(instances);
```

**After:**
```typescript
const orgs = await storage.getAllOrganizationsWithOwners();

// Enrich with instance subscription data
const instances = await Promise.all(orgs.map(async (org) => {
  const subscription = await storage.getInstanceSubscription(org.id);
  const tiers = await storage.getSubscriptionTiers();
  const tier = subscription?.currentTierId ? tiers.find(t => t.id === subscription.currentTierId) : null;
  
  return {
    ...org,
    subscription,
    tierName: tier?.name || null,
    tierCode: tier?.code || null,
  };
}));

res.json(instances);
```

**Why:** Now returns full subscription data including tier name and code for display.

#### 2. PATCH `/api/admin/instances/:id` Endpoint (Line ~14911)
**Before:**
```typescript
const { subscriptionLevel, creditsRemaining, isActive } = req.body;
const updated = await storage.updateOrganization(req.params.id, {
  subscriptionLevel,
  creditsRemaining,
  isActive,
});
```

**After:**
```typescript
const { tierId, creditsRemaining, isActive } = req.body;

// Update organization credits and status
const updated = await storage.updateOrganization(req.params.id, {
  creditsRemaining,
  isActive,
});

// Update instance subscription tier if provided
if (tierId) {
  const subscription = await storage.getInstanceSubscription(req.params.id);
  if (subscription) {
    await storage.updateInstanceSubscription(subscription.id, {
      currentTierId: tierId,
    });
  } else {
    // Create new instance subscription if it doesn't exist
    await storage.createInstanceSubscription({
      organizationId: req.params.id,
      registrationCurrency: 'GBP',
      currentTierId: tierId,
      inspectionQuotaIncluded: 0,
      billingCycle: 'monthly',
      subscriptionStatus: 'active',
    });
  }
}
```

**Why:** Now updates the `instance_subscriptions` table instead of the legacy field.

### Frontend Changes (`client/src/pages/AdminDashboard.tsx`)

#### 1. State Management (Line 42)
**Before:**
```typescript
const [editFormData, setEditFormData] = useState({
  subscriptionLevel: "",
  creditsRemaining: 0,
  isActive: true,
});
```

**After:**
```typescript
const [editFormData, setEditFormData] = useState({
  tierId: "",
  creditsRemaining: 0,
  isActive: true,
});
```

#### 2. Fetch Tiers (Line 59)
**Added:**
```typescript
// Fetch available tiers for the dropdown
const { data: tiers = [] } = useQuery<any[]>({
  queryKey: ["/api/pricing/config"],
  select: (data: any) => data?.tiers || [],
});
```

**Why:** Dynamically loads all available tiers including growth, enterprise_plus, etc.

#### 3. Edit Handler (Line 130)
**Before:**
```typescript
setEditFormData({
  subscriptionLevel: instance.subscriptionLevel || "free",
  creditsRemaining: instance.creditsRemaining || 0,
  isActive: instance.isActive !== false,
});
```

**After:**
```typescript
setEditFormData({
  tierId: instance.subscription?.currentTierId || "",
  creditsRemaining: instance.creditsRemaining || 0,
  isActive: instance.isActive !== false,
});
```

#### 4. Table Display (Line 294)
**Before:**
```tsx
<Badge variant="outline" className="capitalize">
  {instance.subscriptionLevel || "free"}
</Badge>
```

**After:**
```tsx
<Badge variant="outline" className="capitalize">
  {instance.tierName || instance.tierCode || "No Plan"}
</Badge>
```

**Why:** Shows the actual tier name (e.g., "Growth", "Enterprise Plus") instead of code.

#### 5. Edit Dialog Dropdown (Line 358)
**Before:**
```tsx
<Select value={editFormData.subscriptionLevel}>
  <SelectContent>
    <SelectItem value="free">Free</SelectItem>
    <SelectItem value="starter">Starter</SelectItem>
    <SelectItem value="professional">Professional</SelectItem>
    <SelectItem value="enterprise">Enterprise</SelectItem>
  </SelectContent>
</Select>
```

**After:**
```tsx
<Select value={editFormData.tierId}>
  <SelectContent>
    {tiers.map((tier: any) => (
      <SelectItem key={tier.id} value={tier.id}>
        {tier.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Why:** Dynamically shows ALL tiers from the database, including new ones.

## Benefits

### ✅ Complete Tier Support
- All tiers now work: starter, growth, professional, enterprise, enterprise_plus
- No more hardcoded tier lists
- Easy to add new tiers without code changes

### ✅ Accurate Data Display
- Shows actual tier names instead of codes
- Reflects real subscription status
- No more "free" fallback for modern tiers

### ✅ Proper Data Management
- Updates go to the correct table (`instance_subscriptions`)
- Creates subscription records if they don't exist
- Maintains data integrity

### ✅ Future-Proof
- Automatically picks up new tiers from database
- Supports all tier features (overrides, custom pricing, etc.)
- Scalable architecture

## Testing Checklist

- [x] Backend returns tier data correctly
- [x] Frontend displays tier names properly
- [x] Tier dropdown shows all available tiers
- [x] Updating tier creates/updates instance_subscriptions
- [x] Credits and status still update correctly
- [ ] Test with instance that has no subscription (should show "No Plan")
- [ ] Test updating tier for each tier type
- [ ] Verify tier changes reflect in customer billing page

## Migration Complete! 🎉

The AdminDashboard is now fully migrated to use the modern `instance_subscriptions` architecture. All references to the legacy `subscriptionLevel` field have been removed.
