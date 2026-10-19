# Next Inventory (Inventory V2) — Frontend-Only Web Demo

A production-quality, standalone frontend web demonstration of **Next Inventory (Inventory V2)**, reproducing the complete desktop application's workflows, visual identity, business logic, and document printing directly in modern web browsers without Electron, Node.js backend services, or SQLite database servers.

---

## 🌟 Key Highlights & Architectural Features

- **100% Browser-Native Execution**: Runs entirely client-side using Vue 3, Vite, Vuetify 3, and Pinia. Zero server or database installations required.
- **Persistent Local State**: Full CRUD persistence across page reloads using browser `localStorage` with relational simulation (products, multi-warehouse stock, ledger movements, sales, purchases, customers, and vendors).
- **Realistic Algerian Business Logic & Seed Data**:
  - Currency: Algerian Dinar (`DA`) formatted with centime accounting precision.
  - Tax compliance: TVA 19% & 9%, legal stamp duty (*Timbre fiscal* max 2,500 DA).
  - Preloaded with 20 realistic hardware/tech products (with vector SVG images), 3 warehouses (*Main Warehouse*, *Secondary Depot*, *Showroom*), 4 business customers, 4 suppliers, and historic transactions.
- **Client-Side Document Engine & Printing**:
  - Commercial A4 Invoices and Credit Notes generated via `jsPDF` client-side.
  - 80mm thermal point-of-sale receipt layout with browser print stylesheets (`@media print`).
  - Barcode label generation with scannable Code128 barcodes via `JsBarcode`.
  - Replaces Electron silent printing and IPC dialogs with accessible browser print previews and downloads.
- **Multilingual & RTL Support**:
  - Full support for English, French, and Arabic.
  - Instant RTL layout orientation flipping when Arabic is selected.
- **Demo Safety & Usability**:
  - Topbar "Demo Mode (Local Storage)" indicator badge.
  - One-click "Reset Data" button with confirmation modal to restore sample dataset anytime.
  - Quick role switch buttons on Login screen for instant testing.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ or 20+
- Modern Web Browser (Chrome, Firefox, Edge, Safari)

### 2. Installation
```bash
cd "inventory-v2-web-demo"
npm install
```

### 3. Development Server
```bash
npm run dev
```
Open the printed URL (typically `http://localhost:5173`) in your browser.

### 4. Production Build & Static Preview
```bash
# Build production bundle into dist/
npm run build

# Preview production build locally
npm run preview
```
The resulting `dist/` folder contains pure static HTML, CSS, and JS files ready to be deployed to any static host (Cloudflare Pages, GitHub Pages, Netlify, Vercel, AWS S3, or Nginx).

### 5. Running Automated Tests
```bash
npm test
```
Executes the comprehensive Vitest unit and integration test suite covering:
- Local storage repository engine
- RBAC authentication and role management
- Master data CRUD (Categories, Warehouses, Units, Brands, Taxes)
- Product catalog and barcode validation
- Multi-warehouse stock tracking and valuation calculation
- Atomic sales transactions and receivable ledger charges
- Purchase orders and vendor payable balances
- Credit notes and debit notes with stock/ledger rollback
- POS session lifecycle and held sales
- Real-time dashboard KPI aggregations
- Document generation (A4 invoices, 80mm receipts, barcode labels)

---

## 👤 Demo User Accounts

You can log in manually or click one of the quick demo buttons on the Login page:

| Username | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **Administrator** | Full access to all 18 modules, system settings, user management, and ledger |
| `manager` | `admin123` | **Inventory Manager** | Products, warehouses, inventory valuation, stock adjustments, purchases |
| `cashier` | `admin123` | **Cashier / POS** | Point of Sale, sales orders, customer lookup, receipt printing |

---

## 📦 Implemented Modules & Workflows

1. **Dashboard & KPIs**: Real-time sales totals, cost vs revenue, gross profit, stock valuation, low-stock warnings, and recent transaction timeline.
2. **Product Catalog**: Full product listing with category filter, search, creation modal, stock by warehouse breakdown, barcode generator, and Excel export.
3. **Inventory Management**: Multi-warehouse stock tracking, inventory valuation summaries, stock movements ledger, and manual stock adjustment dialog.
4. **Point of Sale (POS)**: Fast register with barcode scanning search, quick product grid, multi-item cart, discount handling, hold/resume order queue, payment modal, and 80mm receipt printing.
5. **Sales & Commercial Invoices**: Sales order list, multi-warehouse item dispatch, discount/stamp computation, customer receivable ledger tracking, order cancellation with automatic stock restoration, and A4 invoice PDF preview.
6. **Purchases**: Supplier purchase order creation, automatic stock increment per warehouse, payable balance tracking, order cancellation, and document preview.
7. **Credit & Debit Notes**: Customer returns (credit notes) and vendor returns (debit notes) with automated reversal of stock and balances.
8. **Customers & Vendors**: Directory with balance indicators, settlement modal (recording incoming/outgoing payments), and full transaction history ledger.
9. **Transfers**: Inter-warehouse stock transfers with automatic ledger entries.
10. **Master Data**: Categories/Families, Units of Measurement, Brands, Warehouses, and Tax rates management.
11. **Settings & Role Management**: Company details, VAT/Timbre settings, role permissions matrix, and profile settings.
12. **Barcode Labels & Document Preview**: Multi-product barcode label printing, customized page preview, and direct browser printing.

---

## 🛠️ Architecture: Desktop vs. Web Demo Adapter

The web demo preserves 100% of the Vue renderer code from the original desktop application. Instead of talking to Electron IPC handlers (`window.api`), a browser adapter (`src/api/index.js`) satisfies the exact same asynchronous interface:

```
┌────────────────────────────────────────────────────────┐
│              Vue 3 Renderer Application                │
│    (Views, Components, Pinia Stores, Vue-Router)       │
└──────────────────────────┬─────────────────────────────┘
                           │ window.api (Unified Contract)
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
[Desktop Application]               [Frontend Web Demo]
 Electron IPC Main Process           Browser LocalStorage Engine
 SQLite3 + Knex.js DB                In-Memory / LocalStorage Repository
 Native printToPDF / Silent Print    jsPDF + Browser Print Dialog (@media print)
 Native OS File Dialogs              HTML5 File Picker & Blob Downloads
```

### Storage Model
All records are saved as JSON tables in browser `localStorage`:
- `_demo_db_products`
- `_demo_db_product_stock`
- `_demo_db_stock_movements`
- `_demo_db_sales` & `_demo_db_sale_items`
- `_demo_db_purchases` & `_demo_db_purchase_items`
- `_demo_db_customers` & `_demo_db_customer_ledger`
- `_demo_db_vendors` & `_demo_db_vendor_ledger`
- `_demo_db_pos_registers` & `_demo_db_pos_sessions`
- `_demo_db_users`, `_demo_db_roles`, `_demo_db_settings`, etc.

Clicking **"Reset Data"** in the top navigation bar clears modified keys and reloads the pristine seed dataset.

---

## 🔒 Security & Privacy Notice

- This is a client-side demonstration designed for presentation, evaluation, and UX review.
- Authentication and session states are simulated in browser storage; **do not use this demo for sensitive or production customer data**.
- No credentials, tokens, or private customer records are transmitted over the network.
