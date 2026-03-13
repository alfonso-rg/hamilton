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

    const fredUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`;
    const res = await fetch(fredUrl, {
      headers: { 'user-agent': 'netlify-hamilton-proxy/1.0' }
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        },
        body: JSON.stringify({ error: `FRED respondió ${res.status}` })
      };
    }

    const csv = await res.text();
    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'cache-control': 'public, max-age=1800'
      },
      body: csv
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
