import "dotenv/config";
import { db } from "../db";
import { marketplaceModules, modulePricing, moduleBundlesTable, bundleModulesJunction, bundlePricingTable, currencyConfig } from "@shared/schema";
import { eq, notInArray } from "drizzle-orm";

const REQUIRED_MODULES = [
    {
        key: "white_label",
        name: "White Labelling",
        description: "Custom branding, domain, and reports",
        iconName: "palette",
        displayOrder: 1,
        priceMonthly: 23900,
        priceAnnual: 23900 * 10, // Assuming 2 months free or similar, but let's stick to prompt or std multiplier. Prompt didn't specify annual exact, but usually 10x or 12x. "annual_price" in prompt. I'll use 10x for now as a safe default or 12x if no discount. Wait, prompt says "annual_price". I will use 10x (2 months free) which is common, or just 12x. Inspect360 tiers use ~10x (4900 -> 49000). So 10x.
    },
    {
        key: "tenant_portal",
        name: "Tenant Portal",
        description: "Self-service portal for up to 500 tenants",
        iconName: "users",
        displayOrder: 2,
        priceMonthly: 11900,
        priceAnnual: 119000,
    },
    {
        key: "maintenance",
        name: "Maintenance & Work Orders",
        description: "Track and manage repairs and contractors",
        iconName: "tool",
        displayOrder: 3,
        priceMonthly: 19900,
        priceAnnual: 199000,
    },
    {
        key: "ai_preventative",
        name: "AI Preventative Maintenance",
        description: "Predict maintenance needs with AI",
        iconName: "cpu",
        displayOrder: 4,
        priceMonthly: 31900,
        priceAnnual: 319000,
    },
    {
        key: "dispute_resolution",
        name: "Dispute Resolution Portal",
        description: "Manage deposit disputes with evidence",
        iconName: "shield",
        displayOrder: 5,
        priceMonthly: 15900,
        priceAnnual: 159000,
    }
];

const BUNDLE = {
    name: "Essential Bundle",
    description: "Includes: Tenant Portal + Maintenance",
    discountPercentage: "12.00", // "Save £39" on (119+199)=318. 318-39=279. 279/318 = 0.877 -> ~12.2% discount. Prompt says "Save £39" and price is £279.
    priceMonthly: 27900,
    priceAnnual: 279000,
    savingsMonthly: 3900,
    modules: ["tenant_portal", "maintenance"]
};

async function seed() {
    console.log("Seeding Marketplace (STRICT)...");

    try {
        // 0. Clean up everything first to ensure a clean state
        console.log("Cleaning up existing marketplace data...");
        // Define these locally if they aren't imported, but they should be in schema
        const { instanceModules, instanceBundles } = await import("@shared/schema");

        await db.delete(instanceModules);
        await db.delete(instanceBundles);
        await db.delete(bundleModulesJunction);
        await db.delete(bundlePricingTable);
        await db.delete(modulePricing);
        await db.delete(moduleBundlesTable);
        await db.delete(marketplaceModules);

        // 1. Ensure GBP currency exists
        await db.insert(currencyConfig)
            .values({
                code: "GBP",
                symbol: "£",
                isActive: true,
                conversionRate: "1.0000"
            })
            .onConflictDoNothing();

        // 2. Insert Required Modules
        const modulesMap = new Map<string, string>(); // key -> id

        for (const mod of REQUIRED_MODULES) {
            console.log(`Inserting module: ${mod.name}...`);
            const [inserted] = await db.insert(marketplaceModules).values({
                name: mod.name,
                moduleKey: mod.key,
                description: mod.description,
                iconName: mod.iconName,
                displayOrder: mod.displayOrder,
                isAvailableGlobally: true,
                defaultEnabled: false
            }).returning();

            modulesMap.set(mod.key, inserted.id);

            // Insert Pricing for GBP
            await db.insert(modulePricing).values({
                moduleId: inserted.id,
                currencyCode: "GBP",
                priceMonthly: mod.priceMonthly,
                priceAnnual: mod.priceAnnual
            });
        }

        // 3. Setup Essential Bundle
        console.log("Inserting Essential Bundle...");
        const [bundle] = await db.insert(moduleBundlesTable).values({
            name: BUNDLE.name,
            description: BUNDLE.description,
            discountPercentage: BUNDLE.discountPercentage,
            isActive: true
        }).returning();

        // Bundle Pricing
        await db.insert(bundlePricingTable).values({
            bundleId: bundle.id,
            currencyCode: "GBP",
            priceMonthly: BUNDLE.priceMonthly,
            priceAnnual: BUNDLE.priceAnnual,
            savingsMonthly: BUNDLE.savingsMonthly
        });

        // Bundle Modules Junction
        for (const key of BUNDLE.modules) {
            const mid = modulesMap.get(key);
            if (mid) {
                await db.insert(bundleModulesJunction).values({
                    bundleId: bundle.id,
                    moduleId: mid
                });
            }
        }

        console.log("Marketplace seeding complete (STRICT). Only 5 modules and 1 bundle remain.");
    } catch (err) {
        console.error("Error during strict seeding:", err);
        throw err;
    }
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
