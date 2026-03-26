A comprehensive e-commerce management system branded as LIMJIBA / لمجيبة (Mauritanian premium import & e-commerce). Provides modules for Invoice Generation (standard and manufacturing), Stock/Inventory Management, Point-of-Sale (POS), Reseller Rewards Program, Salaries Management, Business Expenses Tracking, Profit Analytics, Supplier Management, Purchase Orders, Shipments, Audit Trail, Advanced Reporting, and a trilingual public storefront with customer authentication. All old plastic business data (POLY FLECTA PLASTICA) has been completely removed and replaced with LIMJIBA branding.

Brand Identity: Royal Navy (#0A1628) + Royal Gold (#C9A84C) + Deep Black (#060B14) + Ivory (#FAF6EE), Montserrat typography. Gold gradient: linear-gradient(135deg, #C9A84C, #B8963F, #D4B55A). Logo: camel + plane + world map with Arabic "لمجيبة" + "IMPORTING" text. Currency: MRU (Mauritanian Ouguiya / أوقية) Languages: Arabic, French, English (trilingual with RTL support)

User Preferences
Preferred communication style: Simple, everyday language.

System Architecture
Frontend
Framework: React 18 with TypeScript
Routing: Wouter
State Management: TanStack React Query
UI Components: shadcn/ui on Radix UI
Styling: Tailwind CSS with LIMJIBA premium theme, Montserrat font, gold accent system
Build Tool: Vite
Localization: French, Arabic, and English (trilingual) with RTL support. Admin uses t() from useLanguage() context with locale JSON files (client/src/locales/en.json, fr.json, ar.json). Store uses separate useStoreLanguage() context with client/src/locales/store.ts. Currency uses MRU everywhere.
Backend
Runtime: Node.js with Express
Language: TypeScript
API Design: RESTful endpoints (/api/*)
Database: PostgreSQL with Drizzle ORM
Storage: Persistent DatabaseStorage.
Core Modules
Dashboard: Business statistics, sales, invoices, low stock alerts, quick invoices stat, recent activity feed, clickable low stock alerts, period-filtered KPIs (today/week/month/year), average order value, outstanding credit, top customer, revenue vs expenses comparison. Widget customization with visibility toggles, ordering (move up/down), and localStorage persistence. Balance sheet section with opening balance, income/expense breakdown, wallet balances, net profit, current balance. Store orders history with per-product profit tracking and expandable order details.
Stock Management: CRUD for products with full cost breakdown (purchase price, shipping cost, additional cost → auto-calculated cost price per unit), weight, low stock alerts, favorite products toggle (isFavorite), multi-image upload gallery (up to 6 images, Base64, max 2MB each, first image = primary), barcode label printing (individual and bulk, Code128 format, 3-column A4 grid layout). Dynamic categories fetched from /api/categories. Shopify-style full-page product form at /emanager-portal/stock/new and /emanager-portal/stock/:id/edit with: media gallery, title/descriptions, pricing/cost breakdown, inventory, and option-based variant generation (up to 3 options with cartesian product auto-generation, editable variant table with per-variant image upload, stock per variant, and total stock summary row). Batch variant endpoint: POST /api/products/:id/variants/batch. AI description generation: POST /api/ai/generate-descriptions generates trilingual (EN/FR/AR) product descriptions via OpenAI, accessible from "AI Generate" button on product form.
Invoice Generation: Standard (FA-) and Manufacturing (FAB-) invoices with PDF generation, delivery status tracking (none/prepared/shipped/delivered), multi-payment timeline, email draft feature.
Quick Invoice: Standalone service invoice generator with auto-numbering (FR-XXXX/YYYY), discount support (% or fixed), saved copies in history, preview and print-ready. Independent from main system (no stock/sales/accounting impact).
POS (Point of Sale): Product grid with favorites section, cart with quick customer name input, checkout, payment modes (Cash, Card, Credit, Wallet), receipt printing with MRU currency, recent sales panel, out-of-stock overlays, stock quantity badges, park/hold sale (F3 shortcut) with resume functionality. Wallet payment debits customer wallet balance. Receipt logo uses dark background (#0A1628) for visibility, with logo priority: query param → storeSettings.logoUrl → branding → hardcoded asset. CMS Store Settings has file upload for logo (base64, max 2MB).
Sales Management: View, filter, update, delete, CSV export.
Reseller Rewards: Track purchases, reward pool, random winner draw. Inline unpaid tickets count and outstanding balance columns in reseller list. Account Detail dialog (eye icon) shows summary cards (total sales, unpaid count, total paid, total unpaid) and full sales history table with paid/remaining/status per ticket. Per-sale "Record Payment" inline form (amount + method + confirm) and "Mark All as Paid" bulk action in dialog. Reseller names clickable in Sales page to navigate to resellers. Reusable ResellerAccountDialog component. Mobile-responsive tables with hidden columns on small screens.
Salaries Management: Employee records and monthly salary payments, CSV export.
Expenses Tracking: Categorized business expenses, CSV export.
Profit Calculator: Net profit analysis from sales, salaries, and expenses. Includes shipping cost and delivery cost in calculations.
Customer Portal: Public token-secured customer statement page at /portal/:customerId?token=... showing balance, credit limit, and transaction history. Link generated from Customers page.
Supplier Management: Full CRUD for suppliers (name, phone, email, address, notes). CSV export. Page: /suppliers.
Purchase Orders: Create/manage POs with auto-numbering (PO-XXXX/YYYY), supplier selection, product line items, status tracking (draft/ordered/received/cancelled), receive action that auto-updates stock + costPrice + creates stock movements. Shipping cost distribution (by quantity or by value) with adjusted unit costs. Optional payment wallet selection — chosen wallet is debited on PO receive. Page: /purchase-orders.
Audit Trail: Comprehensive activity logging for login, user management, supplier/PO operations, sales, invoices, products, expenses. Filterable admin page at /audit-log with user/action/entity/date filters.
Advanced Reporting: P&L Statement, Sales Analysis, Product Performance, Product Profitability, Batch Profitability tabs with date ranges and CSV export. Page: /reports.
User Management: Admin settings page with user CRUD (username, password, display name, role, permissions checkboxes), activate/deactivate users, granular module-level permissions.
Global Search (Command Bar): Ctrl+K or search icon opens a universal search across products, customers, resellers, invoices, and sales.
Notification Center: Bell icon with badge showing low stock warnings, overdue invoices, and credit limit exceeded alerts with dismiss functionality.
Marketing Notifications: Bulk notification dialog (Store Customers page) with 6 pre-built poetic marketing templates (New Arrivals, Flash Sale, VIP Exclusive, Seasonal, Free Shipping, Thank You) and AI Agent "Generate with AI" button that calls POST /api/ai/generate-notification to produce trilingual (EN/AR/FR) poetic marketing content for all 6 notification fields. Admin-only endpoint. Automated product notifications: When a new product is created (POST /api/products), all active store customers automatically receive a "New Arrival" in-app notification + rich HTML email with product image, price, and poetic trilingual content in their preferred language. When a product is toggled to Deal of the Day or its discount changes (PATCH /api/products/:id), all customers receive a "Flash Sale" notification + email with crossed-out price, discount badge, and urgency-themed content. Emails use sendProductMarketingEmail() from server/email.ts. Notifications are batched (5 concurrent) with per-customer error isolation. Helper functions: notifyAllCustomers_NewArrival() and notifyAllCustomers_FlashSale() in server/routes.ts.
Abandoned Cart Reminders: Automated system that tracks carts via abandoned_carts table (created via DB migration in server/db.ts). Frontend syncs cart to POST /api/store/cart/sync when user reaches checkout with an email (logged-in or guest). Background scheduler runs every 15 minutes (processAbandonedCartReminders()), finds carts abandoned for 1+ hour, sends poetic trilingual reminder emails via sendAbandonedCartReminderEmail() in server/email.ts, and creates in-app notifications for registered customers. Completing an order marks the cart as converted. Batched processing (5 concurrent) with per-cart error isolation.
Admin Order Notification: When a customer places a store order, an instant email is sent to the store's contact email (from store_settings.contactEmail → SMTP_USER → support@limjiba.com) containing order number, customer info, itemized list, total, and a direct link to the admin portal orders page.
CSV Export: Available on all major list pages (Sales, Invoices, Stock, Expenses, Customers, Salaries, Suppliers, Purchase Orders).
Shipments: Logistics documents tracking product movements. Auto-numbered (BT-XXXX/YYYY), three directions (delivery=warehouse→customer, return=customer→warehouse, client_return=client→warehouse), cost breakdown (fuel/driver/other), product line items with weight tracking and display-only unit price/total value. Status flow: pending→in_transit→completed→cancelled. NO stock movements or financial impact — strictly logistics documentation.
Backup & Restore: Enhanced with last backup date tracking, restore file preview (entity counts), backup reminder warnings.
Public Storefront (LIMJIBA / لمجيبة)
Path: / (root domain = store), also accessible via /store/* (public, no auth required for browsing)
Design: Premium royal luxury brand identity with Royal Navy (#0A1628) + Royal Gold (#C9A84C) + Deep Black (#060B14) + Ivory (#FAF6EE). Gold gradient accents, glassmorphism header, animated hero with glow effects, premium card system with hover zoom, trust badges.
Features: Trilingual (AR/FR/EN) with language switcher, product browsing (in-stock only) with product images, search/filter by dynamic categories with pill selectors, product detail pages with premium layout, cart with localStorage persistence, promo code validation, checkout with wallet payment selection and payment proof upload, order tracking with visual timeline by email/order number.
Stock Enforcement: Out-of-stock products hidden from store. Cart context enforces max quantity per product via addItem(item, qty, maxStock) and updateQuantity(id, qty, maxStock). getItemQuantity(productId) helper checks current cart quantity. "Only X left" badges when stock ≤ 5. Buttons disabled at max. Toast notifications when limits reached.
Customer Auth: Separate from admin login. Customers can register, login, view profile, and auto-fill checkout. Session stored in req.session.storeCustomer.
Notifications: In-store notification bell in header with unread count badge. Shows trilingual notifications for payment confirmations and order updates. Mark as read functionality.
Pages: home (premium hero + trust badges + categories + featured + deals of the day + recently viewed + recommendations + customer reviews), products (premium cards + category pills + comparison tool), product detail (premium layout + variant selector + trilingual description + reviews section + secure/delivery badges + recently viewed tracking), cart (premium summary + gold accents + variant labels), checkout (with payment step + loyalty points earn preview), orders (with visual timeline), about (brand story + values), contact (premium cards + WhatsApp), terms, login, signup, profile (with loyalty points + order history + store rating), compare (side-by-side product comparison).
Payment System: Mobile wallet options stored in payment_wallets table with iconUrl for custom icon images. Admin can manage wallets (add/edit/delete/toggle/upload icons) via CMS → Payment Wallets tab. Checkout shows custom wallet icons when available, displays wallet number for copying, and requires payment proof screenshot upload before order submission. Server-side enforcement of payment proof.
Order Tracking: Visual 4-step timeline (Placed → Confirmed → Shipped → Delivered) with color-coded progress. Search by order number or email.
Translation System: client/src/locales/store.ts with full AR/FR/EN translations including payment, wallet, order tracking, checkout, and stock enforcement strings. StoreLanguageProvider + useStoreLanguage() hook. Language switcher in store header (EN/FR/عر buttons).
Auto Language Detection: First-time visitors automatically see the store in their browser's language (navigator.language → ar/fr/en). Stored in localStorage after first detection; subsequent visits respect manual selection.
RTL Support: When Arabic selected, dir="rtl" set on store container.
Guest vs Account Checkout: Non-authenticated users see a prompt at checkout offering to create an account (with benefits: order tracking, faster checkout, notifications) or continue as guest. Login/signup pages support ?redirect=checkout to return users to checkout after authentication.
PWA Support: Installable as a Progressive Web App. Manifest at /manifest.json, service worker at /sw.js with network-first caching strategy. Install prompt component (pwa-install-prompt.tsx) shows install banner on supported browsers and iOS Safari instructions. Dismissible with 7-day re-prompt.
CMS Pages: About/Contact/Terms render HTML content via dangerouslySetInnerHTML.
Advanced CMS: Admin CMS page (client/src/pages/cms.tsx) has 5 tabs: Pages, Banners, Store Settings, Payment Wallets, Store Content. The Store Content tab allows editing trust badges (icon + trilingual text), category section title (EN/AR/FR), CTA section text (EN/AR/FR), and footer description (EN/AR/FR). All stored as JSON in store_settings columns (trustBadges, categorySectionTitle, ctaText, footerDescription). Frontend reads from settings with fallback to hardcoded defaults.
Deals of the Day: Products marked as isDealOfDay with dealDiscount (%) shown in dedicated homepage section with countdown timer to midnight. Admin can toggle via stock management product form. Discounted prices calculated in real-time.
Recently Viewed: localStorage-based tracking (limjiba-recently-viewed, max 8 items). Hook: client/src/hooks/use-recently-viewed.ts. Sections on home page and product detail page.
Product Comparison: Session-only context (client/src/contexts/comparison-context.tsx) supporting up to 4 products. Toggle button on product cards (products page), floating comparison bar, dedicated comparison page at /store/compare with side-by-side table.
Personalized Recommendations: "Recommended for You" section on home page. Algorithm uses recently viewed categories to find unseen products in same categories.
Customer Loyalty Program: Full points-based rewards system. loyaltyPoints on store_customers; pointsRedeemed+loyaltyDiscount on store_orders; pointsRate+pointsValue on store_settings; dedicated loyalty_transactions table. Points earned on order delivery (configurable rate, default 0.1 pts/MRU). Points redeemable at checkout with slider (max 50% of order, each point = configurable MRU value, default 1 MRU/pt). Redemption deducts from balance, records transaction, applies discount to total. Admin Loyalty Dashboard at /emanager-portal/loyalty: overview stats cards, customer leaderboard, full transaction history, manual point adjustment dialog, settings to configure pointsRate/pointsValue. Customer profile shows points balance + transaction history. All trilingual (EN/FR/AR).
Product Variants: Products can be single-type or multi-variant (colors, sizes, etc.). hasVariants boolean on products table, product_variants table (variantLabel, unitPrice, stockQuantity, imageUrl per variant). Admin manages variants in stock.tsx form. Store shows variant selector chips on product detail page; cart tracks variant info.
Trilingual Product Descriptions: descriptionEn, descriptionFr, descriptionAr text fields on products table. Admin can add descriptions in 3 languages via product form. Store shows appropriate description based on selected language.
Product Reviews: product_reviews table (productId, customerEmail, customerName, rating 1-5, reviewText). One review per customer per product. Product detail page shows average rating, review list, and write-review form (logged-in customers only). Star rating display near product name.
Store Reviews: store_reviews table (customerEmail, customerName, rating 1-5, reviewText). One review per customer. Homepage shows "Customer Reviews" section with average and latest testimonials. Profile page has "Rate Our Store" form.
Order History on Profile: Logged-in customers see all their past orders on profile page via GET /api/store/auth/my-orders. Shows order number, date, status badge, items, total. Expandable details.
AI Chat Support Behavior: Chat agent directs customers to support@limjiba.com for support/contact requests instead of refusing. Helps with order-related queries, provides support email for anything else.
Live Support Chat: Real-time human-to-human chat support system. Customer-facing: integrated into LIMJIBA chat widget with "Talk to Support" chip, allows starting new conversations (subject + message), viewing history, and real-time message exchange with 3s polling. Admin-facing: dedicated page at /emanager-portal/support-chat with conversation list (search, status filters), message thread view, reply input, status management (open/resolved/closed), and unread count badge in sidebar. Tables: support_conversations (customerEmail, customerName, subject, status, assignedTo, lastMessageAt) and support_messages (conversationId, senderType, senderName, content, isRead). Guest customers must provide name/email; logged-in customers auto-populated. Admin replies trigger in-store notifications to customers.
Premium CSS System
Arabic Typography: Amiri (serif) auto-applied to all h1/h2/h3 headings in .store-theme when RTL. Tajawal/Cairo for body text. CSS classes: .store-heading-ar and .brand-name-ar for explicit Amiri usage.
CSS Variables: --royal-navy, --royal-gold, --royal-gold-light, --royal-gold-dark, --deep-black, --ivory, --gold-gradient defined in .store-theme.
Animations: animate-fade-in-up (with delay variants -1 through -3), animate-float, gold-pulse, shimmer-slide, logo-shine-sweep (diagonal light sweep for logo reveal).
Cinematic Logo Reveal: Premium Canvas-based cinematic animation on homepage hero. Uses AI-generated realistic PNG images (camel, airplane, angular shape, world map) at client/src/assets/cinematic-logo/. 8.5-second reveal sequence with: gold particle system (dust/streaks/sparks), airplane flyby with motion blur trails and contrails, camel materialization with golden glow, angular shape slide-in with light sweep, world map fade-in, Arabic text "لمجيبة" with shimmer, "IMPORTING" gold gradient reveal, and final ambient glow aura. Retina-sharp (devicePixelRatio), reduced-motion support, image-load error fallback to static logo. Component: client/src/components/cinematic-logo-reveal.tsx. Previous SVG animation at client/src/components/svg-logo-animation.tsx and canvas particle animation at client/src/components/logo-animation.tsx are retained as fallbacks but not imported.
Premium Classes: store-card-premium (hover zoom + gold border), store-btn-gold (gradient + shimmer + scale), gold-text (gradient text), gold-divider (subtle gold line), hero-glow (animated orbs), glass-card, premium-badge, trust-badge, card-image (zoom transition).
Admin Portal
Path: /emanager-portal/* (requires authentication)
Sidebar: Premium header with LIMJIBA branding + gold accents. Active items marked with gold border. Separate "Online Store" section with Store Orders, Promo Codes, CMS, Store Customers, LIMJIBA Agent, and View Store link. Auto-closes on mobile after navigation.
Store Orders Admin: Expandable order cards with payment proof viewer dialog, status management dropdown, payment confirmation button, multi-channel notification (email/WhatsApp/in-store). Auto in-store notifications on status changes.
Store Customers Admin: Page at /emanager-portal/store-customers listing all store customers with search, bulk selection, and bulk marketing notification sending (in-store notifications with trilingual title/message).
Category Management
Table: categories in schema.ts with id, name, nameAr, nameFr, icon, imageUrl, sortOrder, isActive, createdAt.
Admin UI: CMS page → Categories tab with full CRUD, Base64 image upload (max 2MB), trilingual names, sort order, active toggle.
Store Display: Homepage category grid shows uploaded category image when available, falls back to Package icon.
API: GET/POST/PUT/DELETE /api/categories (admin), GET /api/store/categories (public).
Seeded Categories: Electronics, Fashion, Home & Living, Beauty & Health, Food & Groceries, Sports & Outdoors, Books & Stationery, Accessories, Other.
Stock Integration: stock.tsx fetches categories dynamically from /api/categories.
Customer Authentication
Table: store_customers in schema.ts with id, email, passwordHash, fullName, phone, address, language, isActive, loyaltyPoints, resetToken, resetTokenExpiry, createdAt.
API Routes: POST signup/login/logout, GET session/profile, PUT profile at /api/store/auth/*. POST forgot-password/reset-password for password reset flow.
Context: client/src/contexts/store-auth-context.tsx with StoreAuthProvider + useStoreAuth().
Session: Uses req.session.storeCustomer (separate from admin req.session.userId).
Password Reset: Forgot password page (/store/forgot-password) generates a reset token, stores it in DB, and (in dev) displays the token link. Reset password page (/store/reset-password?token=...) validates token and sets new password. Token expires after 1 hour.
Guest Auto-Registration: When a guest places an order, a store_customers record is auto-created with their email/name/phone and a random bcrypt password + welcome in-store notification.
LIMJIBA AI Agent
AI-powered assistant using OpenAI (gpt-4o-mini via Replit AI Integrations).
Customer-facing smart marketing chat widget on all store pages (floating bubble, bottom-right). Opens with quick-action chips: Best Sellers, Promotions, Track Order, Payment Status, Contact Us (all trilingual). Agent proactively suggests popular products, mentions active promo codes, and recommends related items. Strictly scoped to store-related topics only.
Store language passed to chat API so agent responds in the correct language (AR/FR/EN).
Order tracking: Agent detects order numbers in conversation, looks up order data including payment confirmation status, and reports status/items/total to customer.
Admin-side chat panel at /limjiba provides sales insights, restock alerts, promo code generation.
Backend: server/limjiba.ts. Cost optimizations: SHA-256 response cache (30min TTL, 200 max entries, namespaced by mode+context fingerprint), compressed system prompts, history limited to 10 messages with 2000-char assistant truncation.
Payment Wallets
Table: payment_wallets in schema.ts with id, name, nameAr, nameFr, walletNumber, iconType, isActive, sortOrder, balance (auto-credited on payment confirmation).
API: GET /api/store/wallets (public, active only), CRUD at /api/payment-wallets (admin).
Seeded Wallets: Bankily, Masrvi, Sedad with placeholder numbers.
Store Orders: Now include paymentMethod and paymentProof fields. Server enforces payment proof before order creation.
Wallet Balance Tracking: When admin confirms payment on a store order, the matching wallet's balance is auto-incremented by order total. Wallet balances displayed on dashboard balance sheet. When a PO is received, the selected wallet is debited by the PO total.
Wallet Operations: Dashboard supports wallet-to-wallet transfers (POST /api/wallets/transfer) and cash credit to wallet (POST /api/wallets/:id/credit). Transfer validates sufficient balance with atomic DB transaction. Both operations audit-logged. Per-wallet opening balance editable on dashboard (POST /api/wallets/:id/opening-balance).
Admin Data Management: POST /api/admin/clear-test-data endpoint to clear audit logs and remove test records matching specific patterns.
Promo Codes
Full CRUD management at /promo-codes. Supports percentage/fixed discounts, min order amounts, max uses, expiry dates. AI-generated promo codes with safe margin calculation.
Store Orders
Admin order management at /store-orders. View all customer orders, update status (pending→confirmed→shipped→delivered→cancelled), expand for detail view. Payment method and payment proof display with proof image viewer dialog. Stock impact: confirming an order deducts inventory, cancelling a confirmed order restores inventory. Audit logging on status changes.
Payment Confirmation: Separate "Confirm Payment" action with visual badge indicator. Audit logged.
Multi-Channel Notifications: Admin can notify customers via Email (mailto: with pre-filled message), WhatsApp (wa.me deep link), or In-Store notification (saved to store_notifications table). All messages trilingual (AR/FR/EN).
CMS (Content Management)
Admin CMS at /cms with tabs for Pages (home/about/contact/terms editing), Banners (create/toggle/delete promotional banners), and Store Settings (store name, colors, hero text, contact info, social media links for WhatsApp/Instagram/Facebook/Snapchat/TikTok).
Data Storage
Type: PostgreSQL database using Drizzle ORM.
Schema: Shared shared/schema.ts for type safety between frontend/backend.
Key Entities: Products (with isFavorite, imageUrl, purchasePrice, shippingCost, additionalCost, isDealOfDay, dealDiscount), Invoices (with deliveryStatus, deliveryCost), Manufacturing Invoices, Sales (with deliveryCost), Resellers, Employees, Salary Payments, Expenses, Customers, Quick Invoices, Suppliers, Purchase Orders (with shippingCost), Purchase Order Items (with shippingCostShare, adjustedUnitCost), Shipments, Shipment Items, Parked Sales, Audit Logs, Users (with roles/permissions), Promo Codes, Store Orders (with paymentConfirmed, paymentConfirmedAt), Store Notifications, CMS Pages, CMS Banners, Store Settings, Conversations, Messages, Categories, Store Customers, Support Conversations, Support Messages.
Key Design Decisions
Shared Schema Pattern: Centralized type definitions for consistent data structures.
E-Commerce Branding: LIMJIBA / لمجيبة — Mauritanian premium import & e-commerce brand.
Currency: MRU (Mauritanian Ouguiya) throughout the entire application.
Multilingual Support: French/Arabic/English with RTL for Arabic. Admin and store have separate translation systems.
Stock Deduction: POS sales automatically update product stock and reseller purchase totals.
Stock Enforcement (Store): Cart context tracks max stock per item. addItem() and updateQuantity() accept maxStock param. Out-of-stock hidden by backend filter. Cart validates against live product stock.
PostgreSQL Database Architecture:
Production: Requires Neon database (NEON_DATABASE_URL) with safety guards.
Development: Prefers Neon, falls back to Replit DB (DATABASE_URL).
Standard pg driver with Drizzle ORM, connection pooling, and automatic search_path.
Migrations via runtime migration in server/db.ts runMigrations().
Cold-Start Optimization: In-memory caching (server/cache.ts) for frequently accessed data with 30-second TTL.
Session Separation: Admin uses req.session.userId, store customers use req.session.storeCustomer.
Admin Session Management: Rolling sessions with 30-minute inactivity timeout. Server-side rolling: true + resave: true resets cookie expiry on every request. Frontend tracks activity (mouse/keyboard/scroll/touch) and resets inactivity timers; heartbeat pings server every 5 minutes while active to keep session alive. Warning toast shown at 25 minutes of inactivity with "Stay Logged In" button. Session expiry triggers logout and redirect. useUnsavedChanges hook on product form prevents data loss on page close/navigation.
Security Hardening: Helmet security headers (CSP, X-Frame-Options, HSTS, etc.), Permissions-Policy header (camera/microphone/geolocation/payment/usb disabled), sensitive path blocking middleware (50+ patterns for dotfiles, CMS probes, config files, debug endpoints — returns 404 before SPA fallback), rate limiting on auth endpoints (5/15min) and API (100/min), Origin/Referer CSRF validation in production, persistent PostgreSQL session store in production (connect-pg-simple), sanitized error responses in production (no DB details leaked), HMAC-SHA256 tokens for guest support chat auth, Zod validation on all 40+ POST/PATCH routes, XSS-safe HTML generation with escapeHtml/sanitizeColor/sanitizeUrl utilities, IDOR protection on order tracking (requires email verification).
Route Ordering: Specific routes (e.g., /api/promo-codes/generate) MUST come before generic /:id param routes. Store route detection: location === "/store" || location.startsWith("/store/") (not .startsWith("/store") to avoid matching /store-orders).
Granular Permissions: ALL_PERMISSIONS exported from shared/schema.ts.
Audit Logging: storage.createAuditLog(...) called in login, user CRUD, supplier CRUD, PO operations, etc. Wrapped in try/catch.
serverReady guard: In server/index.ts — critical for startup, do not remove.
AI Cache: Namespaced by mode (customer/admin) + context fingerprint — do not break.
Email Notifications (Live via SMTP)
Module: server/email.ts — sends real emails via nodemailer SMTP (Zoho Mail). Functions: sendOrderInvoiceEmail, sendOrderStatusEmail, sendWelcomeEmail, sendPasswordResetEmail, sendMarketingEmail.
SMTP Config: SMTP_HOST (env var, default smtp.zoho.com), SMTP_PORT (env var, default 465), SMTP_USER (secret), SMTP_PASS (secret), SMTP_FROM (env var). Zoho SSL on port 465.
Auto Invoice Email: On order creation (POST /api/store/orders), a professional branded HTML invoice is auto-sent to customer email with itemized table, totals, discounts, delivery cost, payment method, order status. Trilingual (EN/FR/AR with RTL). Controlled by autoEmailInvoice toggle in store settings (CMS → Store Settings → Email Notifications).
Payment Confirmed Email: When admin confirms payment (PATCH /api/store-orders/:id/confirm-payment), a branded email is auto-sent to customer with payment amount, order number, and a "Track Your Order" button linking to /store/orders. Trilingual, respects autoEmailInvoice toggle.
Auto Triggers: Order creation → invoice email. Order status changes → status email. Payment confirmed → payment confirmation email. Signup → welcome email. All non-blocking (fire-and-forget with error logging).
Personalized Product Recommendations
API: GET /api/store/recommendations — weighted scoring algorithm combining purchase patterns, browsing history, and product popularity
Signals: Purchase category frequency (weight 5×qty), co-bought products (weight 2), browsed categories (weight 3), favorites (weight 1), deals (weight 2), high-rated reviews (weight up to 3)
Query params: email (customer purchase history), viewedIds (browsed product IDs), viewedCategories (browsed categories), excludeId (current product), limit (max 30, default 12)
Frontend: Store homepage "Recommended For You" section uses API; product detail "Related Products" section uses API with current product category context
Fallback: If insufficient scored results, fills with popular/featured products
Files: server/routes.ts (endpoint), client/src/pages/store/home.tsx (homepage section), client/src/pages/store/product-detail.tsx (related products)
Number Input Fix
Admin pages use a pattern that allows clearing number fields to empty string (not stuck at zero). State accepts string | number, converts on blur/submit. Affected: stock, POS, invoices, expenses, salaries, purchase orders, resellers, customers, CMS.
External Dependencies
Frontend Libraries
@tanstack/react-query
Radix UI
Lucide React
react-icons (SiWhatsapp, SiInstagram, SiFacebook, SiSnapchat, SiTiktok)
date-fns
recharts
Backend Libraries
express
drizzle-orm
drizzle-zod
zod
pg
bcrypt
crypto (Node built-in)
openai (via Replit AI Integrations)
nodemailer (SMTP email transport)
helmet (security headers)
express-rate-limit (rate limiting)
connect-pg-simple (persistent sessions in production)
Build Tools
Vite
tsx
drizzle-kit
