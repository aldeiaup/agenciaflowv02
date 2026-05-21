// ═══════════════════════════════════════
//   AgencyFlow — Other Modules
//   src/components/modules.js
// ═══════════════════════════════════════

function renderProjetos() {
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';
  
  return `${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addProject()">+ Novo Projeto</button></div>` : ''}
  ${S.projects.map(p => `<div class="proj-card">
    <div class="proj-color" style="background:${p.color}"></div>
    <div style="flex:1">
      <div style="font-size:14px;font-weight:600;font-family:var(--font-display)">${p.name}</div>
      <div style="font-size:12px;color:var(--text3)">${p.client} · ${p.squad}</div>
      <div style="margin-top:8px"><div class="sprint-bar" style="margin:0"><div class="sprint-fill" style="width:${p.pct}%;background:${p.color}"></div></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--text3)"><span>${fmtDate(p.start)} → ${fmtDate(p.end)}</span><span>${p.pct}%</span></div>
    </div>
    <span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:600;background:${p.status==='Concluído'?'var(--green-bg)':'var(--blue-bg)'};color:${p.status==='Concluído'?'var(--green)':'var(--blue)'}">${p.status}</span>
  </div>`).join('')}`;
}

function addProject() {
  openModal('Novo Projeto', [
    { id: 'name', label: 'Nome do Projeto', placeholder: 'Ex: Campanha Novo Produto' },
    { id: 'client', label: 'Cliente', type: 'select', options: S.clients.map(c => c.name) },
    { id: 'squad', label: 'Squad Responsável', type: 'select', options: S.squads.map(s => s.name) }
  ], async (data) => {
    if (!data.name) return;
    
    const p = {
      id: 'pr' + genId(),
      name: data.name,
      client: data.client,
      squad: data.squad,
      color: COLORS[S.projects.length % COLORS.length],
      start: TODAY,
      end: '2026-04-30',
      status: 'Em andamento',
      pct: 0
    };

    // Persistence Supabase
    if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
      try {
        const sbProj = await sbCreateProject({
          name: p.name,
          client: p.client,
          squad: p.squad,
          color: p.color,
          status: p.status,
          pct: p.pct,
          start_date: p.start,
          end_date: p.end,
          owner_id: S.user?.id
        });
        if (sbProj) p.id = sbProj.id;
      } catch (err) {
        console.error('Erro ao criar projeto no Supabase:', err);
      }
    }

    S.projects.push(p);
    renderPage();
    showToast('Projeto criado!');
  });
}

function renderEquipe() {
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';

  return `${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addMember()">+ Convidar Membro</button></div>` : ''}
  ${S.users.map(u => `<div class="member-card">
    <div class="avatar avatar-lg" style="background:${u.color}">${u.initials}</div>
    <div style="flex:1"><div style="font-size:14px;font-weight:500">${u.name}</div><div style="font-size:11px;color:var(--text3)">${u.squad} · ${u.email || '—'}</div></div>
    <span class="badge role-${u.role==='Administrador'?'admin':u.role==='Gerente'?'manager':'member'}">${u.role}</span>
    <div style="font-size:12px;color:var(--text3);margin-left:12px">${S.tasks.filter(t=>t.resp===u.name&&t.col!=='done').length} abertas</div>
  </div>`).join('')}`;
}

function addMember() {
  openModal('Convidar Membro', [
    { id: 'name', label: 'Nome Completo', placeholder: 'Nome do colaborador' },
    { id: 'email', label: 'E-mail Profissional', placeholder: 'email@agencyflow.com.br' },
    { id: 'squad', label: 'Squad', type: 'select', options: S.squads.map(s => s.name) },
    { id: 'role', label: 'Função', type: 'select', options: ['Membro', 'Gerente', 'Administrador'] }
  ], (data) => {
    if (!data.name) return;
    const initials = data.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    S.users.push({
      id: 'u' + genId(),
      name: data.name,
      email: data.email,
      pass: '123456',
      role: data.role,
      squad: data.squad,
      initials,
      color: COLORS[S.users.length % COLORS.length]
    });
    renderPage();
    showToast('Membro convidado!');
  });
}

function renderSquads() {
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';

  return `${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addSquad()">+ Novo Squad</button></div>` : ''}
  ${S.squads.map(sq => `<div class="section-card" style="margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="width:12px;height:12px;border-radius:50%;background:${sq.color}"></div>
      <div style="font-size:14px;font-weight:600;font-family:var(--font-display)">${sq.name}</div>
      <span style="font-size:11px;color:var(--text3)">${sq.members.length} membros · ${S.tasks.filter(t=>sq.members.includes(t.resp)&&t.col!=='done').length} tarefas abertas</span>
    </div>
    ${sq.members.map(name => {
      const u = S.users.find(x => x.name === name) || { initials: name.slice(0, 2).toUpperCase(), color: '#666' };
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
        <div class="avatar avatar-md" style="background:${u.color}">${u.initials}</div>
        <span style="font-size:13px">${name}</span>
        <span style="margin-left:auto;font-size:11px;color:var(--text3)">${S.tasks.filter(t=>t.resp===name&&t.col!=='done').length} tarefas</span>
      </div>`;
    }).join('')}
  </div>`).join('')}`;
}

function addSquad() {
  openModal('Novo Squad', [
    { id: 'name', label: 'Nome do Squad', placeholder: 'Ex: Squad Performance' }
  ], (data) => {
    if (!data.name) return;
    S.squads.push({ id: 'sq' + genId(), name: data.name, color: COLORS[S.squads.length % COLORS.length], members: [] });
    renderPage();
    showToast('Squad criado!');
  });
}

function renderClientes() {
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';

  return `${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addClient()">+ Novo Cliente</button></div>` : ''}
  ${S.clients.map(cl => `<div class="client-card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div class="avatar avatar-lg" style="background:${cl.color};border-radius:8px">${cl.name.slice(0,2).toUpperCase()}</div>
      <div style="flex:1"><div style="font-weight:600;font-size:14px;font-family:var(--font-display)">${cl.name}</div><div style="font-size:12px;color:var(--text3)">${cl.contact}</div></div>
      <span style="font-size:12px;color:var(--blue)">${cl.site}</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${S.projects.filter(p=>p.client===cl.name).map(p=>`<span style="font-size:11px;padding:3px 10px;border-radius:4px;background:var(--bg4);color:var(--text2)">${p.name}</span>`).join('')}
    </div>
  </div>`).join('')}`;
}

function addClient() {
  openModal('Novo Cliente', [
    { id: 'name', label: 'Nome da Empresa', placeholder: 'Ex: Nike Brasil' },
    { id: 'contact', label: 'E-mail de Contato', placeholder: 'contato@empresa.com' },
    { id: 'site', label: 'Site / URL', placeholder: 'www.empresa.com' }
  ], async (data) => {
    if (!data.name) return;
    
    const cl = {
      id: 'cl' + genId(),
      name: data.name,
      color: COLORS[S.clients.length % COLORS.length],
      contact: data.contact,
      site: data.site
    };

    // Persistence Supabase
    if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
      try {
        const sbCli = await sbCreateClient({
          name: cl.name,
          contact: cl.contact,
          site: cl.site,
          color: cl.color,
          owner_id: S.user?.id
        });
        if (sbCli) cl.id = sbCli.id;
      } catch (err) {
        console.error('Erro ao criar cliente no Supabase:', err);
      }
    }

    S.clients.push(cl);
    renderPage();
    showToast('Cliente adicionado!');
  });
}

function renderOKR() {
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';

  return `${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addObjective()">+ Novo Objetivo</button></div>` : ''}
  ${S.okrs.map((o, oi) => `<div class="okr-obj">
    <div style="font-size:14px;font-weight:600;font-family:var(--font-display);margin-bottom:10px">🎯 ${o.obj}</div>
    ${o.krs.map((kr, ki) => `<div class="kr-item">
      <div style="font-size:13px;margin-bottom:6px">${kr.title}</div>
      <div class="sprint-bar" style="margin:0 0 4px"><div class="sprint-fill" style="width:${kr.pct}%"></div></div>
      <div style="font-size:11px;color:var(--text2);text-align:right">${kr.pct}%</div>
    </div>`).join('')}
    <div style="display:flex;gap:8px;margin-top:12px">
      ${isAdmin ? `
      <button class="btn btn-sm" onclick="addKR(${oi})">+ Key Result</button>
      <button class="btn btn-sm btn-ghost" onclick="S.okrs.splice(${oi},1);renderPage()">Remover</button>
      ` : ''}
    </div>
  </div>`).join('')}`;
}

function addObjective() {
  openModal('Novo Objetivo Estratégico', [
    { id: 'obj', label: 'Definição do Objetivo', placeholder: 'Ex: Ser referência em design na América Latina' }
  ], (data) => {
    if (!data.obj) return;
    S.okrs.push({ id: 'ok' + genId(), obj: data.obj, krs: [] });
    renderPage();
    showToast('Objetivo estratégico adicionado!');
  });
}

function addKR(oi) {
  openModal('Novo Key Result', [
    { id: 'title', label: 'Defini\u00e7\u00e3o do Key Result', placeholder: 'Ex: Publicar 20 posts de SEO' },
    { id: 'pct', label: 'Progresso Inicial (%)', type: 'number', placeholder: '0', value: '0' }
  ], (data) => {
    if (!data.title) return;
    S.okrs[oi].krs.push({ title: data.title, pct: Math.min(100, Math.max(0, parseInt(data.pct) || 0)) });
    renderPage();
    showToast('Key Result adicionado!');
  });
}

function renderSprint() {
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';

  return `${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addSprint()">+ Novo Sprint</button></div>` : ''}
  ${S.sprints.map(sp => {
    const p = sp.tasks ? Math.round(sp.done / sp.tasks * 100) : 0;
    return `<div class="sprint-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-size:14px;font-weight:600;font-family:var(--font-display)">${sp.name}</div>
        <span class="badge ${sp.status==='Ativo'?'badge-green':'badge-gray'}">${sp.status}</span>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">${fmtDate(sp.start)} → ${fmtDate(sp.end)}</div>
      <div class="sprint-bar"><div class="sprint-fill" style="width:${p}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-top:4px"><span>${sp.done}/${sp.tasks} concluídas</span><span>${p}%</span></div>
    </div>`;
  }).join('')}`;
}

function addSprint() {
  openModal('Iniciar Novo Sprint', [
    { id: 'name', label: 'Nome do Sprint', placeholder: 'Ex: Sprint 02 — Março' },
    { id: 'start', label: 'Início', type: 'date', value: TODAY },
    { id: 'end', label: 'Término', type: 'date', value: '2026-03-31' }
  ], (data) => {
    if (!data.name) return;
    S.sprints.unshift({
      id: 'sp' + genId(),
      name: data.name,
      start: data.start,
      end: data.end,
      tasks: 0,
      done: 0,
      status: 'Ativo'
    });
    renderPage();
    showToast('Sprint iniciado!');
  });
}

function renderFluxo() {
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';

  return `${isAdmin ? `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addRule()">+ Nova Regra</button></div>` : ''}
  <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Configure automações para facilitar o fluxo de trabalho da sua equipe.</div>
  ${S.flowRules.map(r => `<div class="flow-rule">
    <div style="font-size:13px">
      <span style="color:var(--text3);font-size:11px">QUANDO </span><span style="color:var(--orange);font-weight:600">${r.trigger}</span>
      <span style="color:var(--text3);font-size:11px"> → ENTÃO </span><span style="color:var(--green);font-weight:600">${r.action}</span>
    </div>
    <div style="display:flex;gap:6px">
      <span class="badge badge-green">Ativo</span>
      <button class="btn btn-sm">Editar</button>
    </div>
  </div>`).join('')}`;
}

function addRule() {
  openModal('Nova Regra de Fluxo', [
    { id: 'trigger', label: 'Gatilho (Quando...)', placeholder: 'Ex: Tarefa movida para Done' },
    { id: 'action', label: 'Ação (...Então)', placeholder: 'Ex: Notificar cliente por e-mail' }
  ], (data) => {
    if (!data.trigger || !data.action) return;
    S.flowRules.push({ id: 'fr' + genId(), trigger: data.trigger, action: data.action, active: true });
    renderPage();
    showToast('Automação configurada!');
  });
}

function renderHistorico() {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
    ${S.history.map(h => {
      const u = S.users.find(x => x.name === h.who) || { color: '#666', initials: h.who.slice(0,2).toUpperCase() };
      return `<div class="hist-card">
        <div class="hist-card-top">
          <div class="avatar avatar-md" style="background:${u.color}">${u.initials}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${h.who}</div>
            <div style="font-size:11px;color:var(--text3)">${h.time}</div>
          </div>
          <div class="hist-card-icon">${h.icon || '📌'}</div>
        </div>
        <div style="font-size:12px;color:var(--text2);line-height:1.5">${h.action}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderChecklist() {
  return `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="addChecklist()">+ Novo Checklist</button></div>
  ${S.checklists.map((cl, ci) => `<div class="section-card" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;font-family:var(--font-display)">${cl.title}</div>
      <button class="btn btn-sm btn-ghost" onclick="S.checklists.splice(${ci},1);renderPage()">✕</button>
    </div>
    ${cl.items.map((item, ii) => `<div class="check-item">
      <input type="checkbox"${item.done?' checked':''} onchange="S.checklists[${ci}].items[${ii}].done=this.checked;renderPage()" style="accent-color:var(--green)">
      <span style="font-size:13px;${item.done?'text-decoration:line-through;color:var(--text3)':''}">${item.text}</span>
      <button class="btn btn-sm btn-ghost" onclick="S.checklists[${ci}].items.splice(${ii},1);renderPage()" style="margin-left:auto;padding:2px">✕</button>
    </div>`).join('')}
    <div style="display:flex;gap:8px;margin-top:10px">
      <input class="field-input" placeholder="Novo item..." style="font-size:12px" id="nc-${ci}" onkeyup="if(event.key==='Enter')addCI(${ci})">
      <button class="btn btn-primary btn-sm" onclick="addCI(${ci})">+</button>
    </div>
  </div>`).join('')}`;
}

function addChecklist() {
  openModal('Novo Checklist Padrão', [
    { id: 'title', label: 'Título do Checklist', placeholder: 'Ex: Revisão Final de Design' }
  ], (data) => {
    if (!data.title) return;
    S.checklists.push({ id: 'ck' + genId(), title: data.title, items: [] });
    renderPage();
    showToast('Checklist criado!');
  });
}

function addCI(ci) {
  const inp = document.getElementById(`nc-${ci}`);
  if (!inp?.value.trim()) return;
  S.checklists[ci].items.push({ text: inp.value.trim(), done: false });
  renderPage();
}

function renderTime() {
  // Cálculos dinâmicos
  const totalSeconds = S.timelogs.reduce((acc, log) => {
    const parts = log.hrs.split(' ');
    let secs = 0;
    parts.forEach(p => {
      if (p.includes('h')) secs += parseInt(p) * 3600;
      if (p.includes('min')) secs += parseInt(p) * 60;
    });
    return acc + secs;
  }, 0);
  
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const timeStr = `${h}h ${m}min`;

  // Agrupar logs por membro
  const logsByUser = {};
  S.timelogs.forEach(l => {
    if (!logsByUser[l.who]) logsByUser[l.who] = [];
    logsByUser[l.who].push(l);
  });

  return `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
    <div class="metric-card"><div class="metric-label">Total de Horas</div><div class="metric-value" style="color:var(--blue)">${timeStr}</div></div>
    <div class="metric-card"><div class="metric-label">Registros</div><div class="metric-value" style="color:var(--green)">${S.timelogs.length}</div></div>
    <div class="metric-card"><div class="metric-label">Membros com Log</div><div class="metric-value" style="color:var(--orange)">${Object.keys(logsByUser).length}</div></div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px">
    ${Object.entries(logsByUser).map(([who, logs]) => {
      const u = S.users.find(x => x.name === who) || { color: '#666', initials: who.slice(0,2).toUpperCase() };
      const userSecs = logs.reduce((acc, l) => {
        const parts = l.hrs.split(' ');
        let s = 0;
        parts.forEach(p => { if (p.includes('h')) s += parseInt(p) * 3600; if (p.includes('min')) s += parseInt(p) * 60; });
        return acc + s;
      }, 0);
      const uh = Math.floor(userSecs / 3600);
      const um = Math.floor((userSecs % 3600) / 60);
      return `<div class="time-card">
        <div class="time-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar avatar-md" style="background:${u.color}">${u.initials}</div>
            <div>
              <div style="font-size:14px;font-weight:600">${who}</div>
              <div style="font-size:11px;color:var(--text3)">${logs.length} registro${logs.length > 1 ? 's' : ''}</div>
            </div>
          </div>
          <div class="time-card-total">${uh}h ${um}min</div>
        </div>
        <div class="time-card-logs">
          ${logs.map(l => `<div class="time-card-item">
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.task}</div>
              <div style="font-size:10px;color:var(--text3)">${l.date}</div>
            </div>
            <span class="time-card-hrs">${l.hrs}</span>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderNotifs() {
  document.getElementById('nb').style.display = 'none';
  S.notifications.forEach(n => n.read = true);
  return `<div class="section-card" style="padding:0;overflow:hidden">
    ${S.notifications.map(n => `<div class="notif-item${n.read ? '' : ' unread'}">
      <div class="notif-dot" style="background:${n.read ? 'var(--border2)' : 'var(--blue)'}"></div>
      <div><div style="font-size:13px">${n.text}</div><div style="font-size:11px;color:var(--text3);margin-top:2px">${n.time}</div></div>
    </div>`).join('')}
  </div>`;
}

// ─────────────────────────────────────────
//   PERFIL DO USUÁRIO
// ─────────────────────────────────────────
function renderPerfil() {
  const u = S.user || {};
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="section-card">
      <div class="section-title">Dados do Perfil</div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
        <div class="avatar avatar-xl" style="background:${u.color || 'var(--blue)'};font-size:18px">${u.initials || '?'}</div>
        <div>
          <div style="font-size:16px;font-weight:600;font-family:var(--font-display)">${u.name || '—'}</div>
          <div style="font-size:12px;color:var(--text3)">${u.email || '—'}</div>
          <span class="badge badge-blue" style="margin-top:4px">${u.role || '—'}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          ['Agência', u.agency],
          ['Squad', S.users.find(x=>x.id===u.id)?.squad || '—'],
          ['Membro desde', fmtDate(S.users.find(x=>x.id===u.id)?.createdAt)],
          ['Tarefas abertas', S.tasks.filter(t=>t.resp===u.name&&t.col!=='done').length],
          ['Tarefas concluídas', S.tasks.filter(t=>t.resp===u.name&&t.col==='done').length],
        ].map(([l,v])=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text2)">${l}</span>
          <span style="font-weight:500">${v}</span>
        </div>`).join('')}
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:16px" onclick="editarPerfil()">✏️ Editar Perfil</button>
    </div>
    <div class="section-card">
      <div class="section-title">Minhas Tarefas Recentes</div>
      ${S.tasks.filter(t=>t.resp===u.name).slice(0,6).map(t=>`
        <div onclick="openTask(${t.id})" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer" onmouseenter="this.style.opacity='.75'" onmouseleave="this.style.opacity='1'">
          <div style="width:8px;height:8px;border-radius:50%;background:${COL_COLORS[t.col]};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</div>
            <div style="font-size:11px;color:var(--text3)">${COL_MAP[t.col]} · Prazo: ${fmtDate(t.due)}</div>
          </div>
          <span class="badge p-${t.priority}">${capitalize(t.priority)}</span>
        </div>`).join('') || '<div style="color:var(--text3);font-size:13px;padding:12px 0">Nenhuma tarefa ainda</div>'}
    </div>
  </div>`;
}

function editarPerfil() {
  const u = S.user || {};
  openModal('Editar Perfil', [
    { id: 'name',   label: 'Nome Completo',  value: u.name   },
    { id: 'agency', label: 'Agência',        value: u.agency },
    { id: 'color',  label: 'Cor do Avatar (hex)', value: u.color  },
  ], async (data) => {
    if (!data.name) return;

    const updates = {
      name: data.name,
      agency: data.agency,
      initials: data.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
    };
    if (/^#[0-9A-Fa-f]{6}$/.test(data.color)) updates.color = data.color;

    // Supabase Persistence
    if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID') && S.user?.id) {
      try {
        await sbUpdateProfile(S.user.id, updates);
      } catch (err) {
        console.error('Erro ao atualizar perfil no Supabase:', err);
        showToast('Erro ao sincronizar perfil.', 'warn');
      }
    }

    // Local Update
    if (S.user) {
      Object.assign(S.user, updates);
    }
    const userInList = S.users.find(x => x.id === S.user?.id);
    if (userInList) {
      Object.assign(userInList, updates);
    }

    document.getElementById('user-name').textContent = S.user.name;
    const av = document.getElementById('user-av');
    av.textContent = S.user.initials;
    av.style.background = S.user.color;
    
    renderPage();
    showToast('Perfil atualizado!');
  });
}

// ─────────────────────────────────────────
//   SEGURANÇA
// ─────────────────────────────────────────
function renderSeguranca() {
  const logs    = typeof getAuditLog === 'function' ? getAuditLog() : [];
  const lockKey = typeof getAttemptKey === 'function' && S.user?.email ? getAttemptKey(S.user.email) : null;
  const attempts = lockKey ? JSON.parse(localStorage.getItem(lockKey) || '{}') : {};

  const iconMap = {
    login_success:           { icon: '✅', color: 'var(--green)'  },
    login_failed:            { icon: '⚠️', color: 'var(--orange)' },
    login_blocked:           { icon: '🚫', color: 'var(--red)'    },
    login_lockout:           { icon: '🔒', color: 'var(--red)'    },
    logout:                  { icon: '🚪', color: 'var(--text3)'  },
    session_expired:         { icon: '⏰', color: 'var(--orange)' },
    unauthorized_access:     { icon: '🛑', color: 'var(--red)'    },
    register_success:        { icon: '🎉', color: 'var(--blue)'   },
    password_reset_requested:{ icon: '📧', color: 'var(--purple)' },
  };

  const statusCard = (label, value, color) => `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value" style="color:${color};font-size:20px">${value}</div>
    </div>`;

  const isLocked  = attempts.lockedUntil && Date.now() < attempts.lockedUntil;
  const remaining = isLocked ? Math.ceil((attempts.lockedUntil - Date.now()) / 60000) : 0;

  return `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
    ${statusCard('Status da Sessão', isSessionValid?.() ? '🟢 Ativa' : '🔴 Inativa', 'var(--text)')}
    ${statusCard('Tentativas Falhas', attempts.count || 0, (attempts.count || 0) >= 3 ? 'var(--red)' : 'var(--green)')}
    ${statusCard('Bloqueio', isLocked ? `${remaining}min` : 'Nenhum', isLocked ? 'var(--red)' : 'var(--green)')}
  </div>

  <div class="section-card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="section-title" style="margin-bottom:0">Configurações de Segurança</div>
    </div>
    ${[
      ['🔐', 'Hash de senha', 'SHA-256 + Pepper individual', 'var(--green)'],
      ['🛡️', 'Limite de tentativas', `${SEC_CONFIG?.maxAttempts || 5} falhas → bloqueio de ${SEC_CONFIG?.lockoutMinutes || 10} min`, 'var(--blue)'],
      ['🎟️', 'Sessão segura', `Token de 64 chars · Expira em ${SEC_CONFIG?.sessionHours || 8}h`, 'var(--blue)'],
      ['💾', 'Lembrar-me', `Até ${SEC_CONFIG?.rememberDays || 7} dias com token persistente`, 'var(--purple)'],
      ['📋', 'Auditoria', `${logs.length} evento${logs.length !== 1 ? 's' : ''} registrado${logs.length !== 1 ? 's' : ''}`, 'var(--orange)'],
    ].map(([icon,label,desc,c])=>`
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:15px">${icon}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:500">${label}</div><div style="font-size:11px;color:var(--text3)">${desc}</div></div>
        <div style="width:8px;height:8px;border-radius:50%;background:${c}"></div>
      </div>`).join('')}
    <button class="btn btn-danger btn-sm" style="margin-top:14px" onclick="if(confirm('Deseja forçar logout e limpar a sessão?')){doLogout()}">🚪 Encerrar Sessão</button>
  </div>

  <div class="section-card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="section-title" style="margin-bottom:0">Log de Auditoria</div>
      <button class="btn btn-sm btn-ghost" onclick="localStorage.removeItem('af_audit_log');renderPage()">Limpar</button>
    </div>
    ${logs.length === 0
      ? '<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">Nenhum evento registrado.</div>'
      : logs.map(log => {
          const m = iconMap[log.action] || { icon: '📌', color: 'var(--text2)' };
          const ts = new Date(log.timestamp);
          const time = `${ts.toLocaleDateString('pt-BR')} ${ts.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`;
          return `<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);align-items:flex-start">
            <div style="font-size:14px;flex-shrink:0;margin-top:1px">${m.icon}</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:500;color:${m.color}">${log.action.replace(/_/g,' ')}</div>
              <div style="font-size:11px;color:var(--text3)">${log.details?.email || log.details?.name || ''} · ${time}</div>
            </div>
          </div>`;
        }).join('')}
  </div>`;
}
