// ═══════════════════════════════════════════════════
//  AgencyFlow — Vercel Serverless Config API
//  Expõe variáveis de ambiente para o frontend
//  Rota: /api/config
// ═══════════════════════════════════════════════════

export default function handler(req, res) {
  // Cache: nunca cachear (valores podem mudar)
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');

  // Só permite GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    pexelsApiKey: process.env.PEXELS_API_KEY || '',
  });
}
