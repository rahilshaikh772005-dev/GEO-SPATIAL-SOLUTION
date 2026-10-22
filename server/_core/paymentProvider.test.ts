import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from "./paymentProvider";

describe("Razorpay signature verification", () => {
  const secret = "razorpay-test-secret";

  it("verifies the checkout order/payment signature", () => {
    const message = "order_test123|pay_test456";
    const signature = createHmac("sha256", secret).update(message).digest("hex");

    expect(verifyRazorpayCheckoutSignature("order_test123", "pay_test456", signature, secret)).toBe(true);
    expect(verifyRazorpayCheckoutSignature("order_wrong", "pay_test456", signature, secret)).toBe(false);
    expect(verifyRazorpayCheckoutSignature("order_test123", "pay_test456", "not-a-signature", secret)).toBe(false);
  });

  it("verifies the exact webhook bytes and rejects tampered bodies", () => {
    const body = Buffer.from('{"event":"payment.captured","payload":{}}');
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyRazorpayWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyRazorpayWebhookSignature(Buffer.from(`${body.toString()} `), signature, secret)).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, signature, "")).toBe(false);
  });
});
