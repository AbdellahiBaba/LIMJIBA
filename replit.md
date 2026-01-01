# POLY FLECTA PLASTICA - Business Management System

## Overview

A fully offline, professionally branded business management system for an industrial plastic packaging manufacturer. The application provides four core modules: Invoice Generation (matching PDF sample format), Stock/Inventory Management, Point-of-Sale (POS) interface, and Reseller Rewards Program. Built as a full-stack TypeScript application with React frontend and Express backend, using in-memory storage for complete offline functionality.

**Company:** POLY FLECTA PLASTICA  
**Industry:** Industrial plastic packaging manufacturing  
**Status:** MVP Complete - All four modules functional

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

### Core Modules
1. **Dashboard** - Business statistics with 5 stat cards (products, sales, invoices, resellers, low stock alerts)
2. **Stock Management** - Full CRUD for products, low stock alerts (threshold 10), search/filter
3. **Invoice Generation** - Create/view/delete invoices, PDF generation with French number-to-words conversion
4. **POS (Point of Sale)** - Product grid, cart system, checkout with payment modes, receipt printing
5. **Reseller Rewards** - Track purchases, threshold-based reward pool, random winner draw
6. **Profit Calculator** - Net profit analysis with configurable costs, monthly expenses, salaries, and product-level profitability metrics

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **API Design:** RESTful endpoints under `/api/*` prefix
- **Storage:** In-memory storage (MemStorage class) for offline operation

### Data Storage
- **Type:** In-memory storage (Map-based)
- **Schema Location:** `shared/schema.ts` (shared types between frontend/backend)
- **Seeded Data:** 8 products (plastic bags), 3 resellers for testing

Core entities:
- Products (inventory with stock tracking, low stock alerts)
- Invoices and InvoiceItems (B2B billing with PDF generation)
- Sales and SaleItems (POS transactions with automatic stock deduction)
- Resellers (partner program with purchase tracking and reward pool)

### Key Design Decisions

**Offline-First:** Uses in-memory storage instead of PostgreSQL for complete offline functionality. No external dependencies required.

**Shared Schema Pattern:** Types defined in `shared/schema.ts` and used by both frontend and backend for type safety.

**Industrial Branding:** Custom design tokens matching company branding (industrial blues, professional greys) defined in `design_guidelines.md`.

**Stock Deduction:** POS sales automatically reduce product stock quantities and update reseller purchase totals.

## Recent Changes

**January 2026:**
- Added Profit Calculator module with monthly revenue analysis, cost breakdown, and product-level profitability metrics
- Added invoice preview component to Branding page showing live logo, watermark, colors, and language settings
- Added profit calculator translations in French and Arabic locale files
- Fixed SelectItem empty value error in POS page (changed value="" to value="none")
- Completed all five core modules with full functionality
- Added theme toggle for light/dark mode support
- Implemented French number-to-words conversion for invoices
- Added sidebar navigation with all module links

## File Structure

```
client/src/
├── pages/
│   ├── dashboard.tsx      # Main dashboard with stats
│   ├── stock.tsx          # Product/inventory management
│   ├── invoices.tsx       # Invoice list
│   ├── invoice-form.tsx   # Create new invoice
│   ├── invoice-view.tsx   # View invoice details
│   ├── pos.tsx            # Point of sale interface
│   ├── resellers.tsx      # Reseller rewards program
│   └── profit-calculator.tsx # Net profit analysis
├── components/
│   ├── app-sidebar.tsx    # Main navigation sidebar
│   └── theme-toggle.tsx   # Dark/light mode toggle
└── lib/
    └── queryClient.ts     # React Query configuration

server/
├── routes.ts              # All API endpoints
├── storage.ts             # In-memory storage implementation
└── index.ts               # Express server entry

shared/
└── schema.ts              # TypeScript types and interfaces
```

## External Dependencies

### Frontend Libraries
- @tanstack/react-query: Server state management
- Radix UI: Accessible primitive components
- Lucide React: Icon library
- date-fns: Date formatting

### Backend Libraries
- express: Web framework
- drizzle-zod: Schema validation (types only)
- zod: Runtime validation

### Build Tools
- Vite: Frontend bundler
- tsx: TypeScript execution
