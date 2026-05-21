// ═══════════════════════════════════════
//   AgencyFlow — Utility Helpers
//   src/utils/helpers.js
// ═══════════════════════════════════════

// COLORS e TODAY são definidos em seed.js (carregado antes).
// Mantidos aqui como comentário para referência:
//   COLORS = ['#3B82F6','#22C55E','#EF4444','#F97316','#A855F7','#EAB308','#EC4899','#06B6D4']
//   TODAY  = '2026-03-17'

// ── Mapa de colunas ──
const COL_MAP = {
  todo:   'A Fazer',
  doing:  'Em Andamento',
  review: 'Em Revisão',
  done:   'Concluído',
};
const COL_COLORS = {
  todo:   '#3B82F6',
  doing:  '#F97316',
  review: '#A855F7',
  done:   '#22C55E',
};

// ────────────────────────────────────────
// DATAS
// ────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return d.split('-').reverse().join('/');
}

function isLate(due, col) {
  return due < TODAY && col !== 'done';
}

function relativeTime(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date(TODAY);
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7)  return `há ${diff} dias`;
  if (diff < 30) return `há ${Math.floor(diff / 7)} semanas`;
  return `há ${Math.floor(diff / 30)} meses`;
}

// ────────────────────────────────────────
// MEMBROS
// ────────────────────────────────────────
function memberColor(name, users) {
  return users.find(u => u.name === name)?.color || '#666680';
}

function memberInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ────────────────────────────────────────
// STRINGS
// ────────────────────────────────────────
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, len = 60) {
  if (!str || str.length <= len) return str;
  return str.slice(0, len) + '…';
}

// ────────────────────────────────────────
// ARRAYS
// ────────────────────────────────────────
function unique(arr) {
  return [...new Set(arr)];
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ────────────────────────────────────────
// IDs
// ────────────────────────────────────────
function genId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function genTaskId(tasks) {
  const max = tasks.reduce((m, t) => Math.max(m, t.id || 0), 37550);
  return max + 1;
}

// ────────────────────────────────────────
// PROGRESSO
// ────────────────────────────────────────
function progressColor(pct) {
  if (pct === 100) return '#22C55E';
  if (pct >= 70)  return '#3B82F6';
  if (pct >= 40)  return '#F97316';
  return '#EF4444';
}

// ────────────────────────────────────────
// TIMER
// ────────────────────────────────────────
function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ────────────────────────────────────────
// TOAST
// ────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  const bg = { success: '#22C55E', error: '#EF4444', info: '#3B82F6', warn: '#F97316' };
  t.className = 'toast';
  t.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    background: ${bg[type] || bg.success};
    color: #fff; padding: 10px 18px; border-radius: 8px;
    font-size: 13px; font-weight: 500; z-index: 9999;
    font-family: var(--font-body);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: fadeIn 0.2s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ────────────────────────────────────────
// MODAIS
// ────────────────────────────────────────

// Fecha o primeiro overlay aberto
function closeModal() {
  document.querySelector('.modal-overlay')?.remove();
}

// ── Sanitização básica de HTML ──
function sanitize(str) {
  if (!str) return '';
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

// Abre modal dinâmico com campos configuráveis
function openModal(title, fields, onSave) {
  const id  = 'm-' + genId();
  const safeTitle = sanitize(title);
  const fieldsHtml = fields.map(f => {
    const safeLabel = sanitize(f.label);
    const safePlaceholder = sanitize(f.placeholder || '');
    const safeValue = sanitize(f.value || '');
    const safeId = sanitize(f.id);

    if (f.type === 'select') {
      const options = (f.options || []).map(o => {
        const val = sanitize(o.value ?? o);
        const lbl = sanitize(o.label ?? o);
        return `<option value="${val}">${lbl}</option>`;
      }).join('');
      return `<div class="field"><div class="field-label">${safeLabel}</div>
        <select class="field-input field-select" id="${safeId}">${options}</select></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="field"><div class="field-label">${safeLabel}</div>
        <textarea class="field-input field-textarea" id="${safeId}"
          placeholder="${safePlaceholder}">${safeValue}</textarea></div>`;
    }
    return `<div class="field"><div class="field-label">${safeLabel}</div>
      <input class="field-input" type="${f.type || 'text'}" id="${safeId}"
        placeholder="${safePlaceholder}" value="${safeValue}"></div>`;
  }).join('');

  const html = `
    <div class="modal-overlay" id="${id}" onclick="if(event.target===this)this.remove()">
      <div class="modal slide-up">
        <h3>${safeTitle}</h3>
        ${fieldsHtml}
        <div class="modal-actions">
          <button class="btn" onclick="document.getElementById('${id}').remove()">Cancelar</button>
          <button class="btn btn-primary" id="btn-save-${id}">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  // Foco no primeiro campo
  setTimeout(() => document.querySelector(`#${id} .field-input`)?.focus(), 60);
  // Enter no botão salva
  document.getElementById(`btn-save-${id}`).onclick = () => {
    const data = {};
    fields.forEach(f => { data[f.id] = document.getElementById(f.id)?.value ?? ''; });
    onSave(data);
    document.getElementById(id)?.remove();
  };
}

// ────────────────────────────────────────
// EXPORTA (Node.js / testes unitários)
// Carregar seed.js antes para obter COLORS e TODAY.
// ────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports = {
    fmtDate, isLate, relativeTime,
    memberColor, memberInitials,
    capitalize, truncate, sanitize,
    unique, groupBy,
    genId, genTaskId,
    showToast, closeModal, openModal,
    progressColor, formatTimer,
    COL_MAP, COL_COLORS,
    COLORS: typeof COLORS !== 'undefined' ? COLORS : undefined,
    TODAY:  typeof TODAY  !== 'undefined' ? TODAY  : undefined,
  };
}
