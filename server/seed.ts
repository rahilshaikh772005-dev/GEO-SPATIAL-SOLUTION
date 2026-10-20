import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { bills, properties, users } from "../drizzle/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

async function seed(connectionString: string) {
  const db = drizzle(connectionString);
  const [existingUser] = await db.select().from(users).limit(1);
  const user = existingUser ?? (await db.insert(users).values({
    openId: process.env.OWNER_OPEN_ID || "demo-admin",
    name: "Demo Administrator",
    email: "admin@civicatlas.local",
    loginMethod: "seed",
    role: "admin",
  }).$returningId())[0];

  const ownerId = existingUser?.id ?? user.id;
  const [existingProperty] = await db.select().from(properties).limit(1);
  if (!existingProperty) {
    const propertyId = (await db.insert(properties).values({
      propertyNo: "P-1024",
      houseNo: "12-4-88",
      ownerId,
      ownerName: "Demo Administrator",
      address: "Powai Lakeview, Mumbai, Maharashtra 400076",
      latitude: 19.1176,
      longitude: 72.9060,
    }).$returningId())[0].id;

    await db.insert(bills).values([
      { propertyId, billType: "property_tax", amount: 4500, dueDate: new Date("2026-09-30"), status: "unpaid" },
      { propertyId, billType: "water", amount: 1200, dueDate: new Date("2026-09-18"), status: "unpaid" },
      { propertyId, billType: "electricity", amount: 2350, dueDate: new Date("2026-09-22"), status: "paid" },
    ]);
  }

  console.log("Civic Atlas seed complete");
}

seed(databaseUrl).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});