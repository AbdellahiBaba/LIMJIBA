A comprehensive e-commerce management system branded as LIMJIBA / لمجيبة (Mauritanian premium import & e-commerce). 

<div align="center">

<!-- Frontend -->
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/UI-shadcn%2Fui-000000.svg)](https://ui.shadcn.com)
[![Radix UI](https://img.shields.io/badge/Components-Radix_UI-161618.svg?logo=radix-ui&logoColor=white)](https://www.radix-ui.com)
[![TanStack Query](https://img.shields.io/badge/State-TanStack_Query-FF4154.svg?logo=reactquery&logoColor=white)](https://tanstack.com/query)

<!-- Backend -->
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/API-Express.js-000000.svg?logo=express&logoColor=white)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

<!-- Database -->
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-FFDA79.svg)](https://orm.drizzle.team)

<!-- AI -->
[![OpenAI](https://img.shields.io/badge/AI-OpenAI-412991.svg?logo=openai&logoColor=white)](https://platform.openai.com)

<!-- Storefront -->
[![PWA](https://img.shields.io/badge/Storefront-PWA-5A0FC8.svg?logo=pwa&logoColor=white)](https://developer.mozilla.org/docs/Web/Progressive_web_apps)
[![RTL Support](https://img.shields.io/badge/Language-RTL_Arabic-FFCC00.svg)](#)
[![Localization](https://img.shields.io/badge/i18n-EN%2FFR%2FAR-008080.svg)](#)

<!-- Branding -->
[![Branding](https://img.shields.io/badge/Brand-LIMJIBA-FFD700.svg)](#)
[![Currency](https://img.shields.io/badge/Currency-MRU-0A1628.svg)](#)

<!-- Security -->
[![Security](https://img.shields.io/badge/Security-Helmet.js-000000.svg)](https://helmetjs.github.io)
[![Rate Limiting](https://img.shields.io/badge/Security-Rate_Limiting-orange.svg)](#)

<!-- Email -->
[![SMTP](https://img.shields.io/badge/Email-Zoho_SMTP-CC0000.svg)](https://www.zoho.com/mail/)

<!-- License -->
[![License](https://img.shields.io/badge/License-Proprietary-8B0000.svg)](#)

</div>


System Summary
LIMJIBA is a full‑stack, enterprise‑grade e‑commerce and business operations platform designed for import, retail, and multi‑channel sales environments. It provides a unified system for inventory control, invoicing, POS operations, financial management, customer engagement, logistics, and advanced reporting. The platform includes a trilingual public storefront with customer authentication and a complete administrative backend for operational management.

System Architecture
Frontend
Framework: React 18 + TypeScript

Routing: Wouter

State Management: TanStack React Query

UI Layer: shadcn/ui built on Radix UI primitives

Styling: Tailwind CSS with a custom premium theme and Montserrat typography

Build Tool: Vite

Localization: Full trilingual support (Arabic, French, English) with RTL handling

Admin translations via useLanguage() context

Storefront translations via useStoreLanguage() context

Currency: MRU (Mauritanian Ouguiya) used consistently across all modules

Backend
Runtime: Node.js

Language: TypeScript

API Architecture: RESTful endpoints under /api/*

Database: PostgreSQL with Drizzle ORM

Storage Layer: Persistent database storage with shared schema definitions for type‑safe frontend/backend integration

Core Functional Modules
1. Dashboard & Business Intelligence
Real‑time KPIs (daily/weekly/monthly/yearly)

Sales, invoices, and low‑stock alerts

Revenue vs. expenses analytics

Opening balance, wallet balances, and net profit

Customizable widgets with local persistence

Store order history with per‑product profit tracking

2. Stock & Inventory Management
Full product CRUD with cost breakdown (purchase, shipping, additional costs → auto‑calculated unit cost)

Multi‑image gallery (up to 6 images, Base64)

Low‑stock alerts and favorite product tagging

Dynamic categories from /api/categories

Shopify‑style product form with:

Media gallery

Pricing & cost structure

Inventory

Variant generation (up to 3 options → cartesian product)

Variant table with per‑variant images and stock

Barcode label printing (Code128, A4 grid)

AI‑generated trilingual product descriptions

3. Invoicing System
Standard invoices (FA‑) and manufacturing invoices (FAB‑)

Delivery status workflow

Multi‑payment timeline

PDF generation

Email draft support

Quick Invoice Module:

Independent service invoice generator

Auto‑numbering (FR‑XXXX/YYYY)

Discount support

Print‑ready output

No impact on stock or accounting

4. Point‑of‑Sale (POS)
Product grid with favorites

Quick customer input

Payment modes: Cash, Card, Credit, Wallet

Receipt printing (MRU currency)

Park/Hold sale (F3) with resume

Out‑of‑stock overlays and quantity badges

Wallet payments integrated with customer wallet balance

5. Sales & Reseller Management
Sales CRUD with CSV export

Reseller rewards program with random winner selection

Detailed reseller account view with unpaid balances

Inline payment recording and bulk “Mark All as Paid”

Mobile‑responsive tables

6. Salaries, Expenses & Profit Analytics
Employee salary management with CSV export

Categorized business expenses

Net profit calculator including shipping and delivery costs

7. Customer Portal
Token‑secured customer statement page

Displays balance, credit limit, and transaction history

8. Supplier & Purchase Order Management
Supplier CRUD with CSV export

Purchase orders with auto‑numbering (PO‑XXXX/YYYY)

Status workflow (draft → ordered → received → cancelled)

Receiving a PO updates stock, cost price, and stock movements

Shipping cost distribution (by quantity or value)

Optional wallet deduction on PO receive

9. Audit Trail
Comprehensive activity logging across all modules

Filterable by user, action, entity, and date

10. Advanced Reporting
Profit & Loss

Sales analysis

Product performance

Batch profitability

CSV export for all reports

11. User & Permission Management
Full user CRUD

Role‑based permissions with granular module‑level access control

Activate/deactivate users

12. Global Search & Notification Center
Universal search (Ctrl+K) across all major entities

Notification center for low stock, overdue invoices, credit limit alerts

13. Marketing & Automated Notifications
Bulk marketing notifications with trilingual templates

AI‑generated marketing content

Automated notifications for:

New product arrivals

Flash sales

Abandoned carts

Rich HTML emails with product details

Batched sending with error isolation

14. Shipments & Logistics
Logistics documentation (BT‑XXXX/YYYY)

Delivery, return, and client return flows

Cost breakdown and weight tracking

No financial or stock impact (documentation only)

15. Backup & Restore
Backup timestamp tracking

Restore preview with entity counts

Backup reminders

Public Storefront
Storefront Features
Trilingual (AR/FR/EN) with RTL support

Product browsing with dynamic categories

Product detail pages with variant selection

Cart with local persistence

Promo code validation

Wallet payment with proof upload

Order tracking with visual timeline

Customer authentication (separate from admin)

In‑store notifications for order updates

Storefront Enhancements
Deals of the Day with countdown

Recently viewed items

Product comparison (up to 4 items)

Personalized recommendations

Customer reviews & store reviews

Loyalty program with points earning & redemption

PWA support with install prompt

AI‑Powered Features
AI‑generated product descriptions (EN/FR/AR)

AI‑generated marketing notifications

Smart customer‑facing chat agent:

Best sellers

Promotions

Order tracking

Payment status

Contact support

Admin‑side AI panel for insights and promo code generation

Optimized with SHA‑256 caching and prompt compression

Customer Authentication & Security
Separate customer session system

Password reset with token flow

Guest auto‑registration on order placement

Strong session management with inactivity timeout

CSRF validation, rate limiting, and secure headers

XSS‑safe HTML generation

IDOR protection for order tracking

Admin Portal
Dedicated /portal/* interface

Premium sidebar with module grouping

Auto‑closing sidebar on mobile

Store Orders, Promo Codes, CMS, Store Customers, AI Agent, and more

Payment proof viewer and multi‑channel notifications

CMS & Store Content Management
Editable pages (Home, About, Contact, Terms)

Banner management

Store settings (name, hero text, contact info, social links)

Trust badges, CTA text, footer description

Category management with images and trilingual names

Database Architecture
PostgreSQL with Drizzle ORM

Shared schema for type‑safe frontend/backend integration

Connection pooling and automatic search_path

Runtime migrations

In‑memory caching for high‑traffic endpoints

Security & Hardening
Helmet security headers

Permissions‑Policy restrictions

Sensitive path blocking middleware

Rate limiting on auth and API routes

Sanitized production error responses

HMAC‑SHA256 tokens for guest chat

Zod validation on all POST/PATCH routes
tsx
drizzle-kit
