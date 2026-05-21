# 🚀 Guia de Integração: Vercel + Supabase

Este guia detalha os passos necessários para ativar a persistência real de dados e o deploy automático da sua plataforma **AgencyFlow**.

---

## 1. Configuração do Supabase

### Passo 1: Criar o Banco de Dados
1. Vá para o [Supabase Dashboard](https://supabase.com/dashboard).
2. Crie um novo projeto.
3. No menu lateral, clique em **SQL Editor**.
4. Clique em **New Query**.
5. Abra o arquivo [schema.sql](file:///c:/Users/Mauricio%20Medeiros/Documents/agencyflow-starter/agencyflow/supabase/schema.sql) que eu criei, copie todo o conteúdo e cole no editor do Supabase.
6. Clique em **Run**. Isso criará todas as tabelas, políticas de segurança e gatilhos automáticos.

### Passo 2: Obter as Credenciais
1. Vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie a **Project URL**.
3. Copie a **anon public key**.

---

## 2. Configuração do Código Local

No arquivo [src/utils/supabase.js](file:///c:/Users/Mauricio%20Medeiros/Documents/agencyflow-starter/agencyflow/src/utils/supabase.js), atualize as constantes:

```javascript
const SUPABASE_URL     = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_AQUI';
```

---

## 3. Deploy no Vercel

### Passo 1: Conectar Repositório
1. Suba seu código para um repositório no **GitHub**, **GitLab** ou **Bitbucket**.
2. Vá para o [Vercel Dashboard](https://vercel.com/dashboard).
3. Clique em **Add New...** → **Project**.
4. Importe o seu repositório.

### Passo 2: Configurar Rotas
O arquivo `vercel.json` que eu criei já cuida das rotas (Single Page Application style) para que `/dashboard` e `/login` funcionem corretamente sem o `.html`.

---

## 4. O que mudou no sistema?

- **Auth Híbrido**: O sistema tenta primeiro logar pelo Supabase. Se o projeto não estiver configurado ou as credenciais supabse falharem, ele tenta o login local (usuários demo do `seed.js`).
- **Persistência Real**: Quando configurado, tarefas, projetos e clientes criados serão salvos permanentemente no banco de dados do Supabase.
- **Sessões Seguras**: A autenticação agora usa tokens JWT do Supabase gerenciados automaticamente pelo SDK oficial.
- **Realtime**: O sistema já está preparado para atualizações em tempo real (ex: se alguém mover uma tarefa no Kanban, ela atualiza na tela de outros usuários sem refresh).

---

## 🛠️ Próximos Passos Sugeridos

1. **Configurar as credenciais** no `supabase.js`.
2. **Realizar o primeiro deploy** no Vercel.
3. **Migrar o restante dos renderizadores** no `modules.js` para usar as funções `sbCreate...` e `sbUpdate...`.
