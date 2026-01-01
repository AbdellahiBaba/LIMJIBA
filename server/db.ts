import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
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
]);

function isTransientError(error: any): boolean {
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
  
  // Check for specific connection pool exhaustion
  if (error?.message?.includes('timeout exceeded when trying to connect')) {
    return true;
  }
  
  // Do NOT retry based on generic substring matching
  // This prevents constraint violations, syntax errors, etc. from being retried
  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (isTransientError(error) && attempt < maxRetries) {
        const delay = delayMs * attempt;
        console.log(`[withRetry] Transient error (attempt ${attempt}/${maxRetries}), code=${error?.code}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Not a transient error, or max retries reached - throw immediately
        throw error;
      }
    }
  }
  throw lastError;
}

// Export helper for routes to check if an error is transient
export { isTransientError };
