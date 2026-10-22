import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./env";

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: "INR";
  status: "created";
};

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};

function requireApiCredentials() {
  if (!ENV.razorpayKeyId || !ENV.razorpayKeySecret) {
    throw new Error("Razorpay checkout is not configured");
  }
  return {
    keyId: ENV.razorpayKeyId,
    authorization: `Basic ${Buffer.from(`${ENV.razorpayKeyId}:${ENV.razorpayKeySecret}`).toString("base64")}`,
  };
}

function signatureMatches(message: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function providerRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { authorization } = requireApiCredentials();
  const headers = new Headers(init.headers);
  headers.set("Authorization", authorization);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${RAZORPAY_API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Razorpay request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function isRazorpayCheckoutConfigured(): boolean {
  return Boolean(ENV.razorpayKeyId && ENV.razorpayKeySecret);
}

export function verifyRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret = ENV.razorpayKeySecret,
): boolean {
  return signatureMatches(`${orderId}|${paymentId}`, signature, secret);
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret = ENV.razorpayWebhookSecret,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function createRazorpayOrder(
  reference: string,
  amountRupees: number,
): Promise<{ order: RazorpayOrder; keyId: string }> {
  const { keyId } = requireApiCredentials();
  const paise = amountRupees * 100;
  if (!Number.isSafeInteger(paise) || paise <= 0) {
    throw new Error("Payment amount is invalid");
  }

  const order = await providerRequest<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: paise,
      currency: "INR",
      receipt: reference,
      notes: { civicAtlasReference: reference },
    }),
  });

  if (!order.id?.startsWith("order_")
    || order.amount !== paise
    || order.currency !== "INR"
    || order.status !== "created"
  ) {
    throw new Error("Razorpay returned an invalid order");
  }
  return { order, keyId };
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const payment = await providerRequest<RazorpayPayment>(
    `/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
  );
  if (!payment.id || !payment.order_id || !Number.isSafeInteger(payment.amount)) {
    throw new Error("Razorpay returned an invalid payment");
  }
  return payment;
}
