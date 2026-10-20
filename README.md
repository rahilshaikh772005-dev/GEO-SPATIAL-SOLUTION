# Civic Atlas

Geo-spatial municipal services MVP with citizen and admin workflows.

## Setup

1. Install Node.js 20+ and pnpm 10+.
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`, `JWT_SECRET`, and OAuth values.
	Set `DEMO_MODE=true` and `VITE_DEMO_MODE=true` only for local, non-production demos without a database. Production startup requires database and OAuth configuration and fails closed if any required setting is missing.
3. Install dependencies from the repository root:

```powershell
pnpm install --dir server
```

4. Create the MySQL schema and demo records:

```powershell
pnpm db:push
pnpm db:seed
```

5. Start the app:

```powershell
pnpm dev
```

The development server uses port `3000` or the next available port. The citizen workspace is `/`; the admin workspace is `/admin`.

## Android app

The Android app uses Capacitor to bundle the Vite build. Install Android Studio with its Android SDK and a supported JDK, then configure `server/.env` with the deployed API origin and canonical server URL:

```env
VITE_API_URL=https://your-deployed-app.example
PUBLIC_APP_URL=https://your-deployed-app.example
CAPACITOR_ORIGINS=https://localhost
```

Register `https://your-deployed-app.example/api/oauth/callback` with the OAuth provider. `CAPACITOR_ORIGINS` is an explicit allowlist for the Android WebView origin; add other native origins only when required. Build the web assets and sync the Android project with `pnpm --dir server android:sync`, then open it in Android Studio with `pnpm --dir server android:open`. Build and run the APK from Android Studio, or use `pnpm --dir server android:run` with an emulator/device configured.

For a local emulator, use the host-reachable API address (typically `http://10.0.2.2:3000`) and add the Android WebView origin to the API CORS allowlist. Android compilation requires Android Studio/SDK and a JDK, which are not bundled with this repository.

## Features

- OAuth citizen authentication and protected dashboard
- Property search by property number, house number, or owner name
- Property coordinates and map marker views
- Property tax, water, and electricity bills
- Paid/unpaid status and simulated payment records
- Admin metrics, property registry, search, and map view
- tRPC web services backed by MySQL and Drizzle ORM

## Backend trust boundaries

- Citizen operations require a citizen session and property records are scoped to the authenticated owner. The public property lookup returns only the exact property number, not owner, address, bill, or coordinate details.
- Citizens submit ownership claims for existing records. A claim does not change ownership until an administrator reviews and approves it.
- Bill creation cannot mark a bill paid. Payment initiation uses the bill amount from the server and creates a pending intent; it does not settle the bill.
- `confirmPaymentFromProvider` is an internal data-layer operation. Only call it after verifying an actual payment-provider webhook signature and matching the provider amount and payment reference. No payment provider is configured in this repository, so payment initiation remains pending and no client route can confirm it.
- Geographic marker queries are a separate admin-only, bounded query and return only marker fields. Admin analytics do not embed property records.
- Demo records are shown only in development when `VITE_DEMO_MODE=true`. Production requires a configured database and fails closed if one is absent.

Apply migrations `0002_ownership_claims_payment_intents.sql`, `0003_restrict_financial_record_deletes.sql`, and `0004_user_session_revocation.sql` from `drizzle/migrations/` before deploying this backend version. Production startup requires `DATABASE_URL`, a `JWT_SECRET` of at least 32 characters, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, and `PUBLIC_APP_URL`. Configure `VITE_DEMO_MODE=false` for production builds.

Before production payments, integrate a payment provider and a signature-verified webhook; initiated intents must remain pending until then. For production maps, use Leaflet/OpenStreetMap tiles with the required attribution.