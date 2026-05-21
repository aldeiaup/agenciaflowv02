// ═══════════════════════════════════════
//   AgencyFlow — Auth Component (SEGURO)
//   src/components/auth.js
//   Usa: src/utils/security.js
// ═══════════════════════════════════════

// ── Estado local do fluxo de registro ──
let selectedRole  = 'admin';
let selectedColor = '#3B82F6';
let regData       = {};
let currentStep   = 1;

// ── Inicialização: inicializa hashes dos usuários demo ──
async function initDemoHashes() {
  // Calcula o hash real da senha demo "123456" uma vez
  const demoHash = await hashSimple('123456');

  // Atribui o hash a todos os usuários seed que ainda não têm hash
  if (typeof seedData !== 'undefined') {
    seedData.users.forEach(u => {
      if (!u.passHash) {
        u.passHash = demoHash;
        u.passSalt = '_demo';
      }
    });
  }
}

// Chama na carga da página
initDemoHashes().catch(console.error);

// ── Verificar motivo de redirecionamento ──
(function checkRedirectReason() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'expired') {
    setTimeout(() => showLoginMsg('Sua sessão expirou. Faça login novamente.', 'info'), 300);
  }
  if (params.get('reason') === 'unauthorized') {
    setTimeout(() => showLoginMsg('Acesso não autorizado. Faça login.', 'error'), 300);
  }
})();

// ── Navegação entre telas ──
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ── Mensagem de login (acima do formulário) ──
function showLoginMsg(msg, type = 'info') {
  const el   = document.getElementById('login-err');
  const msgEl = document.getElementById('login-err-msg');
  if (!el || !msgEl) return;
  el.className = `alert alert-${type === 'info' ? 'info' : 'error'}`;
  el.style.display = 'flex';
  msgEl.textContent = msg;
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ── Toggle visibilidade de senha ──
function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text';     btn.textContent = '🙈'; }
  else                         { inp.type = 'password'; btn.textContent = '👁';  }
}

// ── Seleção de papel no registro ──
function selectRole(r) {
  selectedRole = r;
  ['admin', 'manager', 'member'].forEach(role => {
    document.getElementById('ro-' + role)?.classList.toggle('selected', role === r);
  });
}

// ── Seleção de cor do avatar ──
function selectAv(el) {
  document.querySelectorAll('.av-opt').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  selectedColor = el.dataset.color;
}

// ── Verificador de força de senha (visual) ──
function checkPwd(v) {
  const bars = ['pb1', 'pb2', 'pb3'].map(id => document.getElementById(id));
  const lbl  = document.getElementById('pwd-lbl');
  bars.forEach(b => { if (b) b.className = 'pwd-bar'; });
  if (!v) { if (lbl) lbl.textContent = 'Digite uma senha'; return; }

  const result = validatePasswordStrength(v);
  const score  = result.score;
  const cls    = ['weak', 'weak', 'medium', 'medium', 'strong', 'strong'];

  for (let i = 0; i < Math.min(score, 3); i++) {
    if (bars[i]) bars[i].classList.add(cls[score - 1] || 'weak');
  }
  if (lbl) {
    lbl.textContent = result.label;
    lbl.style.color = result.color;
  }
  // Se houver container de erros de senha, atualiza
  const errBox = document.getElementById('pwd-errors');
  if (errBox) {
    errBox.innerHTML = result.errors.map(e => `<div style="font-size:11px;color:var(--text3)">• ${sanitize(e)}</div>`).join('');
  }
}

// ── Exibe erro de formulário ──
function showErr(id, msg) {
  const el    = document.getElementById(id);
  const msgEl = document.getElementById(id + '-msg');
  if (el)    el.style.display = 'flex';
  if (msgEl) msgEl.textContent = msg;
  setTimeout(() => { if (el) el.style.display = 'none'; }, 5000);
}

// ── Contador de tentativas restantes ──
function updateAttemptsDisplay(email) {
  const remaining = getRemainingAttempts(email);
  const hint = document.getElementById('attempts-hint');
  if (!hint) return;
  if (remaining <= 3 && remaining > 0) {
    hint.textContent = `⚠ ${remaining} tentativa${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''} antes do bloqueio.`;
    hint.style.display = 'block';
  } else if (remaining === 0) {
    hint.style.display = 'none';
  } else {
    hint.style.display = 'none';
  }
}

// ─────────────────────────────────────────
//   LOGIN (Supabase + Fallback Local)
// ─────────────────────────────────────────
async function doLogin() {
  const btn   = document.querySelector('#sc-login .submit-btn');
  const email = document.getElementById('li-email')?.value.trim() || '';
  const pass  = document.getElementById('li-pass')?.value || '';
  const rememberMe = document.getElementById('li-remember')?.checked || false;

  if (!email) { showErr('login-err', 'Digite seu e-mail.'); return; }
  if (!validateEmail(email)) { showErr('login-err', 'E-mail inválido.'); return; }
  if (!pass)  { showErr('login-err', 'Digite sua senha.'); return; }

  const lockStatus = isLockedOut(email);
  if (lockStatus && lockStatus.locked) {
    showErr('login-err', `Conta bloqueada por ${lockStatus.remainingMinutes} min.`);
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

  try {
    // ── TENTATIVA 1: SUPABASE ──
    if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (!error && data.user) {
        // Sucesso no Supabase
        const profile = await sbGetProfile(data.user.id).catch(() => null);
        createSession({
          id: data.user.id,
          name: profile?.name || data.user.email,
          email: data.user.email,
          role: profile?.role || 'Membro',
          initials: profile?.initials || '??',
          color: profile?.color || 'var(--blue)',
          agency: profile?.agency || 'AgencyFlow'
        }, rememberMe);
        logAudit('login_success_supabase', { email });
        window.location.href = 'dashboard.html';
        return;
      }
      // Se for erro de credenciais, continua para o fallback local (para suportar usuários demo)
    }

    // ── TENTATIVA 2: LOCAL FALLBACK (Demo Mode) ──
    await initDemoHashes();
    const users = typeof seedData !== 'undefined' ? seedData.users : [];
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      recordFailedAttempt(email);
      updateAttemptsDisplay(email);
      showErr('login-err', 'E-mail ou senha incorretos.');
      return;
    }

    const inputHash = await hashSimple(pass);
    if (inputHash !== user.passHash) {
      recordFailedAttempt(email);
      updateAttemptsDisplay(email);
      showErr('login-err', 'E-mail ou senha incorretos.');
      return;
    }

    resetAttempts(email);
    createSession(user, rememberMe);
    logAudit('login_success_local', { email });
    window.location.href = 'dashboard.html';

  } catch (err) {
    console.error('Erro no login:', err);
    showErr('login-err', 'Erro na autenticação.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Entrar na plataforma'; }
  }
}

// ─────────────────────────────────────────
//   REGISTRO (Supabase + Local)
// ─────────────────────────────────────────
async function doRegister() {
  if (!document.getElementById('terms-cb')?.checked) {
    showErr('reg-err', 'Aceite os termos de uso.');
    return;
  }

  const btn = document.querySelector('#sc-register .submit-btn:last-of-type');
  if (btn) { btn.disabled = true; btn.textContent = 'Criando conta...'; }

  try {
    regData.color = selectedColor;
    const name    = `${regData.fname} ${regData.lname}`.trim();
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    // ── TENTATIVA 1: SUPABASE ──
    if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
      const { data, error } = await supabase.auth.signUp({
        email: regData.email,
        password: regData.pass,
        options: {
          data: {
            name: name,
            color: regData.color,
            role: ({ admin: 'Administrador', manager: 'Gerente', member: 'Membro' })[regData.role],
            agency: regData.agency
          }
        }
      });
      if (error) throw error;
      
      showLoginMsg('Link de confirmação enviado para seu e-mail!', 'success');
      goTo('sc-login');
      return;
    }

    // ── TENTATIVA 2: LOCAL (Demo) ──
    const { hash, salt } = await hashPassword(regData.pass);
    const newUser = {
      id: 'u' + genId(),
      name, email: regData.email,
      passHash: hash, passSalt: salt,
      role: ({ admin: 'Administrador', manager: 'Gerente', member: 'Membro' })[regData.role],
      initials, color: regData.color, agency: regData.agency,
      createdAt: TODAY, active: true
    };

    if (typeof seedData !== 'undefined') seedData.users.push(newUser);
    createSession(newUser, false);
    goTo('sc-success');

  } catch (err) {
    showErr('reg-err', err.message || 'Erro ao criar conta.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Criar minha conta 🚀'; }
  }
}

// ─────────────────────────────────────────
//   RECUPERAR SENHA
// ─────────────────────────────────────────
function doForgot() {
  const em = document.getElementById('fg-email')?.value.trim();
  if (!em || !validateEmail(em)) {
    alert('Digite um e-mail válido.');
    return;
  }
  // Simula envio (em produção, chamaria API)
  logAudit('password_reset_requested', { email: em });
  const el = document.getElementById('forgot-ok');
  if (el) el.style.display = 'flex';
  setTimeout(() => goTo('sc-login'), 3500);
}
