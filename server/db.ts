import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bills, InsertProperty, payments, properties, propertyClaims, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && !ENV.databaseUrl) {
    if (ENV.demoMode) return null;
    throw new Error("DATABASE_URL is required unless explicit development demo mode is enabled");
  }
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
        if (!ENV.demoMode) throw error;
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

export async function revokeUserSessions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, userId));
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

export async function searchPropertiesForUser(query: string, userId: number) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;
  return db.select().from(properties).where(and(
    eq(properties.ownerId, userId),
    or(sql`${properties.propertyNo} like ${pattern}`, sql`${properties.houseNo} like ${pattern}`, sql`${properties.ownerName} like ${pattern}`),
  )).limit(50);
}

export async function lookupPublicProperty(propertyNo: string) {
  const db = await getDb();
  if (!db) return null;
  const [property] = await db.select({ propertyNo: properties.propertyNo })
    .from(properties)
    .where(eq(properties.propertyNo, propertyNo))
    .limit(1);
  return property ? { propertyNo: property.propertyNo } : null;
}

export async function getPropertiesInBounds(bounds: { north: number; south: number; east: number; west: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: properties.id, propertyNo: properties.propertyNo, latitude: properties.latitude, longitude: properties.longitude })
    .from(properties)
    .where(and(
      sql`${properties.latitude} between ${bounds.south} and ${bounds.north}`,
      sql`${properties.longitude} between ${bounds.west} and ${bounds.east}`,
    ))
    .limit(500);
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

export async function getAdminProperties() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: properties.id,
    propertyNo: properties.propertyNo,
    houseNo: properties.houseNo,
    ownerName: properties.ownerName,
    address: properties.address,
    latitude: properties.latitude,
    longitude: properties.longitude,
  }).from(properties).orderBy(desc(properties.updatedAt)).limit(500);
}

export async function getAdminBills() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: bills.id,
    propertyId: bills.propertyId,
    propertyNo: properties.propertyNo,
    billType: bills.billType,
    amount: bills.amount,
    dueDate: bills.dueDate,
    status: bills.status,
  })
    .from(bills)
    .innerJoin(properties, eq(bills.propertyId, properties.id))
    .orderBy(desc(bills.dueDate))
    .limit(500);
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
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, id)).limit(1);
  if (!property) return { success: false as const, reason: "NOT_FOUND" as const };
  const [billCount] = await db.select({ count: sql<number>`count(*)` }).from(bills).where(eq(bills.propertyId, id));
  if (Number(billCount?.count ?? 0) > 0) return { success: false as const, reason: "HAS_FINANCIAL_RECORDS" as const };
  await db.delete(properties).where(eq(properties.id, id));
  return { success: true as const };
}

export async function createOwnershipClaim(userId: number, propertyNo: string, claimReason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  return db.transaction(async (tx) => {
    const [property] = await tx.select({ id: properties.id, ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.propertyNo, propertyNo))
      .limit(1)
      .for("update");
    if (!property) return { ok: false as const, reason: "NOT_FOUND" as const };
    if (property.ownerId !== null) return { ok: false as const, reason: "NOT_CLAIMABLE" as const };

    const [existingClaim] = await tx.select({ id: propertyClaims.id })
      .from(propertyClaims)
      .where(and(
        eq(propertyClaims.propertyId, property.id),
        eq(propertyClaims.claimantUserId, userId),
        eq(propertyClaims.status, "pending"),
      ))
      .limit(1);
    if (existingClaim) return { ok: false as const, reason: "ALREADY_PENDING" as const };

    const [inserted] = await tx.insert(propertyClaims).values({ propertyId: property.id, claimantUserId: userId, claimReason });
    return { ok: true as const, claimId: Number(inserted.insertId), status: "pending" as const };
  });
}

export async function listOwnershipClaims() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: propertyClaims.id,
    propertyNo: properties.propertyNo,
    claimantUserId: propertyClaims.claimantUserId,
    claimantName: users.name,
    claimantEmail: users.email,
    claimReason: propertyClaims.claimReason,
    status: propertyClaims.status,
    createdAt: propertyClaims.createdAt,
  })
    .from(propertyClaims)
    .innerJoin(properties, eq(propertyClaims.propertyId, properties.id))
    .innerJoin(users, eq(propertyClaims.claimantUserId, users.id))
    .orderBy(desc(propertyClaims.createdAt));
}

export async function reviewOwnershipClaim(claimId: number, adminId: number, decision: "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  return db.transaction(async (tx) => {
    const [claim] = await tx.select({ id: propertyClaims.id, propertyId: propertyClaims.propertyId, claimantUserId: propertyClaims.claimantUserId, status: propertyClaims.status })
      .from(propertyClaims)
      .where(eq(propertyClaims.id, claimId))
      .limit(1)
      .for("update");
    if (!claim || claim.status !== "pending") return { ok: false as const, reason: "NOT_REVIEWABLE" as const };

    if (decision === "approved") {
      const [property] = await tx.select({ ownerId: properties.ownerId })
        .from(properties)
        .where(eq(properties.id, claim.propertyId))
        .limit(1)
        .for("update");
      if (!property || property.ownerId !== null) return { ok: false as const, reason: "NOT_CLAIMABLE" as const };
      await tx.update(properties).set({ ownerId: claim.claimantUserId }).where(eq(properties.id, claim.propertyId));
    }

    await tx.update(propertyClaims).set({ status: decision, reviewedBy: adminId, reviewedAt: new Date() }).where(eq(propertyClaims.id, claimId));
    return { ok: true as const, status: decision };
  });
}

export async function createBill(bill: typeof bills.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(bills).values(bill);
  return { success: true as const };
}

export async function updateBillStatus(id: number, status: "unpaid" | "overdue") {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.update(bills).set({ status }).where(and(eq(bills.id, id), inArray(bills.status, ["unpaid", "overdue"])));
  return { success: result[0].affectedRows > 0 };
}

export async function initiatePayment(userId: number, billId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  return db.transaction(async (tx) => {
    const [bill] = await tx.select({ id: bills.id, amount: bills.amount, status: bills.status })
      .from(bills)
      .innerJoin(properties, eq(bills.propertyId, properties.id))
      .where(and(eq(bills.id, billId), eq(properties.ownerId, userId)))
      .limit(1)
      .for("update");
    if (!bill) return { ok: false as const, reason: "NOT_FOUND" as const };
    if (bill.status === "paid") return { ok: false as const, reason: "NOT_PAYABLE" as const };

    const [existingIntent] = await tx.select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.billId, billId), eq(payments.status, "pending")))
      .limit(1);
    if (existingIntent) return { ok: false as const, reason: "ALREADY_PENDING" as const };

    const reference = `PAY-${randomUUID()}`;
    await tx.insert(payments).values({ userId, billId, amount: bill.amount, reference, status: "pending" });
    return { ok: true as const, reference, status: "pending" as const, amount: bill.amount };
  });
}

export async function attachProviderOrder(reference: string, providerOrderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.update(payments)
    .set({ providerOrderId })
    .where(and(eq(payments.reference, reference), eq(payments.status, "pending")));
  if (result[0].affectedRows !== 1) {
    throw new Error("Pending payment request could not be attached to the provider order");
  }
}

export async function markPaymentFailed(reference: string, providerPaymentId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(payments)
    .set({ status: "failed", ...(providerPaymentId ? { providerPaymentId } : {}) })
    .where(and(eq(payments.reference, reference), eq(payments.status, "pending")));
}

export async function getPaymentForUser(reference: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const [payment] = await db.select({
    reference: payments.reference,
    amount: payments.amount,
    status: payments.status,
    providerOrderId: payments.providerOrderId,
    providerPaymentId: payments.providerPaymentId,
    billType: bills.billType,
  })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .innerJoin(properties, eq(bills.propertyId, properties.id))
    .where(and(eq(payments.reference, reference), eq(payments.userId, userId), eq(properties.ownerId, userId)))
    .limit(1);
  return payment ?? null;
}

export async function getPendingPaymentForUser(billId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const [payment] = await db.select({
    reference: payments.reference,
    amount: payments.amount,
    providerOrderId: payments.providerOrderId,
  })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .innerJoin(properties, eq(bills.propertyId, properties.id))
    .where(and(
      eq(payments.billId, billId),
      eq(payments.userId, userId),
      eq(properties.ownerId, userId),
      eq(payments.status, "pending"),
    ))
    .limit(1);
  return payment ?? null;
}

export async function getPaymentForProviderOrder(providerOrderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const [payment] = await db.select({
    reference: payments.reference,
    amount: payments.amount,
    status: payments.status,
    providerPaymentId: payments.providerPaymentId,
  })
    .from(payments)
    .where(eq(payments.providerOrderId, providerOrderId))
    .limit(1);
  return payment ?? null;
}

export async function getPaymentReceipt(reference: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const [receipt] = await db.select({
    reference: payments.reference,
    providerPaymentId: payments.providerPaymentId,
    amount: payments.amount,
    paidAt: payments.paidAt,
    paymentStatus: payments.status,
    billType: bills.billType,
    propertyNo: properties.propertyNo,
    houseNo: properties.houseNo,
    address: properties.address,
    citizenName: users.name,
    citizenEmail: users.email,
  })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .innerJoin(bills, eq(payments.billId, bills.id))
    .innerJoin(properties, eq(bills.propertyId, properties.id))
    .where(and(
      eq(payments.reference, reference),
      eq(payments.userId, userId),
      eq(properties.ownerId, userId),
      eq(payments.status, "success"),
    ))
    .limit(1);
  return receipt ?? null;
}

// Call only after verifying the provider signature and captured payment details.
export async function confirmPaymentFromProvider(reference: string, providerPaymentId: string, confirmedAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  return db.transaction(async (tx) => {
    const [payment] = await tx.select({ id: payments.id, billId: payments.billId, amount: payments.amount, status: payments.status, providerPaymentId: payments.providerPaymentId, reference: payments.reference, billStatus: bills.status })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .where(eq(payments.reference, reference))
      .limit(1)
      .for("update");
    if (!payment) return { ok: false as const, reason: "NOT_FOUND" as const };
    if (payment.status === "success") {
      return payment.providerPaymentId === providerPaymentId && confirmedAmount === payment.amount
        ? { ok: true as const, status: "success" as const }
        : { ok: false as const, reason: "PAYMENT_MISMATCH" as const };
    }
    if (payment.status !== "pending" || payment.billStatus === "paid") return { ok: false as const, reason: "NOT_PAYABLE" as const };
    if (confirmedAmount !== payment.amount) return { ok: false as const, reason: "AMOUNT_MISMATCH" as const };

    await tx.update(payments).set({ status: "success", providerPaymentId, paidAt: new Date() }).where(eq(payments.id, payment.id));
    await tx.update(bills).set({
      status: "paid",
      receiptUrl: `/receipt/${encodeURIComponent(payment.reference)}`,
    }).where(eq(bills.id, payment.billId));
    return { ok: true as const, status: "success" as const };
  });
}

export async function getAdminSummary() {
  const db = await getDb();
  if (!db) return { citizens: 0, properties: 0, totalRevenue: 0, outstanding: 0 };
  const [citizenCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "user"));
  const [propertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(eq(payments.status, "success"));
  const [outstanding] = await db.select({ total: sql<number>`coalesce(sum(${bills.amount}), 0)` }).from(bills).where(inArray(bills.status, ["unpaid", "overdue", "partially_paid"]));
  return { citizens: Number(citizenCount?.count ?? 0), properties: Number(propertyCount?.count ?? 0), totalRevenue: Number(revenue?.total ?? 0), outstanding: Number(outstanding?.total ?? 0) };
}

export async function checkDatabaseConnection() {
  const db = await getDb();
  if (!db) return false;
  await db.execute(sql`select 1`);
  return true;
}
