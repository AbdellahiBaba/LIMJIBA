# POLY FLECTA PLASTICA - Business Management System

## Overview

A professionally branded business management system for an industrial plastic packaging manufacturer, POLY FLECTA PLASTICA. The application provides comprehensive modules for Invoice Generation (standard and fabrication), Stock/Inventory Management, Point-of-Sale (POS), Reseller Rewards Program, Salaries Management, Business Expenses Tracking, and Profit Analytics. The primary goal is to streamline business operations and provide robust analytics for better decision-making.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter
- **State Management:** TanStack React Query
- **UI Components:** shadcn/ui on Radix UI
- **Styling:** Tailwind CSS with industrial branding (blue #1976D2 theme) and Roboto font.
- **Build Tool:** Vite
- **Localization:** French, Arabic, and Bilingual modes with RTL support.

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **API Design:** RESTful endpoints (`/api/*`)
- **Database:** PostgreSQL with Drizzle ORM
- **Storage:** Persistent DatabaseStorage.

### Core Modules
- **Dashboard:** Business statistics, sales, invoices, low stock alerts, quick invoices stat, recent activity feed, clickable low stock alerts, period-filtered KPIs (today/week/month/year), average order value, outstanding credit, top customer, revenue vs expenses comparison.
- **Stock Management:** CRUD for products, cost price, weight, low stock alerts, favorite products toggle (`isFavorite`).
- **Invoice Generation:** Standard (FA-) and Fabrication (FAB-) invoices with PDF generation.
- **Quick Invoice (Facture Rapide):** Standalone service invoice generator with auto-numbering (FR-XXXX/YYYY), discount support (% or fixed), saved copies in history, preview and print-ready. Independent from main system (no stock/sales/accounting impact).
- **POS (Point of Sale):** Product grid with favorites section, cart with quick customer name input, checkout, payment modes, receipt printing, recent sales panel, out-of-stock overlays, stock quantity badges.
- **Sales Management:** View, filter, update, delete, CSV export.
- **Reseller Rewards:** Track purchases, reward pool, random winner draw.
- **Salaries Management:** Employee records and monthly salary payments, CSV export.
- **Expenses Tracking:** Categorized business expenses, CSV export.
- **Profit Calculator:** Net profit analysis from sales, salaries, and expenses.
- **Customer Portal:** Public token-secured customer statement page at `/portal/:customerId?token=...` showing balance, credit limit, and transaction history. Link generated from Customers page.
- **Global Search (Command Bar):** Ctrl+K or search icon opens a universal search across products, customers, resellers, invoices, and sales.
- **Notification Center:** Bell icon with badge showing low stock warnings, overdue invoices, and credit limit exceeded alerts with dismiss functionality.
- **CSV Export:** Available on all major list pages (Sales, Invoices, Stock, Expenses, Customers, Salaries).
- **DataTable Component:** Reusable table with sorting, pagination, search, selection, and bulk operations (`client/src/components/data-table.tsx`).

### Data Storage
- **Type:** PostgreSQL database using Drizzle ORM.
- **Schema:** Shared `shared/schema.ts` for type safety between frontend/backend.
- **Key Entities:** Products (with `isFavorite`), Invoices, Fabrication Invoices, Sales, Resellers, Employees, Salary Payments, Expenses, Customers, Quick Invoices.

### Key Design Decisions
- **Shared Schema Pattern:** Centralized type definitions for consistent data structures.
- **Industrial Branding:** Custom design tokens aligned with company branding.
- **Multilingual Support:** French/Arabic/Bilingual modes with RTL for Arabic.
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
- **Fabrication Invoice Logic:** Stored separately as manufacturing costs, not revenue. Automatically updates product `costPrice` and `stockQuantity` upon creation.
- **Customer Portal Security:** Token-based access using SHA-256 hash of customer ID + SESSION_SECRET. Tokens generated via authenticated `/api/customers/:id/portal-token` endpoint.
- **Route Ordering:** Specific routes (e.g., `/api/customers/:id/portal-token`, `/api/quick-invoices/next-number`, `/api/sales/lookup`) MUST come before generic `/:id` param routes.

## External Dependencies

### Frontend Libraries
- @tanstack/react-query
- Radix UI
- Lucide React
- date-fns

### Backend Libraries
- express
- drizzle-orm
- drizzle-zod
- zod
- pg
- crypto (Node built-in)

### Build Tools
- Vite
- tsx
- drizzle-kit
