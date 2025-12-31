
import "dotenv/config";
import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Fixing schema...");

    try {
        // 1. module_bundles
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS module_bundles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        discount_percentage NUMERIC(5, 2),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("Checked module_bundles");

        // 3. bundle_modules_junction
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bundle_modules_junction (
        bundle_id VARCHAR NOT NULL REFERENCES module_bundles(id),
        module_id VARCHAR NOT NULL REFERENCES marketplace_modules(id),
        PRIMARY KEY (bundle_id, module_id)
      );
    `);
        console.log("Checked bundle_modules_junction");

        // 4. bundle_pricing
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bundle_pricing (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        bundle_id VARCHAR NOT NULL REFERENCES module_bundles(id),
        currency_code VARCHAR(3) NOT NULL REFERENCES currency_config(code),
        price_monthly INTEGER NOT NULL,
        price_annual INTEGER NOT NULL,
        savings_monthly INTEGER,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("Checked bundle_pricing");

        // 5. instance_bundles
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS instance_bundles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id VARCHAR NOT NULL REFERENCES instance_subscriptions(id),
        bundle_id VARCHAR NOT NULL REFERENCES module_bundles(id),
        purchase_date TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
        console.log("Checked instance_bundles");

        // Add columns if they are missing (in case table existed but was old version)
        try {
            await db.execute(sql`ALTER TABLE instance_bundles ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP DEFAULT NOW()`);
            console.log("Ensured purchase_date column exists");
        } catch (e) { console.log("Note: " + e); }

    } catch (error) {
        console.error("Schema fix failed:", error);
    }

    console.log("Done.");
    process.exit(0);
}

main();
