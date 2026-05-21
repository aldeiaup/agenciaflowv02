// ═══════════════════════════════════════
//   AgencyFlow — Security Module
//   src/utils/security.js
//
//   Usa apenas APIs nativas do browser:
//   - Web Crypto API (PBKDF2 + SHA-256)
//   - crypto.getRandomValues()
//   - localStorage (rate limit + sessão persistente)
//   - sessionStorage (sessão temporária)
// ═══════════════════════════════════════

// ── CONFIGURAÇÕES ──
const SEC_CONFIG = {
  maxAttempts:    5,       // tentativas antes de bloquear
  lockoutMinutes: 10,      // minutos de bloqueio
  sessionHours:   8,       // duração da sessão (horas)
  rememberDays:   7,       // duração do "lembrar-me" (dias)
  minPasswordLen: 8,       // comprimento mínimo de senha
  saltRounds:     100000,  // iterações PBKDF2
};

// ── HELPERS HEX ──
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── HASHING DE SENHA (PBKDF2) ──
async function hashPassword(password, salt = null) {
  // Gera um salt aleatório de 16 bytes se não fornecido
  if (!salt) {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    salt = bytesToHex(saltBytes);
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(salt),
      iterations: SEC_CONFIG.saltRounds,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  const hash = bytesToHex(derivedBits);
  return { hash, salt };
}

async function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = await hashPassword(password, storedSalt);
  return hash === storedHash;
}

// Hash simples (SHA-256 direto) para compatibilidade com seed data (demo)
// ⚠️ NÃO USAR EM PRODUÇÃO — apenas para usuários demo locais
async function hashSimple(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// ── TOKEN DE SESSÃO SEGURO ──
function generateToken(length = 48) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// ── GERENCIAMENTO DE SESSÃO ──
function createSession(user, remember = false) {
  const token = generateToken(64);
  const durationMs = remember
    ? SEC_CONFIG.rememberDays * 24 * 60 * 60 * 1000
    : SEC_CONFIG.sessionHours * 60 * 60 * 1000;

  const session = {
    token,
    userId:    user.id,
    name:      user.name,
    email:     user.email,
    role:      user.role,
    initials:  user.initials,
    color:     user.color,
    agency:    user.agency,
    createdAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    remember,
  };

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('af_session', JSON.stringify(session));

  // Registra o token no localStorage para validação cruzada
  localStorage.setItem('af_last_token', token);
  localStorage.setItem('af_last_expiry', session.expiresAt.toString());

  return session;
}

function getSession() {
  // Tenta sessionStorage primeiro, depois localStorage (lembrar-me)
  let raw = sessionStorage.getItem('af_session') || localStorage.getItem('af_session');
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (!session || !session.token || !session.expiresAt) return null;

    // Verifica expiração
    if (Date.now() > session.expiresAt) {
      destroySession();
      return null;
    }

    // Valida token contra o registrado
    const savedToken = localStorage.getItem('af_last_token');
    if (savedToken && session.token !== savedToken) {
      destroySession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function destroySession() {
  sessionStorage.removeItem('af_session');
  localStorage.removeItem('af_session');
  localStorage.removeItem('af_last_token');
  localStorage.removeItem('af_last_expiry');
}

function isSessionValid() {
  return getSession() !== null;
}

// ── RATE LIMITING (login throttle) ──
function getAttemptKey(email) {
  return `af_attempts_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

function getAttempts(email) {
  try {
    const raw = localStorage.getItem(getAttemptKey(email));
    return raw ? JSON.parse(raw) : { count: 0, firstAt: null, lockedUntil: null };
  } catch {
    return { count: 0, firstAt: null, lockedUntil: null };
  }
}

function recordFailedAttempt(email) {
  const attempts = getAttempts(email);
  const now = Date.now();

  attempts.count = (attempts.count || 0) + 1;
  if (!attempts.firstAt) attempts.firstAt = now;

  if (attempts.count >= SEC_CONFIG.maxAttempts) {
    attempts.lockedUntil = now + (SEC_CONFIG.lockoutMinutes * 60 * 1000);
  }

  localStorage.setItem(getAttemptKey(email), JSON.stringify(attempts));
  return attempts;
}

function resetAttempts(email) {
  localStorage.removeItem(getAttemptKey(email));
}

function isLockedOut(email) {
  const attempts = getAttempts(email);
  if (!attempts.lockedUntil) return false;
  if (Date.now() < attempts.lockedUntil) return {
    locked: true,
    remainingMinutes: Math.ceil((attempts.lockedUntil - Date.now()) / 60000),
    remainingSeconds: Math.ceil((attempts.lockedUntil - Date.now()) / 1000),
  };
  // Lockout expirou, resetar
  resetAttempts(email);
  return false;
}

function getRemainingAttempts(email) {
  const attempts = getAttempts(email);
  return Math.max(0, SEC_CONFIG.maxAttempts - (attempts.count || 0));
}

// ── VALIDAÇÃO DE SENHA FORTE ──
function validatePasswordStrength(password) {
  const errors = [];
  const checks = {
    length:    { ok: password.length >= SEC_CONFIG.minPasswordLen,
                 msg: `Mínimo ${SEC_CONFIG.minPasswordLen} caracteres` },
    uppercase: { ok: /[A-Z]/.test(password),
                 msg: 'Pelo menos uma letra maiúscula' },
    lowercase: { ok: /[a-z]/.test(password),
                 msg: 'Pelo menos uma letra minúscula' },
    number:    { ok: /[0-9]/.test(password),
                 msg: 'Pelo menos um número' },
    special:   { ok: /[^A-Za-z0-9]/.test(password),
                 msg: 'Pelo menos um caractere especial (!@#$%...)' },
  };

  let score = 0;
  for (const [key, check] of Object.entries(checks)) {
    if (check.ok) score++;
    else errors.push(check.msg);
  }

  return {
    score,          // 0–5
    errors,
    isStrong: score >= 4,   // exige 4 de 5 critérios
    label: score <= 1 ? 'Muito fraca' : score === 2 ? 'Fraca' : score === 3 ? 'Média' : score === 4 ? 'Forte' : 'Muito forte',
    color: score <= 1 ? 'var(--red)' : score <= 2 ? 'var(--orange)' : score === 3 ? 'var(--yellow)' : 'var(--green)',
  };
}

// ── VALIDAÇÃO DE EMAIL ──
function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
}

// ── LOG DE AUDITORIA ──
function logAudit(action, details = {}) {
  try {
    const logs = JSON.parse(localStorage.getItem('af_audit_log') || '[]');
    logs.unshift({
      action,
      details,
      timestamp: new Date().toISOString(),
      ua: navigator.userAgent.slice(0, 80),
    });
    // Mantém apenas os últimos 50 registros
    localStorage.setItem('af_audit_log', JSON.stringify(logs.slice(0, 50)));
  } catch { /* silencioso */ }
}

function getAuditLog() {
  try {
    return JSON.parse(localStorage.getItem('af_audit_log') || '[]');
  } catch {
    return [];
  }
}

// ── EXPIRAÇÃO AUTOMÁTICA ──
function startSessionWatcher() {
  // Verifica a sessão a cada minuto
  setInterval(() => {
    const session = getSession();
    if (!session && window.location.href.includes('dashboard')) {
      logAudit('session_expired');
      window.location.href = 'index.html?reason=expired';
    }
  }, 60 * 1000);
}

// Exporta
if (typeof module !== 'undefined') {
  module.exports = {
    hashPassword, verifyPassword, hashSimple,
    generateToken, createSession, getSession, destroySession, isSessionValid,
    recordFailedAttempt, resetAttempts, isLockedOut, getRemainingAttempts,
    validatePasswordStrength, validateEmail,
    logAudit, getAuditLog, startSessionWatcher,
    SEC_CONFIG,
  };
}
