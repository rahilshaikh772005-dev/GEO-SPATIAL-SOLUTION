import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Civic Atlas dashboard content contract", () => {
  const homeSource = readFileSync(resolve(import.meta.dirname, "../src/pages/Home.tsx"), "utf8");
  const citizenPagesSource = readFileSync(resolve(import.meta.dirname, "../src/pages/CitizenPages.tsx"), "utf8");

  it("keeps the three connected civic services visible in the citizen workspace", () => {
    expect(homeSource).toContain("Mumbai Water Supply");
    expect(homeSource).toContain("Adani Electricity Mumbai");
    expect(homeSource).toContain("BMC Ward 14 Office");
  });

  it("keeps property claims separate from verified ownership", () => {
    expect(homeSource).toContain("Municipal property number");
    expect(homeSource).toContain("Claim reason");
    expect(homeSource).toContain("property remains unlinked until an administrator reviews it");
    expect(homeSource).toContain("Ownership claim submitted for administrator review.");
  });

  it("requires provider confirmation before showing paid status", () => {
    expect(citizenPagesSource).toContain("Continue to Razorpay secure checkout.");
    expect(citizenPagesSource).toContain("The bill will be marked paid only after the payment is verified with the provider.");
    expect(citizenPagesSource).toContain("Payment confirmation is still pending.");
    expect(citizenPagesSource).toContain("Payment verified.");
  });
});
