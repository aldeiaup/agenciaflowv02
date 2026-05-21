// ═══════════════════════════════════════════════════════════════
//  AgencyFlow — Vercel Serverless Config API
//  Rota: /api/config
//
//  SEGURANÇA:
//  - Apenas retorna o necessário para o frontend
//  - Pexels API key NÃO é exposta (usar /api/pexels-proxy)
//  - Validação de Origin/Referer
//  - Rate limiting
// ═══════════════════════════════════════════════════════════════

// ── Rate limiting (em memória) ──
const rateLimitMap = new Map();
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return { allowed: entry.count <= RATE_MAX, remaining: Math.max(0, RATE_MAX - entry.count) };
}

export default function handler(req, res) {
  // ── Só GET ──
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Validação de Origin (CSRF / hotlinking) ──
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedHosts = [
    'agenciaflowv02.vercel.app',
    'app-aldeiaupmkt.vercel.app',
    'agenciaflowv02-git-master-aldeiaupmkt.vercel.app',
    'localhost',
    '127.0.0.1',
  ];
  const isAllowed = !origin || allowedHosts.some(h => origin.includes(h));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // ── Rate limiting ──
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
  const rateCheck = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // ── Cache ──
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // ── Response (apenas o necessário, sem chave Pexels) ──
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    appName: 'AgencyFlow',
    version: '1.0.0',
  });
}
