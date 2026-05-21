-- ═══════════════════════════════════════════════════════════════
--   AgencyFlow — Supabase Schema
--   Execute este SQL no painel do Supabase:
--   Dashboard → SQL Editor → New query → Cole e execute
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────
-- 0. EXTENSÕES
-- ────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────
-- 1. PERFIS DE USUÁRIO
--    (complementa a tabela auth.users do Supabase)
-- ────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  initials   text,
  color      text default '#3B82F6',
  role       text default 'Membro',      -- Administrador | Gerente | Membro
  squad      text,
  agency     text,
  avatar_url text,
  active     boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: usuário só vê/edita o próprio perfil (admin vê todos)
alter table public.profiles enable row level security;

create policy "Usuário pode ler qualquer perfil da agência"
  on public.profiles for select using (true);

create policy "Usuário edita apenas o próprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- ────────────────────────────────────────
-- 2. PROJETOS
-- ────────────────────────────────────────
create table if not exists public.projects (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid references auth.users(id) on delete set null,
  name       text not null,
  client     text,
  squad      text,
  color      text default '#3B82F6',
  status     text default 'Em andamento',
  pct        integer default 0 check (pct between 0 and 100),
  start_date date,
  end_date   date,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Todos podem ver projetos"
  on public.projects for select using (true);

create policy "Usuário autenticado pode criar/editar projetos"
  on public.projects for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 3. CLIENTES
-- ────────────────────────────────────────
create table if not exists public.clients (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid references auth.users(id) on delete set null,
  name       text not null,
  contact    text,
  site       text,
  color      text default '#3B82F6',
  created_at timestamptz default now()
);

alter table public.clients enable row level security;
create policy "Autenticados acessam clientes" on public.clients
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 4. SQUADS
-- ────────────────────────────────────────
create table if not exists public.squads (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  color      text default '#3B82F6',
  created_at timestamptz default now()
);

alter table public.squads enable row level security;
create policy "Autenticados acessam squads" on public.squads
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 5. TAREFAS
-- ────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  col         text default 'todo',       -- todo | doing | review | done
  priority    text default 'normal',     -- baixa | normal | alta | urgente
  resp        text,                      -- nome do responsável (desnormalizado)
  resp_id     uuid references auth.users(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  client      text,
  tags        text[] default '{}',
  prog        integer default 0,
  due_date    date,
  start_date  date,
  link        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.tasks enable row level security;
create policy "Autenticados acessam tarefas" on public.tasks
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 6. SUBTAREFAS
-- ────────────────────────────────────────
create table if not exists public.subtasks (
  id         uuid primary key default uuid_generate_v4(),
  task_id    uuid references public.tasks(id) on delete cascade,
  text       text not null,
  done       boolean default false,
  created_at timestamptz default now()
);

alter table public.subtasks enable row level security;
create policy "Autenticados acessam subtarefas" on public.subtasks
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 7. TIMELOGS
-- ────────────────────────────────────────
create table if not exists public.timelogs (
  id         uuid primary key default uuid_generate_v4(),
  task_id    uuid references public.tasks(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  who        text not null,
  task_title text,
  seconds    integer not null,
  hrs        text not null,
  log_date   date,
  created_at timestamptz default now()
);

alter table public.timelogs enable row level security;
create policy "Autenticados acessam timelogs" on public.timelogs
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 8. OKRs
-- ────────────────────────────────────────
create table if not exists public.okrs (
  id         uuid primary key default uuid_generate_v4(),
  objective  text not null,
  owner_id   uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.key_results (
  id      uuid primary key default uuid_generate_v4(),
  okr_id  uuid references public.okrs(id) on delete cascade,
  title   text not null,
  pct     integer default 0 check (pct between 0 and 100)
);

alter table public.okrs         enable row level security;
alter table public.key_results  enable row level security;
create policy "Autenticados acessam OKRs" on public.okrs
  for all using (auth.role() = 'authenticated');
create policy "Autenticados acessam KRs" on public.key_results
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 9. SPRINTS
-- ────────────────────────────────────────
create table if not exists public.sprints (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  start_date date,
  end_date   date,
  status     text default 'Ativo',
  task_count integer default 0,
  done_count integer default 0,
  created_at timestamptz default now()
);

alter table public.sprints enable row level security;
create policy "Autenticados acessam sprints" on public.sprints
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 10. CHECKLISTS
-- ────────────────────────────────────────
create table if not exists public.checklists (
  id    uuid primary key default uuid_generate_v4(),
  title text not null,
  owner_id uuid references auth.users(id) on delete set null
);

create table if not exists public.checklist_items (
  id           uuid primary key default uuid_generate_v4(),
  checklist_id uuid references public.checklists(id) on delete cascade,
  text         text not null,
  done         boolean default false
);

alter table public.checklists       enable row level security;
alter table public.checklist_items  enable row level security;
create policy "Autenticados acessam checklists" on public.checklists
  for all using (auth.role() = 'authenticated');
create policy "Autenticados acessam checklist items" on public.checklist_items
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 11. FLOW RULES
-- ────────────────────────────────────────
create table if not exists public.flow_rules (
  id      uuid primary key default uuid_generate_v4(),
  trigger text not null,
  action  text not null,
  active  boolean default true
);

alter table public.flow_rules enable row level security;
create policy "Autenticados acessam regras" on public.flow_rules
  for all using (auth.role() = 'authenticated');

-- ────────────────────────────────────────
-- 12. NOTIFICAÇÕES
-- ────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade,
  text       text not null,
  time_label text,
  read       boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Usuário vê apenas suas notificações" on public.notifications
  for all using (auth.uid() = user_id);

-- ────────────────────────────────────────
-- 13. TRIGGER: atualiza updated_at automáticamente
-- ────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_tasks_updated
  before update on public.tasks
  for each row execute function public.handle_updated_at();

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ────────────────────────────────────────
-- 14. TRIGGER: cria perfil automaticamente no cadastro
-- ────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, initials, color, role, agency)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 2)),
    coalesce(new.raw_user_meta_data->>'color', '#3B82F6'),
    coalesce(new.raw_user_meta_data->>'role', 'Membro'),
    new.raw_user_meta_data->>'agency'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
