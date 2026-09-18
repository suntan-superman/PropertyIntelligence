const DEFAULT_MAPSERVER_URL =
  'https://maps.kerncounty.com/arcgis/rest/services/Assessor/Assessor_Public/MapServer';

function integerSetting(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

export const kernConfig = Object.freeze({
  mapServerUrl: (process.env.KERN_MAPSERVER_URL || DEFAULT_MAPSERVER_URL).replace(/\/$/, ''),
  layerId: integerSetting('KERN_PARCEL_LAYER_ID', 2),
  timeoutMs: integerSetting('KERN_REQUEST_TIMEOUT_MS', 15_000),
  requestDelayMs: integerSetting('KERN_REQUEST_DELAY_MS', 150),
  maxRetries: integerSetting('KERN_MAX_RETRIES', 4),
});

export function layerUrl(config = kernConfig) {
  return `${config.mapServerUrl}/${config.layerId}`;
}

export function queryUrl(config = kernConfig) {
  return `${layerUrl(config)}/query`;
}
