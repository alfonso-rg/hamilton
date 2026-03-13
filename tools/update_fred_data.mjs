#!/usr/bin/env node
import { writeFile, mkdir } from 'node:fs/promises';

const series = ['UNRATE', 'INDPRO', 'PAYEMS', 'CPIAUCSL', 'GDPC1'];
const outDir = new URL('../data/fred/', import.meta.url);

function normalizeCsv(raw) {
  const lines = String(raw).split(/\r?\n/).filter(Boolean);
  const out = ['DATE,VALUE'];
  for (const line of lines) {
    if (/^DATE,VALUE$/i.test(line.trim())) continue;
    if (/^DATE\s*,/i.test(line)) continue;
    const [date, value] = line.split(',');
    if (!date || !value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) continue;
    out.push(`${date.trim()},${value.trim()}`);
  }
  return out.join('\n') + '\n';
}

await mkdir(outDir, { recursive: true });

for (const id of series) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error ${res.status} al descargar ${id}`);
  const csv = normalizeCsv(await res.text());
  await writeFile(new URL(`${id}.csv`, outDir), csv, 'utf8');
  console.log(`ok ${id}`);
}

console.log('Snapshots actualizados en data/fred/');
