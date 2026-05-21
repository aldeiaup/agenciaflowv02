// ═══════════════════════════════════════════════════════════════
//   AgencyFlow — Supabase Client
//   src/utils/supabase.js
//
//   CONFIGURAÇÃO:
//   Substitua os valores abaixo com as credenciais do seu projeto:
//   Supabase Dashboard → Settings → API
// ═══════════════════════════════════════════════════════════════

// ── Carrega credenciais do APP_CONFIG (config.js) ──
// O config.js faz fetch de /api/config em produção e popula APP_CONFIG.
// Fallback para placeholders apenas em dev local.
function getSupabaseUrl() {
  return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.supabaseUrl)
    ? APP_CONFIG.supabaseUrl
    : 'https://SEU_PROJECT_ID.supabase.co';
}

function getSupabaseAnonKey() {
  return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.supabaseAnonKey)
    ? APP_CONFIG.supabaseAnonKey
    : 'SUA_ANON_KEY_AQUI';
}

// ── Constantes globais para compatibilidade com auth.js ──
// auth.js usa SUPABASE_URL e SUPABASE_ANON_KEY para verificar
// se o Supabase está configurado antes de tentar login remoto.
const SUPABASE_URL     = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();

// ── Inicializa cliente Supabase (via CDN) ──
// O script do SDK é carregado no <head> do HTML antes deste arquivo.
// Usa funções getter para capturar valores atualizados via /api/config
let _supabaseInstance = null;

function getSupabaseClient() {
  if (_supabaseInstance) return _supabaseInstance;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url.includes('SEU_PROJECT_ID') && !key.includes('SUA_ANON_KEY') && window.supabase) {
    _supabaseInstance = window.supabase.createClient(url, key, {
      auth: {
        autoRefreshToken:    true,
        persistSession:      true,
        detectSessionInUrl:  true,
        storage:             window.localStorage,
      }
    });
  }
  return _supabaseInstance;
}

// Inicialização sob demanda: cria o cliente na primeira chamada
// Isso permite que o APP_CONFIG seja populado pelo /api/config antes
function initSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[AgencyFlow] Supabase não configurado. Usando dados locais (seed).');
  }
  return client;
}

// Atualiza referência global `supabase` usada pelo resto do módulo
let supabase = null;

// Escuta evento de config carregado para reinicializar
if (typeof window !== 'undefined') {
  window.addEventListener('appconfig:ready', () => {
    _supabaseInstance = null; // força recriação do cliente
    supabase = initSupabase();
  });
}

// Tenta inicializar imediatamente (caso APP_CONFIG já esteja populado)
supabase = initSupabase();

// ═══════════════════════════════════════════════════════════════
//   AUTH
// ═══════════════════════════════════════════════════════════════

async function sbSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function sbSignUp(email, password, meta = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta }          // name, color, role, agency
  });
  if (error) throw error;
  return data;
}

async function sbSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function sbGetSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function sbGetUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Listener de mudança de sessão
function sbOnAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

// ═══════════════════════════════════════════════════════════════
//   PROFILE
// ═══════════════════════════════════════════════════════════════

async function sbGetProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function sbUpdateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sbListProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════════════════════════
//   TAREFAS
// ═══════════════════════════════════════════════════════════════

async function sbGetTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function sbCreateTask(task) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sbUpdateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sbDeleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════
//   SUBTAREFAS
// ═══════════════════════════════════════════════════════════════

async function sbCreateSubtask(taskId, text) {
  const { data, error } = await supabase
    .from('subtasks')
    .insert([{ task_id: taskId, text, done: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sbUpdateSubtask(id, done) {
  const { data, error } = await supabase
    .from('subtasks')
    .update({ done })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sbDeleteSubtask(id) {
  const { error } = await supabase.from('subtasks').delete().eq('id', id);
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════
//   PROJETOS
// ═══════════════════════════════════════════════════════════════

async function sbGetProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function sbCreateProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════════════════════════
//   CLIENTES
// ═══════════════════════════════════════════════════════════════

async function sbGetClients() {
  const { data, error } = await supabase.from('clients').select('*').order('name');
  if (error) throw error;
  return data;
}

async function sbCreateClient(client) {
  const { data, error } = await supabase.from('clients').insert([client]).select().single();
  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════════════════════════
//   TIMELOGS
// ═══════════════════════════════════════════════════════════════

async function sbGetTimelogs() {
  const { data, error } = await supabase
    .from('timelogs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function sbCreateTimelog(log) {
  const { data, error } = await supabase.from('timelogs').insert([log]).select().single();
  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════════════════════════
//   NOTIFICAÇÕES
// ═══════════════════════════════════════════════════════════════

async function sbGetNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function sbMarkNotifRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════
//   REALTIME — escuta mudanças em tarefas em tempo real
// ═══════════════════════════════════════════════════════════════

function sbSubscribeTasks(callback) {
  return supabase
    .channel('tasks-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => callback(payload)
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════════
//   UTILITÁRIO — sincroniza S com dados do Supabase
// ═══════════════════════════════════════════════════════════════

async function sbSyncAll() {
  if (!supabase || SUPABASE_URL.includes('SEU_PROJECT_ID')) {
    console.info('[AgencyFlow] Supabase não configurado. Usando dados locais (seed).');
    return false;
  }

  try {
    const userId = (await sbGetSession())?.user?.id;
    const [tasks, projects, clients, timelogs, notifs, profiles] = await Promise.all([
      sbGetTasks(),
      sbGetProjects(),
      sbGetClients(),
      sbGetTimelogs(),
      userId ? sbGetNotifications(userId) : [],
      sbListProfiles()
    ]);

    // Mapeia formato do Supabase para o formato do S
    if (tasks)    S.tasks    = tasks.map(mapTask);
    if (projects) S.projects = projects.map(mapProject);
    if (clients)  S.clients  = clients;
    if (timelogs) S.timelogs = timelogs.map(l => ({
      id: l.id, who: l.who, task: l.task_title, hrs: l.hrs, date: l.log_date.split('-').reverse().join('/')
    }));
    if (notifs) S.notifications = notifs.map(n => ({
      id: n.id, text: n.text, time: 'recentemente', read: n.read
    }));
    if (profiles) S.users = profiles.map(mapProfile);

    return true;
  } catch (err) {
    console.warn('[AgencyFlow] Falha ao sincronizar com Supabase:', err.message);
    return false;
  }
}

function mapProfile(p) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    agency: p.agency,
    initials: p.initials,
    color: p.color,
    squad: p.squad || 'Squad Principal',
    createdAt: p.created_at?.slice(0, 10) || TODAY,
    active: true
  };
}

// ── Mapeadores de formato ──
function mapTask(t) {
  return {
    id:       t.id,
    title:    t.title,
    col:      t.col || 'todo',
    priority: t.priority || 'normal',
    resp:     t.resp,
    due:      t.due_date,
    start:    t.start_date,
    proj:     t.project_id,
    client:   t.client,
    tags:     t.tags || [],
    prog:     t.prog || 0,
    desc:     t.description || '',
    link:     t.link || '',
    subtasks: (t.subtasks || []).map(st => ({ id: st.id, text: st.text, done: st.done })),
  };
}

function mapProject(p) {
  return {
    id:     p.id,
    name:   p.name,
    client: p.client,
    squad:  p.squad,
    color:  p.color,
    status: p.status,
    pct:    p.pct,
    start:  p.start_date,
    end:    p.end_date,
  };
}
