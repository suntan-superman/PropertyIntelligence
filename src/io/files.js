import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const resolve = (relative) => path.join(root, relative);
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export async function readJson(relative) {
  return JSON.parse(await readFile(resolve(relative), 'utf8'));
}
export async function writeText(relative, text) {
  const destination = resolve(relative);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, text, { mode: 0o600 });
  await rename(temporary, destination);
}
export const writeJson = (relative, value) => writeText(relative, `${JSON.stringify(value, null, 2)}\n`);
export function csv(rows, columns) {
  const cell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns, ...rows.map((row) => columns.map((key) => row[key]))]
    .map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
