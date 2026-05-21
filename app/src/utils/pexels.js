// ═══════════════════════════════════════
//   AgencyFlow — Pexels Background Engine
//   src/utils/pexels.js
//
//   SEGURANÇA: A chave de API NUNCA está no frontend.
//   As requisições passam pelo proxy server-side
//   (/api/pexels-proxy) que adiciona a chave.
// ═══════════════════════════════════════

const PEXELS_PROXY = '/api/pexels-proxy';

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
 * Busca imagens de fundo via proxy server-side.
 * @param {string} query - Termo de busca (opcional)
 * @param {number} perPage - Quantidade de imagens (default 15)
 * @returns {Promise<Object>} Objeto com array de fotos
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
    const url = `${PEXELS_PROXY}?query=${encodeURIComponent(searchTerm)}&per_page=${perPage}&orientation=${orientation}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

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
