// ═══════════════════════════════════════
//   AgencyFlow — App Configuration
//   src/config.js
//
//   CONFIGURE SUA CHAVE AQUI (apenas para dev local):
//   const APP_CONFIG = { pexelsApiKey: 'SUA_CHAVE' };
//
//   EM PRODUÇÃO: use variáveis de ambiente ou um backend proxy
//   para não expor chaves de API no frontend.
// ═══════════════════════════════════════

const APP_CONFIG = {
  // Pexels API key removida — usar /api/pexels-proxy (server-side)
  supabaseUrl: 'https://SEU_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'SUA_ANON_KEY_AQUI',
  appName: 'AgencyFlow',
  version: '1.0.0',
};

// Tenta carregar configuração via window.__APP_CONFIG__ (injeção manual)
if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
  Object.assign(APP_CONFIG, window.__APP_CONFIG__);
}

// Em produção (Vercel), busca as env vars do endpoint /api/config
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  (async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const env = await res.json();
        if (env.supabaseUrl)        APP_CONFIG.supabaseUrl = env.supabaseUrl;
        if (env.supabaseAnonKey)    APP_CONFIG.supabaseAnonKey = env.supabaseAnonKey;
        window.dispatchEvent(new CustomEvent('appconfig:ready', { detail: APP_CONFIG }));
      }
    } catch (_) { /* fallback silencioso para valores locais */ }
  })();
}

// Exporta
if (typeof module !== 'undefined') {
  module.exports = { APP_CONFIG };
}
