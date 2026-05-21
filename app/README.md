# AgencyFlow 🚀

Plataforma de produtividade para agências de marketing digital.

## Stack

- **Frontend:** HTML5 + CSS3 + JavaScript Vanilla
- **Fontes:** Plus Jakarta Sans (títulos) + Inter (corpo) via Google Fonts
- **Ícones:** SVG inline
- **Sem dependências externas** — pronto para rodar em qualquer ambiente

## Estrutura do Projeto

```
agencyflow/
├── index.html          ← Ponto de entrada (login)
├── dashboard.html      ← App principal (sidebar + Kanban + módulos)
├── src/
│   ├── styles/
│   │   ├── variables.css    ← Tokens de design (cores, tipografia)
│   │   ├── global.css       ← Reset + estilos base
│   │   ├── sidebar.css      ← Sidebar e navegação
│   │   ├── dashboard.css    ← Dashboard, calendário, métricas
│   │   ├── kanban.css       ← Quadro Kanban e cards
│   │   ├── panel.css        ← Painel lateral de tarefas
│   │   └── components.css   ← Botões, modais, badges, forms
│   ├── data/
│   │   └── seed.js          ← Dados iniciais (tarefas, membros, etc.)
│   ├── utils/
│   │   ├── helpers.js       ← Funções utilitárias
│   │   ├── security.js      ← Módulo de segurança (hash, sessão, rate-limit)
│   │   ├── supabase.js      ← Cliente Supabase + sync
│   │   └── pexels.js        ← API Pexels para backgrounds dinâmicos
│   └── components/
│       ├── auth.js          ← Login, cadastro, logout
│       ├── kanban.js        ← Kanban + drag and drop + dashboard
│       ├── taskPanel.js     ← Painel de detalhes da tarefa
│       └── modules.js       ← Todos os módulos (OKR, Sprint, Equipe, etc.)
└── public/
    └── favicon.svg

```

## Como Rodar

```bash
# Opção 1 — Abrir direto no navegador
open index.html

# Opção 2 — Servidor local (recomendado)
npx serve .
# ou
python3 -m http.server 3000
```

> **⚠️ Nota de Segurança:** As credenciais de demonstração são geradas automaticamente na primeira execução. Para ambientes de produção, configure o Supabase e substitua as senhas padrão imediatamente após o primeiro deploy.

## Módulos Implementados

- [x] Autenticação (login, cadastro 3 etapas, recuperar senha)
- [x] Dashboard com métricas
- [x] Kanban (drag & drop, filtros, lista)
- [x] Painel de tarefas completo
- [x] Calendário mensal
- [x] Relatórios e gráficos
- [x] Projetos e Clientes
- [x] Equipe e Squads
- [x] Sprint e OKR
- [x] Controle de Horas (Time Tracking)
- [x] Checklist
- [x] Fluxo (automações)
- [x] Histórico de atividades
- [x] Notificações

## Próximas Etapas Sugeridas

1. Conectar Supabase (preencher URL e ANON_KEY em `supabase.js`)
2. Upload de arquivos real (bucket Supabase Storage)
3. Notificações em tempo real (WebSocket / Supabase Realtime)
4. Exportação de relatórios (PDF/CSV)
5. Modo escuro customizável por usuário
6. App mobile (React Native)
7. Integração com calendário (Google Calendar API)
8. Automações de Fluxo com disparo real via webhook

## Design System

- **Fundo principal:** `#0D0D0F`
- **Cards:** `#1A1A1F`
- **Azul primário:** `#3B82F6`
- **Verde sucesso:** `#22C55E`
- **Vermelho perigo:** `#EF4444`
- **Laranja alerta:** `#F97316`
