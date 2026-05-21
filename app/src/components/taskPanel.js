// ═══════════════════════════════════════
//   AgencyFlow — Task Panel
//   src/components/taskPanel.js
// ═══════════════════════════════════════

function openTask(id) {
  const t = S.tasks.find(t => t.id === id);
  if (!t) return;
  S.activeTask = id;

  document.getElementById('p-id').textContent = '#' + t.id;
  document.getElementById('p-title').value = t.title;
  document.getElementById('p-prog').value = t.prog;
  document.getElementById('p-pct').textContent = t.prog + '%';
  document.getElementById('p-pct-lbl').textContent = t.prog + '%';
  document.getElementById('p-proj').textContent = t.proj || 'Sem projeto';
  document.getElementById('p-client').textContent = t.client || 'Sem cliente';
  document.getElementById('p-due').value = t.due || '';
  document.getElementById('p-start').value = t.start || '';
  document.getElementById('p-desc').value = t.desc || '';
  document.getElementById('p-tags').value = t.tags.join(', ');
  document.getElementById('p-link').value = t.link || '';

  // Prioridade
  Array.from(document.getElementById('p-pri').options)
    .forEach(o => { o.selected = (o.value === t.priority); });

  // Etapa
  Array.from(document.getElementById('p-stage').options)
    .forEach(o => { o.selected = (o.value === t.col); });

  // Responsável
  const respSel = document.getElementById('p-resp');
  respSel.innerHTML = S.users.map(u =>
    `<option${u.name === t.resp ? ' selected' : ''}>${u.name}</option>`
  ).join('');

  // Sub-tarefas
  renderSubtasks(id);

  // Timer
  document.getElementById('timer-d').textContent = formatTimer(S.timerSec);
  document.getElementById('timer-btn').textContent = S.timerOn ? '⏸ Pausar' : '▶ Iniciar';
  document.getElementById('timer-logs').innerHTML = S.timelogs
    .filter(l => l.task === t.proj || l.task === t.title)
    .slice(0, 3)
    .map(l => `<div class="time-log">${l.date} — ${l.who} — ${l.hrs}</div>`)
    .join('') || `<div class="time-log" style="color:var(--text3)">Nenhum registro ainda</div>`;

  // Histórico da tarefa
  document.getElementById('panel-hist').innerHTML = [
    { who: S.user?.name || 'Usuário', action: 'abriu esta tarefa', time: 'agora' },
    { who: 'Juliane Noberto', action: 'criou a tarefa', time: '23/02/2026' },
  ].map(h => `<div class="activity-item"><div class="activity-dot"></div><span><b>${h.who}</b> ${h.action} · ${h.time}</span></div>`).join('');

  // Role control
  const role = S.user?.role || 'Membro';
  const isAdmin = role === 'Administrador' || role === 'Gerente';
  const delBtn = document.getElementById('btn-del-task');
  if (delBtn) delBtn.style.display = isAdmin ? '' : 'none';

  document.getElementById('task-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.add('active');
}

function renderSubtasks(id) {
  const t = S.tasks.find(t => t.id === id);
  if (!t) return;
  const sl = document.getElementById('subtask-list');
  if (!sl) return;
  sl.innerHTML = t.subtasks.map((st, i) =>
    `<div class="subtask-item">
      <input type="checkbox"${st.done ? ' checked' : ''} onchange="toggleSub(${id},${i},this.checked)">
      <span class="subtask-text">${st.text}</span>
      <button class="subtask-del" onclick="removeSub(${id},${i})">✕</button>
    </div>`
  ).join('');
}

async function toggleSub(taskId, i, done) {
  const t = S.tasks.find(t => t.id === taskId);
  if (!t || !t.subtasks[i]) return;
  
  t.subtasks[i].done = done;

  // Supabase Persistence
  if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
    try {
      if (t.subtasks[i].id && typeof t.subtasks[i].id === 'string' && t.subtasks[i].id.length > 20) {
        await sbUpdateSubtask(t.subtasks[i].id, done);
      }
    } catch (err) {
      console.error('Erro ao atualizar subtarefa no Supabase:', err);
    }
  }
}

async function removeSub(taskId, i) {
  const t = S.tasks.find(t => t.id === taskId);
  if (!t) return;
  
  const sub = t.subtasks[i];

  // Supabase Persistence
  if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
    try {
      if (sub.id && typeof sub.id === 'string' && sub.id.length > 20) {
        await sbDeleteSubtask(sub.id);
      }
    } catch (err) {
      console.error('Erro ao excluir subtarefa no Supabase:', err);
    }
  }

  t.subtasks.splice(i, 1); 
  renderSubtasks(taskId);
}

async function addSub() {
  const inp = document.getElementById('new-sub');
  if (!inp?.value.trim() || !S.activeTask) return;
  const t = S.tasks.find(t => t.id === S.activeTask);
  if (!t) return;

  const newSub = { text: inp.value.trim(), done: false, id: 'st' + genId() };

  // Supabase Persistence
  if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID') && typeof t.id === 'string') {
    try {
      const sbSub = await sbCreateSubtask(t.id, newSub.text);
      if (sbSub) newSub.id = sbSub.id;
    } catch (err) {
      console.error('Erro ao criar subtarefa no Supabase:', err);
    }
  }

  t.subtasks.push(newSub);
  inp.value = '';
  renderSubtasks(S.activeTask);
}

function closePanel() {
  document.getElementById('task-panel').classList.remove('open');
  document.getElementById('panel-overlay').classList.remove('active');
}

function updProg(v) {
  document.getElementById('p-pct').textContent = v + '%';
  document.getElementById('p-pct-lbl').textContent = v + '%';
}

async function saveTask() {
  if (!S.activeTask) return;
  const t = S.tasks.find(t => t.id === S.activeTask);
  if (!t) return;

  const tv   = document.getElementById('p-tags').value;
  const tags = tv ? tv.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const updates = {
    title:    document.getElementById('p-title').value,
    prog:     parseInt(document.getElementById('p-prog').value),
    due_date: document.getElementById('p-due').value,
    start_date: document.getElementById('p-start').value,
    description: document.getElementById('p-desc').value,
    resp:     document.getElementById('p-resp').value,
    col:      document.getElementById('p-stage').value,
    priority: document.getElementById('p-pri').value,
    link:     document.getElementById('p-link').value,
    tags:     tags
  };

  if (updates.prog === 100) updates.col = 'done';

  // Supabase Persistence
  if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID') && typeof t.id === 'string') {
    try {
      await sbUpdateTask(t.id, updates);
    } catch (err) {
      console.error('Erro ao salvar tarefa no Supabase:', err);
      showToast('Erro ao sincronizar com banco.', 'warn');
    }
  }

  // Update local object
  Object.assign(t, {
    ...updates,
    due: updates.due_date,
    start: updates.start_date,
    desc: updates.description
  });

  S.history.unshift({ who: S.user?.name || 'Usuário', action: `atualizou "${t.title}"`, time: 'agora', icon: '✏️' });
  closePanel();
  renderPage();
  showToast('Tarefa salva!');
}

async function deleteTask() {
  const role = S.user?.role || 'Membro';
  if (role !== 'Administrador' && role !== 'Gerente') {
    showToast('Apenas administradores podem excluir tarefas.', 'error');
    return;
  }

  if (!S.activeTask) return;
  const t = S.tasks.find(t => t.id === S.activeTask);
  if (!t) return;
  if (!confirm(`Excluir "${t.title}"?`)) return;

  // Supabase Persistence
  if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID') && typeof t.id === 'string') {
    try {
      await sbDeleteTask(t.id);
    } catch (err) {
      console.error('Erro ao excluir tarefa no Supabase:', err);
    }
  }

  S.tasks = S.tasks.filter(t => t.id !== S.activeTask);
  closePanel();
  renderPage();
  showToast('Tarefa excluída.');
}

function dupTask() {
  if (!S.activeTask) return;
  const t = S.tasks.find(t => t.id === S.activeTask);
  if (!t) return;
  S.tasks.push({ ...t, id: genId(), title: '[Cópia] ' + t.title, col: 'todo', prog: 0, subtasks: [] });
  closePanel();
  renderPage();
  showToast('Tarefa duplicada!');
}

function fmt(type) {
  const ta = document.getElementById('p-desc');
  if (!ta) return;
  const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
  const map = {
    bold: `**${sel}**`, italic: `_${sel}_`, underline: `<u>${sel}</u>`,
    h2: `## ${sel}`, h3: `### ${sel}`, ul: `- ${sel}`, link: `[${sel}](url)`,
  };
  if (map[type]) {
    const s = ta.selectionStart;
    ta.value = ta.value.substring(0, s) + map[type] + ta.value.substring(ta.selectionEnd);
  }
}

// ── TIMER ──
async function toggleTimer() {
  const btn = document.getElementById('timer-btn');
  if (!S.timerOn) {
    S.timerOn = true;
    S.timerStart = Date.now();
    if (btn) btn.textContent = '\u23f8 Pausar';
    S.timerInt = setInterval(() => {
      S.timerSec++;
      const el = document.getElementById('timer-d');
      if (el) el.textContent = formatTimer(S.timerSec);
    }, 1000);
  } else {
    S.timerOn = false;
    if (btn) btn.textContent = '\u25b6 Iniciar';
    clearInterval(S.timerInt);

    if (S.timerSec > 10 && S.activeTask) {
      const t = S.tasks.find(t => t.id === S.activeTask);
      const h = Math.floor(S.timerSec / 3600);
      const m = Math.floor((S.timerSec % 3600) / 60);
      const s = S.timerSec % 60;
      const hrsStr = h > 0 ? `${h}h ${m}min` : m > 0 ? `${m}min ${s}s` : `${s}s`;
      const now = new Date();
      const dateStrYMD = now.toISOString().split('T')[0];
      const dateStrBR  = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

      const log = {
        id: 'tl' + genId(),
        who: S.user?.name || 'Usuário',
        task: t?.title || 'Tarefa',
        hrs: hrsStr,
        date: dateStrBR
      };

      // Supabase Persistence
      if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('SEU_PROJECT_ID')) {
        try {
          const sbLog = await sbCreateTimelog({
            task_id: typeof t?.id === 'string' ? t.id : null,
            user_id: S.user?.id,
            who: log.who,
            task_title: log.task,
            seconds: S.timerSec,
            hrs: log.hrs,
            log_date: dateStrYMD
          });
          if (sbLog) log.id = sbLog.id;
        } catch (err) {
          console.error('Erro ao salvar timelog no Supabase:', err);
        }
      }

      S.timelogs.unshift(log);

      const logsEl = document.getElementById('timer-logs');
      if (logsEl) {
        logsEl.innerHTML = S.timelogs
          .filter(l => l.task === t?.title)
          .slice(0, 3)
          .map(l => `<div class="time-log">${l.date} \u2014 ${l.who} \u2014 <strong>${l.hrs}</strong></div>`)
          .join('') || `<div class="time-log" style="color:var(--text3)">Nenhum registro ainda</div>`;
      }
      showToast(`\u23f1 ${hrsStr} registrados!`);
    }
    S.timerSec = 0;
    const el = document.getElementById('timer-d');
    if (el) el.textContent = '00:00:00';
  }
}
