import "dotenv/config";
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
        annualPriceGbp: 52920, // £529.20 (10% discount: £49 * 12 * 0.9)
        includedCredits: 50,
        softCap: 5000,
        isCustom: false,
        isActive: true,
      },
      {
        code: "professional" as const,
        name: "Professional Plan",
        monthlyPriceGbp: 14900, // £149.00
        annualPriceGbp: 160920, // £1,609.20 (10% discount: £149 * 12 * 0.9)
        includedCredits: 200,
        softCap: 5000,
        isCustom: false,
        isActive: true,
      },
      {
        code: "enterprise" as const,
        name: "Enterprise Plan",
        monthlyPriceGbp: 34900, // £349.00
        annualPriceGbp: 376920, // £3,769.20 (10% discount: £349 * 12 * 0.9)
        includedCredits: 500,
        softCap: 5000,
        isCustom: false,
        isActive: true,
      },
      {
        code: "enterprise_plus" as const,
        name: "Enterprise+ Plan",
        monthlyPriceGbp: 99900, // £999.00 (custom pricing)
        annualPriceGbp: null, // No annual pricing for custom plans
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
        // Always update existing plan to ensure it matches seed data
        const [existingPlan] = existing;
        const updates: any = {};
        
        // Always update annual price if seed data has it (for non-custom plans)
        if (plan.annualPriceGbp !== null && existingPlan.annualPriceGbp !== plan.annualPriceGbp) {
          updates.annualPriceGbp = plan.annualPriceGbp;
        } else if (plan.annualPriceGbp === null && existingPlan.annualPriceGbp !== null) {
          // If seed data says null (for custom plans), ensure it's null
          updates.annualPriceGbp = null;
        }
        
        // Also ensure other fields are up to date
        if (existingPlan.monthlyPriceGbp !== plan.monthlyPriceGbp) {
          updates.monthlyPriceGbp = plan.monthlyPriceGbp;
        }
        if (existingPlan.includedCredits !== plan.includedCredits) {
          updates.includedCredits = plan.includedCredits;
        }
        if (existingPlan.isActive !== plan.isActive) {
          updates.isActive = plan.isActive;
        }
        
        if (Object.keys(updates).length > 0) {
          await db.update(plans)
            .set(updates)
            .where(eq(plans.id, existingPlan.id));
          console.log(`✅ Updated plan: ${plan.name} - Updated: ${Object.keys(updates).join(', ')}`);
        } else {
          console.log(`⏭️  Plan already exists and matches seed data: ${plan.name}`);
        }
      }
    }

    // Seed Credit Bundles (optional - skip if table doesn't exist)
    try {
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
    } catch (bundleError: any) {
      // Credit bundles table might not exist yet - that's okay
      if (bundleError.code === '42P01') {
        console.log(`⏭️  Credit bundles table doesn't exist yet - skipping bundle seeding`);
      } else {
        throw bundleError; // Re-throw if it's a different error
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
