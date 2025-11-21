import { db } from "./db";
import { plans, creditBundles } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedEcoAdmin() {
  console.log("🌱 Seeding Eco Admin data...");

  try {
    // Seed Subscription Plans
    console.log("📦 Seeding subscription plans...");
    
    const planData = [
      {
        code: "starter" as const,
        name: "Starter Plan",
        monthlyPriceGbp: 4900, // £49.00
        includedCredits: 50,
        softCap: 5000,
        isCustom: false,
        isActive: true,
      },
      {
        code: "professional" as const,
        name: "Professional Plan",
        monthlyPriceGbp: 14900, // £149.00
        includedCredits: 200,
        softCap: 5000,
        isCustom: false,
        isActive: true,
      },
      {
        code: "enterprise" as const,
        name: "Enterprise Plan",
        monthlyPriceGbp: 34900, // £349.00
        includedCredits: 500,
        softCap: 5000,
        isCustom: false,
        isActive: true,
      },
      {
        code: "enterprise_plus" as const,
        name: "Enterprise+ Plan",
        monthlyPriceGbp: 99900, // £999.00 (custom pricing)
        includedCredits: 2000,
        softCap: 10000,
        isCustom: true,
        isActive: true,
      },
    ];

    for (const plan of planData) {
      // Check if plan exists
      const existing = await db.select().from(plans).where(eq(plans.code, plan.code));
      
      if (existing.length === 0) {
        await db.insert(plans).values(plan);
        console.log(`✅ Created plan: ${plan.name}`);
      } else {
        console.log(`⏭️  Plan already exists: ${plan.name}`);
      }
    }

    // Seed Credit Bundles
    console.log("\n💳 Seeding credit bundles...");
    
    const bundleData = [
      {
        name: "100 Credits Pack",
        credits: 100,
        priceGbp: 40000, // £400 = £4.00 per credit
        priceUsd: 52000, // $520 = $5.20 per credit
        priceAed: 190000, // AED 1,900 = AED 19.00 per credit
        sortOrder: 0,
        isPopular: false,
        discountLabel: null,
        isActive: true,
      },
      {
        name: "250 Credits Pack",
        credits: 250,
        priceGbp: 75000, // £750 = £3.00 per credit
        priceUsd: 97500, // $975 = $3.90 per credit
        priceAed: 360000, // AED 3,600 = AED 14.40 per credit
        sortOrder: 1,
        isPopular: true,
        discountLabel: "Best Value",
        isActive: true,
      },
      {
        name: "500 Credits Pack",
        credits: 500,
        priceGbp: 100000, // £1,000 = £2.00 per credit
        priceUsd: 130000, // $1,300 = $2.60 per credit
        priceAed: 480000, // AED 4,800 = AED 9.60 per credit
        sortOrder: 2,
        isPopular: false,
        discountLabel: "Save 50%",
        isActive: true,
      },
      {
        name: "1000 Credits Pack",
        credits: 1000,
        priceGbp: 150000, // £1,500 = £1.50 per credit
        priceUsd: 195000, // $1,950 = $1.95 per credit
        priceAed: 720000, // AED 7,200 = AED 7.20 per credit
        sortOrder: 3,
        isPopular: false,
        discountLabel: "Enterprise Value",
        isActive: true,
      },
    ];

    for (const bundle of bundleData) {
      // Check if bundle exists by name and credits
      const existing = await db
        .select()
        .from(creditBundles)
        .where(eq(creditBundles.name, bundle.name));
      
      if (existing.length === 0) {
        await db.insert(creditBundles).values(bundle);
        console.log(`✅ Created bundle: ${bundle.name}`);
      } else {
        console.log(`⏭️  Bundle already exists: ${bundle.name}`);
      }
    }

    console.log("\n✨ Eco Admin seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding Eco Admin data:", error);
    throw error;
  }
}

// Run the seed function
seedEcoAdmin()
  .then(() => {
    console.log("🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
