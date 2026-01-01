/**
 * In-memory cache for cold-start optimization
 * Provides instant responses while database wakes up
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 60000; // 1 minute default TTL

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { entries: number; keys: string[] } {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new MemoryCache();

// Cache keys for all major data collections
export const CACHE_KEYS = {
  PRODUCTS: "products",
  DASHBOARD_STATS: "dashboard_stats",
  INVOICES: "invoices",
  SALES: "sales",
  RESELLERS: "resellers",
  EMPLOYEES: "employees",
  EXPENSES: "expenses",
  FABRICATION_INVOICES: "fabrication_invoices",
  SALARY_PAYMENTS: "salary_payments",
};

// TTL values (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30000,    // 30 seconds - for frequently changing data
  MEDIUM: 60000,   // 1 minute - default
  LONG: 300000,    // 5 minutes - for rarely changing data
};
