import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createOwnershipClaim: vi.fn(),
  getAdminSummary: vi.fn(),
  getAdminProperties: vi.fn(),
  getAdminBills: vi.fn(),
  listOwnershipClaims: vi.fn(),
  getPropertiesInBounds: vi.fn(),
  initiatePayment: vi.fn(),
  getPaymentForUser: vi.fn(),
  getPaymentReceipt: vi.fn(),
  lookupPublicProperty: vi.fn(),
  createBill: vi.fn(),
  updateBillStatus: vi.fn(),
  searchPropertiesForUser: vi.fn(),
  reviewOwnershipClaim: vi.fn(),
  createProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
}));

function createContext(role: "user" | "admin" = "user"): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: role === "admin" ? 7 : 42,
      openId: `${role}-open-id`,
      name: "Test User",
      email: "test@example.com",
      loginMethod: "test",
      role,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("backend authorization and domain boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only the public lookup shape", async () => {
    vi.mocked(db.lookupPublicProperty).mockResolvedValue({ propertyNo: "P-2048" });

    const result = await appRouter.createCaller(createContext()).property.lookup({ propertyNo: "P-2048" });

    expect(result).toEqual({ propertyNo: "P-2048" });
    expect(db.lookupPublicProperty).toHaveBeenCalledWith("P-2048");
  });

  it("scopes citizen property search to the authenticated owner", async () => {
    vi.mocked(db.searchPropertiesForUser).mockResolvedValue([]);

    await appRouter.createCaller(createContext()).citizen.search({ query: "Powai" });

    expect(db.searchPropertiesForUser).toHaveBeenCalledWith("Powai", 42);
  });

  it("requires authentication for private property search", async () => {
    const caller = appRouter.createCaller({ user: null, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });

    await expect(caller.citizen.search({ query: "P-2048" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.searchPropertiesForUser).not.toHaveBeenCalled();
  });

  it("does not allow admin accounts to use citizen-only operations", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.citizen.initiatePayment({ billId: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.initiatePayment).not.toHaveBeenCalled();
  });

  it("binds a property claim to the session user, not submitted ownership data", async () => {
    vi.mocked(db.createOwnershipClaim).mockResolvedValue({ ok: true, claimId: 19, status: "pending" });

    await appRouter.createCaller(createContext()).citizen.claimProperty({ propertyNo: "P-2048", claimReason: "I am listed on the registered deed" });

    expect(db.createOwnershipClaim).toHaveBeenCalledWith(42, "P-2048", "I am listed on the registered deed");
  });

  it("rejects client-provided payment amounts", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.citizen.initiatePayment({ billId: 12, amount: 1 } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.initiatePayment).not.toHaveBeenCalled();
  });

  it("requires a citizen session for payment verification and receipts", async () => {
    const caller = appRouter.createCaller({ user: null, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const paymentInput = {
      reference: "PAY-test-reference",
      orderId: "order_test123",
      paymentId: "pay_test456",
      signature: "a".repeat(64),
    };

    await expect(caller.citizen.verifyPayment(paymentInput)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.citizen.receipt({ reference: paymentInput.reference })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getPaymentForUser).not.toHaveBeenCalled();
    expect(db.getPaymentReceipt).not.toHaveBeenCalled();
  });

  it("loads receipts using the authenticated citizen id", async () => {
    const reference = "PAY-test-reference";
    const receipt = {
      reference,
      providerPaymentId: "pay_test456",
      amount: 1200,
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
      paymentStatus: "success" as const,
      billType: "water" as const,
      propertyNo: "P-2048",
      houseNo: "12-4-88",
      address: "Powai, Mumbai",
      citizenName: "Test User",
      citizenEmail: "test@example.com",
    };
    vi.mocked(db.getPaymentReceipt).mockResolvedValue(receipt);

    await expect(appRouter.createCaller(createContext()).citizen.receipt({ reference })).resolves.toEqual(receipt);
    expect(db.getPaymentReceipt).toHaveBeenCalledWith(reference, 42);
  });

  it("does not let admins create or edit bills as paid", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const bill = { propertyId: 4, billType: "water" as const, amount: 1200, dueDate: new Date("2026-11-01") };

    await expect(caller.admin.addBill({ ...bill, status: "paid" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.admin.updateBillStatus({ id: 3, status: "paid" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createBill).not.toHaveBeenCalled();
    expect(db.updateBillStatus).not.toHaveBeenCalled();
  });

  it("allows admin-only analytics and geographic queries", async () => {
    const citizenCaller = appRouter.createCaller(createContext());
    await expect(citizenCaller.admin.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getAdminSummary).not.toHaveBeenCalled();

    vi.mocked(db.getAdminSummary).mockResolvedValue({ citizens: 0, properties: 0, totalRevenue: 0, outstanding: 0 });
    await appRouter.createCaller(createContext("admin")).admin.summary();
    expect(db.getAdminSummary).toHaveBeenCalledOnce();
  });

  it("restricts administrative property and bill lists to admins", async () => {
    const citizenCaller = appRouter.createCaller(createContext());
    await expect(citizenCaller.admin.properties()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(citizenCaller.admin.bills()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getAdminProperties).not.toHaveBeenCalled();
    expect(db.getAdminBills).not.toHaveBeenCalled();

    vi.mocked(db.getAdminProperties).mockResolvedValue([]);
    vi.mocked(db.getAdminBills).mockResolvedValue([]);
    const adminCaller = appRouter.createCaller(createContext("admin"));
    await expect(adminCaller.admin.properties()).resolves.toEqual([]);
    await expect(adminCaller.admin.bills()).resolves.toEqual([]);
  });

  it("restricts the paginated training dataset to admins", async () => {
    const citizenCaller = appRouter.createCaller(createContext());
    await expect(citizenCaller.admin.propertyDataset({ page: 1, search: "P00001" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminCaller = appRouter.createCaller(createContext("admin"));
    const firstPage = await adminCaller.admin.propertyDataset({ page: 1, search: "" });
    expect(firstPage).toMatchObject({
      totalRows: 12000,
      page: 1,
      pageSize: 50,
    });
    expect(firstPage.rows).toHaveLength(50);

    const secondPage = await adminCaller.admin.propertyDataset({ page: 2, search: "" });
    expect(secondPage.rows[0]?.Property_ID).toBe("P00051");

    const result = await adminCaller
      .admin.propertyDataset({ page: 1, search: "P00001" });
    expect(result.totalRows).toBe(1);
    expect(result.rows[0]).toMatchObject({
      Property_ID: "P00001",
      Current_Tax: 2971.31,
      Payment_Status: "Due",
    });
  });
});