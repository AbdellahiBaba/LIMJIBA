import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Robust connection pool configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Increased pool size for better concurrency
  min: 2,                       // Keep minimum connections alive
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout for acquiring connection
  allowExitOnIdle: false,       // Keep pool alive
});

// Track pool health and readiness
let poolHealthy = true;
let lastHealthCheck = Date.now();
let databaseReady = false;

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export function setDatabaseReady(ready: boolean): void {
  databaseReady = ready;
}

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected pool error:', err.message);
  poolHealthy = false;
  databaseReady = false; // Revert to 503 responses until recovery
});

pool.on('connect', () => {
  poolHealthy = true;
  databaseReady = true; // Recover after reconnection
});

export const db = drizzle(pool, { schema });

// Explicit list of transient error codes that should trigger retries
// These are network/connection issues, NOT application/validation errors
const TRANSIENT_ERROR_CODES = new Set([
  // Node.js DNS/network errors
  'EAI_AGAIN',      // DNS lookup timed out
  'ECONNRESET',     // Connection reset by peer
  'ETIMEDOUT',      // Connection timed out
  'ENOTFOUND',      // DNS lookup failed
  'ECONNREFUSED',   // Connection refused
  'EPIPE',          // Broken pipe
  'ECONNABORTED',   // Connection aborted
  'EHOSTUNREACH',   // Host unreachable
  'ENETUNREACH',    // Network unreachable
  // PostgreSQL transient errors (SQLSTATE codes)
  '57P01',          // Admin shutdown
  '57P02',          // Crash shutdown
  '57P03',          // Cannot connect now
  '53300',          // Too many connections
  '53400',          // Configuration limit exceeded
  '08000',          // Connection exception
  '08003',          // Connection does not exist
  '08006',          // Connection failure
  '08001',          // Unable to establish connection
  '08004',          // Server rejected connection
  '40001',          // Serialization failure (retry is appropriate)
  '40P01',          // Deadlock detected (retry is appropriate)
]);

// Error messages that indicate transient issues
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
];

export function isTransientError(error: any): boolean {
  if (!error) return false;
  
  // Check error.code for Node.js network errors or PostgreSQL SQLSTATE
  const code = error?.code;
  if (code && TRANSIENT_ERROR_CODES.has(code)) {
    return true;
  }
  
  // Check for PostgreSQL error with embedded SQLSTATE in message
  const sqlstate = error?.sqlState || error?.sqlstate;
  if (sqlstate && TRANSIENT_ERROR_CODES.has(sqlstate)) {
    return true;
  }
  
  // Check for specific connection-related error messages
  const message = error?.message?.toLowerCase() || '';
  for (const pattern of TRANSIENT_ERROR_MESSAGES) {
    if (message.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Do NOT retry based on generic substring matching
  // This prevents constraint violations, syntax errors, etc. from being retried
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
      
      // Only retry on transient errors
      if (isTransientError(error) && attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
        console.log(`[withRetry] Transient error (attempt ${attempt}/${maxRetries}), code=${error?.code || 'N/A'}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Not a transient error, or max retries reached - throw immediately
        throw error;
      }
    }
  }
  throw lastError;
}

// Health check function - verifies database connectivity
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

// Verify database connection on startup with continuous background retry
export async function verifyDatabaseConnection(): Promise<boolean> {
  console.log('[DB] Verifying database connection...');
  
  for (let attempt = 1; attempt <= 10; attempt++) {
    const health = await checkDatabaseHealth();
    if (health.healthy) {
      console.log(`[DB] Database connection verified (${health.latencyMs}ms)`);
      databaseReady = true;
      return true;
    }
    
    console.log(`[DB] Connection attempt ${attempt}/10 failed: ${health.error}`);
    if (attempt < 10) {
      const delay = Math.min(1000 * attempt, 5000); // Max 5 seconds between retries
      console.log(`[DB] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error('[DB] Failed to verify database connection after 10 attempts');
  console.log('[DB] Starting background recovery loop...');
  databaseReady = false;
  
  // Start background recovery - keep trying every 10 seconds
  startBackgroundRecovery();
  return false;
}

// Background recovery loop for production cold starts
let recoveryInterval: ReturnType<typeof setInterval> | null = null;

function startBackgroundRecovery() {
  if (recoveryInterval) return; // Already running
  
  recoveryInterval = setInterval(async () => {
    if (databaseReady) {
      // Already recovered, stop the loop
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
  }, 10000); // Try every 10 seconds
}

// Get pool statistics for monitoring
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    healthy: poolHealthy,
    lastHealthCheck: new Date(lastHealthCheck).toISOString(),
  };
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  console.log('[DB] Closing connection pool...');
  await pool.end();
  console.log('[DB] Connection pool closed');
}
