import { cacheLocation, readCache, saveCache } from './cache.js';
const transient = new Set([429, 500, 502, 503, 504]);
export class ProviderStop extends Error {
  constructor(code, rawResponseRef = null) { super(code); this.code = code; this.rawResponseRef = rawResponseRef; }
}
export function redact(value, secrets = []) {
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, /api[-_]?key|authorization|token|password|secret|cookie/i.test(key) ? '[REDACTED]' : redact(item, secrets)]));
  if (typeof value === 'string') {
    for (const secret of secrets.filter(Boolean)) {
      for (const variant of new Set([secret, encodeURIComponent(secret), Buffer.from(secret).toString('base64')])) {
        value = value.split(variant).join('[REDACTED]');
      }
    }
    return value.replace(/((?:x-api-key|authorization|api[_-]?key|token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');
  }
  return value;
}
export function retryDelay(header, now = Date.now()) {
  if (header === null || header === undefined) return null;
  if (/^\d+(?:\.\d+)?$/.test(header)) return Math.ceil(Number(header) * 1000);
  const parsed = Date.parse(header);
  return Number.isFinite(parsed) ? Math.max(0, parsed - now) : null;
}
export function createClient(config, { fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  cachePrefix = 'data/raw/rentcast', clock = () => new Date().toISOString(), store = {get:readCache,put:saveCache} } = {}) {
  const metrics = { apiCalls: 0, cacheHits: 0, retries: 0, rateLimits: 0, events: [] };
  let exhaustedQuota = false;
  async function get(endpoint, params, { refresh = false } = {}) {
    if (!['/properties', '/avm/value'].includes(endpoint)
      || config.baseUrl !== 'https://api.rentcast.io/v1'
      || typeof params.address !== 'string' || !params.address.trim()
      || Object.keys(params).some((key) => !['address','compCount','maxRadius','daysOld'].includes(key))) {
      throw new ProviderStop('REQUEST_CONTRACT_STOP');
    }
    const location = cacheLocation(endpoint, params, cachePrefix);
    const cached = refresh ? null : await store.get(location);
    if (cached) { metrics.cacheHits++; return cached; }
    const url = new URL(`${config.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      if (exhaustedQuota || metrics.apiCalls >= config.maxCalls) throw new ProviderStop('QUOTA_BUDGET_STOP');
      if (metrics.apiCalls > 0) await sleep(config.delayMs);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      let response;
      let body;
      let malformed = false;
      metrics.apiCalls++;
      try {
        response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal: controller.signal,
          headers: { Accept: 'application/json', 'X-Api-Key': config.apiKey } });
        const responseText = await response.text();
        try { body = JSON.parse(responseText); } catch { body = { parseError: 'Non-JSON response omitted' }; malformed = true; }
      } catch {
        metrics.events.push({ endpoint, status: 'NETWORK_OR_TIMEOUT', attempt });
        if (attempt === config.maxRetries) throw new ProviderStop('NETWORK_STOP');
        metrics.retries++;
        await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 100));
        continue;
      } finally { clearTimeout(timeout); }
      const entry = await store.put(location, { retrievedAt: clock(), httpStatus: response.status,
        body: redact(body, [config.apiKey]) });
      metrics.events.push({ endpoint, httpStatus: response.status, rawResponseRef: entry.rawResponseRef });
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining !== null && Number(remaining) <= 0) exhaustedQuota = true;
      if ([401, 403].includes(response.status)) throw new ProviderStop('AUTHENTICATION_STOP', entry.rawResponseRef);
      if (response.status === 402) throw new ProviderStop('QUOTA_STOP', entry.rawResponseRef);
      if (response.status === 429) metrics.rateLimits++;
      if (transient.has(response.status)) {
        const wait = retryDelay(response.headers.get('retry-after')) ?? 500 * 2 ** attempt + Math.floor(Math.random() * 100);
        if (exhaustedQuota || attempt === config.maxRetries || wait > 30000) {
          throw new ProviderStop(response.status === 429 ? 'RATE_LIMIT_STOP' : 'PROVIDER_UNAVAILABLE_STOP', entry.rawResponseRef);
        }
        metrics.retries++;
        await sleep(wait);
        continue;
      }
      if (!response.ok) throw new ProviderStop(`HTTP_${response.status}_STOP`, entry.rawResponseRef);
      if (malformed || body === null || typeof body !== 'object' || body.error) {
        throw new ProviderStop('API_CONTRACT_STOP', entry.rawResponseRef);
      }
      return entry;
    }
  }
  return { get, metrics };
}
