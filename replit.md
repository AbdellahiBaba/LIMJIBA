# POLY FLECTA PLASTICA - Business Management System

## Overview

A professionally branded business management system for an industrial plastic packaging manufacturer. The application provides comprehensive modules: Invoice Generation (standard + fabrication), Stock/Inventory Management, Point-of-Sale (POS), Reseller Rewards Program, Salaries Management, Business Expenses Tracking, and Profit Analytics. Built as a full-stack TypeScript application with React frontend and Express backend, using PostgreSQL database for persistent data storage.

**Company:** POLY FLECTA PLASTICA  
**Industry:** Industrial plastic packaging manufacturing  
**Status:** MVP Complete - All modules functional with persistent database

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight router)
- **State Management:** TanStack React Query for server state and caching
- **UI Components:** shadcn/ui component library built on Radix UI primitives
- **Styling:** Tailwind CSS with industrial branding (blue #1976D2 theme)
- **Typography:** Roboto font family (Material Design)
- **Build Tool:** Vite with HMR support
- **Localization:** French, Arabic, and Bilingual modes with RTL support

### Core Modules
1. **Dashboard** - Business statistics with stat cards (products, sales, invoices, resellers, low stock alerts)
2. **Stock Management** - Full CRUD for products with cost price and weight tracking, low stock alerts
3. **Invoice Generation** - Standard invoices (FA- prefix) and Fabrication invoices (FAB- prefix) with PDF generation
4. **POS (Point of Sale)** - Product grid, cart system, checkout with payment modes, receipt printing
5. **Reseller Rewards** - Track purchases, threshold-based reward pool, random winner draw
6. **Salaries Management** - Employee records, monthly salary payments, payment history
7. **Expenses Tracking** - Business expenses by category (electricity, rent, supplies, etc.)
8. **Profit Calculator** - Net profit analysis with automated data from sales, salaries, and expenses

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **API Design:** RESTful endpoints under `/api/*` prefix
- **Database:** PostgreSQL with Drizzle ORM
- **Storage Class:** DatabaseStorage (persistent)

### Data Storage
- **Type:** PostgreSQL database (Drizzle ORM)
- **Schema Location:** `shared/schema.ts` (shared types between frontend/backend)
- **Migrations:** `npm run db:push` for schema updates

Core entities:
- Products (inventory with stock, cost price, weight per unit)
- Invoices and InvoiceItems (B2B billing with PDF generation)
- FabricationInvoices and FabricationItems (manufacturing invoices)
- Sales and SaleItems (POS transactions with automatic stock deduction)
- Resellers (partner program with purchase tracking and reward pool)
- Employees (staff management with monthly salary)
- SalaryPayments (payment records by month/year)
- Expenses (business expenses by category)

### Key Design Decisions

**PostgreSQL Database:** Uses Drizzle ORM with PostgreSQL for persistent data storage across restarts.

**Shared Schema Pattern:** Types defined in `shared/schema.ts` and used by both frontend and backend for type safety.

**Industrial Branding:** Custom design tokens matching company branding defined in `design_guidelines.md`.

**Multilingual Support:** French/Arabic/Bilingual modes with RTL layout for Arabic.

**Stock Deduction:** POS sales automatically reduce product stock quantities and update reseller purchase totals.

**Neon PostgreSQL:** Migrated from Replit PostgreSQL to Neon PostgreSQL for better reliability and faster cold-starts:
- Uses `@neondatabase/serverless` driver with WebSocket support
- Connection pooling with Neon-optimized settings (max=20, idleTimeout=10s, connectionTimeout=5s)
- Connection string from `NEON_DATABASE_URL` environment variable
- Schema management via `drizzle-kit push` (requires `DATABASE_URL` override for migrations)

**Cold-Start Optimization:** In-memory caching layer (`server/cache.ts`) provides instant responses during database wake-up:
- Cache-first pattern for all major collections (products, invoices, sales, resellers, employees, expenses, fabrication_invoices, dashboard_stats)
- 30-second TTL for frequently changing business data
- All mutations invalidate relevant caches to prevent stale data
- Server starts immediately; DB verification runs in background
- All DB operations wrapped in withRetry() for automatic error recovery
- Health endpoints always return 200 with status in response body

## Recent Changes

**January 2026:**
- Migrated from in-memory storage to PostgreSQL database for data persistence
- Added Salaries module for employee management and payment tracking
- Added Expenses module for business expense tracking by category
- Added Fabrication Invoice module for manufacturing invoices
- Extended products table with costPrice and weightPerUnit fields
- Added automated profit statistics endpoint (/api/profit-stats)
- Added translations for all new modules in French and Arabic
- Updated sidebar navigation with Salaries and Expenses links

## File Structure

```
client/src/
├── pages/
│   ├── dashboard.tsx          # Main dashboard with stats
│   ├── stock.tsx              # Product/inventory management
│   ├── invoices.tsx           # Invoice list
│   ├── invoice-form.tsx       # Create new standard invoice
│   ├── invoice-view.tsx       # View invoice details
│   ├── fabrication-invoice.tsx # Create fabrication invoice
│   ├── pos.tsx                # Point of sale interface
│   ├── resellers.tsx          # Reseller rewards program
│   ├── salaries.tsx           # Employee and salary management
│   ├── expenses.tsx           # Business expense tracking
│   ├── profit-calculator.tsx  # Net profit analysis
│   └── branding.tsx           # Company branding settings
├── components/
│   ├── app-sidebar.tsx        # Main navigation sidebar
│   ├── theme-toggle.tsx       # Dark/light mode toggle
│   └── language-switcher.tsx  # Language selection
├── contexts/
│   └── language-context.tsx   # i18n and branding context
├── locales/
│   ├── fr.json                # French translations
│   └── ar.json                # Arabic translations
└── lib/
    └── queryClient.ts         # React Query configuration

server/
├── routes.ts                  # All API endpoints
├── storage.ts                 # DatabaseStorage implementation
├── db.ts                      # Drizzle database connection
└── index.ts                   # Express server entry

shared/
└── schema.ts                  # TypeScript types, Drizzle schemas, Zod validation
```

## API Endpoints

### Products
- GET /api/products - List all products
- GET /api/products/:id - Get single product
- POST /api/products - Create product
- PATCH /api/products/:id - Update product
- DELETE /api/products/:id - Delete product

### Invoices
- GET /api/invoices - List all invoices
- GET /api/invoices/:id - Get invoice with items
- POST /api/invoices - Create invoice with items
- DELETE /api/invoices/:id - Delete invoice

### Fabrication Invoices
- GET /api/fabrication-invoices - List all
- GET /api/fabrication-invoices/:id - Get with items
- GET /api/fabrication-invoices/next-number - Get next invoice number
- POST /api/fabrication-invoices - Create
- DELETE /api/fabrication-invoices/:id - Delete

### Employees
- GET /api/employees - List all employees
- GET /api/employees/:id - Get single employee
- POST /api/employees - Create employee
- PATCH /api/employees/:id - Update employee
- DELETE /api/employees/:id - Delete employee

### Salary Payments
- GET /api/salary-payments - List all payments
- POST /api/salary-payments - Create payment
- DELETE /api/salary-payments/:id - Delete payment

### Expenses
- GET /api/expenses - List all expenses
- GET /api/expenses/:id - Get single expense
- POST /api/expenses - Create expense
- PATCH /api/expenses/:id - Update expense
- DELETE /api/expenses/:id - Delete expense

### Analytics
- GET /api/profit-stats?startDate=&endDate= - Get profit statistics for date range

## External Dependencies

### Frontend Libraries
- @tanstack/react-query: Server state management
- Radix UI: Accessible primitive components
- Lucide React: Icon library
- date-fns: Date formatting

### Backend Libraries
- express: Web framework
- drizzle-orm: PostgreSQL ORM
- drizzle-zod: Schema validation
- zod: Runtime validation
- pg: PostgreSQL driver

### Build Tools
- Vite: Frontend bundler
- tsx: TypeScript execution
- drizzle-kit: Database migrations
