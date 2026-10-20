import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Civic Atlas dashboard content contract", () => {
  const homeSource = readFileSync(resolve(import.meta.dirname, "../src/pages/Home.tsx"), "utf8");

  it("keeps the three connected civic services visible in the citizen workspace", () => {
    expect(homeSource).toContain("Mumbai Water Supply");
    expect(homeSource).toContain("Adani Electricity Mumbai");
    expect(homeSource).toContain("BMC Ward 14 Office");
  });

  it("keeps the property lookup journey anchored to house number and owner name", () => {
    expect(homeSource).toContain("House / property number");
    expect(homeSource).toContain("Owner name");
    expect(homeSource).toContain("Verification flow is ready to connect");
  });

  it("keeps the payment dashboard states explicit", () => {
    expect(homeSource).toContain("₹4,280");
    expect(homeSource).toContain("Due soon");
    expect(homeSource).toContain("Paid");
  });
});
