# Inspect360 - Stripe Subscription Setup Guide

## Overview

This guide details how to set up Stripe payment processing for the Inspect360 subscription system.

---

## Subscription Tiers

### Plan Configuration

| Plan Code | Display Name | Monthly (GBP) | Annual (GBP) | Inspections/Year | Top-up Rate |
|-----------|--------------|---------------|--------------|------------------|-------------|
| `freelancer` | Freelancer | £9 | £99 | 120 (10/mo) | £7.00/credit |
| `btr` | BTR / Lettings | £29 | £299 | 600 (50/mo) | £7.00/credit |
| `pbsa` | PBSA | £99 | £999 | 3,000 (250/mo) | £6.00/credit |
| `housing_association` | Housing Association | £299 | £2,999 | 10,000 (833/mo) | £6.00/credit |
| `council` | Council / Enterprise | £499 | £4,999 | 25,000 (2083/mo) | £6.00/credit |

### Multi-Currency Support

All plans are available in:
- **GBP** (British Pounds) - Default
- **USD** (US Dollars) - ~1.27x GBP
- **AED** (UAE Dirhams) - ~4.65x GBP

---

## Stripe Dashboard Setup

### Step 1: Create Products

Go to **Stripe Dashboard** → **Products** → **Add Product**

For each plan, create a product:

1. **Freelancer Plan**
   - Name: `Inspect360 Freelancer`
   - Description: `120 AI-powered inspections per year, all features included`
   - Create 6 prices:
     - Monthly GBP: £9/month (recurring)
     - Annual GBP: £99/year (recurring)
     - Monthly USD: $11/month (recurring)
     - Annual USD: $125/year (recurring)
     - Monthly AED: AED 42/month (recurring)
     - Annual AED: AED 460/year (recurring)

2. **BTR / Lettings Plan**
   - Name: `Inspect360 BTR / Lettings`
   - Description: `600 AI-powered inspections per year, all features included`
   - Create 6 prices (monthly/annual for each currency)

3. **PBSA Plan**
   - Name: `Inspect360 PBSA`
   - Description: `3,000 AI-powered inspections per year, all features included`

4. **Housing Association Plan**
   - Name: `Inspect360 Housing Association`
   - Description: `10,000 AI-powered inspections per year, all features included`

5. **Council / Enterprise Plan**
   - Name: `Inspect360 Council / Enterprise`
   - Description: `25,000 AI-powered inspections per year, all features included`

### Step 2: Record Price IDs

After creating each price, record the Price ID (starts with `price_`):

```
Freelancer:
  - stripe_price_id_monthly_gbp: price_xxxxxxxx
  - stripe_price_id_annual_gbp: price_xxxxxxxx
  - stripe_price_id_monthly_usd: price_xxxxxxxx
  - stripe_price_id_annual_usd: price_xxxxxxxx
  - stripe_price_id_monthly_aed: price_xxxxxxxx
  - stripe_price_id_annual_aed: price_xxxxxxxx

BTR:
  - ... (repeat for all plans)
```

### Step 3: Update Database

Update the `plans` table with the Stripe Price IDs:

```sql
UPDATE plans SET 
  stripe_price_id_monthly_gbp = 'price_xxx',
  stripe_price_id_annual_gbp = 'price_xxx',
  stripe_price_id_monthly_usd = 'price_xxx',
  stripe_price_id_annual_usd = 'price_xxx',
  stripe_price_id_monthly_aed = 'price_xxx',
  stripe_price_id_annual_aed = 'price_xxx'
WHERE code = 'freelancer';

-- Repeat for other plans
```

---

## Credit Bundle Setup (Top-Up Purchases)

### Bundle Configuration

| Credits | Freelancer/BTR Price | PBSA+ Price | Discount |
|---------|---------------------|-------------|----------|
| 100 | £700 (£7.00/credit) | £600 (£6.00/credit) | - |
| 500 | £3,325 (£6.65/credit) | £2,850 (£5.70/credit) | ~5% |
| 1000 | £6,500 (£6.50/credit) | £5,500 (£5.50/credit) | ~7-8% |

### Create Bundle Products

For each bundle size, create a Stripe product with tier-based pricing:

1. **100 Inspections Bundle**
   - Create price: £700 (one-time) for Freelancer/BTR
   - Create price: £600 (one-time) for PBSA+

2. **500 Inspections Bundle**
   - Create price: £3,325 (one-time) for Freelancer/BTR
   - Create price: £2,850 (one-time) for PBSA+

3. **1000 Inspections Bundle**
   - Create price: £6,500 (one-time) for Freelancer/BTR
   - Create price: £5,500 (one-time) for PBSA+

---

## Webhook Configuration

### Step 1: Create Webhook Endpoint

Go to **Developers** → **Webhooks** → **Add endpoint**

- **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
- **API version**: Latest
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

### Step 2: Copy Webhook Secret

After creating the webhook, click on it and copy the **Signing secret** (starts with `whsec_`).

Set this as the `STRIPE_WEBHOOK_SECRET` environment variable.

### Step 3: Test Webhook

Use Stripe CLI to test locally:

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

---

## API Key Security

### Best Practices

1. **Never expose the Secret Key** in client-side code
2. **Use restricted keys** in production with only required permissions
3. **Rotate keys** periodically (quarterly recommended)
4. **Monitor usage** in Stripe Dashboard → Developers → Logs

### Required Permissions for Restricted Key

If using a restricted API key, ensure these permissions:
- Checkout Sessions: Write
- Customers: Write
- Subscriptions: Write
- Invoices: Read
- Prices: Read
- Products: Read
- Webhook Endpoints: Read

---

## Customer Portal

### Enable Customer Portal

Go to **Settings** → **Billing** → **Customer portal**

Configure:
- **Subscription management**: Allow customers to update subscriptions
- **Payment method management**: Allow customers to update payment methods
- **Invoice history**: Show invoice history
- **Cancellation**: Allow with optional feedback

### Portal URL

The application redirects to Stripe's hosted portal at:
`https://billing.stripe.com/p/session/...`

---

## Tax Configuration (Optional)

If you need to collect VAT/GST:

1. Go to **Settings** → **Tax**
2. Enable Stripe Tax
3. Configure tax registration numbers
4. Set up tax rates for different regions

---

## Testing

### Test Mode

Before going live, test thoroughly in Test mode:

1. Use test API keys (start with `sk_test_` and `pk_test_`)
2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires authentication: `4000 0025 0000 3155`

### Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
```

---

## Go-Live Checklist

- [ ] Products created in live mode
- [ ] Price IDs updated in database
- [ ] Live API keys configured
- [ ] Webhook endpoint created and verified
- [ ] Webhook secret configured
- [ ] Customer portal enabled
- [ ] Test transaction completed successfully
- [ ] Cancellation flow tested
- [ ] Upgrade/downgrade flow tested
- [ ] Invoice emails configured
- [ ] Tax settings configured (if applicable)

---

## Troubleshooting

### Common Issues

1. **Webhook signature verification failed**
   - Ensure `STRIPE_WEBHOOK_SECRET` is correct
   - Check that you're using the raw request body for verification

2. **Subscription not activating**
   - Check webhook logs in Stripe Dashboard
   - Verify `checkout.session.completed` event is being received

3. **Credits not being added**
   - Check application logs for errors
   - Verify the subscription metadata includes plan details

### Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

---

*Last Updated: December 2025*
