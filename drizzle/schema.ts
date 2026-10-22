import { double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  sessionVersion: int("sessionVersion").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  propertyNo: varchar("propertyNo", { length: 32 }).notNull().unique(),
  houseNo: varchar("houseNo", { length: 128 }).notNull(),
  ownerId: int("ownerId").references(() => users.id, { onDelete: "set null" }),
  ownerName: varchar("ownerName", { length: 160 }).notNull(),
  address: text("address").notNull(),
  latitude: double("latitude").notNull(),
  longitude: double("longitude").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const propertyClaims = mysqlTable("propertyClaims", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "restrict" }),
  claimantUserId: int("claimantUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimReason: text("claimReason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bills = mysqlTable("bills", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
  billType: mysqlEnum("billType", ["property_tax", "water", "electricity"]).notNull(),
  amount: int("amount").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  status: mysqlEnum("status", ["unpaid", "paid", "partially_paid", "overdue"]).default("unpaid").notNull(),
  receiptUrl: text("receiptUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  billId: int("billId").notNull().references(() => bills.id, { onDelete: "restrict" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  amount: int("amount").notNull(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  providerOrderId: varchar("providerOrderId", { length: 128 }).unique(),
  providerPaymentId: varchar("providerPaymentId", { length: 128 }).unique(),
  status: mysqlEnum("status", ["success", "pending", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = typeof bills.$inferInsert;