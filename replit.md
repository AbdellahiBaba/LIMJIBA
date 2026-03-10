# E-Commerce Manager - Business Management System

## Overview

A comprehensive e-commerce management system providing modules for Invoice Generation (standard and manufacturing), Stock/Inventory Management, Point-of-Sale (POS), Reseller Rewards Program, Salaries Management, Business Expenses Tracking, Profit Analytics, Supplier Management, Purchase Orders, Shipments, Audit Trail, and Advanced Reporting with profitability tracking. The primary goal is to streamline e-commerce operations and provide robust analytics for better decision-making.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter
- **State Management:** TanStack React Query
- **UI Components:** shadcn/ui on Radix UI
- **Styling:** Tailwind CSS with blue #1976D2 theme and Roboto font.
- **Build Tool:** Vite
- **Localization:** French, Arabic, and English (trilingual) with RTL support. All UI strings use `t()` translation function from `useLanguage()` context. Currency uses `t("common.currency")` key. Login page uses inline `isRTL` ternary pattern (FR/AR only). Print templates use `getLabel()` bilingual helper.

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **API Design:** RESTful endpoints (`/api/*`)
- **Database:** PostgreSQL with Drizzle ORM
- **Storage:** Persistent DatabaseStorage.

### Core Modules
- **Dashboard:** Business statistics, sales, invoices, low stock alerts, quick invoices stat, recent activity feed, clickable low stock alerts, period-filtered KPIs (today/week/month/year), average order value, outstanding credit, top customer, revenue vs expenses comparison. Widget customization with visibility toggles, ordering (move up/down), and localStorage persistence.
- **Stock Management:** CRUD for products, cost price, weight, low stock alerts, favorite products toggle (`isFavorite`), barcode label printing (individual and bulk, Code128 format, 3-column A4 grid layout).
- **Invoice Generation:** Standard (FA-) and Manufacturing (FAB-) invoices with PDF generation, delivery status tracking (none/prepared/shipped/delivered), multi-payment timeline, email draft feature.
- **Quick Invoice:** Standalone service invoice generator with auto-numbering (FR-XXXX/YYYY), discount support (% or fixed), saved copies in history, preview and print-ready. Independent from main system (no stock/sales/accounting impact).
- **POS (Point of Sale):** Product grid with favorites section, cart with quick customer name input, checkout, payment modes, receipt printing, recent sales panel, out-of-stock overlays, stock quantity badges, park/hold sale (F3 shortcut) with resume functionality.
- **Sales Management:** View, filter, update, delete, CSV export.
- **Reseller Rewards:** Track purchases, reward pool, random winner draw. Inline unpaid tickets count and outstanding balance columns in reseller list. Account Detail dialog (eye icon) shows summary cards (total sales, unpaid count, total paid, total unpaid) and full sales history table with paid/remaining/status per ticket. Per-sale "Record Payment" inline form (amount + method + confirm) and "Mark All as Paid" bulk action in dialog. Reseller names clickable in Sales page to navigate to resellers. Reusable `ResellerAccountDialog` component (`client/src/components/reseller-account-dialog.tsx`) used in both Resellers and Sales pages. Mobile-responsive tables with hidden columns on small screens.
- **Salaries Management:** Employee records and monthly salary payments, CSV export.
- **Expenses Tracking:** Categorized business expenses, CSV export.
- **Profit Calculator:** Net profit analysis from sales, salaries, and expenses. Includes shipping cost and delivery cost in calculations.
- **Customer Portal:** Public token-secured customer statement page at `/portal/:customerId?token=...` showing balance, credit limit, and transaction history. Link generated from Customers page.
- **Supplier Management:** Full CRUD for suppliers (name, phone, email, address, notes). CSV export. Page: `/suppliers`.
- **Purchase Orders:** Create/manage POs with auto-numbering (PO-XXXX/YYYY), supplier selection, product line items, status tracking (draft/ordered/received/cancelled), receive action that auto-updates stock + costPrice + creates stock movements. Shipping cost distribution (by quantity or by value) with adjusted unit costs. Page: `/purchase-orders`.
- **Audit Trail:** Comprehensive activity logging for login, user management, supplier/PO operations, sales, invoices, products, expenses. Filterable admin page at `/audit-log` with user/action/entity/date filters.
- **Advanced Reporting:** P&L Statement, Sales Analysis, Product Performance, Product Profitability, Batch Profitability tabs with date ranges and CSV export. Page: `/reports`.
- **User Management:** Admin settings page with user CRUD (username, password, display name, role, permissions checkboxes), activate/deactivate users, granular module-level permissions.
- **Global Search (Command Bar):** Ctrl+K or search icon opens a universal search across products, customers, resellers, invoices, and sales.
- **Notification Center:** Bell icon with badge showing low stock warnings, overdue invoices, and credit limit exceeded alerts with dismiss functionality.
- **CSV Export:** Available on all major list pages (Sales, Invoices, Stock, Expenses, Customers, Salaries, Suppliers, Purchase Orders).
- **DataTable Component:** Reusable table with sorting, pagination, search, selection, and bulk operations (`client/src/components/data-table.tsx`).
- **Shipments:** Logistics documents tracking product movements. Auto-numbered (BT-XXXX/YYYY), three directions (delivery=warehouse→customer, return=customer→warehouse, client_return=client→warehouse), cost breakdown (fuel/driver/other), product line items with weight tracking and display-only unit price/total value (auto-filled from product catalog, no financial impact). Status flow: pending→in_transit→completed→cancelled. NO stock movements or financial impact — strictly logistics documentation. Branded print template with company header, colored table headers, signature areas. Page: `/transportation`.
- **Backup & Restore:** Enhanced with last backup date tracking, restore file preview (entity counts), backup reminder warnings.
- **Public Storefront (LEMJIBA / لمجيبه):** Premium royal-themed customer-facing store at `/store/*` (public, no auth). Features: product browsing (in-stock only), search/filter by category, product detail pages, cart with localStorage persistence, promo code validation, checkout with order placement, order tracking by email/order number. Royal Blue (#1B3A6B) + Deep Gold (#C9A84C) + Black (#0A1628) theme with Montserrat typography. Pages: home, products, product detail, cart, checkout, orders, about, contact, terms.
- **LEMJIBA AI Agent:** AI-powered assistant using OpenAI (gpt-4o-mini via Replit AI Integrations). Customer-facing chat widget on all store pages (floating bubble, bottom-right) answers product queries, recommends items, speaks AR/FR/EN. Admin-side chat panel at `/limjiba` provides sales insights, restock alerts, promo code generation. Backend: `server/limjiba.ts`. Cost optimizations: SHA-256 response cache (30min TTL, 200 max entries, namespaced by mode+context fingerprint), compressed system prompts (~50% token reduction), history limited to 10 messages with 2000-char assistant truncation, reduced max_tokens.
- **Promo Codes:** Full CRUD management at `/promo-codes`. Supports percentage/fixed discounts, min order amounts, max uses, expiry dates. AI-generated promo codes with safe margin calculation. Admin page: `/promo-codes`.
- **Store Orders:** Admin order management at `/store-orders`. View all customer orders, update status (pending→confirmed→shipped→delivered→cancelled), expand for detail view.
- **CMS (Content Management):** Admin CMS at `/cms` with tabs for Pages (home/about/contact/terms editing), Banners (create/toggle/delete promotional banners), and Store Settings (store name, colors, hero text, contact info).

### Data Storage
- **Type:** PostgreSQL database using Drizzle ORM.
- **Schema:** Shared `shared/schema.ts` for type safety between frontend/backend.
- **Key Entities:** Products (with `isFavorite`), Invoices (with `deliveryStatus`, `deliveryCost`), Manufacturing Invoices, Sales (with `deliveryCost`), Resellers, Employees, Salary Payments, Expenses, Customers, Quick Invoices, Suppliers, Purchase Orders (with `shippingCost`), Purchase Order Items (with `shippingCostShare`, `adjustedUnitCost`), Shipments, Shipment Items, Parked Sales, Audit Logs, Users (with roles/permissions), Promo Codes, Store Orders, CMS Pages, CMS Banners, Store Settings, Conversations, Messages.

### Key Design Decisions
- **Shared Schema Pattern:** Centralized type definitions for consistent data structures.
- **E-Commerce Branding:** Customizable branding with configurable company information.
- **Multilingual Support:** French/Arabic/English with RTL for Arabic.
- **Stock Deduction:** POS sales automatically update product stock and reseller purchase totals.
- **PostgreSQL Database Architecture:**
    - Production: Requires Neon database (`NEON_DATABASE_URL`) with safety guards.
    - Development: Prefers Neon, falls back to Replit DB (`DATABASE_URL`).
    - Standard `pg` driver with Drizzle ORM, connection pooling, and automatic `search_path`.
    - Migrations via runtime migration in `server/db.ts` `runMigrations()`.
- **Cold-Start Optimization:** In-memory caching (`server/cache.ts`) for frequently accessed data with 30-second TTL.
    - Cache-first pattern for major collections.
    - Mutations invalidate relevant caches.
    - Database operations wrapped with retry logic for error recovery.
    - Stale-while-revalidate: Dashboard queries use `staleTime: 30000` for smoother navigation.
- **GAAP/IFRS Compliance:**
    - Historical COGS tracking: `costPrice` stored at transaction time for accurate profit calculation.
    - Invoice Type Classification: `invoiceType` field ('SALE', 'FABRICATION', 'SERVICE') to distinguish revenue.
    - Inventory Valuation: GAAP/IFRS-compliant `stockQuantity × costPrice`.
    - Pre-Transaction Validation: Stock, costPrice, and quantity checks for sales and invoices.
    - Consistent 2-Decimal Rounding for all monetary calculations.
    - Stock movements logged for audit trail on POS sales.
    - Corrected profit calculation incorporating all relevant costs and revenues.
- **Manufacturing Invoice Logic:** Stored separately as manufacturing costs, not revenue. Automatically updates product `costPrice` and `stockQuantity` upon creation.
- **Customer Portal Security:** Token-based access using SHA-256 hash of customer ID + SESSION_SECRET. Tokens generated via authenticated `/api/customers/:id/portal-token` endpoint.
- **Route Ordering:** Specific routes (e.g., `/api/customers/:id/portal-token`, `/api/quick-invoices/next-number`, `/api/purchase-orders/next-number`, `/api/sales/lookup`) MUST come before generic `/:id` param routes.
- **Granular Permissions:** `ALL_PERMISSIONS` exported from `shared/schema.ts`; permissions stored as JSON string array in users.permissions. `hasPermission(user, module)` checks access. Admin always has full access.
- **Audit Logging:** `storage.createAuditLog(...)` called in login, user CRUD, supplier CRUD, PO operations, delivery status, sales, invoices, products, expenses. Wrapped in try/catch to never break main operations.
- **Purchase Order Receive:** `receivePurchaseOrder(id, receivedBy)` auto-updates product stock + costPrice + creates stock movements.
- **Shipping Cost Distribution:** Shipping costs on purchase orders can be distributed across items by quantity or by value, updating adjusted unit costs.
- **Delivery Status:** Values: 'none' | 'prepared' | 'shipped' | 'delivered'. Shown as color-coded badges on invoice list and detail view.
- **Parked Sales:** POS cart can be parked (saved to server) and resumed later. F3 keyboard shortcut.

## External Dependencies

### Frontend Libraries
- @tanstack/react-query
- Radix UI
- Lucide React
- date-fns
- recharts

### Backend Libraries
- express
- drizzle-orm
- drizzle-zod
- zod
- pg
- bcrypt
- crypto (Node built-in)
- openai (via Replit AI Integrations)

### Build Tools
- Vite
- tsx
- drizzle-kit
