import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createOwnershipClaim: vi.fn(),
  getAdminSummary: vi.fn(),
  getPropertiesInBounds: vi.fn(),
  initiatePayment: vi.fn(),
  lookupPublicProperty: vi.fn(),
  createBill: vi.fn(),
  updateBillStatus: vi.fn(),
  searchPropertiesForUser: vi.fn(),
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
});