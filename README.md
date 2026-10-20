# Civic Atlas

Geo-spatial municipal services MVP with citizen and admin workflows.

## Setup

1. Install Node.js 20+ and pnpm 10+.
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`, `JWT_SECRET`, and OAuth values.
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

## Features

- OAuth citizen authentication and protected dashboard
- Property search by property number, house number, or owner name
- Property coordinates and map marker views
- Property tax, water, and electricity bills
- Paid/unpaid status and simulated payment records
- Admin metrics, property registry, search, and map view
- tRPC web services backed by MySQL and Drizzle ORM

For production, replace the simulated payment mutation with a verified payment gateway webhook and use Leaflet/OpenStreetMap tiles with the required attribution.