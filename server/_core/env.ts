export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  publicAppUrl: process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ?? "",
  demoMode: process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return;

  const required = ["DATABASE_URL", "JWT_SECRET", "VITE_APP_ID", "VITE_OAUTH_PORTAL_URL", "OAUTH_SERVER_URL", "PUBLIC_APP_URL"];
  const missing = required.filter(name => !env[name]?.trim());
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  }
}
