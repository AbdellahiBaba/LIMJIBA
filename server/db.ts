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
