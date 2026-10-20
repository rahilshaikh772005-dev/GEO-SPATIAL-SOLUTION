import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bills, InsertProperty, payments, properties, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listPropertiesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(properties).where(eq(properties.ownerId, userId)).orderBy(desc(properties.updatedAt));
}

export async function searchProperties(query: string) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;
  return db.select().from(properties).where(or(sql`${properties.propertyNo} like ${pattern}`, sql`${properties.houseNo} like ${pattern}`, sql`${properties.ownerName} like ${pattern}`)).limit(50);
}

export async function getBillsForProperties(propertyIds: number[]) {
  const db = await getDb();
  if (!db || propertyIds.length === 0) return [];
  return db.select().from(bills).where(inArray(bills.propertyId, propertyIds)).orderBy(desc(bills.dueDate));
}

export async function getPaymentHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.paidAt));
}

export async function createProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(properties).values(property);
  const created = await db.select().from(properties).where(eq(properties.propertyNo, property.propertyNo)).limit(1);
  return created[0];
}

export async function updateProperty(id: number, changes: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(properties).set(changes).where(eq(properties.id, id));
  const updated = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return updated[0];
}

export async function deleteProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.delete(properties).where(eq(properties.id, id));
  return { success: true as const };
}

export async function createBill(bill: typeof bills.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(bills).values(bill);
  return { success: true as const };
}

export async function updateBillStatus(id: number, status: "unpaid" | "paid" | "partially_paid" | "overdue") {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(bills).set({ status }).where(eq(bills.id, id));
  return { success: true as const };
}

export async function createPayment(userId: number, billId: number, amount: number, reference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(payments).values({ userId, billId, amount, reference, status: "success" });
  await db.update(bills).set({ status: "paid" }).where(eq(bills.id, billId));
  return { reference, status: "success" as const };
}

export async function getAdminSummary() {
  const db = await getDb();
  if (!db) return { citizens: 0, properties: 0, totalRevenue: 0, outstanding: 0, mapProperties: [] };
  const [citizenCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "user"));
  const [propertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(eq(payments.status, "success"));
  const [outstanding] = await db.select({ total: sql<number>`coalesce(sum(${bills.amount}), 0)` }).from(bills).where(inArray(bills.status, ["unpaid", "overdue", "partially_paid"]));
  const mapProperties = await db.select().from(properties).limit(100);
  return { citizens: Number(citizenCount?.count ?? 0), properties: Number(propertyCount?.count ?? 0), totalRevenue: Number(revenue?.total ?? 0), outstanding: Number(outstanding?.total ?? 0), mapProperties };
}
