// ═══════════════════════════════════════
//   AgencyFlow — Kanban + Dashboard
//   src/components/kanban.js
// ═══════════════════════════════════════

function nav(page) {
  S.page = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.querySelector(`[data-p="${page}"]`);
  if (el) el.classList.add('active');
  const titles = {
    dashboard: 'Principal', kanban: 'Quadro Kanban', calendario: 'Calendário',
    relatorios: 'Relatórios', projetos: 'Projetos', equipe: 'Equipe',
    squads: 'Squads', clientes: 'Clientes', okr: 'OKR', sprint: 'Sprint',
    fluxo: 'Fluxo', historico: 'Histórico', checklist: 'Checklist',
    timetracking: 'Controle de Horas', notificacoes: 'Notificações',
    perfil: 'Meu Perfil', seguranca: 'Segurança', admin: 'Painel Admin'
  };
  const role = S.user?.role || 'Membro';
  const adminOnly = ['equipe', 'squads', 'admin', 'fluxo'];
  
  if (adminOnly.includes(page) && role === 'Membro') {
    showToast('Acesso restrito a administradores', 'error');
    return;
  }
  document.getElementById('page-title').textContent = titles[page] || page;
  // Atualiza badge de notificações
  const unread = S.notifications.filter(n => !n.read).length;
  const nb = document.getElementById('nb');
  if (nb) { nb.textContent = unread; nb.style.display = unread > 0 ? '' : 'none'; }
  renderPage();
}

function renderPage() {
  const c = document.getElementById('content');
  const pages = {
    dashboard:    renderDash,
    kanban:       renderKanban,
    calendario:   renderCal,
    relatorios:   renderRelatorios,
    projetos:     renderProjetos,
    equipe:       renderEquipe,
    squads:       renderSquads,
    clientes:     renderClientes,
    okr:          renderOKR,
    sprint:       renderSprint,
    fluxo:        renderFluxo,
    historico:    renderHistorico,
    checklist:    renderChecklist,
    timetracking: renderTime,
    notificacoes: renderNotifs,
    perfil:       renderPerfil,
    seguranca:    renderSeguranca,
  };
  if (pages[S.page]) c.innerHTML = pages[S.page]();
  if (S.page === 'kanban') initDrag();
}

// ── DASHBOARD ──
function renderDash() {
  const all = S.tasks.length || 1;
  const late = S.tasks.filter(t => isLate(t.due, t.col)).length;
  const done = S.tasks.filter(t => t.col === 'done').length;
  const progAvg = Math.round(S.tasks.reduce((a, t) => a + t.prog, 0) / all);

  // ── Donut: distribuição por etapa ──
  const stages = [
    { k: 'todo',   l: 'A Fazer',      c: '#3B82F6' },
    { k: 'doing',  l: 'Em Andamento', c: '#F97316' },
    { k: 'review', l: 'Em Revisão',   c: '#A855F7' },
    { k: 'done',   l: 'Concluído',    c: '#22C55E' },
  ];
  const stageCounts = stages.map(s => ({ ...s, n: S.tasks.filter(t => t.col === s.k).length }));
  const donutPcts = stageCounts.map(s => Math.round((s.n / all) * 100));
  let conicParts = stageCounts.map((s, i) => {
    const pct = Math.round((s.n / all) * 100);
    return pct > 0 ? `${s.c} ${i === 0 ? 0 : donutPcts.slice(0, i).reduce((a, b) => a + b, 0)}% ${donutPcts.slice(0, i + 1).reduce((a, b) => a + b, 0)}%` : '';
  }).filter(Boolean).join(', ');
  if (!conicParts) conicParts = '#3B82F6 0% 100%';

  // ── Últimos 7 dias ──
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }
  const weekData = last7Days.map(date => {
    const doneDay = S.tasks.filter(t => t.due === date || (t.col === 'done' && t.due === date)).length;
    return doneDay;
  });
  const maxWeek = Math.max(...weekData, 1);

  // ── Ranking ──
  const completedBy = {};
  S.tasks.filter(t => t.col === 'done').forEach(t => {
    completedBy[t.resp] = (completedBy[t.resp] || 0) + 1;
  });
  const ranking = Object.entries(completedBy).sort((a, b) => b[1] - a[1]);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const medals = ['🥇', '🥈', '🥉'];

  // ── Destaques ──
  const topDone = ranking[0];
  let topProg = { name: '', pct: 0 };
  S.tasks.filter(t => t.col !== 'done').forEach(t => {
    if (t.prog > topProg.pct && t.resp) { topProg = { name: t.resp, pct: t.prog }; }
  });
  const urgentProj = S.projects.filter(p => p.status !== 'Concluído').sort((a, b) => a.pct - b.pct)[0];

  return `
  <!-- LINHA 1: MÉTRICAS -->
  <div class="dash-grid">
    <div class="metric-card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:-10px;right:-10px;width:50px;height:50px;border-radius:50%;background:rgba(59,130,246,.08)"></div>
      <div class="metric-label">📋 Total de Tarefas</div>
      <div class="metric-value" style="color:var(--blue)">${all}</div>
      <div class="metric-sub">Todas as tarefas do sistema</div>
    </div>
    <div class="metric-card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:-10px;right:-10px;width:50px;height:50px;border-radius:50%;background:rgba(239,68,68,.08)"></div>
      <div class="metric-label">⚠️ Atrasadas</div>
      <div class="metric-value" style="color:var(--red)">${late}</div>
      <div class="metric-sub">${late > 0 ? Math.round(late / all * 100) + '% das tarefas' : 'Nenhuma atrasada 🎉'}</div>
    </div>
    <div class="metric-card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:-10px;right:-10px;width:50px;height:50px;border-radius:50%;background:rgba(34,197,94,.08)"></div>
      <div class="metric-label">✅ Concluídas</div>
      <div class="metric-value" style="color:var(--green)">${done}</div>
      <div class="metric-sub">${Math.round(done / all * 100)}% do total</div>
    </div>
    <div class="metric-card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:-10px;right:-10px;width:50px;height:50px;border-radius:50%;background:rgba(249,115,22,.08)"></div>
      <div class="metric-label">📈 Progresso Médio</div>
      <div class="metric-value" style="color:var(--orange)">${progAvg}%</div>
      <div class="metric-sub">Média de todas as tarefas</div>
    </div>
  </div>

  <!-- LINHA 2: DONUT + RANKING -->
  <div class="dash-grid-2">
    <div class="section-card">
      <div class="section-title">📊 Distribuição por Etapa</div>
      <div style="display:flex;align-items:center;gap:24px">
        <div class="donut-chart" style="background:conic-gradient(${conicParts})">
          <div class="donut-hole">
            <div style="font-size:20px;font-weight:700;font-family:var(--font-display);color:var(--text)">${done}</div>
            <div style="font-size:10px;color:var(--text3)">concluídas</div>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          ${stageCounts.map(s => `
            <div style="display:flex;align-items:center;gap:8px;font-size:12px">
              <div style="width:10px;height:10px;border-radius:50%;background:${s.c};flex-shrink:0"></div>
              <span style="flex:1;color:var(--text2)">${s.l}</span>
              <span style="font-weight:600;min-width:24px;text-align:right">${s.n}</span>
              <span style="font-size:10px;color:var(--text3);min-width:30px;text-align:right">${Math.round(s.n/all*100)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">🏆 Ranking da Semana</div>
      ${top3.length > 0 ? `
      <div class="podium">
        ${top3.map(([name, count], i) => {
          const u = S.users.find(x => x.name === name) || { color: '#666', initials: name.slice(0,2).toUpperCase() };
          const pos = i === 0 ? 'first' : i === 1 ? 'second' : 'third';
          const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
          return `<div class="podium-item podium-${pos}">
            <div class="podium-medal" style="background:${medalColors[i]}">${medals[i]}</div>
            <div class="avatar avatar-md" style="background:${u.color};width:36px;height:36px;font-size:13px;border:2px solid ${medalColors[i]}">${u.initials}</div>
            <div style="font-size:12px;font-weight:600;text-align:center">${name.split(' ')[0]}</div>
            <div style="font-size:18px;font-weight:700;color:${medalColors[i]}">${count}</div>
            <div style="font-size:10px;color:var(--text3)">tarefas</div>
          </div>`;
        }).join('')}
      </div>` : '<div style="font-size:12px;color:var(--text3);padding:12px;text-align:center">Nenhuma tarefa concluída ainda.</div>'}
      ${rest.length > 0 ? `
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
        ${rest.slice(0, 4).map(([name, count], i) => {
          const u = S.users.find(x => x.name === name) || { color: '#666', initials: name.slice(0,2).toUpperCase() };
          return `<div class="ranking-item">
            <span class="ranking-pos">${i + 4}º</span>
            <div class="avatar avatar-sm" style="background:${u.color}">${u.initials}</div>
            <span style="flex:1;font-size:12px">${name.split(' ')[0]}</span>
            <span style="font-size:12px;font-weight:600">${count}</span>
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>
  </div>

  <!-- LINHA 3: SEMANAL + DESTAQUES -->
  <div class="dash-grid-2">
    <div class="section-card">
      <div class="section-title">📅 Tarefas Concluídas (7 dias)</div>
      <div class="week-chart">
        ${weekData.map((h, i) => {
          const heightPx = Math.max(4, Math.round((h / maxWeek) * 100));
          return `<div class="week-bar-wrap">
            <div style="font-size:10px;font-weight:600;color:var(--blue)">${h}</div>
            <div class="week-bar" style="height:${heightPx}px;opacity:${i === 6 ? 1 : 0.45}"></div>
            <div style="font-size:9px;color:var(--text3)">${last7Days[i].split('-')[2]}/${last7Days[i].split('-')[1]}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">⭐ Destaques</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${topDone ? `
        <div class="highlight-card" style="border-left-color:var(--green)">
          <div class="highlight-icon">🏅</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">Mais Concluídas</div>
            <div style="font-size:11px;color:var(--text3)">${topDone[0]} finalizou ${topDone[1]} tarefa${topDone[1] > 1 ? 's' : ''}</div>
          </div>
        </div>` : ''}
        ${topProg.name ? `
        <div class="highlight-card" style="border-left-color:var(--blue)">
          <div class="highlight-icon">🔥</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">Maior Progresso</div>
            <div style="font-size:11px;color:var(--text3)">${topProg.name} — ${topProg.pct}% em tarefa ativa</div>
          </div>
        </div>` : ''}
        ${urgentProj ? `
        <div class="highlight-card" style="border-left-color:var(--orange)">
          <div class="highlight-icon">🎯</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">Projeto Crítico</div>
            <div style="font-size:11px;color:var(--text3)">${urgentProj.name} — ${urgentProj.pct}% concluído</div>
          </div>
        </div>` : ''}
        <div class="highlight-card" style="border-left-color:var(--purple)">
          <div class="highlight-icon">👥</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">Total de Squads</div>
            <div style="font-size:11px;color:var(--text3)">${S.squads.length} squads · ${S.users.length} membros</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- LINHA 4: PROJETOS + SPRINT + ATIVIDADES -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="section-card">
      <div class="section-title">📌 Progresso dos Projetos</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${S.projects.filter(p => p.status !== 'Concluído').slice(0, 4).map(p => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span style="display:flex;align-items:center;gap:6px"><div style="width:8px;height:8px;border-radius:50%;background:${p.color}"></div>${p.name}</span>
              <span style="font-weight:600">${p.pct}%</span>
            </div>
            <div class="sprint-bar" style="margin:0"><div class="sprint-fill" style="width:${p.pct}%;background:${p.color}"></div></div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="section-card">
      <div class="section-title">🔄 Sprint Atual</div>
      ${S.sprints.filter(sp => sp.status === 'Ativo').map(sp => {
        const p = sp.tasks ? Math.round(sp.done / sp.tasks * 100) : 0;
        return `<div style="font-size:14px;font-weight:600;font-family:var(--font-display);margin-bottom:4px">${sp.name}</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:10px">${fmtDate(sp.start)} → ${fmtDate(sp.end)}</div>
        <div class="sprint-bar"><div class="sprint-fill" style="width:${p}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-top:4px"><span>${sp.done}/${sp.tasks} concluídas</span><span>${p}%</span></div>`;
      }).join('') || '<div style="font-size:12px;color:var(--text3);padding:12px 0;text-align:center">Nenhum sprint ativo.</div>'}
      <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
        <div class="section-title" style="margin-bottom:8px">📝 Atividades Recentes</div>
        ${S.history.slice(0, 4).map(h => `<div class="activity-item"><div class="activity-dot"></div><div><b>${h.who}</b> ${h.action}<div style="font-size:10px;color:var(--text3);margin-top:2px">${h.time}</div></div></div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── KANBAN ──
function renderKanban() {
  const cols = [
    { k: 'todo',   l: 'A Fazer',       c: '#3B82F6' },
    { k: 'doing',  l: 'Em Andamento',  c: '#F97316' },
    { k: 'review', l: 'Em Revisão',    c: '#A855F7' },
    { k: 'done',   l: 'Concluído',     c: '#22C55E' },
  ];
  const ft = filteredTasks();
  const board = S.view === 'lista' ? renderListView(ft) : `
    <div class="kanban-board">
      ${cols.map(col => {
        const cards = ft.filter(t => t.col === col.k);
        return `<div class="kanban-col">
          <div class="col-header">
            <div class="col-title"><div class="col-dot" style="background:${col.c}"></div>${col.l}</div>
            <span class="col-count">${cards.length}</span>
          </div>
          <div class="col-cards drop-zone" data-col="${col.k}" ondragover="allowDrop(event)" ondrop="dropCard(event,'${col.k}')">
            ${cards.map(t => renderCard(t)).join('')}
          </div>
          <button class="add-card-btn" onclick="quickAdd('${col.k}')">+ Adicionar tarefa</button>
        </div>`;
      }).join('')}
    </div>`;
  return `
  <div class="filter-bar">
    <input class="search-box" placeholder="🔍 Buscar tarefas..." value="${S.filterSearch}" oninput="S.filterSearch=this.value;reRenderKanban()">
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      <span class="filter-chip${!S.filterResp ? ' active' : ''}" onclick="S.filterResp='';reRenderKanban()">Todos</span>
      ${S.users.map(u => `<span class="filter-chip${S.filterResp === u.name ? ' active' : ''}" onclick="S.filterResp='${u.name}';reRenderKanban()">${u.initials}</span>`).join('')}
    </div>
    <div style="display:flex;gap:4px">
      ${[['', 'Todas'], ['urgente', 'Urgente'], ['alta', 'Alta'], ['normal', 'Normal'], ['baixa', 'Baixa']].map(([v, l]) =>
        `<span class="filter-chip${S.filterPri === v ? ' active' : ''}" onclick="S.filterPri='${v}';reRenderKanban()">${l}</span>`
      ).join('')}
    </div>
    <div style="margin-left:auto">
      <div class="view-toggle">
        <button class="view-btn${S.view === 'kanban' ? ' active' : ''}" onclick="S.view='kanban';reRenderKanban()">Kanban</button>
        <button class="view-btn${S.view === 'lista' ? ' active' : ''}" onclick="S.view='lista';reRenderKanban()">Lista</button>
      </div>
    </div>
  </div>
  <div id="kanban-inner">${board}</div>`;
}

function reRenderKanban() {
  const el = document.getElementById('kanban-inner');
  if (!el) return;
  const ft = filteredTasks();
  el.innerHTML = S.view === 'lista' ? renderListView(ft) : renderBoardInner(ft);
  if (S.view === 'kanban') initDrag();
}

function renderBoardInner(ft) {
  const cols = [
    { k: 'todo', l: 'A Fazer', c: '#3B82F6' }, { k: 'doing', l: 'Em Andamento', c: '#F97316' },
    { k: 'review', l: 'Em Revisão', c: '#A855F7' }, { k: 'done', l: 'Concluído', c: '#22C55E' },
  ];
  return `<div class="kanban-board">${cols.map(col => {
    const cards = ft.filter(t => t.col === col.k);
    return `<div class="kanban-col">
      <div class="col-header"><div class="col-title"><div class="col-dot" style="background:${col.c}"></div>${col.l}</div><span class="col-count">${cards.length}</span></div>
      <div class="col-cards drop-zone" data-col="${col.k}" ondragover="allowDrop(event)" ondrop="dropCard(event,'${col.k}')">${cards.map(t => renderCard(t)).join('')}</div>
      <button class="add-card-btn" onclick="quickAdd('${col.k}')">+ Adicionar tarefa</button>
    </div>`;
  }).join('')}</div>`;
}

function filteredTasks() {
  return S.tasks.filter(t => {
    if (S.filterResp && t.resp !== S.filterResp) return false;
    if (S.filterPri && t.priority !== S.filterPri) return false;
    if (S.filterSearch) {
      const q = S.filterSearch.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.tags.join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function renderCard(t) {
  const late = isLate(t.due, t.col);
  return `<div class="card" draggable="true" ondragstart="dragStart(event,${t.id})" onclick="openTask(${t.id})">
    ${t.tags.length ? `<div class="card-tags">${t.tags.map(tg => `<span class="tag">${tg}</span>`).join('')}</div>` : ''}
    <div class="card-title">${t.title}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span class="badge p-${t.priority}">${capitalize(t.priority)}</span>
      <span class="card-date${late ? ' late' : ''}">${late ? '⚠ ' : ''}${fmtDate(t.due)}</span>
    </div>
    <div class="progress-bar"><div class="progress-fill${t.prog === 100 ? ' done' : ''}" style="width:${t.prog}%"></div></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
      <div class="avatar avatar-sm" style="background:${memberColor(t.resp, S.users)}">${memberInitials(t.resp)}</div>
      <span style="font-size:11px;color:var(--text3)">${t.prog}%</span>
    </div>
  </div>`;
}

function renderListView(ft) {
  return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden">
    <table class="list-table">
      <thead><tr><th>Título</th><th>Responsável</th><th>Prioridade</th><th>Etapa</th><th>Prazo</th><th>Progresso</th></tr></thead>
      <tbody>${(ft || filteredTasks()).map(t => `<tr onclick="openTask(${t.id})">
        <td><div style="font-weight:500">${t.title}</div><div style="font-size:11px;color:var(--text3)">${t.tags.join(', ')}</div></td>
        <td><div style="display:flex;align-items:center;gap:6px"><div class="avatar avatar-sm" style="background:${memberColor(t.resp, S.users)}">${memberInitials(t.resp)}</div>${t.resp.split(' ')[0]}</div></td>
        <td><span class="badge p-${t.priority}">${capitalize(t.priority)}</span></td>
        <td>${COL_MAP[t.col]}</td>
        <td><span style="font-size:12px;color:${isLate(t.due, t.col) ? 'var(--red)' : 'inherit'}">${fmtDate(t.due)}</span></td>
        <td><div style="display:flex;align-items:center;gap:6px"><div style="height:4px;width:60px;background:var(--bg5);border-radius:2px;overflow:hidden"><div style="height:100%;width:${t.prog}%;background:${t.prog===100?'var(--green)':'var(--blue)'};border-radius:2px"></div></div><span style="font-size:11px;color:var(--text2)">${t.prog}%</span></div></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

// ── DRAG & DROP ──
function initDrag() {
  document.querySelectorAll('.drop-zone').forEach(z => {
    z.addEventListener('dragenter', () => z.classList.add('over'));
    z.addEventListener('dragleave', e => { if (!z.contains(e.relatedTarget)) z.classList.remove('over'); });
  });
}
function dragStart(e, id) { S.drag = id; }
function allowDrop(e) { e.preventDefault(); }
async function dropCard(e, col) {
  e.preventDefault();
  document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('over'));
  const t = S.tasks.find(t => t.id === S.drag);
  if (t) {
    const oldCol = t.col;
    t.col = col;
    if (col === 'done') t.prog = 100;

    // Persistência Supabase
    if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
      try {
        await sbUpdateTask(t.id, { col, prog: t.prog });
      } catch (err) {
        console.error('Erro ao mover tarefa no Supabase:', err);
        showToast('Erro ao sincronizar movimento.', 'error');
        // Rollback opcional: t.col = oldCol; reRenderKanban();
      }
    }

    S.history.unshift({ who: S.user?.name || 'Usuário', action: `moveu "${t.title}" para ${COL_MAP[col]}`, time: 'agora', icon: '↗' });
    reRenderKanban();
    initDrag();
  }
}

// ── CALENDAR ──
function renderCal() {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dows = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const y = S.calYear, m = S.calMonth;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const pad = n => n.toString().padStart(2, '0');
  let cells = [];
  for (let i = first - 1; i >= 0; i--) cells.push({ day: prevDays - i, cur: false });
  for (let d = 1; d <= days; d++) cells.push({ day: d, cur: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - days - first + 1, cur: false });

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:12px">
      <button class="btn btn-sm" onclick="S.calMonth--;if(S.calMonth<0){S.calMonth=11;S.calYear--;}renderPage()">‹</button>
      <div style="font-size:16px;font-weight:600;font-family:var(--font-display)">${months[m]} ${y}</div>
      <button class="btn btn-sm" onclick="S.calMonth++;if(S.calMonth>11){S.calMonth=0;S.calYear++;}renderPage()">›</button>
    </div>
    <div style="font-size:12px;color:var(--text3)">${S.tasks.filter(t => t.due && t.due.startsWith(y + '-' + pad(m + 1))).length} tarefas neste mês</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border-radius:var(--r-lg);overflow:hidden">
    ${dows.map(d => `<div style="background:var(--bg2);padding:8px;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;text-align:center">${d}</div>`).join('')}
    ${cells.map(cell => {
      const dateStr = `${y}-${pad(m + 1)}-${pad(cell.day)}`;
      const dayTasks = cell.cur ? S.tasks.filter(t => t.due === dateStr) : [];
      const isToday = dateStr === TODAY;
      return `<div style="background:${isToday ? 'var(--blue-bg)' : 'var(--bg2)'};min-height:90px;padding:6px;${!cell.cur ? 'opacity:.4' : ''}cursor:pointer" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background='${isToday ? 'var(--blue-bg)' : 'var(--bg2)'}'">
        <div style="font-size:12px;font-weight:${isToday ? '700' : '500'};color:${isToday ? 'var(--blue)' : 'var(--text2)'};margin-bottom:4px">${cell.day}</div>
        ${dayTasks.slice(0, 3).map(t => `<div onclick="event.stopPropagation();openTask(${t.id})" title="${t.title}" style="font-size:10px;padding:2px 5px;border-radius:3px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;background:${t.priority === 'urgente' ? 'var(--red-bg)' : t.priority === 'alta' ? 'var(--orange-bg)' : 'var(--blue-bg)'};color:${t.priority === 'urgente' ? 'var(--red)' : t.priority === 'alta' ? 'var(--orange)' : 'var(--blue)'}">${t.title}</div>`).join('')}
        ${dayTasks.length > 3 ? `<div style="font-size:10px;color:var(--text3)">+${dayTasks.length - 3} mais</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

// ── RELATÓRIOS DINÂMICOS ──
function renderRelatorios() {
  const total = S.tasks.length || 1;
  const done = S.tasks.filter(t => t.col === 'done');
  const late = S.tasks.filter(t => isLate(t.due, t.col));
  
  const last7Days = [];
  for(let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }
  
  const hoursData = last7Days.map(date => {
    const dayLogs = S.timelogs.filter(l => {
      const parts = l.date.split('/');
      const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
      return iso === date;
    });
    return dayLogs.length * 2; // Simulação: 2h por log se não houver 'seconds'
  });
  const maxH = Math.max(...hoursData, 1);

  const byPri = { baixa: 0, normal: 0, alta: 0, urgente: 0 };
  S.tasks.forEach(t => byPri[t.priority]++);

  const teamProd = {};
  done.forEach(t => { teamProd[t.resp] = (teamProd[t.resp] || 0) + 1; });
  const sortedTeam = Object.entries(teamProd).sort((a,b) => b[1] - a[1]);

  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <div style="font-size:13px;color:var(--text2)">Dados atualizados em tempo real com base nas tarefas e registros do sistema.</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" style="display:flex;align-items:center;gap:6px" onclick="exportReportCSV()">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11l4 4 4-4M8 15V5"/><path d="M2 9v4a2 2 0 002 2h8a2 2 0 002-2V9"/></svg>
        CSV
      </button>
      <button class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:6px" onclick="exportReportPDF()">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11l4 4 4-4M8 15V5"/><path d="M2 9v4a2 2 0 002 2h8a2 2 0 002-2V9"/></svg>
        PDF
      </button>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
    <div class="section-card">
      <div class="section-title">Esforço da Equipe <span style="font-size:11px;color:var(--text3);font-weight:400">Horas registradas (7 dias)</span></div>
      <div style="display:flex;align-items:flex-end;gap:8px;height:140px;margin-top:10px">
        ${hoursData.map((h, i) => {
          const height = Math.round((h / maxH) * 120);
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1">
            <div style="font-size:10px;font-weight:600;color:var(--blue)">${h}h</div>
            <div style="border-radius:4px 4px 0 0;width:100%;height:${Math.max(4, height)}px;background:var(--blue);opacity:${i===6?'1':'.4'}"></div>
            <div style="font-size:9px;color:var(--text3)">${last7Days[i].split('-')[2]}/${last7Days[i].split('-')[1]}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="section-card">
      <div class="section-title">Distribuição de Prioridades</div>
      <div style="display:flex;align-items:center;gap:24px;height:140px">
        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
          ${[['Urgente','#EF4444',byPri.urgente],['Alta','#F97316',byPri.alta],['Normal','#3B82F6',byPri.normal],['Baixa','#666680',byPri.baixa]].map(([l,c,v]) =>
            `<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:${c}"></div>${l}</div><span style="font-weight:600">${v}</span></div>`
          ).join('')}
        </div>
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
    <div class="section-card">
      <div class="section-title">🏆 Top Performance <span style="font-size:11px;color:var(--text3);font-weight:400">Concluídas</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${sortedTeam.length ? sortedTeam.slice(0, 4).map(([name, count]) => {
          const u = S.users.find(x => x.name === name) || { color: '#666', initials: '?' };
          const pct = Math.round((count / (done.length || 1)) * 100);
          return `<div style="display:flex;align-items:center;gap:10px">
            <div class="avatar avatar-sm" style="background:${u.color}">${u.initials}</div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${name.split(' ')[0]}</span><span style="font-weight:600">${count}</span></div>
              <div style="height:4px;background:var(--bg5);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${u.color};border-radius:2px"></div></div>
            </div>
          </div>`;
        }).join('') : '<div style="font-size:12px;color:var(--text3);padding:20px;text-align:center">Sem dados.</div>'}
      </div>
    </div>
    <div class="section-card">
      <div class="section-title">Progresso dos Projetos</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${S.projects.slice(0, 4).map(p => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${p.name}</span><span>${p.pct}%</span></div>
            <div style="height:4px;background:var(--bg5);border-radius:2px;overflow:hidden"><div style="height:100%;width:${p.pct}%;background:${p.color};border-radius:2px"></div></div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="section-card">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center">
      <div><div style="font-size:18px;font-weight:700;color:var(--green)">${Math.round((done.length/total)*100)}%</div><div style="font-size:11px;color:var(--text3)">Conclusão</div></div>
      <div><div style="font-size:18px;font-weight:700;color:var(--red)">${late.length}</div><div style="font-size:11px;color:var(--text3)">Atrasos</div></div>
      <div><div style="font-size:18px;font-weight:700;color:var(--blue)">${S.timelogs.length}</div><div style="font-size:11px;color:var(--text3)">Time Logs</div></div>
      <div><div style="font-size:18px;font-weight:700;color:var(--orange)">${Math.round(S.tasks.reduce((a,t)=>a+t.prog,0)/total)}%</div><div style="font-size:11px;color:var(--text3)">Progresso Médio</div></div>
    </div>
  </div>`;
}

// ── NOVA TAREFA MODAL ──
function openNewTask() {
  const html = `<div class="modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="modal">
      <h3>Nova Tarefa</h3>
      <div class="field"><div class="field-label">Título</div><input class="field-input" id="nt-t" placeholder="Título da tarefa..." autofocus></div>
      <div class="field-row">
        <div><div class="field-label">Prioridade</div><select class="field-input field-select" id="nt-p"><option value="baixa">Baixa</option><option value="normal" selected>Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div>
        <div><div class="field-label">Etapa</div><select class="field-input field-select" id="nt-c"><option value="todo">A Fazer</option><option value="doing">Em Andamento</option><option value="review">Em Revisão</option><option value="done">Concluído</option></select></div>
      </div>
      <div class="field-row">
        <div><div class="field-label">Responsável</div><select class="field-input field-select" id="nt-r">${S.users.map(u => `<option>${u.name}</option>`).join('')}</select></div>
        <div><div class="field-label">Prazo</div><input type="date" class="field-input" id="nt-d" value="2026-03-31"></div>
      </div>
      <div class="field"><div class="field-label">Projeto</div><select class="field-input field-select" id="nt-pr"><option>Sem projeto</option>${S.projects.map(p => `<option>${p.name}</option>`).join('')}</select></div>
      <div class="field"><div class="field-label">Tags</div><input class="field-input" id="nt-tg" placeholder="design, dev, ..."></div>
      <div class="modal-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="createTask()">Criar Tarefa</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function createTask() {
  const title = document.getElementById('nt-t')?.value.trim();
  if (!title) { showToast('Digite um título!', 'error'); return; }
  const projName = document.getElementById('nt-pr')?.value || '';
  const proj = S.projects.find(p => p.name === projName);
  const client = proj?.client || '';
  const tgsRaw = document.getElementById('nt-tg')?.value || '';
  const col = document.getElementById('nt-c')?.value || 'todo';
  const priority = document.getElementById('nt-p')?.value || 'normal';
  const resp = document.getElementById('nt-r')?.value || S.user?.name || 'Inatribuído';
  const due = document.getElementById('nt-d')?.value || '2026-03-31';

  const t = {
    id: genId(), // Temporário ou local
    title, col, priority, resp, due,
    start: TODAY,
    proj: projName === 'Sem projeto' ? '' : projName,
    client,
    tags: tgsRaw ? tgsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
    prog: (col === 'done' ? 100 : 0),
    subtasks: [], desc: '', link: '',
  };

  // Persistência Supabase
  if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
    try {
      const sbTask = await sbCreateTask({
        title, col, priority, resp,
        due_date: due,
        start_date: TODAY,
        project_id: proj?.id || null,
        client,
        tags: t.tags,
        prog: t.prog,
        created_by: S.user?.id
      });
      if (sbTask) t.id = sbTask.id; // Assume UUID do Supabase
    } catch (err) {
      console.error('Erro ao criar tarefa no Supabase:', err);
      showToast('Erro ao salvar no banco, salvo localmente.', 'warn');
    }
  }

  S.tasks.push(t);
  S.history.unshift({ who: S.user?.name || 'Usuário', action: `criou "${t.title}"`, time: 'agora', icon: '✨' });
  document.querySelector('.modal-overlay')?.remove();
  renderPage();
  showToast('Tarefa criada!');
}

function quickAdd(col) {
  openModal(`Adicionar Tarefa em "${COL_MAP[col]}"`, [
    { id: 'title', label: 'Título da Tarefa', placeholder: 'Ex: Criar post para Instagram...' },
    { id: 'resp', label: 'Responsável', type: 'select', options: S.users.map(u => u.name) },
    { id: 'priority', label: 'Prioridade', type: 'select', options: [
        {value:'normal',label:'Normal'},{value:'baixa',label:'Baixa'},
        {value:'alta',label:'Alta'},{value:'urgente',label:'Urgente'}
    ]},
    { id: 'due', label: 'Prazo de Entrega', type: 'date', value: '2026-03-31' }
  ], async (data) => {
    if (!data.title) return;
    
    const t = {
      id: genId(), title: data.title, col,
      priority: data.priority || 'normal',
      resp: data.resp || S.user?.name || S.users[0].name,
      due: data.due || '2026-03-31', start: TODAY,
      proj: '', client: '', tags: [], prog: 0, subtasks: [], desc: '', link: ''
    };

    // Persistência Supabase
    if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
      try {
        const sbTask = await sbCreateTask({
          title: t.title, col, priority: t.priority, resp: t.resp,
          due_date: t.due, start_date: t.start,
          created_by: S.user?.id
        });
        if (sbTask) t.id = sbTask.id;
      } catch (err) {
        console.error('Erro quickAdd no Supabase:', err);
      }
    }

    S.tasks.push(t);
    S.history.unshift({ who: S.user?.name || 'Usuário', action: `criou "${data.title}"`, time: 'agora', icon: '✨' });
    reRenderKanban();
    initDrag();
    showToast('Tarefa adicionada!');
  });
}
