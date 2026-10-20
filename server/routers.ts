import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminProcedure, citizenProcedure, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const geographicBounds = z.object({
  north: z.number().gte(-90).lte(90),
  south: z.number().gte(-90).lte(90),
  east: z.number().gte(-180).lte(180),
  west: z.number().gte(-180).lte(180),
}).refine(bounds => bounds.north > bounds.south && bounds.east > bounds.west, {
  message: "Bounds must have positive area",
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (ctx.user && ctx.user.id > 0) {
        return db.revokeUserSessions(ctx.user.id).then(() => ({ success: true as const }));
      }
      return {
        success: true,
      } as const;
    }),
  }),

  property: router({
    lookup: publicProcedure.input(z.object({ propertyNo: z.string().trim().min(2).max(32) }))
      .query(({ input }) => db.lookupPublicProperty(input.propertyNo)),
  }),

  citizen: router({
    dashboard: citizenProcedure.query(async ({ ctx }) => {
      const userProperties = await db.listPropertiesForUser(ctx.user.id);
      const bills = await db.getBillsForProperties(userProperties.map(property => property.id));
      const payments = await db.getPaymentHistory(ctx.user.id);
      return { properties: userProperties, bills, payments };
    }),
    search: citizenProcedure.input(z.object({ query: z.string().trim().min(1).max(160) })).query(({ input, ctx }) => db.searchPropertiesForUser(input.query, ctx.user.id)),
    claimProperty: citizenProcedure.input(z.object({ propertyNo: z.string().trim().min(2).max(32), claimReason: z.string().trim().min(10).max(2000) }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createOwnershipClaim(ctx.user.id, input.propertyNo, input.claimReason);
        if (result.ok) return result;
        if (result.reason === "NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Property record not found" });
        throw new TRPCError({ code: "CONFLICT", message: result.reason === "ALREADY_PENDING" ? "A claim is already pending" : "Property is not available to claim" });
      }),
    initiatePayment: citizenProcedure.input(z.object({ billId: z.number().int().positive() }).strict())
      .mutation(async ({ input, ctx }) => {
        const result = await db.initiatePayment(ctx.user.id, input.billId);
        if (result.ok) return result;
        if (result.reason === "NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Payable bill not found" });
        throw new TRPCError({ code: "CONFLICT", message: result.reason === "ALREADY_PENDING" ? "A payment request is already pending" : "Bill is already paid" });
      }),
  }),

  admin: router({
    summary: adminProcedure.query(() => db.getAdminSummary()),
    searchProperties: adminProcedure.input(z.object({ query: z.string().min(1).max(160) })).query(({ input }) => db.searchProperties(input.query)),
    propertiesInBounds: adminProcedure.input(geographicBounds).query(({ input }) => db.getPropertiesInBounds(input)),
    ownershipClaims: adminProcedure.query(() => db.listOwnershipClaims()),
    reviewOwnershipClaim: adminProcedure.input(z.object({ claimId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]) }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.reviewOwnershipClaim(input.claimId, ctx.user.id, input.decision);
        if (result.ok) return result;
        throw new TRPCError({ code: "CONFLICT", message: "Claim is no longer reviewable or the property has another owner" });
      }),
    addProperty: adminProcedure.input(z.object({ propertyNo: z.string().min(2).max(32), houseNo: z.string().min(1).max(128), ownerName: z.string().min(2).max(160), address: z.string().min(3).max(500), latitude: z.number().gte(-90).lte(90), longitude: z.number().gte(-180).lte(180) })).mutation(({ input }) => db.createProperty(input)),
    updateProperty: adminProcedure.input(z.object({ id: z.number().int().positive(), houseNo: z.string().min(1).max(128).optional(), ownerName: z.string().min(2).max(160).optional(), address: z.string().min(3).max(500).optional(), latitude: z.number().gte(-90).lte(90).optional(), longitude: z.number().gte(-180).lte(180).optional() })).mutation(({ input }) => { const { id, ...changes } = input; return db.updateProperty(id, changes); }),
    deleteProperty: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const result = await db.deleteProperty(input.id);
      if (result.success) return result;
      if (result.reason === "NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Property record not found" });
      throw new TRPCError({ code: "CONFLICT", message: "Property has bill records and cannot be deleted" });
    }),
    addBill: adminProcedure.input(z.object({ propertyId: z.number().int().positive(), billType: z.enum(["property_tax", "water", "electricity"]), amount: z.number().int().positive(), dueDate: z.coerce.date() }).strict()).mutation(({ input }) => db.createBill(input)),
    updateBillStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["unpaid", "overdue"]) }).strict()).mutation(({ input }) => db.updateBillStatus(input.id, input.status)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
