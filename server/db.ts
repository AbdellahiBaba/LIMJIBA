import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// CRITICAL: Use ONLY Neon database - no fallback to prevent data split
const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "NEON_DATABASE_URL must be set. This application requires the Neon production database.",
  );
}

// Clean up and validate connection string
const cleanConnectionString = connectionString.trim()
  .replace(/^psql\s+/i, '')
  .replace(/^['"]|['"]$/g, '');

// Log connection details (no credentials) and confirm Neon is being used
try {
  const url = new URL(cleanConnectionString);
  console.log('[DB] NEON DATABASE ONLY MODE');
  console.log('[DB] Connecting to Neon:', url.host);
  if (!url.host.includes('neon')) {
    console.warn('[DB] WARNING: Connection string may not be a Neon database!');
  }
} catch {
  console.log('[DB] Connecting to Neon database...');
}

export const pool = new Pool({ 
  connectionString: cleanConnectionString,
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

pool.on('connect', () => {
  poolHealthy = true;
  databaseReady = true;
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
    
    console.log('[DB] Schema migrations complete');
  } catch (error) {
    console.error('[DB] Migration error:', error);
  } finally {
    client.release();
  }
}

export async function verifyDatabaseConnection(): Promise<boolean> {
  console.log('[DB] Verifying Neon database connection...');
  
  for (let attempt = 1; attempt <= 10; attempt++) {
    const health = await checkDatabaseHealth();
    if (health.healthy) {
      console.log(`[DB] Neon database connection verified (${health.latencyMs}ms)`);
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
  
  console.error('[DB] Failed to verify Neon database connection after 10 attempts');
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
    
    console.log('[DB] Background recovery: Attempting to reconnect to Neon...');
    const health = await checkDatabaseHealth();
    if (health.healthy) {
      console.log(`[DB] Background recovery: Neon connection restored (${health.latencyMs}ms)`);
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

export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    healthy: poolHealthy,
    lastHealthCheck: new Date(lastHealthCheck).toISOString(),
    provider: 'neon',
  };
}

export async function closePool(): Promise<void> {
  console.log('[DB] Closing Neon connection pool...');
  await pool.end();
  console.log('[DB] Neon connection pool closed');
}
