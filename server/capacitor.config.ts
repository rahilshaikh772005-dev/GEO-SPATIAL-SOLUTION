import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.civicatlas.app",
  appName: "Civic Atlas",
  webDir: "dist/public",
  android: {
    allowMixedContent: false,
  },
};

export default config;