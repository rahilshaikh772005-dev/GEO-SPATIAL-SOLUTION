import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminProcedure, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  citizen: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const userProperties = await db.listPropertiesForUser(ctx.user.id);
      const bills = await db.getBillsForProperties(userProperties.map(property => property.id));
      const payments = await db.getPaymentHistory(ctx.user.id);
      return { properties: userProperties, bills, payments };
    }),
    search: protectedProcedure.input(z.object({ query: z.string().min(1).max(160) })).query(({ input }) => db.searchProperties(input.query)),
    addProperty: protectedProcedure.input(z.object({ propertyNo: z.string().min(2).max(32), houseNo: z.string().min(1).max(128), ownerName: z.string().min(2).max(160), address: z.string().min(3).max(500), latitude: z.number().gte(-90).lte(90), longitude: z.number().gte(-180).lte(180) })).mutation(({ input, ctx }) => db.createProperty({ ...input, ownerId: ctx.user.id })),
    payBill: protectedProcedure.input(z.object({ billId: z.number().int().positive(), amount: z.number().int().positive() })).mutation(({ input, ctx }) => db.createPayment(ctx.user.id, input.billId, input.amount, `PAY-${Date.now()}`)),
  }),

  admin: router({
    summary: adminProcedure.query(() => db.getAdminSummary()),
    searchProperties: adminProcedure.input(z.object({ query: z.string().min(1).max(160) })).query(({ input }) => db.searchProperties(input.query)),
    addProperty: adminProcedure.input(z.object({ propertyNo: z.string().min(2).max(32), houseNo: z.string().min(1).max(128), ownerName: z.string().min(2).max(160), address: z.string().min(3).max(500), latitude: z.number().gte(-90).lte(90), longitude: z.number().gte(-180).lte(180) })).mutation(({ input }) => db.createProperty(input)),
    updateProperty: adminProcedure.input(z.object({ id: z.number().int().positive(), houseNo: z.string().min(1).max(128).optional(), ownerName: z.string().min(2).max(160).optional(), address: z.string().min(3).max(500).optional(), latitude: z.number().gte(-90).lte(90).optional(), longitude: z.number().gte(-180).lte(180).optional() })).mutation(({ input }) => { const { id, ...changes } = input; return db.updateProperty(id, changes); }),
    deleteProperty: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteProperty(input.id)),
    addBill: adminProcedure.input(z.object({ propertyId: z.number().int().positive(), billType: z.enum(["property_tax", "water", "electricity"]), amount: z.number().int().positive(), dueDate: z.coerce.date(), status: z.enum(["unpaid", "paid", "partially_paid", "overdue"]).default("unpaid") })).mutation(({ input }) => db.createBill(input)),
    updateBillStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["unpaid", "paid", "partially_paid", "overdue"]) })).mutation(({ input }) => db.updateBillStatus(input.id, input.status)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
