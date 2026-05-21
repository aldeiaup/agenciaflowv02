// ═══════════════════════════════════════
//   AgencyFlow — Pexels Background Engine
//   src/utils/pexels.js
//
//   Busca imagens de fundo da Pexels API
//   para compor o layout de forma dinâmica.
// ═══════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//   SEGURANÇA: A chave de API NÃO deve ficar hardcoded no frontend.
//   Configure via:
//     1. src/config.js  (dev local — não commitar)
//     2. window.__APP_CONFIG__ (injetado em produção)
//     3. localStorage.setItem('pexels_api_key', 'sua-chave')
//   Em produção, use um backend proxy para não expor a chave.
// ═══════════════════════════════════════════════════════════════

function getPexelsApiKey() {
  // 1. Tenta config.js
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.pexelsApiKey) {
    return APP_CONFIG.pexelsApiKey;
  }
  // 2. Tenta window.__APP_CONFIG__
  if (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.pexelsApiKey) {
    return window.__APP_CONFIG__.pexelsApiKey;
  }
  // 3. Tenta localStorage (dev)
  try {
    const stored = localStorage.getItem('pexels_api_key');
    if (stored) return stored;
  } catch { /* silent */ }
  // 4. Fallback vazio — a API retornará erro controlado
  console.warn('[Pexels] Nenhuma API key configurada. Configure em src/config.js ou localStorage.');
  return '';
}

const PEXELS_BASE = 'https://api.pexels.com/v1';

// ── Cache local para evitar requests repetidos ──
let _imageCache = null;
let _lastFetch = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// ── Categorias de busca alinhadas ao nicho de agências ──
const SEARCH_QUERIES = [
  'marketing agency workspace',
  'creative studio office',
  'digital agency team',
  'modern office desk',
  'creative collaboration',
  'abstract gradient',
  'professional workspace',
  'design studio interior',
];

/**
 * Busca imagens de fundo da Pexels API.
 * @param {string} query - Termo de busca (opcional)
 * @param {number} perPage - Quantidade de imagens (default 15)
 * @returns {Promise<string[]>} Array de URLs de imagens
 */
async function fetchPexelsBackgrounds(query = null, perPage = 15) {
  const now = Date.now();
  
  // Usa cache se ainda válido
  if (_imageCache && (now - _lastFetch) < CACHE_TTL) {
    return _imageCache;
  }

  const searchTerm = query || SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';

  try {
    const apiKey = getPexelsApiKey();
    if (!apiKey) {
      console.warn('[Pexels] API key não configurada — pulando busca de imagens.');
      return _imageCache || { photos: [] };
    }

    const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(searchTerm)}&per_page=${perPage}&orientation=${orientation}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);

    const data = await response.json();
    const photos = data.photos || [];
    
    // Cache média e pequena para diferentes usos
    _imageCache = {
      photos: photos.map(p => ({
        id: p.id,
        src: p.src,                // Contém vários tamanhos
        photographer: p.photographer,
        photographerUrl: p.photographer_url,
        alt: p.alt || searchTerm,
      })),
      lastQuery: searchTerm,
    };
    _lastFetch = now;

    return _imageCache;
  } catch (err) {
    console.warn('[Pexels] Erro ao buscar imagens:', err.message);
    // Retorna fallback se cache existir
    return _imageCache || { photos: [] };
  }
}

/**
 * Retorna URL de background em tamanho adequado.
 * @param {Object} photo - Objeto photo do Pexels
 * @param {'original'|'large2x'|'large'|'medium'|'small'} size
 * @returns {string}
 */
function getPexelsUrl(photo, size = 'large') {
  return photo?.src?.[size] || '';
}

/**
 * Aplica background image a um elemento com overlay escuro via CSS nativo.
 * Usa background-image multicamada — sem div extra, sem conflito de stacking.
 * O conteúdo do elemento fica naturalmente acima do overlay.
 *
 * @param {HTMLElement} element - Elemento alvo
 * @param {string} imageUrl - URL da imagem
 * @param {number} overlayOpacity - Opacidade do overlay (0-1)
 */
function applyPexelsBackground(element, imageUrl, overlayOpacity = 0.6) {
  if (!element || !imageUrl) return;

  // Gradiente escuro + imagem — sem div overlay separada
  // O gradiente fica na camada de cima, imagem na de baixo
  element.style.backgroundImage = `
    linear-gradient(rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${Math.min(overlayOpacity + 0.1, 0.95)})),
    url(${imageUrl})
  `;
  element.style.backgroundSize = 'cover, cover';
  element.style.backgroundPosition = 'center, center';
  element.style.backgroundRepeat = 'no-repeat, no-repeat';
  element.style.backgroundBlendMode = 'normal, normal';

  // Remove overlay div antigo se existir (migração do modelo anterior)
  element.querySelectorAll('.pexels-overlay').forEach(el => el.remove());
}

/**
 * Inicializa background Pexels na página de login.
 * Escolhe imagem aleatória do cache e aplica no painel esquerdo.
 */
async function initLoginBackground() {
  const leftPanel = document.querySelector('.left-panel');
  if (!leftPanel) return;

  try {
    const result = await fetchPexelsBackgrounds('marketing agency creative workspace');
    const photos = result?.photos || [];
    
    if (photos.length > 0) {
      // Escolhe foto aleatória
      const photo = photos[Math.floor(Math.random() * photos.length)];
      const imageUrl = getPexelsUrl(photo, 'large');
      
      // Troca a cada 60s
      applyPexelsBackground(leftPanel, imageUrl, 0.72);
      
      // Rotação automática
      setInterval(async () => {
        try {
          const newResult = await fetchPexelsBackgrounds();
          const newPhotos = newResult?.photos || [];
          if (newPhotos.length > 0) {
            const newPhoto = newPhotos[Math.floor(Math.random() * newPhotos.length)];
            applyPexelsBackground(leftPanel, getPexelsUrl(newPhoto, 'large'), 0.72);
          }
        } catch (e) {
          // Silencioso
        }
      }, 60000);
    }
  } catch (err) {
    console.warn('[Pexels] Erro no background do login:', err.message);
  }
}

/**
 * Inicializa background sutil no dashboard
 */
async function initDashboardBackground() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  try {
    const result = await fetchPexelsBackgrounds('dark abstract gradient', 5);
    const photos = result?.photos || [];
    
    if (photos.length > 0) {
      const photo = photos[Math.floor(Math.random() * photos.length)];
      const imageUrl = getPexelsUrl(photo, 'medium');
      
      // Overlay mais opaco para manter legibilidade
      applyPexelsBackground(appEl, imageUrl, 0.85);
    }
  } catch (err) {
    console.warn('[Pexels] Erro no background do dashboard:', err.message);
  }
}

// Export para uso modular
if (typeof module !== 'undefined') {
  module.exports = {
    fetchPexelsBackgrounds,
    getPexelsUrl,
    applyPexelsBackground,
    initLoginBackground,
    initDashboardBackground,
  };
}
