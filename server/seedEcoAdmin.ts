import "dotenv/config";
import { db } from "./db";
import { plans, creditBundles, bundleTierPricing } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedEcoAdmin() {
  console.log("🌱 Seeding Eco Admin data...");

  try {
    // Seed NEW Subscription Plans (per specification)
    console.log("📦 Seeding subscription plans...");
    
    const planData = [
      {
        code: "freelancer" as const,
        name: "Freelancer",
        monthlyPriceGbp: 7900, // £79/mo
        annualPriceGbp: 94800, // £948/yr
        monthlyPriceUsd: 9900, // $99/mo
        annualPriceUsd: 118800, // $1,188/yr
        monthlyPriceAed: 36500, // 365 AED/mo
        annualPriceAed: 438000, // 4,380 AED/yr
        includedInspections: 10,
        includedCredits: 10, // Backward compatibility
        topupPricePerInspectionGbp: 600, // £6 per inspection
        topupPricePerInspectionUsd: 760,
        topupPricePerInspectionAed: 2800,
        softCap: 1000,
        isCustom: false,
        isActive: true,
        sortOrder: 0,
      },
      {
        code: "btr" as const,
        name: "BTR / Lettings",
        monthlyPriceGbp: 34900, // £349/mo
        annualPriceGbp: 418800, // £4,188/yr
        monthlyPriceUsd: 44900, // $449/mo
        annualPriceUsd: 538800, // $5,388/yr
        monthlyPriceAed: 165000, // 1,650 AED/mo
        annualPriceAed: 1980000, // 19,800 AED/yr
        includedInspections: 50,
        includedCredits: 50,
        topupPricePerInspectionGbp: 500, // £5 per inspection
        topupPricePerInspectionUsd: 640,
        topupPricePerInspectionAed: 2350,
        softCap: 5000,
        isCustom: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        code: "pbsa" as const,
        name: "PBSA",
        monthlyPriceGbp: 125000, // £1,250/mo
        annualPriceGbp: 1500000, // £15,000/yr
        monthlyPriceUsd: 159000, // $1,590/mo
        annualPriceUsd: 1908000, // $19,080/yr
        monthlyPriceAed: 595000, // 5,950 AED/mo
        annualPriceAed: 7140000, // 71,400 AED/yr
        includedInspections: 250,
        includedCredits: 250,
        topupPricePerInspectionGbp: 400, // £4 per inspection
        topupPricePerInspectionUsd: 510,
        topupPricePerInspectionAed: 1900,
        softCap: 10000,
        isCustom: false,
        isActive: true,
        sortOrder: 2,
      },
      {
        code: "housing_association" as const,
        name: "Housing Association",
        monthlyPriceGbp: 350000, // £3,500/mo
        annualPriceGbp: 4200000, // £42,000/yr
        monthlyPriceUsd: 445000, // $4,450/mo
        annualPriceUsd: 5340000, // $53,400/yr
        monthlyPriceAed: 1650000, // 16,500 AED/mo
        annualPriceAed: 19800000, // 198,000 AED/yr
        includedInspections: 833, // ~10,000/yr
        includedCredits: 833,
        topupPricePerInspectionGbp: 300, // £3 per inspection
        topupPricePerInspectionUsd: 380,
        topupPricePerInspectionAed: 1400,
        softCap: 20000,
        isCustom: false,
        isActive: true,
        sortOrder: 3,
      },
      {
        code: "council" as const,
        name: "Council / Enterprise",
        monthlyPriceGbp: 625000, // £6,250/mo
        annualPriceGbp: 7500000, // £75,000/yr
        monthlyPriceUsd: 799000, // $7,990/mo
        annualPriceUsd: 9588000, // $95,880/yr
        monthlyPriceAed: 2950000, // 29,500 AED/mo
        annualPriceAed: 35400000, // 354,000 AED/yr
        includedInspections: 2083, // ~25,000/yr
        includedCredits: 2083,
        topupPricePerInspectionGbp: 200, // £2 per inspection
        topupPricePerInspectionUsd: 260,
        topupPricePerInspectionAed: 950,
        softCap: 50000,
        isCustom: false,
        isActive: true,
        sortOrder: 4,
      },
    ];

    for (const plan of planData) {
      const existing = await db.select().from(plans).where(eq(plans.code, plan.code));
      
      if (existing.length === 0) {
        await db.insert(plans).values(plan);
        console.log(`✅ Created plan: ${plan.name}`);
      } else {
        const [existingPlan] = existing;
        await db.update(plans)
          .set(plan)
          .where(eq(plans.id, existingPlan.id));
        console.log(`✅ Updated plan: ${plan.name}`);
      }
    }

    // Seed Credit Bundles (100, 500, 1000 inspections)
    console.log("\n💳 Seeding inspection bundles...");
    
    const bundleData = [
      {
        name: "100 Inspections Bundle",
        credits: 100,
        priceGbp: 55000, // £550 (Freelancer tier base price)
        priceUsd: 69000, // $690
        priceAed: 255000, // 2,550 AED
        sortOrder: 0,
        isPopular: false,
        discountLabel: null,
        isActive: true,
      },
      {
        name: "500 Inspections Bundle",
        credits: 500,
        priceGbp: 265000, // £2,650 (Freelancer tier base price)
        priceUsd: 335000, // $3,350
        priceAed: 1225000, // 12,250 AED
        sortOrder: 1,
        isPopular: true,
        discountLabel: "Popular",
        isActive: true,
      },
      {
        name: "1000 Inspections Bundle",
        credits: 1000,
        priceGbp: 500000, // £5,000 (Freelancer tier base price)
        priceUsd: 635000, // $6,350
        priceAed: 2300000, // 23,000 AED
        sortOrder: 2,
        isPopular: false,
        discountLabel: "Best Value",
        isActive: true,
      },
    ];

    const createdBundles: Array<{ id: string; credits: number }> = [];

    for (const bundle of bundleData) {
      const existing = await db
        .select()
        .from(creditBundles)
        .where(eq(creditBundles.credits, bundle.credits));
      
      if (existing.length === 0) {
        const [created] = await db.insert(creditBundles).values(bundle).returning();
        console.log(`✅ Created bundle: ${bundle.name}`);
        createdBundles.push({ id: created.id, credits: bundle.credits });
      } else {
        await db.update(creditBundles)
          .set(bundle)
          .where(eq(creditBundles.id, existing[0].id));
        console.log(`✅ Updated bundle: ${bundle.name}`);
        createdBundles.push({ id: existing[0].id, credits: bundle.credits });
      }
    }

    // Seed tier-based pricing for each bundle
    console.log("\n💰 Seeding tier-based bundle pricing...");
    
    const tierPricing = {
      100: {
        freelancer: { gbp: 55000, usd: 69000, aed: 255000 },
        btr: { gbp: 45000, usd: 59000, aed: 210000 },
        pbsa: { gbp: 36000, usd: 47000, aed: 170000 },
        housing_association: { gbp: 27000, usd: 35000, aed: 125000 },
        council: { gbp: 18000, usd: 24000, aed: 85000 },
      },
      500: {
        freelancer: { gbp: 265000, usd: 335000, aed: 1225000 },
        btr: { gbp: 215000, usd: 275000, aed: 995000 },
        pbsa: { gbp: 170000, usd: 215000, aed: 785000 },
        housing_association: { gbp: 125000, usd: 159000, aed: 575000 },
        council: { gbp: 85000, usd: 110000, aed: 395000 },
      },
      1000: {
        freelancer: { gbp: 500000, usd: 635000, aed: 2300000 },
        btr: { gbp: 400000, usd: 510000, aed: 1840000 },
        pbsa: { gbp: 310000, usd: 395000, aed: 1425000 },
        housing_association: { gbp: 225000, usd: 285000, aed: 1035000 },
        council: { gbp: 150000, usd: 190000, aed: 690000 },
      },
    };

    for (const bundle of createdBundles) {
      const bundleCredits = bundle.credits as 100 | 500 | 1000;
      const pricing = tierPricing[bundleCredits];
      
      if (pricing) {
        for (const [planCode, prices] of Object.entries(pricing)) {
          const existing = await db
            .select()
            .from(bundleTierPricing)
            .where(eq(bundleTierPricing.bundleId, bundle.id));
          
          const existingForPlan = existing.find(e => e.planCode === planCode);
          
          if (!existingForPlan) {
            await db.insert(bundleTierPricing).values({
              bundleId: bundle.id,
              planCode: planCode as any,
              priceGbp: prices.gbp,
              priceUsd: prices.usd,
              priceAed: prices.aed,
            });
            console.log(`✅ Created tier pricing: ${bundleCredits} bundle for ${planCode}`);
          } else {
            await db.update(bundleTierPricing)
              .set({
                priceGbp: prices.gbp,
                priceUsd: prices.usd,
                priceAed: prices.aed,
              })
              .where(eq(bundleTierPricing.id, existingForPlan.id));
            console.log(`✅ Updated tier pricing: ${bundleCredits} bundle for ${planCode}`);
          }
        }
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
