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

## Property tax model

The supplied 12,000-row workbook is stored at `data/Geospatial_Property_Dataset_12000.xlsx` and is used by a separate offline Python training pipeline. It predicts `Current_Tax`; the workbook is not loaded into the live property registry.

Administrators can open `/admin` to search and browse all 12,000 dataset rows across 17 columns. In local demo mode, the dataset is also available without signing in; outside demo mode, an administrator account is required.

From the repository root, create an environment, install the training dependencies, and train the model:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r ml\requirements.txt
python ml\train_property_tax.py
```

The script evaluates on a held-out 20% test split and saves the trained pipeline to `models/property_tax_model.joblib` with MAE, RMSE, and R² metrics in `models/property_tax_metrics.json`. Both generated files are local artifacts and are excluded from Git. To use a different workbook or output folder, pass `--dataset` and `--output-dir`.

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
- Bill payment through Razorpay Checkout with server-side payment verification and confirmed receipts
- Admin metrics, property registry, search, and map view
- Admin property creation/editing/deletion, bill creation, and ownership-claim review
- Searchable, paginated view of the separate geospatial training dataset
- tRPC web services backed by MySQL and Drizzle ORM

## Backend trust boundaries

- Citizen operations require a citizen session and property records are scoped to the authenticated owner. The public property lookup returns only the exact property number, not owner, address, bill, or coordinate details.
- Citizens submit ownership claims for existing records. A claim does not change ownership until an administrator reviews and approves it.
- Bill creation cannot mark a bill paid. Payment initiation uses the bill amount from the server and creates a pending intent; it does not settle the bill.
- `confirmPaymentFromProvider` is an internal data-layer operation. It is called only after signature verification and a server-to-server Razorpay payment lookup, or a signature-verified raw-body webhook; both paths check the captured amount and order mapping. A payment failure does not mark the bill paid, and repeated settlement notifications are idempotent.
- Geographic marker queries are a separate admin-only, bounded query and return only marker fields. Admin analytics do not embed property records.
- Demo records are shown only in development when `VITE_DEMO_MODE=true`. Production requires a configured database and fails closed if one is absent.

Apply migrations `0002_ownership_claims_payment_intents.sql`, `0003_restrict_financial_record_deletes.sql`, `0004_user_session_revocation.sql`, and `0005_razorpay_payment_orders.sql` from `drizzle/migrations/` before deploying this backend version. Production startup requires `DATABASE_URL`, a `JWT_SECRET` of at least 32 characters, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, and `PUBLIC_APP_URL`. Configure `VITE_DEMO_MODE=false` for production builds.

For Razorpay test checkout, set server-only `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, and configure a Razorpay webhook targeting `/api/payments/razorpay/webhook` with `RAZORPAY_WEBHOOK_SECRET`. Enable the `payment.captured` and `payment.failed` events. Never expose the key secret or webhook secret to the browser. The checkout key ID is returned only when the server creates the order. Apply the database migration before enabling payments. Use Razorpay test credentials and verify the webhook endpoint is publicly reachable in the provider dashboard before production use. Receipts are available only after a confirmed payment and can be printed or saved as PDF from the receipt page.

For production maps, use Leaflet/OpenStreetMap tiles with the required attribution.