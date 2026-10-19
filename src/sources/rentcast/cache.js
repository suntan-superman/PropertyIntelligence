import path from 'node:path';
import { readdir,rm } from 'node:fs/promises';
import { hash, readJson, resolve as resolveFile, writeJson } from '../../io/files.js';
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

export async function listCache(prefix = 'data/raw/rentcast') {
  let directories;
  try { directories = await readdir(prefix, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const records = [];
  for (const directoryEntry of directories) {
    if (!directoryEntry.isDirectory() || !/^[a-f0-9]{64}$/.test(directoryEntry.name)) continue;
    const directory = `${prefix}/${directoryEntry.name}`;
    let files;
    try { files = await readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const file of files) {
      if (!file.isFile() || !/^[a-f0-9]{64}\.index\.json$/.test(file.name)) continue;
      const index = `${directory}/${file.name}`;
      try {
        const pointer = await readJson(index);
        if (typeof pointer.rawResponseRef !== 'string' || !pointer.rawResponseRef.startsWith(`${directory}/`)) continue;
        const stored = await readJson(pointer.rawResponseRef);
        const validated = await readCache({ directory, index, request: stored.request });
        if (validated) records.push(validated);
      } catch (error) {
        if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
      }
    }
  }
  return records;
}

export async function removeCacheRecords(records,prefix='data/raw/rentcast'){
  const root=path.resolve(resolveFile(prefix)),directories=new Set();
  for(const record of records??[]){
    if(typeof record?.rawResponseRef!=='string')continue;
    const target=path.dirname(path.resolve(resolveFile(record.rawResponseRef))),relative=path.relative(root,target);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.includes(path.sep)||!/^[a-f0-9]{64}$/.test(path.basename(target)))throw new Error('CACHE_REMOVAL_TARGET_INVALID');
    directories.add(target);
  }
  for(const directory of directories)await rm(directory,{recursive:true,force:true});
  return {records:records?.length??0,directories:directories.size};
}
