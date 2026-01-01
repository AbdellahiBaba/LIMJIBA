# POLY FLECTA PLASTICA - Business Management System

## Overview

A fully-featured business management system for an industrial plastic packaging manufacturing company. The application provides invoice generation, stock/inventory management, point-of-sale (POS) functionality, and a reseller rewards program. Built as a full-stack TypeScript application with React frontend and Express backend, using PostgreSQL for data persistence.

**Company:** POLY FLECTA PLASTICA  
**Industry:** Industrial plastic packaging manufacturing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight alternative to React Router)
- **State Management:** TanStack React Query for server state and caching
- **UI Components:** shadcn/ui component library built on Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens matching company branding (industrial blues, greys, metallic accents)
- **Build Tool:** Vite with HMR support

The frontend follows a page-based structure with shared components. Key modules include:
- Dashboard with business statistics
- Invoice generation and management with PDF export capability
- Stock/inventory management with low-stock alerts
- POS system for direct sales
- Reseller management with rewards tracking

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript (compiled with tsx for development, esbuild for production)
- **API Design:** RESTful endpoints under `/api/*` prefix
- **Server Structure:** Single entry point (`server/index.ts`) with modular route registration

The server handles all CRUD operations for products, invoices, sales, and resellers. It serves the static frontend in production and proxies to Vite dev server in development.

### Data Storage
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM with drizzle-zod for schema validation
- **Schema Location:** `shared/schema.ts` (shared between frontend and backend)
- **Migrations:** Managed via drizzle-kit (`db:push` command)

Core entities:
- Users (authentication)
- Products (inventory items with stock tracking)
- Invoices and InvoiceItems (B2B billing)
- Sales and SaleItems (POS transactions)
- Resellers (partner program with rewards)

### Key Design Decisions

**Shared Schema Pattern:** The database schema is defined in `shared/schema.ts` and used by both frontend (for type safety) and backend (for database operations). This eliminates type drift between layers.

**In-Memory Storage Fallback:** The storage layer (`server/storage.ts`) abstracts data access, allowing for in-memory storage during development or when database is unavailable.

**Component Library:** Using shadcn/ui provides accessible, customizable components without the overhead of a full component framework. Components are copied into the project for full control.

**Monorepo Structure:** Single repository with `client/`, `server/`, and `shared/` directories. Path aliases (`@/`, `@shared/`) simplify imports.

## External Dependencies

### Database
- **PostgreSQL:** Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple:** Session storage for Express sessions

### Frontend Libraries
- **@tanstack/react-query:** Server state management and caching
- **Radix UI:** Accessible primitive components (dialogs, dropdowns, forms)
- **Lucide React:** Icon library
- **date-fns:** Date formatting and manipulation
- **embla-carousel-react:** Carousel functionality
- **react-day-picker:** Date picker component
- **recharts:** Charting library for dashboard visualizations

### Backend Libraries
- **express:** Web framework
- **drizzle-orm:** Database ORM
- **zod:** Schema validation
- **express-session:** Session management

### Build Tools
- **Vite:** Frontend bundler with React plugin
- **esbuild:** Production server bundling
- **tsx:** TypeScript execution for development

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal:** Error overlay for development
- **@replit/vite-plugin-cartographer:** Development tooling