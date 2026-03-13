const TIMEOUT_MS = 4500;

async function fetchTextWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'netlify-hamilton-proxy/1.1' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function normalizeCsv(raw) {
  const lines = String(raw).split(/\r?\n/).filter(Boolean);
  const out = ['DATE,VALUE'];

  for (const line of lines) {
    if (/^DATE,VALUE$/i.test(line.trim())) continue;
    if (/^DATE\s*,/i.test(line)) continue;
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const date = (parts[0] || '').trim();
    const val = (parts[1] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out.push(`${date},${val}`);
  }

  return out.length > 1 ? out.join('\n') + '\n' : 'DATE,VALUE\n';
}

exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id;

    if (!id || !/^[A-Z0-9_]+$/i.test(id)) {
      return {
        statusCode: 400,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        },
        body: JSON.stringify({ error: 'Parámetro id inválido' })
      };
    }

    const urls = [
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`,
      `https://fred.stlouisfed.org/series/${encodeURIComponent(id)}/downloaddata/${encodeURIComponent(id)}.csv`
    ];

    const errors = [];
    for (const url of urls) {
      try {
        const raw = await fetchTextWithTimeout(url);
        const csv = normalizeCsv(raw);
        if (csv.split(/\r?\n/).length > 10) {
          return {
            statusCode: 200,
            headers: {
              'content-type': 'text/csv; charset=utf-8',
              'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
            },
            body: csv
          };
        }
        errors.push(`respuesta vacía en ${url}`);
      } catch (err) {
        errors.push(`${url}: ${String(err?.message || err)}`);
      }
    }

    return {
      statusCode: 504,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      },
      body: JSON.stringify({
        error: 'No se pudieron descargar datos de FRED a tiempo',
        detail: errors.join(' | ')
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      },
      body: JSON.stringify({ error: 'Error interno al consultar FRED', detail: String(err?.message || err) })
    };
  }
};
