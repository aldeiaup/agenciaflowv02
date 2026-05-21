// ═══════════════════════════════════════
//   AgencyFlow — Export Module
//   src/utils/export.js
//
//   Exportação de relatórios em CSV e PDF.
//   jsPDF carregado via CDN no dashboard.html.
// ═══════════════════════════════════════

/**
 * Gera um arquivo CSV com os dados do relatório e dispara download.
 */
function exportReportCSV() {
  if (typeof S === 'undefined' || !S.tasks) {
    showToast('Nenhum dado disponível para exportar.', 'error');
    return;
  }

  const total = S.tasks.length;
  const done = S.tasks.filter(t => t.col === 'done');
  const late = S.tasks.filter(t => isLate(t.due, t.col));
  const totalProg = total > 0 ? Math.round(S.tasks.reduce((a, t) => a + t.prog, 0) / total) : 0;
  const conclPct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const byPri = { baixa: 0, normal: 0, alta: 0, urgente: 0 };
  S.tasks.forEach(t => byPri[t.priority]++);

  const teamProd = {};
  done.forEach(t => { teamProd[t.resp] = (teamProd[t.resp] || 0) + 1; });
  const sortedTeam = Object.entries(teamProd).sort((a, b) => b[1] - a[1]);

  const rows = [];

  // ── Seção: Resumo ──
  rows.push('=== RESUMO DO RELATÓRIO ===');
  rows.push('Métrica,Valor');
  rows.push(`Total de Tarefas,${total}`);
  rows.push(`Concluídas,${done.length}`);
  rows.push(`Atrasadas,${late.length}`);
  rows.push(`Taxa de Conclusão,${conclPct}%`);
  rows.push(`Progresso Médio,${totalProg}%`);
  rows.push(`Registros de Horas,${S.timelogs.length}`);
  rows.push('');

  // ── Seção: Prioridades ──
  rows.push('=== DISTRIBUIÇÃO DE PRIORIDADES ===');
  rows.push('Prioridade,Quantidade');
  for (const [pri, count] of Object.entries(byPri)) {
    rows.push(`${capitalize(pri)},${count}`);
  }
  rows.push('');

  // ── Seção: Performance do Time ──
  rows.push('=== TOP PERFORMANCE (TAREFAS CONCLUÍDAS) ===');
  rows.push('Membro,Concluídas');
  for (const [name, count] of sortedTeam) {
    rows.push(`"${name}",${count}`);
  }
  rows.push('');

  // ── Seção: Progresso dos Projetos ──
  rows.push('=== PROGRESSO DOS PROJETOS ===');
  rows.push('Projeto,Cliente,Progresso');
  for (const p of S.projects) {
    rows.push(`"${p.name}","${p.client}",${p.pct}%`);
  }
  rows.push('');

  // ── Seção: Tarefas (detalhado) ──
  rows.push('=== LISTA DE TAREFAS ===');
  rows.push('ID,Título,Responsável,Etapa,Prioridade,Prazo,Progresso,Projeto,Cliente');
  for (const t of S.tasks) {
    rows.push([
      t.id,
      `"${t.title}"`,
      `"${t.resp}"`,
      COL_MAP[t.col] || t.col,
      capitalize(t.priority),
      fmtDate(t.due),
      `${t.prog}%`,
      `"${t.proj || ''}"`,
      `"${t.client || ''}"`,
    ].join(','));
  }

  // ── Dispara download ──
  const bom = '\uFEFF';
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agencyflow-relatorio-${TODAY}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  S.history.unshift({
    who: S.user?.name || 'Usuário',
    action: 'exportou relatório em CSV',
    time: 'agora',
    icon: '📄',
  });

  showToast('CSV exportado com sucesso!');
}

/**
 * Gera um PDF com os dados do relatório usando jsPDF e dispara download.
 */
function exportReportPDF() {
  if (typeof S === 'undefined' || !S.tasks) {
    showToast('Nenhum dado disponível para exportar.', 'error');
    return;
  }

  // Verifica se jsPDF foi carregado
  if (typeof jspdf === 'undefined') {
    showToast('Biblioteca jsPDF não carregada. Verifique a conexão.', 'error');
    return;
  }

  const { jsPDF } = jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 190; // Largura útil (210 - 10*2)
  const margin = 10;
  let y = margin + 10;

  const total = S.tasks.length;
  const done = S.tasks.filter(t => t.col === 'done');
  const late = S.tasks.filter(t => isLate(t.due, t.col));
  const totalProg = total > 0 ? Math.round(S.tasks.reduce((a, t) => a + t.prog, 0) / total) : 0;
  const conclPct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const byPri = { baixa: 0, normal: 0, alta: 0, urgente: 0 };
  S.tasks.forEach(t => byPri[t.priority]++);

  const teamProd = {};
  done.forEach(t => { teamProd[t.resp] = (teamProd[t.resp] || 0) + 1; });
  const sortedTeam = Object.entries(teamProd).sort((a, b) => b[1] - a[1]);

  // Função auxiliar: verifica espaço e adiciona página se necessário
  function checkSpace(needed) {
    if (y + needed > 280) {
      doc.addPage();
      y = margin + 10;
    }
  }

  // ── Cabeçalho ---
  doc.setFillColor(13, 13, 15);
  doc.rect(0, 0, 210, 50, 'F');

  doc.setTextColor(59, 130, 246);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('AgencyFlow', margin, 22);

  doc.setTextColor(160, 160, 180);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Desempenho', margin, 32);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, margin, 40);

  y = 60;

  // ── Seção: Resumo ──
  doc.setTextColor(232, 232, 240);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo', margin, y);
  y += 10;

  const metrics = [
    ['Total de Tarefas', total, '#3B82F6'],
    ['Concluídas', done.length, '#22C55E'],
    ['Atrasadas', late.length, '#EF4444'],
    ['Progresso Médio', `${totalProg}%`, '#F97316'],
    ['Taxa de Conclusão', `${conclPct}%`, '#22C55E'],
    ['Registros de Horas', S.timelogs.length, '#A855F7'],
  ];

  doc.setFontSize(10);
  metrics.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * 63;
    const ry = y + row * 12;

    doc.setFillColor(26, 26, 31);
    doc.roundedRect(x, ry - 4, 58, 10, 2, 2, 'F');
    doc.setTextColor(160, 160, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 3, ry + 1);
    doc.setTextColor(232, 232, 240);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), x + 3, ry + 8);
  });

  y += 30;

  // ── Seção: Prioridades ──
  checkSpace(50);
  doc.setTextColor(232, 232, 240);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribuição de Prioridades', margin, y);
  y += 10;

  const priColors = {
    urgente: { r: 239, g: 68, b: 68 },
    alta: { r: 249, g: 115, b: 22 },
    normal: { r: 59, g: 130, b: 246 },
    baixa: { r: 102, g: 102, b: 128 },
  };

  doc.setDrawColor(46, 46, 56);
  doc.setFontSize(10);
  for (const [pri, count] of Object.entries(byPri)) {
    const c = priColors[pri] || { r: 102, g: 102, b: 128 };
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;

    doc.setFillColor(c.r, c.g, c.b);
    doc.circle(margin + 3, y - 1, 2, 'F');

    doc.setTextColor(160, 160, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(capitalize(pri), margin + 8, y);

    doc.setTextColor(232, 232, 240);
    doc.setFont('helvetica', 'bold');
    doc.text(String(count), pageW - 15, y, { align: 'right' });

    // Barra de progresso
    doc.setFillColor(42, 42, 50);
    doc.rect(margin + 35, y - 3, 80, 4, 'F');
    doc.setFillColor(c.r, c.g, c.b);
    doc.rect(margin + 35, y - 3, Math.round(80 * pct / 100), 4, 'F');

    y += 9;
  }

  y += 6;

  // ── Seção: Top Performance ──
  if (sortedTeam.length > 0) {
    checkSpace(20 + sortedTeam.length * 9);
    doc.setTextColor(232, 232, 240);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance da Equipe', margin, y);
    y += 10;

    doc.setDrawColor(46, 46, 56);
    doc.setFontSize(10);
    sortedTeam.slice(0, 6).forEach(([name, count]) => {
      const pct = Math.round((count / (done.length || 1)) * 100);
      const u = S.users.find(x => x.name === name) || { color: '#666680' };
      const hex = u.color.replace('#', '');
      const cr = parseInt(hex.slice(0, 2), 16);
      const cg = parseInt(hex.slice(2, 4), 16);
      const cb = parseInt(hex.slice(4, 6), 16);

      doc.setTextColor(160, 160, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(name, margin + 5, y);

      doc.setTextColor(232, 232, 240);
      doc.setFont('helvetica', 'bold');
      doc.text(`${count} (${pct}%)`, pageW - 15, y, { align: 'right' });

      doc.setFillColor(42, 42, 50);
      doc.rect(margin + 60, y - 3, 70, 4, 'F');
      doc.setFillColor(cr, cg, cb);
      doc.rect(margin + 60, y - 3, Math.round(70 * pct / 100), 4, 'F');

      y += 9;
    });
    y += 6;
  }

  // ── Seção: Projetos ──
  if (S.projects.length > 0) {
    checkSpace(20 + S.projects.length * 9);
    doc.setTextColor(232, 232, 240);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Progresso dos Projetos', margin, y);
    y += 10;

    doc.setFontSize(10);
    S.projects.slice(0, 8).forEach(p => {
      const hex = p.color.replace('#', '');
      const cr = parseInt(hex.slice(0, 2), 16);
      const cg = parseInt(hex.slice(2, 4), 16);
      const cb = parseInt(hex.slice(4, 6), 16);

      doc.setTextColor(160, 160, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(`${p.name} — ${p.client}`, margin + 5, y);

      doc.setTextColor(232, 232, 240);
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.pct}%`, pageW - 15, y, { align: 'right' });

      doc.setFillColor(42, 42, 50);
      doc.rect(margin + 60, y - 3, 70, 4, 'F');
      doc.setFillColor(cr, cg, cb);
      doc.rect(margin + 60, y - 3, Math.round(70 * p.pct / 100), 4, 'F');

      y += 9;
    });
    y += 6;
  }

  // ── Seção: Tarefas ──
  checkSpace(20);
  doc.setTextColor(232, 232, 240);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Todas as Tarefas', margin, y);
  y += 8;

  doc.setFontSize(7);
  doc.setFillColor(26, 26, 31);
  doc.rect(margin, y - 4, pageW, 5, 'F');
  doc.setTextColor(160, 160, 180);
  doc.setFont('helvetica', 'bold');
  const taskCols = [
    { label: 'Título', x: margin + 2, w: 50 },
    { label: 'Responsável', x: margin + 54, w: 25 },
    { label: 'Etapa', x: margin + 80, w: 22 },
    { label: 'Prioridade', x: margin + 103, w: 20 },
    { label: 'Prazo', x: margin + 124, w: 18 },
    { label: 'Prog', x: margin + 143, w: 12 },
    { label: 'Projeto', x: margin + 156, w: 32 },
  ];
  taskCols.forEach(c => doc.text(c.label, c.x, y));
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 180);
  S.tasks.slice(0, 30).forEach((t, i) => {
    if (y > 275) {
      doc.addPage();
      y = margin + 10;

      // Re-cabeçalho
      doc.setFillColor(26, 26, 31);
      doc.rect(margin, y - 4, pageW, 5, 'F');
      doc.setTextColor(160, 160, 180);
      doc.setFont('helvetica', 'bold');
      taskCols.forEach(c => doc.text(c.label, c.x, y));
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 180);
    }

    if (i % 2 === 0) {
      doc.setFillColor(17, 17, 20);
      doc.rect(margin, y - 3, pageW, 6, 'F');
    }

    doc.setTextColor(232, 232, 240);
    const title = t.title.length > 22 ? t.title.slice(0, 20) + '…' : t.title;
    doc.text(title, taskCols[0].x, y);
    doc.text(t.resp || '—', taskCols[1].x, y);
    doc.text(COL_MAP[t.col] || t.col, taskCols[2].x, y);
    doc.text(capitalize(t.priority), taskCols[3].x, y);
    doc.text(fmtDate(t.due), taskCols[4].x, y);
    doc.text(`${t.prog}%`, taskCols[5].x, y);
    doc.text(t.proj?.length > 12 ? t.proj.slice(0, 10) + '…' : t.proj || '—', taskCols[6].x, y);

    y += 7;
  });

  // ── Rodapé ──
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 128);
  doc.text('Gerado por AgencyFlow — www.agencyflow.com.br', margin, 290);

  // ── Salva ──
  doc.save(`agencyflow-relatorio-${TODAY}.pdf`);

  S.history.unshift({
    who: S.user?.name || 'Usuário',
    action: 'exportou relatório em PDF',
    time: 'agora',
    icon: '📄',
  });

  showToast('PDF exportado com sucesso!');
}
