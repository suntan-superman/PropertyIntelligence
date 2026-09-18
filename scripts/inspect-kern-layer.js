import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { kernConfig, layerUrl } from '../src/config/kern.js';
import {
  renderDataDictionary,
  summarizeMetadata,
} from '../src/sources/kern/metadata.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDirectory = path.join(projectRoot, 'data', 'cache');
const dataDictionaryPath = path.join(projectRoot, 'docs', 'DATA_DICTIONARY.md');

async function fetchMetadata(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), kernConfig.timeoutMs);
  try {
    const response = await fetch(`${url}?f=json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'PropertyIntelligence-Kern-POC1/0.1' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Metadata request failed: HTTP ${response.status} ${response.statusText}`);
    }
    const body = await response.json();
    if (body.error) {
      const error = new Error(`ArcGIS metadata error ${body.error.code}: ${body.error.message}`);
      error.arcgis = {
        url,
        http_status: response.status,
        code: body.error.code,
        message: body.error.message,
        details: body.error.details || [],
      };
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

await mkdir(cacheDirectory, { recursive: true });

try {
  // Keep metadata discovery conservative and sequential. Record queries remain
  // blocked until both responses prove that the service is available.
  const serviceMetadata = await fetchMetadata(kernConfig.mapServerUrl);
  const layerMetadata = await fetchMetadata(layerUrl(kernConfig));
  const summary = summarizeMetadata(serviceMetadata, layerMetadata);

  await Promise.all([
    writeFile(
      path.join(cacheDirectory, 'kern-mapserver-metadata.json'),
      `${JSON.stringify(serviceMetadata, null, 2)}\n`,
    ),
    writeFile(
      path.join(cacheDirectory, 'kern-parcel-layer-metadata.json'),
      `${JSON.stringify(layerMetadata, null, 2)}\n`,
    ),
    writeFile(dataDictionaryPath, renderDataDictionary(layerUrl(kernConfig), layerMetadata, summary)),
  ]);

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  const diagnostic = {
    inspected_at: new Date().toISOString(),
    mapserver_url: kernConfig.mapServerUrl,
    layer_url: layerUrl(kernConfig),
    status: 'METADATA_INSPECTION_FAILED',
    error: error.arcgis || { message: error.message },
  };
  const diagnosticPath = path.join(cacheDirectory, 'kern-metadata-inspection-failure.json');
  await writeFile(diagnosticPath, `${JSON.stringify(diagnostic, null, 2)}\n`);
  console.error(`${error.message}\nDiagnostic: ${diagnosticPath}`);
  process.exitCode = 1;
}
