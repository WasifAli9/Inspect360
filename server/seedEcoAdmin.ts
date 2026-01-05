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
    
    const hashedPassword = await hashPassword(adminPassword);
    
    if (existingAdmin.length === 0) {
      await db.insert(adminUsers).values({
        email: adminEmail,
        password: hashedPassword,
        firstName: "Nadeem",
        lastName: "Mohammed",
      });
      console.log(`✅ Created Eco Admin user: ${adminEmail}`);
    } else {
      // Update password to ensure it matches the seed password
      await db
        .update(adminUsers)
        .set({ 
          password: hashedPassword,
          firstName: "Nadeem",
          lastName: "Mohammed",
        })
        .where(eq(adminUsers.email, adminEmail));
      console.log(`✓ Eco Admin user already exists, password updated: ${adminEmail}`);
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
const mainModulePath = process.argv[1] ? resolve(process.argv[1]) : '';
const currentFilePath = resolve(__filename);

// Check if this file is being run directly (not imported)
// Normalize paths for comparison (handle .js vs .ts, and different path separators)
const normalizePath = (path: string) => path.replace(/\\/g, '/').replace(/\.(js|ts)$/, '').toLowerCase();
const isMainModule = mainModulePath && normalizePath(mainModulePath) === normalizePath(currentFilePath);

// Only execute and exit if this file is the main entry point
// When imported by index.ts, this block should NOT execute
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
