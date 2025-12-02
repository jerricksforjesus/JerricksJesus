import bcrypt from "bcrypt";
import { db } from "./db";
import { users, USER_ROLES } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const adminUsername = "admin";
  const adminPassword = "Jfoundation@1";

  console.log("Checking for existing admin user...");
  
  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.username, adminUsername),
  });

  if (existingAdmin) {
    console.log("Admin user already exists. Updating password...");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await db.update(users)
      .set({ password: hashedPassword, role: USER_ROLES.ADMIN })
      .where(eq(users.username, adminUsername));
    console.log("Admin password updated successfully!");
  } else {
    console.log("Creating admin user...");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      username: adminUsername,
      password: hashedPassword,
      role: USER_ROLES.ADMIN,
    });
    console.log("Admin user created successfully!");
  }

  console.log("\nAdmin credentials:");
  console.log("  Username: admin");
  console.log("  Password: Jfoundation@1");
  
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error("Error seeding admin:", error);
  process.exit(1);
});
