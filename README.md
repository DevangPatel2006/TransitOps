# 🚛 TransitOps — Enterprise Transport & Fleet Operations Platform

> **Production-Ready Multi-Tenant Fleet Operations Management System**  
> A high-performance, secure, and resilient end-to-end fleet operations platform designed to eliminate spreadsheets with database-enforced ACID transactions, role-based security, cloud document storage, visual analytics, and automated compliance alerts.

---

## 🏆 Key Architecture & Platform Highlights

* **100% Core Deliverables Complete**: Comprehensive vehicle registry, driver compliance, transactional trip lifecycles, preventative maintenance logs, and expense audits.
* **ACID Business Rule Enforcement**: All business constraints (payload limits, atomic driver/vehicle status transitions, double-booking prevention) are enforced at the **Database & API layer** via Prisma transactions.
* **Persistent Cloud Document Storage**: Production-grade document management powered by Cloudinary with support for PDFs and inspection images, backward-compatible local fallback, and secure streaming downloads.
* **Decoupled Standalone Cron Execution**: Dedicated standalone runner (`npm run job:license-expiry`) designed for cloud schedulers (Render Cron Jobs) without relying on long-lived web server background loops.
* **Production-Safe Health Probing**: Unauthenticated `/health` endpoint validating live Neon database connectivity with low-overhead queries.
* **Hardened Security & RBAC**: Rate-limited authentication, bcrypt password hashing (cost factor 12), parameterized Prisma queries, production error sanitization (no stack trace or credential leakage), Helmet HTTP headers, and strict CORS.
* **Single Page Application Fallbacks**: Full direct deep-linking and reload support on Vercel without 404 routing errors (`vercel.json`).

---

## 🧬 System Architecture

```mermaid
graph TD
    subgraph Frontend [React SPA - Vite + Tailwind (Deployed on Vercel)]
        UI[User Interface & Dark/Light Themes]
        AuthContext[Auth Context & Session Store]
        AxiosClient[Environment-Aware Axios Client]
    end

    subgraph Backend [Express REST API (Deployed on Render)]
        Router[API Gateway / Route Modules]
        CORS[Production Multi-Origin CORS]
        AuthGuard[JWT & Role-Based Access Guard]
        Controllers[Module Controllers]
        Services[Transactional Business Services]
        HealthCheck[Render Health Check /health]
    end

    subgraph CloudStorage [Persistent Cloud Storage]
        Cloudinary[Cloudinary Object Storage (PDFs/Images)]
    end

    subgraph Database [Neon Serverless PostgreSQL]
        Prisma[Prisma Client v5.22.0]
        DB[(PostgreSQL Tables & Enums)]
    end

    subgraph BackgroundJob [Render Cron Service]
        CronJob[Runner: npm run job:license-expiry]
    end

    UI --> AuthContext
    AuthContext --> AxiosClient
    AxiosClient -- HTTPS /api/v1/* --> Router
    Router --> CORS
    CORS --> AuthGuard
    AuthGuard --> Controllers
    Controllers --> Services
    Services --> Prisma
    Services --> Cloudinary
    CronJob --> Prisma
    Prisma --> DB
```

---

## 🛠️ Technology Stack

### Backend
* **Runtime**: Node.js (CommonJS, Node 18+)
* **Framework**: Express.js 4
* **ORM**: Prisma 5.22.0
* **Database**: PostgreSQL (Hosted on Neon with SSL & connection pooling)
* **Storage**: Cloudinary (Persistent storage for documents/PDFs/images)
* **Auth & Security**: JWT (`jsonwebtoken`), `bcrypt` (cost 12), `helmet`, `express-rate-limit`, `cors`
* **Validation**: Zod (strict request body, query, and parameter schemas)
* **Mailing**: Nodemailer (SMTP transport with graceful unconfigured fallback)
* **PDF Engine**: PDFKit (Vector report compiler)

### Frontend
* **Build Tool**: Vite 6
* **Framework**: React 18
* **Styling**: Vanilla CSS Design System Tokens + Tailwind CSS
* **Routing**: React Router 6 (SPA deep-linking with Vercel rewrites)
* **Icons**: Lucide React
* **Charts**: Recharts
* **Forms**: React Hook Form + Zod Resolvers

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

Every CRUD and state-mutation endpoint is enforced autoritatively on the backend:

| Role | Fleet Registry | Driver Profiles | Trips & Dispatch | Fuel & Expenses | Analytics & PDF | Document Upload/Delete |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **FLEET_MANAGER** | Full CRUD | Full CRUD | Full Lifecycle | Full CRUD | Full Access | Full Access |
| **DRIVER_OPS** | View Only | View Only | Dispatch & Complete | View Only | Full Access | View Only |
| **SAFETY_OFFICER** | View Only | Manage & Update Status | View Only | View Only | Full Access | View Only |
| **FINANCIAL_ANALYST** | View Only | View Only | View Only | Create & Manage | Full Access | View Only |

---

## 🚀 Local Development Setup

### Prerequisites
* Node.js (v18 or higher)
* PostgreSQL database (Local or Neon dev branch)

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your DATABASE_URL and JWT_SECRET in .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```
The backend server will boot on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd ../frontend
cp .env.example .env
# For local dev using the Vite proxy, VITE_API_URL can be omitted or set to http://localhost:3000/api/v1
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 🌐 Production Deployment Guide

```
GitHub Repository
   │
   ├─► Vercel (React Frontend)
   │
   └─► Render Web Service (Express Backend)
          │
          ├─► Neon PostgreSQL (Database)
          ├─► Cloudinary (Persistent Document Storage)
          ├─► SMTP / Nodemailer (Alert Notifications)
          └─► Render Cron Job (License Expiry Runner)
```

---

### 1. Database Configuration (Neon PostgreSQL)

1. Create a project in [Neon Console](https://console.neon.tech).
2. Copy your pooled connection string with SSL enabled:
   ```
   postgresql://neondb_owner:<PASSWORD>@<ENDPOINT>-pooler.<REGION>.aws.neon.tech/neondb?sslmode=require
   ```
3. Use this connection string as the `DATABASE_URL` in Render.

---

### 2. Backend Deployment (Render Web Service)

1. Log into [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`TransitOps`).
3. Configure the service settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `transitops-backend` |
| **Region** | Select closest region to your Neon DB (e.g., Ohio / Frankfurt) |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/health` |

4. Configure **Environment Variables** in Render:

| Variable | Value / Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | `postgresql://user:pass@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Strong random secret key (min 32 chars) | `e4b98...` (generate with `openssl rand -hex 32`) |
| `FRONTEND_URL` | Your production frontend URL on Vercel | `https://transitops.vercel.app` (or comma-separated) |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Web server port (Render injects this automatically) | `10000` or leave default |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name for file storage | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `abcdef123456...` |
| `SMTP_HOST` | SMTP server host for expiry emails | `smtp.mailtrap.io` or `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP port | `587` (or `465` for SSL, `2525` for Mailtrap) |
| `SMTP_USER` | SMTP username | `your_smtp_user` |
| `SMTP_PASS` | SMTP password | `your_smtp_password` |
| `SMTP_FROM` | Sender display and email | `TransitOps Safety Alerts <no-reply@transitops.com>` |
| `ADMIN_EMAILS` | Comma-separated alert recipients | `admin@transitops.com,safety@transitops.com` |
| `ENABLE_INTERNAL_CRON` | Disable internal cron in web process | `false` |

---

### 3. Frontend Deployment (Vercel)

1. Log into [Vercel Dashboard](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import the GitHub repository (`TransitOps`).
3. Configure the project settings:

| Setting | Value |
| :--- | :--- |
| **Project Name** | `transitops` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

4. Add **Environment Variable** in Vercel:

| Variable | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://transitops-backend.onrender.com/api/v1` *(Replace with your real Render URL)* |

5. **SPA Routing Rewrites**:  
   The included `frontend/vercel.json` automatically rewrites all incoming paths (`/(.*)`) to `/index.html`, ensuring direct reloads on `/dashboard`, `/fleet`, `/drivers`, etc., never return 404.

---

### 4. Scheduled Cron Job (Render Cron Job)

Render Web Services sleep on free plans or scale across instances on paid plans. To guarantee deterministic daily compliance checks without duplicate runs:

1. In Render Dashboard, click **New +** -> **Cron Job**.
2. Connect your GitHub repository (`TransitOps`).
3. Configure the Cron Job settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `transitops-license-expiry-cron` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate` |
| **Command** | `npm run job:license-expiry` |
| **Schedule** | `0 8 * * *` *(Runs at 08:00 UTC every day)* |

#### ⚠️ Timezone Notice & Schedule Calculation:
Render Cron Jobs execute based on **UTC** system time:
* If your team operates in **UTC**: `0 8 * * *` = 8:00 AM UTC.
* If your team operates in **EST (UTC-5)**: set schedule to `0 13 * * *` (13:00 UTC = 8:00 AM EST).
* If your team operates in **IST (UTC+5:30)**: set schedule to `30 2 * * *` (02:30 UTC = 8:00 AM IST).

#### Duplicate Send Prevention:
The job checks `LicenseReminderLog` in Neon for matching `driver_id` and `days_before` (thresholds: 30, 15, 7, 1 days). It records the attempt in the database before sending, guaranteeing that multiple invocations or retries never spam administrators.

---

## 🚫 Critical Commands: DO NOT RUN ON PRODUCTION

| Command | Why It Must NOT Be Run on Production |
| :--- | :--- |
| ❌ `npx prisma migrate dev` | Prompts interactively and can reset production schemas or delete live data. Use `npx prisma migrate deploy` instead. |
| ❌ `node prisma/seed.js` or `npm run db:seed` | Contains destructive data wipes (`deleteMany({})`). Blocked by `NODE_ENV=production` guard. |
| ❌ `npx prisma migrate reset` | Drops the entire production Neon database. |
| ❌ `npm test` against production DB | The integration test suite wipes tables between test cycles. Run tests only against local/ephemeral test databases. |

---

## 📋 Production Deployment Verification Checklist

- [x] Prisma Client locked to `5.22.0` (no unintended engine upgrades).
- [x] Production migration history verified (`npx prisma migrate deploy`).
- [x] Destructive database seed script protected with `NODE_ENV === 'production'` guard.
- [x] Express bound to `0.0.0.0` with dynamic `PORT` support.
- [x] Lightweight unauthenticated `/health` endpoint returning database health status for Render probes.
- [x] Strict CORS origin validation supporting one or more frontend domains without wildcard `*`.
- [x] Persistent cloud document storage (Cloudinary) configured for vehicle documents with secure streaming downloads and cloud deletions.
- [x] Standalone cron runner (`npm run job:license-expiry`) decoupled from web process.
- [x] Production error handling sanitizes 500 error outputs and suppresses stack traces while maintaining server-side logs.
- [x] Frontend Axios client dynamically constructs API URLs without double `/api/v1` prefixes.
- [x] Vercel SPA routing configured via `vercel.json` to prevent reload 404s.
