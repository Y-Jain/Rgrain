interface CacheEntry {
  data: any;
  timestamp: number;
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry>();

  get(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: CacheEntry): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global variable to persist cache across hot-reloads in Next.js development mode
const globalForCache = global as unknown as { analyticsCache: AnalyticsCache };

export const analyticsCache = globalForCache.analyticsCache || new AnalyticsCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.analyticsCache = analyticsCache;
}
