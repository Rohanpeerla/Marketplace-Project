const { createClient } = require('redis');
const config = require('./env');

/**
 * Centralized Redis service.
 * Redis is a cache layer only: every helper fails soft (logs and returns a
 * neutral value) so callers can fall back to PostgreSQL when Redis is down.
 */
let client = null;
let connectPromise = null;
let lastWarnAt = 0;
let lastFailedConnectAt = 0;
const CONNECT_RETRY_COOLDOWN_MS = 5000;

const warn = (msg) => {
  // Throttle warnings so an outage does not flood the logs
  const now = Date.now();
  if (now - lastWarnAt > 10000) {
    console.warn(`[Redis] ${msg}`);
    lastWarnAt = now;
  }
};

const buildClient = () => {
  let everConnected = false;
  const c = createClient({
    url: config.redisUrl,
    RESP: 2, // RESP2 for compatibility with Redis 5.x (Windows port) and newer servers
    socket: {
      connectTimeout: 2000,
      // Initial connect: fail fast so requests fall back to PostgreSQL.
      // After a successful connect: retry in background with capped backoff.
      reconnectStrategy: (retries) =>
        everConnected ? Math.min(retries * 200, 5000) : new Error('Initial Redis connection failed'),
    },
    disableOfflineQueue: true, // fail fast instead of queueing while offline
  });
  c.on('ready', () => { everConnected = true; });
  c.on('error', (err) => warn(`Connection issue: ${err.message}`));
  return c;
};

const isReady = () => !!client && client.isReady;

/**
 * Connect to Redis (idempotent). Resolves true/false; never throws.
 * After a failed attempt, waits a cooldown before retrying to avoid per-request latency.
 */
const connect = async () => {
  if (isReady()) return true;
  if (client && client.isOpen) return false; // reconnecting in background
  if (Date.now() - lastFailedConnectAt < CONNECT_RETRY_COOLDOWN_MS) return false;

  if (!connectPromise) {
    client = buildClient();
    const c = client;
    connectPromise = c.connect().then(() => true).catch((err) => {
      lastFailedConnectAt = Date.now();
      warn(`Could not connect (${err.message}). Cart will use PostgreSQL only.`);
      if (client === c) client = null;
      return false;
    }).finally(() => {
      connectPromise = null;
    });
  }
  await connectPromise;
  return isReady();
};

const disconnect = async () => {
  const c = client;
  client = null;
  lastFailedConnectAt = 0;
  if (!c) return;
  try {
    if (c.isOpen) await c.quit();
  } catch (_) {
    try { await c.disconnect(); } catch (__) {}
  }
};

const ensure = async () => (isReady() ? true : connect());

/** Get raw string value. Returns null on miss or Redis failure. */
const get = async (key) => {
  try {
    if (!(await ensure())) return null;
    return await client.get(key);
  } catch (err) {
    warn(`GET failed: ${err.message}`);
    return null;
  }
};

/** Set raw string value with optional TTL (seconds). Returns boolean. */
const set = async (key, value, ttlSeconds) => {
  try {
    if (!(await ensure())) return false;
    if (ttlSeconds) await client.set(key, value, { EX: ttlSeconds });
    else await client.set(key, value);
    return true;
  } catch (err) {
    warn(`SET failed: ${err.message}`);
    return false;
  }
};

/** Delete key. Returns boolean success. */
const del = async (key) => {
  try {
    if (!(await ensure())) return false;
    await client.del(key);
    return true;
  } catch (err) {
    warn(`DEL failed: ${err.message}`);
    return false;
  }
};

/** Check key existence. Returns false on failure. */
const exists = async (key) => {
  try {
    if (!(await ensure())) return false;
    return (await client.exists(key)) === 1;
  } catch (err) {
    warn(`EXISTS failed: ${err.message}`);
    return false;
  }
};

const getJSON = async (key) => {
  const raw = await get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

const setJSON = async (key, value, ttlSeconds) => set(key, JSON.stringify(value), ttlSeconds);

const ttl = async (key) => {
  try {
    if (!(await ensure())) return -2;
    return await client.ttl(key);
  } catch (_) {
    return -2;
  }
};

/** Health check for GET /api/health/redis. Never exposes connection strings. */
const checkHealth = async () => {
  const start = Date.now();
  try {
    if (!(await ensure())) return { connected: false, latencyMs: Date.now() - start };
    const pong = await client.ping();
    return { connected: pong === 'PONG', latencyMs: Date.now() - start };
  } catch (_) {
    return { connected: false, latencyMs: Date.now() - start };
  }
};

module.exports = {
  connect,
  disconnect,
  isReady,
  get,
  set,
  delete: del,
  del,
  exists,
  getJSON,
  setJSON,
  ttl,
  checkHealth,
};
