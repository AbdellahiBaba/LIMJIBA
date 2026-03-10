import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// ===================== DATABASE ENVIRONMENT CONFIGURATION =====================
// 
// ARCHITECTURE:
// - Production (NODE_ENV=production): MUST use Neon database (NEON_DATABASE_URL)
// - Development (NODE_ENV=development): Uses Neon if available, falls back to Replit DB
// - All data writes go to ONE database based on environment
// - Safety guard prevents accidental Replit DB writes in production
//
// =============================================================================

const isProduction = process.env.NODE_ENV === 'production';

// Helper to extract clean connection string from NEON_DATABASE_URL
// Handles format: psql 'postgresql://...' -> postgresql://...
function cleanConnectionString(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  // Remove 'psql ' prefix and surrounding quotes if present
  return rawUrl
    .replace(/^psql\s*['"]?/, '')
    .replace(/['"]$/, '');
}

// Get available database URLs
const neonUrl = cleanConnectionString(process.env.NEON_DATABASE_URL);
const replitUrl = process.env.DATABASE_URL;

// SAFETY GUARD: In production, Neon is REQUIRED
if (isProduction && !neonUrl) {
  throw new Error(
    "[DB SAFETY] PRODUCTION MODE REQUIRES NEON_DATABASE_URL. " +
    "Refusing to use Replit DB in production to prevent data fragmentation. " +
    "Please set NEON_DATABASE_URL environment variable."
  );
}

// Select database based on environment
// Production: Neon only (enforced above)
// Development: Prefer Neon, fallback to Replit for local dev
const connectionString = neonUrl || replitUrl;
const usingNeon = !!neonUrl;
const databaseProvider = usingNeon ? 'Neon' : 'Replit';

if (!connectionString) {
  throw new Error(
    "No database connection available. " +
    "Set NEON_DATABASE_URL for production or DATABASE_URL for development."
  );
}

// Log database selection
console.log(`[DB] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[DB] Database provider: ${databaseProvider}`);
if (!isProduction && !usingNeon) {
  console.warn('[DB] WARNING: Using Replit DB in development. Data will NOT sync to production.');
}

// Log connection details (no credentials)
try {
  const url = new URL(connectionString);
  console.log('[DB] Connecting to PostgreSQL:', url.host);
} catch {
  console.log('[DB] Connecting to PostgreSQL database...');
}

export const pool = new Pool({ 
  connectionString,
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

let poolHealthy = true;
let lastHealthCheck = Date.now();
let databaseReady = false;

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export function setDatabaseReady(ready: boolean): void {
  databaseReady = ready;
}

pool.on('error', (err: Error) => {
  console.error('[DB Pool] Unexpected pool error:', err.message);
  poolHealthy = false;
  databaseReady = false;
});

pool.on('connect', async (client) => {
  poolHealthy = true;
  databaseReady = true;
  // Neon databases have empty search_path, so we must set it explicitly
  if (usingNeon) {
    await client.query('SET search_path TO public');
  }
});

export const db = drizzle(pool, { schema });

const TRANSIENT_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'EPIPE',
  'ECONNABORTED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  '57P01',
  '57P02',
  '57P03',
  '53300',
  '53400',
  '08000',
  '08003',
  '08006',
  '08001',
  '08004',
  '40001',
  '40P01',
]);

const TRANSIENT_ERROR_MESSAGES = [
  'timeout exceeded when trying to connect',
  'connection terminated unexpectedly',
  'the database system is starting up',
  'the database system is shutting down',
  'canceling statement due to conflict with recovery',
  'could not connect to server',
  'server closed the connection unexpectedly',
  'SSL connection has been closed unexpectedly',
  'Connection terminated',
  'fetch failed',
  'WebSocket',
];

export function isTransientError(error: any): boolean {
  if (!error) return false;
  
  const code = error?.code;
  if (code && TRANSIENT_ERROR_CODES.has(code)) {
    return true;
  }
  
  const sqlstate = error?.sqlState || error?.sqlstate;
  if (sqlstate && TRANSIENT_ERROR_CODES.has(sqlstate)) {
    return true;
  }
  
  const message = error?.message?.toLowerCase() || '';
  for (const pattern of TRANSIENT_ERROR_MESSAGES) {
    if (message.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 500
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (isTransientError(error) && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
        console.log(`[withRetry] Transient error (attempt ${attempt}/${maxRetries}), code=${error?.code || 'N/A'}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - start;
      poolHealthy = true;
      lastHealthCheck = Date.now();
      return { healthy: true, latencyMs };
    } finally {
      client.release();
    }
  } catch (error: any) {
    poolHealthy = false;
    return { 
      healthy: false, 
      latencyMs: Date.now() - start, 
      error: error?.message || 'Unknown error' 
    };
  }
}

async function runMigrations(): Promise<void> {
  console.log('[DB] Running schema migrations...');
  const client = await pool.connect();
  try {
    // Check and add missing columns to sales table
    const salesColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'sales' AND table_schema = 'public'
    `);
    const existingCols = salesColumns.rows.map((r: any) => r.column_name);
    
    if (!existingCols.includes('status')) {
      await client.query(`ALTER TABLE sales ADD COLUMN status text NOT NULL DEFAULT 'completed'`);
      console.log('[DB] Added status column to sales');
    }
    if (!existingCols.includes('customer_name')) {
      await client.query(`ALTER TABLE sales ADD COLUMN customer_name text`);
      console.log('[DB] Added customer_name column to sales');
    }
    if (!existingCols.includes('customer_phone')) {
      await client.query(`ALTER TABLE sales ADD COLUMN customer_phone text`);
      console.log('[DB] Added customer_phone column to sales');
    }
    
    // Check products table for barcode column
    const prodColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' AND table_schema = 'public'
    `);
    const prodCols = prodColumns.rows.map((r: any) => r.column_name);
    
    if (!prodCols.includes('barcode')) {
      await client.query(`ALTER TABLE products ADD COLUMN barcode text`);
      console.log('[DB] Added barcode column to products');
    }
    
    if (!prodCols.includes('is_favorite')) {
      await client.query(`ALTER TABLE products ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false`);
      console.log('[DB] Added is_favorite column to products');
    }

    if (!prodCols.includes('purchase_price')) {
      await client.query(`ALTER TABLE products ADD COLUMN purchase_price REAL NOT NULL DEFAULT 0`);
      console.log('[DB] Added purchase_price column to products');
    }

    if (!prodCols.includes('shipping_cost')) {
      await client.query(`ALTER TABLE products ADD COLUMN shipping_cost REAL NOT NULL DEFAULT 0`);
      console.log('[DB] Added shipping_cost column to products');
    }

    if (!prodCols.includes('additional_cost')) {
      await client.query(`ALTER TABLE products ADD COLUMN additional_cost REAL NOT NULL DEFAULT 0`);
      console.log('[DB] Added additional_cost column to products');
    }

    if (!prodCols.includes('image_url')) {
      await client.query(`ALTER TABLE products ADD COLUMN image_url TEXT`);
      console.log('[DB] Added image_url column to products');
    }

    // Store orders: payment confirmation columns
    const soColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'store_orders' AND table_schema = 'public'
    `);
    const soCols = soColumns.rows.map((r: any) => r.column_name);
    if (!soCols.includes('payment_confirmed')) {
      await client.query(`ALTER TABLE store_orders ADD COLUMN payment_confirmed BOOLEAN NOT NULL DEFAULT false`);
      console.log('[DB] Added payment_confirmed column to store_orders');
    }
    if (!soCols.includes('payment_confirmed_at')) {
      await client.query(`ALTER TABLE store_orders ADD COLUMN payment_confirmed_at TEXT`);
      console.log('[DB] Added payment_confirmed_at column to store_orders');
    }

    // Store notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id VARCHAR,
        customer_email TEXT,
        order_number TEXT,
        type TEXT NOT NULL DEFAULT 'payment_confirmed',
        title TEXT NOT NULL,
        title_ar TEXT,
        title_fr TEXT,
        message TEXT NOT NULL,
        message_ar TEXT,
        message_fr TEXT,
        channel TEXT NOT NULL DEFAULT 'in_store',
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check sale_items table for cost_price column (GAAP/IFRS historical COGS tracking)
    const saleItemsColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'sale_items' AND table_schema = 'public'
    `);
    const saleItemsCols = saleItemsColumns.rows.map((r: any) => r.column_name);
    
    if (!saleItemsCols.includes('cost_price')) {
      await client.query(`ALTER TABLE sale_items ADD COLUMN cost_price real NOT NULL DEFAULT 0`);
      console.log('[DB] Added cost_price column to sale_items (historical COGS tracking)');
    }
    
    // Check invoice_items table for cost_price column (GAAP/IFRS historical COGS tracking)
    const invoiceItemsColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'invoice_items' AND table_schema = 'public'
    `);
    const invoiceItemsCols = invoiceItemsColumns.rows.map((r: any) => r.column_name);
    
    if (!invoiceItemsCols.includes('cost_price')) {
      await client.query(`ALTER TABLE invoice_items ADD COLUMN cost_price real NOT NULL DEFAULT 0`);
      console.log('[DB] Added cost_price column to invoice_items (historical COGS tracking)');
    }
    
    // Check invoices table for invoice_type column (distinguishes SALE from FABRICATION)
    const invoiceColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'invoices' AND table_schema = 'public'
    `);
    const invoiceCols = invoiceColumns.rows.map((r: any) => r.column_name);
    
    if (!invoiceCols.includes('invoice_type')) {
      await client.query(`ALTER TABLE invoices ADD COLUMN invoice_type text NOT NULL DEFAULT 'SALE'`);
      console.log('[DB] Added invoice_type column to invoices');
      
      // Set existing invoices with FAB- prefix or Fabrication role to FABRICATION type
      await client.query(`
        UPDATE invoices 
        SET invoice_type = 'FABRICATION' 
        WHERE invoice_number LIKE 'FAB-%' 
           OR role ILIKE '%fabrication%'
      `);
      console.log('[DB] Updated existing fabrication invoices to FABRICATION type');
    }
    
    // Add amount_paid column to invoices for partial payments
    if (!invoiceCols.includes('amount_paid')) {
      await client.query(`ALTER TABLE invoices ADD COLUMN amount_paid real DEFAULT 0`);
      console.log('[DB] Added amount_paid column to invoices');
    }
    
    // Add amount_paid column to sales for partial payments
    if (!existingCols.includes('amount_paid')) {
      await client.query(`ALTER TABLE sales ADD COLUMN amount_paid real DEFAULT 0`);
      console.log('[DB] Added amount_paid column to sales');
      
      // Set amount_paid = total for all existing completed sales
      await client.query(`UPDATE sales SET amount_paid = total WHERE status = 'completed'`);
      console.log('[DB] Updated existing completed sales with amount_paid = total');
    }
    
    // Create sale_payments table if it doesn't exist
    const salePaymentsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sale_payments'
      )
    `);
    if (!salePaymentsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE sale_payments (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          sale_id VARCHAR NOT NULL,
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          reference TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        )
      `);
      console.log('[DB] Created sale_payments table');
    }
    
    // Create sale_returns table if it doesn't exist
    const saleReturnsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sale_returns'
      )
    `);
    if (!saleReturnsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE sale_returns (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          sale_id VARCHAR NOT NULL,
          return_number TEXT NOT NULL UNIQUE,
          return_date TEXT NOT NULL,
          total_refund REAL NOT NULL,
          reason TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL
        )
      `);
      console.log('[DB] Created sale_returns table');
    }
    
    // Create sale_return_items table if it doesn't exist
    const saleReturnItemsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sale_return_items'
      )
    `);
    if (!saleReturnItemsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE sale_return_items (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          return_id VARCHAR NOT NULL,
          product_id VARCHAR NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total REAL NOT NULL
        )
      `);
      console.log('[DB] Created sale_return_items table');
    }
    
    // Create quick_invoices table if it doesn't exist
    const quickInvoicesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'quick_invoices'
      )
    `);
    if (!quickInvoicesExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE quick_invoices (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number TEXT NOT NULL,
          date TEXT NOT NULL,
          responsible TEXT,
          role TEXT,
          payment_mode TEXT NOT NULL DEFAULT 'A TERME',
          due_date TEXT,
          client_name TEXT,
          client_address TEXT,
          client_phone TEXT,
          apply_tva BOOLEAN NOT NULL DEFAULT false,
          tva_rate REAL NOT NULL DEFAULT 0.19,
          total_ht REAL NOT NULL DEFAULT 0,
          tva_amount REAL NOT NULL DEFAULT 0,
          total_ttc REAL NOT NULL DEFAULT 0,
          total_weight REAL NOT NULL DEFAULT 0,
          notes TEXT,
          items TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      console.log('[DB] Created quick_invoices table');
    }
    
    // ===================== NEW ENTERPRISE TABLES =====================
    
    // Users table - new columns for permissions system
    const userColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    const userCols = userColumns.rows.map((r: any) => r.column_name);
    
    if (!userCols.includes('display_name')) {
      await client.query(`ALTER TABLE users ADD COLUMN display_name text`);
      console.log('[DB] Added display_name column to users');
    }
    if (!userCols.includes('role')) {
      await client.query(`ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'staff'`);
      console.log('[DB] Added role column to users');
    }
    if (!userCols.includes('permissions')) {
      await client.query(`ALTER TABLE users ADD COLUMN permissions text NOT NULL DEFAULT '[]'`);
      console.log('[DB] Added permissions column to users');
    }
    if (!userCols.includes('is_active')) {
      await client.query(`ALTER TABLE users ADD COLUMN is_active boolean NOT NULL DEFAULT true`);
      console.log('[DB] Added is_active column to users');
    }
    
    // Invoices - delivery_status column
    if (!invoiceCols.includes('delivery_status')) {
      await client.query(`ALTER TABLE invoices ADD COLUMN delivery_status text NOT NULL DEFAULT 'none'`);
      console.log('[DB] Added delivery_status column to invoices');
    }
    
    // Suppliers table
    const suppliersExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers')
    `);
    if (!suppliersExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE suppliers (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        )
      `);
      console.log('[DB] Created suppliers table');
    }
    
    // Purchase orders table
    const poExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders')
    `);
    if (!poExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE purchase_orders (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          order_number TEXT NOT NULL UNIQUE,
          supplier_id VARCHAR NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          total_amount REAL NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL,
          received_at TEXT,
          received_by TEXT
        )
      `);
      console.log('[DB] Created purchase_orders table');
    }
    
    // Purchase order items table
    const poItemsExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_items')
    `);
    if (!poItemsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE purchase_order_items (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          purchase_order_id VARCHAR NOT NULL,
          product_id VARCHAR,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_cost REAL NOT NULL,
          total REAL NOT NULL
        )
      `);
      console.log('[DB] Created purchase_order_items table');
    }
    
    // Parked sales table
    const parkedExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parked_sales')
    `);
    if (!parkedExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE parked_sales (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          label TEXT NOT NULL,
          customer_name TEXT,
          items TEXT NOT NULL,
          discount REAL DEFAULT 0,
          created_at TEXT NOT NULL,
          created_by TEXT
        )
      `);
      console.log('[DB] Created parked_sales table');
    }
    
    // Audit logs table
    const auditExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs')
    `);
    if (!auditExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE audit_logs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR,
          username TEXT NOT NULL,
          action TEXT NOT NULL,
          entity TEXT NOT NULL,
          entity_id VARCHAR,
          details TEXT,
          ip_address TEXT,
          created_at TEXT NOT NULL
        )
      `);
      console.log('[DB] Created audit_logs table');
    }

    const transportExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transportation_invoices')
    `);
    if (!transportExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE transportation_invoices (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number TEXT UNIQUE NOT NULL,
          date TEXT NOT NULL,
          direction TEXT NOT NULL,
          driver_name TEXT NOT NULL,
          vehicle_plate TEXT,
          departure_location TEXT NOT NULL,
          arrival_location TEXT NOT NULL,
          fuel_cost REAL DEFAULT 0,
          driver_fee REAL DEFAULT 0,
          other_costs REAL DEFAULT 0,
          total_cost REAL NOT NULL,
          total_weight REAL DEFAULT 0,
          notes TEXT,
          responsible TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TEXT NOT NULL
        )
      `);
      console.log('[DB] Created transportation_invoices table');
    }

    const transportItemsExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transportation_items')
    `);
    if (!transportItemsExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE transportation_items (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          transportation_invoice_id VARCHAR NOT NULL,
          product_id VARCHAR,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          weight_per_unit REAL DEFAULT 0,
          total_weight REAL DEFAULT 0
        )
      `);
      console.log('[DB] Created transportation_items table');
    }

    const transportValueCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'transportation_invoices' AND column_name = 'total_value'
    `);
    if (transportValueCol.rows.length === 0) {
      await client.query(`ALTER TABLE transportation_invoices ADD COLUMN total_value REAL DEFAULT 0`);
      console.log('[DB] Added total_value column to transportation_invoices');
    }

    const itemPriceCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'transportation_items' AND column_name = 'unit_price'
    `);
    if (itemPriceCol.rows.length === 0) {
      await client.query(`ALTER TABLE transportation_items ADD COLUMN unit_price REAL DEFAULT 0`);
      console.log('[DB] Added unit_price column to transportation_items');
    }

    const itemValueCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'transportation_items' AND column_name = 'total_value'
    `);
    if (itemValueCol.rows.length === 0) {
      await client.query(`ALTER TABLE transportation_items ADD COLUMN total_value REAL DEFAULT 0`);
      console.log('[DB] Added total_value column to transportation_items');
    }

    try {
      await client.query(`ALTER TABLE transportation_invoices ALTER COLUMN driver_name DROP NOT NULL`);
      await client.query(`ALTER TABLE transportation_invoices ALTER COLUMN responsible DROP NOT NULL`);
      console.log('[DB] Made driver_name and responsible optional on transportation_invoices');
    } catch (e: any) {
      // Ignore if already nullable
    }

    // ===================== E-COMMERCE UPGRADE MIGRATIONS =====================

    // Purchase orders - shipping cost fields
    const poCols2 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' AND table_schema = 'public'
    `);
    const poColNames = poCols2.rows.map((r: any) => r.column_name);
    
    if (!poColNames.includes('shipping_cost')) {
      await client.query(`ALTER TABLE purchase_orders ADD COLUMN shipping_cost REAL DEFAULT 0`);
      console.log('[DB] Added shipping_cost column to purchase_orders');
    }
    if (!poColNames.includes('shipping_distribution_method')) {
      await client.query(`ALTER TABLE purchase_orders ADD COLUMN shipping_distribution_method TEXT`);
      console.log('[DB] Added shipping_distribution_method column to purchase_orders');
    }
    if (!poColNames.includes('shipping_added_at')) {
      await client.query(`ALTER TABLE purchase_orders ADD COLUMN shipping_added_at TEXT`);
      console.log('[DB] Added shipping_added_at column to purchase_orders');
    }

    // Purchase order items - shipping distribution fields
    const poItemCols2 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'purchase_order_items' AND table_schema = 'public'
    `);
    const poItemColNames = poItemCols2.rows.map((r: any) => r.column_name);
    
    if (!poItemColNames.includes('shipping_cost_share')) {
      await client.query(`ALTER TABLE purchase_order_items ADD COLUMN shipping_cost_share REAL DEFAULT 0`);
      console.log('[DB] Added shipping_cost_share column to purchase_order_items');
    }
    if (!poItemColNames.includes('adjusted_unit_cost')) {
      await client.query(`ALTER TABLE purchase_order_items ADD COLUMN adjusted_unit_cost REAL DEFAULT 0`);
      console.log('[DB] Added adjusted_unit_cost column to purchase_order_items');
    }

    // Sales - delivery cost field
    if (!existingCols.includes('delivery_cost')) {
      await client.query(`ALTER TABLE sales ADD COLUMN delivery_cost REAL DEFAULT 0`);
      console.log('[DB] Added delivery_cost column to sales');
    }

    // Sale items - purchase order reference
    if (!saleItemsCols.includes('purchase_order_id')) {
      await client.query(`ALTER TABLE sale_items ADD COLUMN purchase_order_id VARCHAR`);
      console.log('[DB] Added purchase_order_id column to sale_items');
    }

    // Invoices - delivery cost field
    if (!invoiceCols.includes('delivery_cost')) {
      await client.query(`ALTER TABLE invoices ADD COLUMN delivery_cost REAL DEFAULT 0`);
      console.log('[DB] Added delivery_cost column to invoices');
    }
    
    // Create conversations and messages tables for AI chat
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    // Create promo_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT NOT NULL UNIQUE,
        discount_type TEXT NOT NULL DEFAULT 'percentage',
        discount_value REAL NOT NULL,
        min_order_amount REAL DEFAULT 0,
        max_uses INTEGER DEFAULT 0,
        current_uses INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL,
        created_by TEXT NOT NULL DEFAULT 'admin',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create store_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_orders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        customer_phone TEXT,
        customer_address TEXT,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        promo_code TEXT,
        delivery_cost REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create cms_pages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '{}',
        is_published BOOLEAN NOT NULL DEFAULT true,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default CMS pages
    const existingPages = await client.query(`SELECT slug FROM cms_pages`);
    if (existingPages.rows.length === 0) {
      await client.query(`
        INSERT INTO cms_pages (slug, title, content) VALUES
          ('home', 'Home', '{"blocks":[{"type":"text","content":"Welcome to our store!"}]}'),
          ('about', 'About Us', '{"blocks":[{"type":"text","content":"Learn more about our company."}]}'),
          ('contact', 'Contact Us', '{"blocks":[{"type":"text","content":"Get in touch with us."}]}'),
          ('terms', 'Terms & Conditions', '{"blocks":[{"type":"text","content":"Our terms and conditions."}]}')
      `);
      console.log('[DB] Seeded default CMS pages');
    }

    // Create cms_banners table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_banners (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        subtitle TEXT,
        image_url TEXT,
        link_url TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create store_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR PRIMARY KEY DEFAULT 'default',
        store_name TEXT NOT NULL DEFAULT 'LIMJIBA',
        store_description TEXT DEFAULT '',
        primary_color TEXT NOT NULL DEFAULT '#0A1628',
        accent_color TEXT NOT NULL DEFAULT '#C9A84C',
        logo_url TEXT,
        hero_title TEXT DEFAULT '',
        hero_subtitle TEXT DEFAULT '',
        contact_email TEXT,
        contact_phone TEXT,
        contact_address TEXT,
        social_links TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default store settings
    const existingSettings = await client.query(`SELECT id FROM store_settings`);
    if (existingSettings.rows.length === 0) {
      await client.query(`INSERT INTO store_settings (id) VALUES ('default')`);
      console.log('[DB] Seeded default store settings');
    }

    await client.query(`
      UPDATE store_settings 
      SET store_name = 'LIMJIBA', 
          primary_color = '#0A1628', 
          accent_color = '#C9A84C' 
      WHERE id = 'default' 
        AND (primary_color = '#4A0E4E' OR store_name = 'Limjiba Store')
    `);

    await client.query(`
      UPDATE store_settings 
      SET hero_title = '', hero_subtitle = '' 
      WHERE id = 'default' 
        AND (hero_title = 'Welcome to Our Store' OR hero_subtitle = 'Discover premium products at the best prices')
    `);

    // ===================== CATEGORIES TABLE =====================
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        name_ar TEXT,
        name_fr TEXT,
        icon TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existingCategories = await client.query(`SELECT id FROM categories LIMIT 1`);
    if (existingCategories.rows.length === 0) {
      await client.query(`
        INSERT INTO categories (name, name_ar, name_fr, icon, sort_order) VALUES
          ('Electronics', 'إلكترونيات', 'Électronique', 'Cpu', 1),
          ('Fashion', 'أزياء', 'Mode', 'Shirt', 2),
          ('Home & Living', 'منزل ومعيشة', 'Maison & Vie', 'Home', 3),
          ('Beauty & Health', 'جمال وصحة', 'Beauté & Santé', 'Heart', 4),
          ('Food & Groceries', 'طعام وبقالة', 'Alimentation', 'ShoppingBasket', 5),
          ('Sports & Outdoors', 'رياضة وأنشطة', 'Sports & Plein Air', 'Dumbbell', 6),
          ('Books & Stationery', 'كتب وقرطاسية', 'Livres & Papeterie', 'BookOpen', 7),
          ('Accessories', 'إكسسوارات', 'Accessoires', 'Watch', 8),
          ('Other', 'أخرى', 'Autre', 'Package', 9)
      `);
      console.log('[DB] Seeded default categories');
    }

    // ===================== STORE CUSTOMERS TABLE =====================
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_customers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        language TEXT NOT NULL DEFAULT 'en',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ===================== CLEANUP: Remove all plastic data and old business data =====================
    const plasticCheck = await client.query(`SELECT id FROM products WHERE category ILIKE '%plastique%' OR name ILIKE '%plastique%' OR name ILIKE '%plastic%' LIMIT 1`);
    if (plasticCheck.rows.length > 0) {
      await client.query(`DELETE FROM sale_items WHERE product_id IN (SELECT id FROM products WHERE category ILIKE '%plastique%' OR name ILIKE '%plastique%' OR name ILIKE '%plastic%')`);
      await client.query(`DELETE FROM products WHERE category ILIKE '%plastique%' OR name ILIKE '%plastique%' OR name ILIKE '%plastic%'`);
      console.log('[DB] Removed plastic products and related sale items');
    }

    // One-time cleanup: Clear old legacy sales, purchase orders, and expenses data
    const legacyCleanupDone = await client.query(`SELECT id FROM store_settings WHERE id = 'legacy_data_cleaned' LIMIT 1`);
    if (legacyCleanupDone.rows.length === 0) {
      await client.query(`DELETE FROM sale_return_items`);
      await client.query(`DELETE FROM sale_returns`);
      await client.query(`DELETE FROM sale_payments`);
      await client.query(`DELETE FROM sale_items`);
      await client.query(`DELETE FROM sales`);
      console.log('[DB] Cleared all sales history');

      await client.query(`DELETE FROM purchase_order_items`);
      await client.query(`DELETE FROM purchase_orders`);
      console.log('[DB] Cleared all purchase orders');

      await client.query(`DELETE FROM expenses`);
      console.log('[DB] Cleared all expenses');

      await client.query(`INSERT INTO store_settings (id) VALUES ('legacy_data_cleaned') ON CONFLICT DO NOTHING`);
      console.log('[DB] Legacy data cleanup completed (one-time)');
    }

    // Update CMS pages with rich trilingual content
    await client.query(`
      UPDATE cms_pages SET content = '{"body":"<h2>About LIMJIBA</h2><p>LIMJIBA (لمجيبة) is a premium e-commerce and importing platform born in Mauritania, dedicated to bringing you the finest products with exceptional service.</p><h3>Our Mission</h3><p>We strive to provide a seamless shopping experience with curated products, competitive prices in MRU, and reliable delivery across Mauritania and beyond.</p><h3>Our Values</h3><ul><li><strong>Quality First</strong> — Every product is carefully selected</li><li><strong>Customer Trust</strong> — Your satisfaction is our priority</li><li><strong>Local Pride</strong> — Proudly Mauritanian, globally inspired</li></ul><h3>عن لمجيبة</h3><p>لمجيبة هي منصة تجارة إلكترونية واستيراد متميزة من موريتانيا، مكرسة لتقديم أفضل المنتجات بخدمة استثنائية.</p><h3>À propos de LIMJIBA</h3><p>LIMJIBA est une plateforme e-commerce et d''importation premium née en Mauritanie, dédiée à vous offrir les meilleurs produits avec un service exceptionnel.</p>"}'
      WHERE slug = 'about'
    `);
    await client.query(`
      UPDATE cms_pages SET content = '{"body":"<h2>Contact Us</h2><p>We would love to hear from you! Reach out to our team for any questions, orders, or support.</p><p><strong>Email:</strong> contact@lemjiba.com</p><p><strong>Phone:</strong> +222 00 00 00 00</p><p><strong>Address:</strong> Nouakchott, Mauritania</p><h3>اتصل بنا</h3><p>يسعدنا سماع رأيك! تواصل مع فريقنا لأي استفسار أو طلب.</p><h3>Contactez-nous</h3><p>Nous serions ravis de vous entendre! Contactez notre équipe pour toute question.</p>"}'
      WHERE slug = 'contact'
    `);
    await client.query(`
      UPDATE cms_pages SET content = '{"body":"<h2>Terms & Conditions</h2><h3>1. General</h3><p>By using LIMJIBA, you agree to these terms. All prices are in MRU (Mauritanian Ouguiya).</p><h3>2. Orders & Payments</h3><p>Orders are confirmed upon receipt. Payment is required before shipping. We accept cash on delivery and bank transfer.</p><h3>3. Shipping & Delivery</h3><p>We deliver across Mauritania. Delivery times vary by location. Shipping costs are calculated at checkout.</p><h3>4. Returns & Refunds</h3><p>Returns are accepted within 7 days of delivery for unused items in original packaging. Refunds are processed within 5 business days.</p><h3>5. Privacy</h3><p>We protect your personal information. Your data is never shared with third parties without consent.</p>"}'
      WHERE slug = 'terms'
    `);
    console.log('[DB] Updated CMS pages with rich content');

    // ===================== Payment wallets table & order payment fields =====================
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_wallets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        name_ar TEXT,
        name_fr TEXT,
        wallet_number TEXT NOT NULL,
        icon_type TEXT NOT NULL DEFAULT 'wallet',
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    try {
      await client.query(`ALTER TABLE store_orders ADD COLUMN payment_method TEXT`);
    } catch {}
    try {
      await client.query(`ALTER TABLE store_orders ADD COLUMN payment_proof TEXT`);
    } catch {}

    const walletCheck = await client.query(`SELECT id FROM payment_wallets LIMIT 1`);
    if (walletCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO payment_wallets (name, name_ar, name_fr, wallet_number, icon_type, sort_order) VALUES
        ('Bankily', 'بنكيلي', 'Bankily', '00000000', 'bankily', 0),
        ('Masrvi', 'مصرفي', 'Masrvi', '00000000', 'masrvi', 1),
        ('Sedad', 'سداد', 'Sedad', '00000000', 'sedad', 2)
      `);
      console.log('[DB] Seeded default payment wallets');
    }

    try {
      await client.query(`ALTER TABLE products ADD COLUMN is_deal_of_day BOOLEAN NOT NULL DEFAULT false`);
      console.log('[DB] Added is_deal_of_day column to products');
    } catch {}
    try {
      await client.query(`ALTER TABLE products ADD COLUMN deal_discount REAL NOT NULL DEFAULT 0`);
      console.log('[DB] Added deal_discount column to products');
    } catch {}
    try {
      await client.query(`ALTER TABLE store_customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0`);
      console.log('[DB] Added loyalty_points column to store_customers');
    } catch {}

    try {
      await client.query(`ALTER TABLE payment_wallets ADD COLUMN icon_url TEXT`);
      console.log('[DB] Added icon_url column to payment_wallets');
    } catch {}
    try {
      await client.query(`ALTER TABLE payment_wallets ADD COLUMN balance REAL NOT NULL DEFAULT 0`);
      console.log('[DB] Added balance column to payment_wallets');
    } catch {}
    try {
      await client.query(`ALTER TABLE store_settings ADD COLUMN trust_badges TEXT`);
      console.log('[DB] Added trust_badges column to store_settings');
    } catch {}
    try {
      await client.query(`ALTER TABLE store_settings ADD COLUMN category_section_title TEXT`);
      console.log('[DB] Added category_section_title column to store_settings');
    } catch {}
    try {
      await client.query(`ALTER TABLE store_settings ADD COLUMN cta_text TEXT`);
      console.log('[DB] Added cta_text column to store_settings');
    } catch {}
    try {
      await client.query(`ALTER TABLE store_settings ADD COLUMN footer_description TEXT`);
      console.log('[DB] Added footer_description column to store_settings');
    } catch {}

    try {
      await client.query(`ALTER TABLE products ADD COLUMN has_variants BOOLEAN NOT NULL DEFAULT false`);
      console.log('[DB] Added has_variants column to products');
    } catch {}
    try {
      await client.query(`ALTER TABLE products ADD COLUMN description_en TEXT`);
      console.log('[DB] Added description_en column to products');
    } catch {}
    try {
      await client.query(`ALTER TABLE products ADD COLUMN description_fr TEXT`);
      console.log('[DB] Added description_fr column to products');
    } catch {}
    try {
      await client.query(`ALTER TABLE products ADD COLUMN description_ar TEXT`);
      console.log('[DB] Added description_ar column to products');
    } catch {}

    try {
      await client.query(`CREATE TABLE IF NOT EXISTS product_variants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id VARCHAR NOT NULL,
        variant_label TEXT NOT NULL,
        sku TEXT,
        unit_price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true
      )`);
      console.log('[DB] Created product_variants table');
    } catch {}

    try {
      await client.query(`CREATE TABLE IF NOT EXISTS product_reviews (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id VARCHAR NOT NULL,
        customer_email TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log('[DB] Created product_reviews table');
    } catch {}

    try {
      await client.query(`CREATE TABLE IF NOT EXISTS store_reviews (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_email TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log('[DB] Created store_reviews table');
    } catch {}

    try {
      await client.query(`ALTER TABLE store_settings ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0`);
      console.log('[DB] Added opening_balance column to store_settings');
    } catch {}
    try {
      await client.query(`ALTER TABLE store_customers ADD COLUMN reset_token TEXT`);
      console.log('[DB] Added reset_token column to store_customers');
    } catch {}
    try {
      await client.query(`ALTER TABLE store_customers ADD COLUMN reset_token_expiry TEXT`);
      console.log('[DB] Added reset_token_expiry column to store_customers');
    } catch {}

    try {
      await client.query(`ALTER TABLE purchase_orders ADD COLUMN payment_wallet_id VARCHAR`);
      console.log('[DB] Added payment_wallet_id column to purchase_orders');
    } catch {}

    try {
      await client.query(`ALTER TABLE payment_wallets ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0`);
      console.log('[DB] Added opening_balance column to payment_wallets');
    } catch {}

    try {
      await client.query(`ALTER TABLE products ADD COLUMN images TEXT[]`);
      console.log('[DB] Added images array column to products');
    } catch {}

    try {
      await client.query(`ALTER TABLE product_variants ADD COLUMN cost_price REAL NOT NULL DEFAULT 0`);
      await client.query(`ALTER TABLE product_variants ADD COLUMN option1_name TEXT`);
      await client.query(`ALTER TABLE product_variants ADD COLUMN option1_value TEXT`);
      await client.query(`ALTER TABLE product_variants ADD COLUMN option2_name TEXT`);
      await client.query(`ALTER TABLE product_variants ADD COLUMN option2_value TEXT`);
      await client.query(`ALTER TABLE product_variants ADD COLUMN option3_name TEXT`);
      await client.query(`ALTER TABLE product_variants ADD COLUMN option3_value TEXT`);
      console.log('[DB] Added option columns and cost_price to product_variants');
    } catch {}

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_conversations (
        id SERIAL PRIMARY KEY,
        customer_email TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to VARCHAR,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    try {
      await client.query(`ALTER TABLE categories ADD COLUMN image_url TEXT`);
      console.log('[DB] Added image_url to categories');
    } catch {}

    await client.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" VARCHAR NOT NULL PRIMARY KEY,
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL
      )
    `);
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire")`);
    } catch {}
    console.log('[DB] Ensured user_sessions table exists');

    console.log('[DB] Schema migrations complete');
  } catch (error) {
    console.error('[DB] Migration error:', error);
  } finally {
    client.release();
  }
}

export async function verifyDatabaseConnection(): Promise<boolean> {
  console.log('[DB] Verifying database connection...');
  
  for (let attempt = 1; attempt <= 10; attempt++) {
    const health = await checkDatabaseHealth();
    if (health.healthy) {
      console.log(`[DB] Database connection verified (${health.latencyMs}ms)`);
      await runMigrations();
      databaseReady = true;
      return true;
    }
    
    console.log(`[DB] Connection attempt ${attempt}/10 failed: ${health.error}`);
    if (attempt < 10) {
      const delay = Math.min(1000 * attempt, 5000);
      console.log(`[DB] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error('[DB] Failed to verify database connection after 10 attempts');
  console.log('[DB] Starting background recovery loop...');
  databaseReady = false;
  
  startBackgroundRecovery();
  return false;
}

let recoveryInterval: ReturnType<typeof setInterval> | null = null;

function startBackgroundRecovery() {
  if (recoveryInterval) return;
  
  recoveryInterval = setInterval(async () => {
    if (databaseReady) {
      if (recoveryInterval) {
        clearInterval(recoveryInterval);
        recoveryInterval = null;
      }
      return;
    }
    
    console.log('[DB] Background recovery: Attempting to reconnect...');
    const health = await checkDatabaseHealth();
    if (health.healthy) {
      console.log(`[DB] Background recovery: Connection restored (${health.latencyMs}ms)`);
      databaseReady = true;
      if (recoveryInterval) {
        clearInterval(recoveryInterval);
        recoveryInterval = null;
      }
    } else {
      console.log(`[DB] Background recovery: Still failing - ${health.error}`);
    }
  }, 10000);
}

// Export database info for other modules
export const dbInfo = {
  isProduction,
  provider: databaseProvider,
  usingNeon,
};

export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    healthy: poolHealthy,
    lastHealthCheck: new Date(lastHealthCheck).toISOString(),
    provider: databaseProvider,
    isProduction,
  };
}

export async function closePool(): Promise<void> {
  console.log('[DB] Closing connection pool...');
  await pool.end();
  console.log('[DB] Connection pool closed');
}
