# Production Deployment & Render Cleanup Report

**Project**: Next Inventory (Inventory V2) — Web Demo  
**Deployment Target**: Render  
**Execution Date**: October 19, 2026  
**DevOps Engineer**: Antigravity  

---

## 1. Discovered Project Path & Repository

| Attribute | Details |
| :--- | :--- |
| **Local Project Path** | `/home/next/next projects/inventory-v2-web-demo` |
| **Desktop Application Path** | `/home/next/next projects/inventory-v2` *(Preserved & Untouched)* |
| **GitHub Repository** | [https://github.com/Bouafia19/inventory-v2-web-demo](https://github.com/Bouafia19/inventory-v2-web-demo) |
| **Git Branch** | `master` |
| **Commit ID** | `4146df186c69502132ec0ad6f11e364b995a246e` |

### Distinction from Desktop Application
- **Main Desktop Application (`../inventory-v2`)**: Heavy Electron desktop package with Knex.js, SQLite database engine, native system dialogs, and native C++ print bindings (`github.com/Bouafia19/next_inventory_desktop`). Completely preserved without modification.
- **Web Demo Application (`./inventory-v2-web-demo`)**: Lightweight, standalone Vue 3 SPA utilizing a browser-native storage adapter (`src/api/storage.js` and `src/api/seedData.js`) that reproduces 100% of the desktop application's business logic, document generation (`jsPDF`), thermal receipt layout, and multi-warehouse state directly inside web browsers.

---

## 2. Deployment Architecture & Configuration

- **Frontend Framework**: Vue 3 (`^3.5.42`), Vuetify 3 (`^3.7.1`), Pinia (`^2.2.2`), Vue Router (`^4.4.4`, Hash History), `vue-i18n` (`^11.4.13`).
- **Rendering & State Model**: 100% Client-Side Single Page Application (SPA).
- **Backend & Database Requirements**: None. Relational CRUD and ledger operations are simulated locally via browser `localStorage` and seed fixtures.
- **Routing**: `createWebHashHistory()` ensures seamless client-side deep linking without server-side rewrite dependency, augmented with Render Blueprint SPA fallback rewrite rules (`/*` -> `/index.html`).
- **Blueprint File**: Added validated `render.yaml` defining static site infrastructure as code.

```yaml
services:
  - type: web
    name: inventory-v2-web-demo
    runtime: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    headers:
      - path: /*
        name: X-Frame-Options
        value: SAMEORIGIN
      - path: /*
        name: X-Content-Type-Options
        value: nosniff
```

---

## 3. Render Service Names & Public URLs

| Service Name | Render Service ID | Service Type | Tier / Plan | Public URL | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`inventory-v2-web-demo`** | `srv-dbb53umi0phs73f0b6qg` | `static_site` | Free / Starter | [https://inventory-v2-web-demo.onrender.com](https://inventory-v2-web-demo.onrender.com) | **Live / Healthy** |
| **`touriva-web`** | `srv-dbb3a78m7kps73aspl90` | `static_site` | Free / Starter | [https://touriva-web.onrender.com](https://touriva-web.onrender.com) | **Live / Healthy** |
| **`touriva-api`** | `srv-dbb3a4lg1s2s73e3ll9g` | `web_service` | Free | [https://touriva-api.onrender.com](https://touriva-api.onrender.com) | **Live / Healthy** |

---

## 4. Build & Start Commands

- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Start Command**: Managed automatically by Render's high-performance static file CDN / edge infrastructure.

---

## 5. Environment Variable Names

| Variable Name | Required | Default Value | Notes |
| :--- | :--- | :--- | :--- |
| `BASE_URL` | Optional | `/` | Defines base asset resolution URL for Vite. Configured in `.env.example`. No secret keys or database credentials are required. |

---

## 6. Deployment & Functional Test Results

### Automated Vitest Suite (Local Pre-Deployment)
- **Status**: Passed (24/24 tests)
- **Coverage**: RBAC security matrix, stock tracking across warehouses, atomic sales ledger transactions, purchase returns, and currency formatting.

### Render Cloud Build
- **Deploy ID**: `dep-dbb53v6i0phs73f0b7p0`
- **Duration**: ~21 seconds
- **Result**: `live` (HTTP 200 OK across HTML, CSS bundles, JS modules, and vector assets)

### Playwright End-to-End Verification against Production URL
Headless Chromium ran a full automated workflow test against `https://inventory-v2-web-demo.onrender.com`:
- **Initial Load**: HTTP 200, title `"Next Inventory — Web Demo"`, brand assets loaded.
- **Authentication**: Admin demo one-click role switch succeeded; session token stored.
- **Dashboard**: KPI cards rendered, real-time sales/profit figures displayed, demo badge verified.
- **Product Catalog View**: Route `/#/products` loaded successfully.
- **POS Register View**: Route `/#/pos` container initialized with cashier controls.
- **Customers View**: Route `/#/customers` ledger and balances displayed.
- **Sales Orders View**: Route `/#/sales` rendered historic transactions.
- **Console Errors**: **0 JavaScript runtime errors / 0 failed network requests.**

---

## 7. Render Resources Audit & Cleanup

### Resources Retained (Protected State)
1. **`inventory-v2-web-demo`** (`srv-dbb53umi0phs73f0b6qg`): Newly deployed static site.
2. **`touriva-web`** (`srv-dbb3a78m7kps73aspl90`): Production Touriva frontend web application.
3. **`touriva-api`** (`srv-dbb3a4lg1s2s73e3ll9g`): Production Touriva REST API.

### Resources Deleted (Obsolete Services & Projects Approved by User)
The following 7 obsolete services and 1 obsolete project wrapper were removed following explicit user approval:

| Resource Name | Resource ID | Resource Type | Associated Git Repo | Deletion Status |
| :--- | :--- | :--- | :--- | :--- |
| **`nextDelivery_backEnd`** | `srv-d3jqvv7diees73cokvvg` | `web_service` | `Bouafia19/nextDelivery_backEnd` | **Deleted** |
| **`nextDelivery_backEnd-1`** | `srv-d3jsb1vdiees73cpluag` | `web_service` | `Bouafia19/nextDelivery_backEnd` | **Deleted** |
| **`nextOnlineStore_backEnd`** | `srv-d3kemsripnbc73fqog5g` | `web_service` | `Bouafia19/nextOnlineStore_backEnd` | **Deleted** |
| **`aloBati`** | `srv-cjb6mipitvpc73f98kog` | `web_service` | `Bouafia19/aloBati_backEnd` | **Deleted** |
| **`aloBati_backEnd`** | `srv-cjb64k1itvpc73f4mogg` | `web_service` | `Bouafia19/aloBati_backEnd` | **Deleted** |
| **`csc_backEnd`** | `srv-ckmm34g710pc739j7ung` | `web_service` | `Bouafia19/csc_backEnd` | **Deleted** |
| **`cubnes_backEnd`** | `srv-cmcl81md3nmc73dc8ru0` | `web_service` | `Bouafia19/cubnes_backend` | **Deleted** |
| **`onlineStore`** *(Project)* | `prj-d3hoqhu3jp1c73fnfv4g` | `project` | N/A | **Deleted** |

> [!NOTE]
> No GitHub repositories, local project directories, or external databases were deleted. Only obsolete Render cloud instances were decommissioned.

---

## 8. Touriva Preservation Verification

Continuous verification was executed before, during, and after the cleanup:
- **`https://touriva-web.onrender.com`**: Returns HTTP `200 OK` (Cloudflare cached edge response, unmodified).
- **`https://touriva-api.onrender.com/api/health`**: Returns HTTP `200 OK` with JSON health payload:
  ```json
  {"status":"ok","timestamp":"2026-10-19T17:30:33.000Z"}
  ```
- **Configuration & Environment**: All Touriva environment variables, build settings, database URIs, and custom configs remain untouched and intact.

---

## 9. Outstanding Issues, Limitations & Cost Assessment

- **Cost Assessment**: **$0.00 / month (100% Free Tier)**. Both `inventory-v2-web-demo` and `touriva-web` are static sites which are free on Render. `touriva-api` operates on Render's free web service tier. Deleting 7 obsolete web services eliminated stale resources and risks of dormant resource limits.
- **Client-Side Data Persistence**: Data modified by a user is persisted exclusively in that user's browser `localStorage`. Each visitor has an isolated sandbox. Clicking **"Reset Data"** in the top navigation bar returns the application to its pristine seed dataset at any time.
- **No Blocking Limitations**: The demo is fully functional, performant, and ready for public evaluation.
