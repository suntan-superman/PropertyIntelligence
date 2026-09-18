import { hash, readJson, writeJson } from '../../io/files.js';
export function cacheLocation(endpoint, params, prefix = 'data/raw/rentcast') {
  const canonicalParams = Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
  const request = { endpoint, params: canonicalParams };
  const directory = `${prefix}/${hash(params.address)}`;
  return { request, directory, index: `${directory}/${hash(JSON.stringify(request))}.index.json` };
}
export async function readCache(location) {
  try {
    const { rawResponseRef } = await readJson(location.index);
    if (typeof rawResponseRef !== 'string' || !rawResponseRef.startsWith(`${location.directory}/`)
      || !/^[a-f0-9]{64}\.json$/.test(rawResponseRef.slice(location.directory.length + 1))) return null;
    const entry = await readJson(rawResponseRef);
    if (entry.schemaVersion !== 1 || entry.httpStatus !== 200
      || JSON.stringify(entry.request) !== JSON.stringify(location.request)
      || !Number.isFinite(Date.parse(entry.retrievedAt)) || entry.body === undefined
      || entry.bodyHash !== hash(JSON.stringify(entry.body))) return null;
    return { ...entry, rawResponseRef };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}
export async function saveCache(location, entry) {
  const bodyHash = hash(JSON.stringify(entry.body));
  const rawResponseRef = `${location.directory}/${hash(JSON.stringify([location.request, entry.retrievedAt, bodyHash]))}.json`;
  const record = { schemaVersion: 1, ...entry, bodyHash, request: location.request };
  await writeJson(rawResponseRef, record);
  if (entry.httpStatus === 200 && entry.body && !entry.body.parseError && !entry.body.error) {
    await writeJson(location.index, { rawResponseRef });
  }
  return { ...record, rawResponseRef };
}
