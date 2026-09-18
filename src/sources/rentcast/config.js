import { existsSync } from 'node:fs';
import { resolve } from '../../io/files.js';
export function loadLocalEnvironment() {
  const envPath = resolve('.env');
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}
export function configuration(env = process.env) {
  const apiKey = env.RENTCAST_API_KEY?.trim() || env.MARKET_DATA_API_KEY?.trim();
  if (!apiKey) throw new Error('CONFIGURATION_STOP: populate RENTCAST_API_KEY in the process environment or PropertyIntelligence/.env');
  if (/\s/.test(apiKey)) throw new Error('CONFIGURATION_STOP: RENTCAST_API_KEY contains whitespace');
  if (env.RENTCAST_BASE_URL && env.RENTCAST_BASE_URL.replace(/\/$/, '') !== 'https://api.rentcast.io/v1') {
    throw new Error('CONFIGURATION_STOP: only the official RentCast HTTPS host is allowed');
  }
  return { apiKey, baseUrl: 'https://api.rentcast.io/v1', timeoutMs: 15000,
    maxRetries: 2, maxCalls: 6, delayMs: 300 };
}
