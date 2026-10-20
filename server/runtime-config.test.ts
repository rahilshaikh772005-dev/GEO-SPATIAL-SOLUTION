import { describe, expect, it } from "vitest";
import { validateRuntimeConfig } from "./_core/env";

describe("production runtime configuration", () => {
  it("rejects missing production authentication and database settings", () => {
    expect(() => validateRuntimeConfig({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
  });

  it("rejects weak production session secrets", () => {
    expect(() => validateRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "mysql://db",
      JWT_SECRET: "short",
      VITE_APP_ID: "app",
      VITE_OAUTH_PORTAL_URL: "https://oauth.example",
      OAUTH_SERVER_URL: "https://oauth.example",
      PUBLIC_APP_URL: "https://civic.example",
    })).toThrow(/at least 32 characters/);
  });

  it("accepts complete production configuration", () => {
    expect(() => validateRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "mysql://db",
      JWT_SECRET: "a-secure-secret-value-at-least-32-characters-long",
      VITE_APP_ID: "app",
      VITE_OAUTH_PORTAL_URL: "https://oauth.example",
      OAUTH_SERVER_URL: "https://oauth.example",
      PUBLIC_APP_URL: "https://civic.example",
    })).not.toThrow();
  });

  it("allows incomplete configuration outside production", () => {
    expect(() => validateRuntimeConfig({ NODE_ENV: "development" })).not.toThrow();
  });
});