/* WHOOP OAuth token exchange + refresh. Keeps client_secret server-side.
   Set in Netlify env vars: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET. */

const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json(500, { error: 'env_missing', message: 'WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET not set in Netlify env vars.' });
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'bad_json' }); }

  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);

  if (payload.action === 'exchange') {
    if (!payload.code || !payload.redirect_uri) return json(400, { error: 'missing_code_or_redirect' });
    params.set('grant_type', 'authorization_code');
    params.set('code', payload.code);
    params.set('redirect_uri', payload.redirect_uri);
  } else if (payload.action === 'refresh') {
    if (!payload.refresh_token) return json(400, { error: 'missing_refresh_token' });
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', payload.refresh_token);
    params.set('scope', 'offline');
  } else {
    return json(400, { error: 'unknown_action' });
  }

  try {
    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
    return json(r.ok ? 200 : r.status, body);
  } catch (err) {
    return json(502, { error: 'token_endpoint_failed', message: String(err) });
  }
};
