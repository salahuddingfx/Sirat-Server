const NodeCache = require("node-cache");

/**
 * Centralized in-memory cache for frequently-read data.
 * - Reduces DB load for hot endpoints (products, categories, hero slides, etc.)
 * - TTL-based expiration (default 60s) keeps data reasonably fresh
 * - Invalidate via pattern or specific key on writes
 */
const cache = new NodeCache({
  stdTTL: 60,            // default TTL: 60 seconds
  checkperiod: 120,      // cleanup check interval
  useClones: false,      // don't clone values (faster; callers shouldn't mutate)
  maxKeys: 1000          // cap to prevent memory bloat
});

// Track which keys were created with which prefix (for targeted invalidation)
const keyIndex = new Map();

/**
 * Generate a namespaced cache key.
 * @param {string} namespace - e.g. "products", "categories", "dashboard"
 * @param {string} identifier - e.g. "list", "slug:foo", "id:abc"
 */
const buildKey = (namespace, identifier) => `${namespace}:${identifier}`;

/**
 * Get a cached value.
 */
const get = (key) => cache.get(key);

/**
 * Set a cached value with optional TTL (in seconds).
 * Indexes the key by namespace for later invalidation.
 */
const set = (key, value, ttlSeconds) => {
  if (ttlSeconds) {
    cache.set(key, value, ttlSeconds);
  } else {
    cache.set(key, value);
  }
  const namespace = key.split(":")[0];
  if (!keyIndex.has(namespace)) keyIndex.set(namespace, new Set());
  keyIndex.get(namespace).add(key);
  return value;
};

/**
 * Get-or-fetch pattern: returns cached value if present, otherwise calls
 * the loader, caches the result, and returns it.
 * @param {string} key
 * @param {Function} loader - async () => value
 * @param {number} ttlSeconds - optional override TTL
 */
const getOrSet = async (key, loader, ttlSeconds) => {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const fresh = await loader();
  return set(key, fresh, ttlSeconds);
};

/**
 * Invalidate a specific key.
 */
const del = (key) => {
  cache.del(key);
  const namespace = key.split(":")[0];
  if (keyIndex.has(namespace)) keyIndex.get(namespace).delete(key);
};

/**
 * Invalidate every key under a namespace.
 * Call this after any write (POST/PUT/PATCH/DELETE) that affects a resource.
 */
const invalidateNamespace = (namespace) => {
  if (!keyIndex.has(namespace)) return;
  const keys = keyIndex.get(namespace);
  cache.del([...keys]);
  keyIndex.set(namespace, new Set());
};

/**
 * Wipe the entire cache. Useful for tests or full refresh.
 */
const flush = () => {
  cache.flushAll();
  keyIndex.clear();
};

/**
 * Stats for monitoring.
 */
const stats = () => ({
  keys: cache.keys().length,
  hits: cache.getStats().hits,
  misses: cache.getStats().misses,
  hitRatio: (() => {
    const s = cache.getStats();
    const total = s.hits + s.misses;
    return total === 0 ? 0 : (s.hits / total).toFixed(3);
  })()
});

module.exports = {
  buildKey,
  get,
  set,
  getOrSet,
  del,
  invalidateNamespace,
  flush,
  stats
};
