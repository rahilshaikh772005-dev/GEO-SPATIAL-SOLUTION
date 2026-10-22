import express, { type Express, type Request, type Response } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { verifyRazorpayWebhookSignature } from "./paymentProvider";

type RazorpayWebhookPayload = {
  event?: unknown;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
  };
};

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function registerRazorpayWebhook(app: Express) {
  app.post(
    "/api/payments/razorpay/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req: Request, res: Response) => {
      if (!ENV.razorpayWebhookSecret) {
        res.status(503).json({ error: "Payment webhook is not configured" });
        return;
      }

      const signature = req.header("x-razorpay-signature");
      if (!Buffer.isBuffer(req.body) || !signature
        || !verifyRazorpayWebhookSignature(req.body, signature)
      ) {
        res.status(401).json({ error: "Invalid payment webhook signature" });
        return;
      }

      let payload: RazorpayWebhookPayload;
      try {
        payload = JSON.parse(req.body.toString("utf8")) as RazorpayWebhookPayload;
      } catch {
        res.status(400).json({ error: "Invalid payment webhook payload" });
        return;
      }

      const event = getString(payload.event);
      if (event !== "payment.captured" && event !== "payment.failed") {
        res.status(200).json({ received: true });
        return;
      }

      const payment = payload.payload?.payment?.entity;
      const providerOrderId = getString(payment?.order_id);
      const providerPaymentId = getString(payment?.id);
      const amountPaise = payment?.amount;
      if (!providerOrderId || !providerPaymentId
        || typeof amountPaise !== "number"
        || !Number.isSafeInteger(amountPaise)
        || payment?.currency !== "INR"
        || (event === "payment.captured" && payment?.status !== "captured")
        || (event === "payment.failed" && payment?.status !== "failed")
      ) {
        res.status(400).json({ error: "Payment webhook is missing valid payment details" });
        return;
      }

      try {
        const intent = await db.getPaymentForProviderOrder(providerOrderId);
        if (!intent) {
          res.status(404).json({ error: "Payment order was not found" });
          return;
        }

        if (event === "payment.failed") {
          res.status(200).json({ received: true });
          return;
        }

        if (amountPaise % 100 !== 0) {
          res.status(400).json({ error: "Payment amount is not a whole rupee amount" });
          return;
        }

        const result = await db.confirmPaymentFromProvider(
          intent.reference,
          providerPaymentId,
          amountPaise / 100,
        );
        if (!result.ok) {
          res.status(result.reason === "NOT_FOUND" ? 404 : 409).json({ error: "Payment confirmation did not match the pending bill" });
          return;
        }
        res.status(200).json({ received: true });
      } catch (error) {
        console.error("[Razorpay] Webhook processing failed", error);
        res.status(500).json({ error: "Payment webhook processing failed" });
      }
    },
  );
}
