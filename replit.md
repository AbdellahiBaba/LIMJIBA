# LIMJIBA / لمجيبة - E-Commerce Management System

## Overview

A comprehensive e-commerce management system branded as **LIMJIBA / لمجيبة** (Mauritanian premium import & e-commerce). Provides modules for Invoice Generation (standard and manufacturing), Stock/Inventory Management, Point-of-Sale (POS), Reseller Rewards Program, Salaries Management, Business Expenses Tracking, Profit Analytics, Supplier Management, Purchase Orders, Shipments, Audit Trail, Advanced Reporting, and a trilingual public storefront with customer authentication. All old plastic business data (POLY FLECTA PLASTICA) has been completely removed and replaced with LIMJIBA branding.

**Brand Identity:** Royal Navy (#0A1628) + Royal Gold (#C9A84C) + Deep Black (#060B14) + Ivory (#FAF6EE), Montserrat typography. Gold gradient: linear-gradient(135deg, #C9A84C, #B8963F, #D4B55A). Logo: camel + plane + world map with Arabic "لمجيبة" + "IMPORTING" text.
**Currency:** MRU (Mauritanian Ouguiya / أوقية)
**Languages:** Arabic, French, English (trilingual with RTL support)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter
- **State Management:** TanStack React Query
- **UI Components:** shadcn/ui on Radix UI
- **Styling:** Tailwind CSS with LIMJIBA premium theme, Montserrat font, gold accent system
- **Build Tool:** Vite
- **Localization:** French, Arabic, and English (trilingual) with RTL support. Admin uses `t()` from `useLanguage()` context with locale JSON files (`client/src/locales/en.json`, `fr.json`, `ar.json`). Store uses separate `useStoreLanguage()` context with `client/src/locales/store.ts`. Currency uses MRU everywhere.

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **API Design:** RESTful endpoints (`/api/*`)
- **Database:** PostgreSQL with Drizzle ORM
- **Storage:** Persistent DatabaseStorage.

### Core Modules
- **Dashboard:** Business statistics, sales, invoices, low stock alerts, quick invoices stat, recent activity feed, clickable low stock alerts, period-filtered KPIs (today/week/month/year), average order value, outstanding credit, top customer, revenue vs expenses comparison. Widget customization with visibility toggles, ordering (move up/down), and localStorage persistence.
- **Stock Management:** CRUD for products with full cost breakdown (purchase price, shipping cost, additional cost → auto-calculated cost price per unit), weight, low stock alerts, favorite products toggle (`isFavorite`), product image upload (Base64, max 2MB), barcode label printing (individual and bulk, Code128 format, 3-column A4 grid layout). Dynamic categories fetched from `/api/categories`.
- **Invoice Generation:** Standard (FA-) and Manufacturing (FAB-) invoices with PDF generation, delivery status tracking (none/prepared/shipped/delivered), multi-payment timeline, email draft feature.
- **Quick Invoice:** Standalone service invoice generator with auto-numbering (FR-XXXX/YYYY), discount support (% or fixed), saved copies in history, preview and print-ready. Independent from main system (no stock/sales/accounting impact).
- **POS (Point of Sale):** Product grid with favorites section, cart with quick customer name input, checkout, payment modes, receipt printing, recent sales panel, out-of-stock overlays, stock quantity badges, park/hold sale (F3 shortcut) with resume functionality.
- **Sales Management:** View, filter, update, delete, CSV export.
- **Reseller Rewards:** Track purchases, reward pool, random winner draw. Inline unpaid tickets count and outstanding balance columns in reseller list. Account Detail dialog (eye icon) shows summary cards (total sales, unpaid count, total paid, total unpaid) and full sales history table with paid/remaining/status per ticket. Per-sale "Record Payment" inline form (amount + method + confirm) and "Mark All as Paid" bulk action in dialog. Reseller names clickable in Sales page to navigate to resellers. Reusable `ResellerAccountDialog` component. Mobile-responsive tables with hidden columns on small screens.
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
- **Shipments:** Logistics documents tracking product movements. Auto-numbered (BT-XXXX/YYYY), three directions (delivery=warehouse→customer, return=customer→warehouse, client_return=client→warehouse), cost breakdown (fuel/driver/other), product line items with weight tracking and display-only unit price/total value. Status flow: pending→in_transit→completed→cancelled. NO stock movements or financial impact — strictly logistics documentation.
- **Backup & Restore:** Enhanced with last backup date tracking, restore file preview (entity counts), backup reminder warnings.

### Public Storefront (LIMJIBA / لمجيبة)
- **Path:** `/store/*` (public, no auth required for browsing)
- **Design:** Premium royal luxury brand identity with Royal Navy (#0A1628) + Royal Gold (#C9A84C) + Deep Black (#060B14) + Ivory (#FAF6EE). Gold gradient accents, glassmorphism header, animated hero with glow effects, premium card system with hover zoom, trust badges.
- **Features:** Trilingual (AR/FR/EN) with language switcher, product browsing (in-stock only) with product images, search/filter by dynamic categories with pill selectors, product detail pages with premium layout, cart with localStorage persistence, promo code validation, checkout with wallet payment selection and payment proof upload, order tracking with visual timeline by email/order number.
- **Stock Enforcement:** Out-of-stock products hidden from store. Cart context enforces max quantity per product via `addItem(item, qty, maxStock)` and `updateQuantity(id, qty, maxStock)`. `getItemQuantity(productId)` helper checks current cart quantity. "Only X left" badges when stock ≤ 5. Buttons disabled at max. Toast notifications when limits reached.
- **Customer Auth:** Separate from admin login. Customers can register, login, view profile, and auto-fill checkout. Session stored in `req.session.storeCustomer`.
- **Notifications:** In-store notification bell in header with unread count badge. Shows trilingual notifications for payment confirmations and order updates. Mark as read functionality.
- **Pages:** home (premium hero + trust badges + categories + featured), products (premium cards + category pills), product detail (premium layout + secure/delivery badges), cart (premium summary + gold accents), checkout (with payment step), orders (with visual timeline), about (brand story + values), contact (premium cards + WhatsApp), terms, login, signup, profile.
- **Payment System:** 3 mobile wallet options (Bankily, Masrvi, Sedad) stored in `payment_wallets` table. Checkout requires selecting a wallet, viewing its number, and uploading payment proof screenshot before order submission. Server-side enforcement of payment proof.
- **Order Tracking:** Visual 4-step timeline (Placed → Confirmed → Shipped → Delivered) with color-coded progress. Search by order number or email.
- **Translation System:** `client/src/locales/store.ts` with full AR/FR/EN translations including payment, wallet, order tracking, checkout, and stock enforcement strings. `StoreLanguageProvider` + `useStoreLanguage()` hook. Language switcher in store header (EN/FR/عر buttons).
- **Auto Language Detection:** First-time visitors automatically see the store in their browser's language (navigator.language → ar/fr/en). Stored in localStorage after first detection; subsequent visits respect manual selection.
- **RTL Support:** When Arabic selected, `dir="rtl"` set on store container.
- **Guest vs Account Checkout:** Non-authenticated users see a prompt at checkout offering to create an account (with benefits: order tracking, faster checkout, notifications) or continue as guest. Login/signup pages support `?redirect=checkout` to return users to checkout after authentication.
- **PWA Support:** Installable as a Progressive Web App. Manifest at `/manifest.json`, service worker at `/sw.js` with network-first caching strategy. Install prompt component (`pwa-install-prompt.tsx`) shows install banner on supported browsers and iOS Safari instructions. Dismissible with 7-day re-prompt.
- **CMS Pages:** About/Contact/Terms render HTML content via `dangerouslySetInnerHTML`.

### Premium CSS System
- **CSS Variables:** `--royal-navy`, `--royal-gold`, `--royal-gold-light`, `--royal-gold-dark`, `--deep-black`, `--ivory`, `--gold-gradient` defined in `.store-theme`.
- **Animations:** `animate-fade-in-up` (with delay variants -1 through -3), `animate-float`, `gold-pulse`, `shimmer-slide`.
- **Premium Classes:** `store-card-premium` (hover zoom + gold border), `store-btn-gold` (gradient + shimmer + scale), `gold-text` (gradient text), `gold-divider` (subtle gold line), `hero-glow` (animated orbs), `glass-card`, `premium-badge`, `trust-badge`, `card-image` (zoom transition).

### Admin Portal
- **Sidebar:** Premium header with LIMJIBA branding + gold accents. Active items marked with gold border. Separate "Online Store" section with Store Orders, Promo Codes, CMS, LIMJIBA Agent, and View Store link.
- **Store Orders Admin:** Expandable order cards with payment proof viewer dialog, status management dropdown, payment confirmation button, multi-channel notification (email/WhatsApp/in-store).

### Category Management
- **Table:** `categories` in schema.ts with id, name, nameAr, nameFr, icon, sortOrder, isActive, createdAt.
- **API:** GET/POST/PUT/DELETE `/api/categories` (admin), GET `/api/store/categories` (public).
- **Seeded Categories:** Electronics, Fashion, Home & Living, Beauty & Health, Food & Groceries, Sports & Outdoors, Books & Stationery, Accessories, Other.
- **Stock Integration:** `stock.tsx` fetches categories dynamically from `/api/categories`.

### Customer Authentication
- **Table:** `store_customers` in schema.ts with id, email, passwordHash, fullName, phone, address, language, isActive, createdAt.
- **API Routes:** POST signup/login/logout, GET session/profile, PUT profile at `/api/store/auth/*`.
- **Context:** `client/src/contexts/store-auth-context.tsx` with `StoreAuthProvider` + `useStoreAuth()`.
- **Session:** Uses `req.session.storeCustomer` (separate from admin `req.session.userId`).

### LIMJIBA AI Agent
- AI-powered assistant using OpenAI (gpt-4o-mini via Replit AI Integrations).
- Customer-facing smart marketing chat widget on all store pages (floating bubble, bottom-right). Opens with quick-action chips: Best Sellers, Promotions, Track Order, Payment Status, Contact Us (all trilingual). Agent proactively suggests popular products, mentions active promo codes, and recommends related items. Strictly scoped to store-related topics only.
- Store language passed to chat API so agent responds in the correct language (AR/FR/EN).
- Order tracking: Agent detects order numbers in conversation, looks up order data including payment confirmation status, and reports status/items/total to customer.
- Admin-side chat panel at `/limjiba` provides sales insights, restock alerts, promo code generation.
- Backend: `server/limjiba.ts`. Cost optimizations: SHA-256 response cache (30min TTL, 200 max entries, namespaced by mode+context fingerprint), compressed system prompts, history limited to 10 messages with 2000-char assistant truncation.

### Payment Wallets
- **Table:** `payment_wallets` in schema.ts with id, name, nameAr, nameFr, walletNumber, iconType, isActive, sortOrder.
- **API:** GET `/api/store/wallets` (public, active only), CRUD at `/api/payment-wallets` (admin).
- **Seeded Wallets:** Bankily, Masrvi, Sedad with placeholder numbers.
- **Store Orders:** Now include `paymentMethod` and `paymentProof` fields. Server enforces payment proof before order creation.

### Promo Codes
- Full CRUD management at `/promo-codes`. Supports percentage/fixed discounts, min order amounts, max uses, expiry dates. AI-generated promo codes with safe margin calculation.

### Store Orders
- Admin order management at `/store-orders`. View all customer orders, update status (pending→confirmed→shipped→delivered→cancelled), expand for detail view. Payment method and payment proof display with proof image viewer dialog. Stock impact: confirming an order deducts inventory, cancelling a confirmed order restores inventory. Audit logging on status changes.
- **Payment Confirmation:** Separate "Confirm Payment" action with visual badge indicator. Audit logged.
- **Multi-Channel Notifications:** Admin can notify customers via Email (mailto: with pre-filled message), WhatsApp (wa.me deep link), or In-Store notification (saved to `store_notifications` table). All messages trilingual (AR/FR/EN).

### CMS (Content Management)
- Admin CMS at `/cms` with tabs for Pages (home/about/contact/terms editing), Banners (create/toggle/delete promotional banners), and Store Settings (store name, colors, hero text, contact info, social media links for WhatsApp/Instagram/Facebook/Snapchat/TikTok).

### Data Storage
- **Type:** PostgreSQL database using Drizzle ORM.
- **Schema:** Shared `shared/schema.ts` for type safety between frontend/backend.
- **Key Entities:** Products (with `isFavorite`, `imageUrl`, `purchasePrice`, `shippingCost`, `additionalCost`), Invoices (with `deliveryStatus`, `deliveryCost`), Manufacturing Invoices, Sales (with `deliveryCost`), Resellers, Employees, Salary Payments, Expenses, Customers, Quick Invoices, Suppliers, Purchase Orders (with `shippingCost`), Purchase Order Items (with `shippingCostShare`, `adjustedUnitCost`), Shipments, Shipment Items, Parked Sales, Audit Logs, Users (with roles/permissions), Promo Codes, Store Orders (with `paymentConfirmed`, `paymentConfirmedAt`), Store Notifications, CMS Pages, CMS Banners, Store Settings, Conversations, Messages, Categories, Store Customers.

### Key Design Decisions
- **Shared Schema Pattern:** Centralized type definitions for consistent data structures.
- **E-Commerce Branding:** LIMJIBA / لمجيبة — Mauritanian premium import & e-commerce brand.
- **Currency:** MRU (Mauritanian Ouguiya) throughout the entire application.
- **Multilingual Support:** French/Arabic/English with RTL for Arabic. Admin and store have separate translation systems.
- **Stock Deduction:** POS sales automatically update product stock and reseller purchase totals.
- **Stock Enforcement (Store):** Cart context tracks max stock per item. `addItem()` and `updateQuantity()` accept `maxStock` param. Out-of-stock hidden by backend filter. Cart validates against live product stock.
- **PostgreSQL Database Architecture:**
    - Production: Requires Neon database (`NEON_DATABASE_URL`) with safety guards.
    - Development: Prefers Neon, falls back to Replit DB (`DATABASE_URL`).
    - Standard `pg` driver with Drizzle ORM, connection pooling, and automatic `search_path`.
    - Migrations via runtime migration in `server/db.ts` `runMigrations()`.
- **Cold-Start Optimization:** In-memory caching (`server/cache.ts`) for frequently accessed data with 30-second TTL.
- **Session Separation:** Admin uses `req.session.userId`, store customers use `req.session.storeCustomer`.
- **Route Ordering:** Specific routes (e.g., `/api/promo-codes/generate`) MUST come before generic `/:id` param routes. Store route detection: `location === "/store" || location.startsWith("/store/")` (not `.startsWith("/store")` to avoid matching `/store-orders`).
- **Granular Permissions:** `ALL_PERMISSIONS` exported from `shared/schema.ts`.
- **Audit Logging:** `storage.createAuditLog(...)` called in login, user CRUD, supplier CRUD, PO operations, etc. Wrapped in try/catch.
- **serverReady guard:** In `server/index.ts` — critical for startup, do not remove.
- **AI Cache:** Namespaced by `mode` (customer/admin) + context fingerprint — do not break.

## External Dependencies

### Frontend Libraries
- @tanstack/react-query
- Radix UI
- Lucide React
- react-icons (SiWhatsapp, SiInstagram, SiFacebook, SiSnapchat, SiTiktok)
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
