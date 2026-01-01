import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Clean up connection string - remove psql command prefix, extra quotes, and whitespace
connectionString = connectionString.trim()
  .replace(/^psql\s+/i, '')  // Remove 'psql ' prefix if present
  .replace(/^['"]|['"]$/g, '');  // Remove surrounding quotes

// Log connection details (without password) for debugging
const safeUrl = connectionString.replace(/:[^:@]+@/, ':***@');
console.log('[DB] Connecting to:', safeUrl);

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

export async function verifyDatabaseConnection(): Promise<boolean> {
  console.log('[DB] Verifying Neon database connection...');
  
  for (let attempt = 1; attempt <= 10; attempt++) {
    const health = await checkDatabaseHealth();
    if (health.healthy) {
      console.log(`[DB] Neon database connection verified (${health.latencyMs}ms)`);
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
