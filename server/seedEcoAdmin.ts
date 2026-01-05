import "dotenv/config";
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { db } from "./db";
import { adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

/**
 * Seeds only the Eco Admin user on startup.
 * Does NOT seed currencies or subscription plans.
 */
async function seedEcoAdmin() {
  console.log("🌱 Seeding Eco Admin user (no currency or plans)...");

  try {
    // Seed Eco Admin User only
    const adminEmail = "nadeem.mohammed@deffinity.com";
    const adminPassword = "Nadeem123#!";
    
    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, adminEmail))
      .limit(1);
    
    if (existingAdmin.length === 0) {
      const hashedPassword = await hashPassword(adminPassword);
      await db.insert(adminUsers).values({
        email: adminEmail,
        password: hashedPassword,
        firstName: "Nadeem",
        lastName: "Mohammed",
      });
      console.log(`✅ Created Eco Admin user: ${adminEmail}`);
    } else {
      console.log(`✓ Eco Admin user already exists: ${adminEmail}`);
    }

    console.log("✨ Eco Admin user seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding Eco Admin user:", error);
    throw error;
  }
}

// Export the function so it can be called from server startup
export { seedEcoAdmin };

// If run directly (not imported), execute and exit
// This check ensures the file only runs when executed directly via npm run seed:plans
// and NOT when imported by index.ts
// Note: This script only seeds the admin user, not currencies or plans
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);

if (isMainModule) {
  seedEcoAdmin()
    .then(() => {
      console.log("🎉 Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}
