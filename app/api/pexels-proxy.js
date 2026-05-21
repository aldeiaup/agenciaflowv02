// ═══════════════════════════════════════════════════════════════
//  AgencyFlow — Pexels Proxy API (SERVER-SIDE ONLY)
//  Rota: /api/pexels-proxy
//
//  SEGURANÇA: A chave Pexels NUNCA sai do servidor.
//  O frontend chama este proxy, que faz a request autenticada
//  para a Pexels API e retorna apenas os dados necessários.
//
//  Uso: GET /api/pexels-proxy?query=...&per_page=...&orientation=...
// ═══════════════════════════════════════════════════════════════

const PEXELS_BASE = 'https://api.pexels.com/v1';

// ── Rate limiting simples (em memória) ──
const rateLimitMap = new Map();
const RATE_WINDOW = 60 * 1000;   // 1 minuto
const RATE_MAX    = 20;           // máx requests/minuto/IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };

  // Se a janela expirou, reseta
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  // Limpeza periódica do mapa
  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_WINDOW * 2;
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt < cutoff) rateLimitMap.delete(key);
    }
  }

  const remaining = Math.max(0, RATE_MAX - entry.count);
  return { allowed: entry.count <= RATE_MAX, remaining, resetAt: entry.resetAt };
}

export default async function handler(req, res) {
  // ── CORS / Same-Origin ──
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedHosts = [
    'agenciaflowv02.vercel.app',
    'app-aldeiaupmkt.vercel.app',
    'localhost',
    '127.0.0.1',
  ];

  const isAllowed = allowedHosts.some(h => origin.includes(h));
  if (!isAllowed && origin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Define CORS header para permitir requests do próprio domínio
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // ── Preflight ──
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── Só permite GET ──
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting ──
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
  const rateCheck = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  res.setHeader('X-RateLimit-Reset', rateCheck.resetAt);

  if (!rateCheck.allowed) {
    const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter,
    });
  }

  // ── Cache ──
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.setHeader('CDN-Cache-Control', 'public, max-age=600');

  // ── Valida parâmetros ──
  const query = req.query.query || 'marketing agency workspace';
  const perPage = Math.min(Math.max(parseInt(req.query.per_page) || 15, 1), 30);
  const orientation = req.query.orientation || 'landscape';

  if (query.length > 200) {
    return res.status(400).json({ error: 'Query too long' });
  }

  // ── Chave Pexels (apenas server-side) ──
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Pexels API key not configured' });
  }

  try {
    const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
    const response = await fetch(url, {
      headers: { 'Authorization': apiKey },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    const photos = (data.photos || []).map(p => ({
      id: p.id,
      src: p.src,       // Vários tamanhos: original, large2x, large, medium, small
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      alt: p.alt || query,
    }));

    res.status(200).json({
      photos,
      lastQuery: query,
      page: data.page || 1,
      totalResults: data.total_results || 0,
    });
  } catch (err) {
    console.error('[Pexels Proxy] Erro:', err.message);
    res.status(502).json({ error: 'Failed to fetch from Pexels' });
  }
}
