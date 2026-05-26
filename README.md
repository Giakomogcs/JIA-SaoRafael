# São Rafael — Wizard de Orçamentos & Assistente IA

> Plataforma web para geração assistida de orçamentos de câmaras frigoríficas, walk-in coolers, túneis de congelamento e equipamentos correlatos da **São Rafael**, com validação técnica por IA, RAG sobre documentação de engenharia e CRM leve de clientes.

## Sobre

Este repositório contém o sistema completo São Rafael: um **wizard guiado** para representantes comerciais montarem orçamentos válidos, um **assistente conversacional** que tira dúvidas técnicas usando RAG sobre o manual de dimensionamento e regras de negócio, e a infraestrutura de dados (Supabase/PostgreSQL) que sustenta autenticação, persistência e controle de acesso.

A arquitetura é **serverless-friendly**: o frontend é um único HTML estático servido por n8n, o backend é uma coleção de workflows n8n (cada webhook é um endpoint) e o banco fica no Supabase com RLS por empresa/role. Não há build de backend a compilar — tudo é declarativo e versionado como SQL + JSON.

Para arquitetura técnica detalhada, veja [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + JavaScript vanilla, Tailwind via CDN, Marked, Highlight.js, Lucide, SheetJS |
| Auth & DB | Supabase (PostgreSQL 15+) com RLS, RPC e `auth.users` |
| Orquestração | n8n (workflows em JSON) — webhooks REST |
| IA — Wizard | Azure OpenAI `gpt-5.4-mini` (validação determinística por step) |
| IA — Chat | Azure OpenAI `gpt-5.4-mini` + LangChain Agent |
| Embeddings | Azure OpenAI `text-embedding-3-small` e Google Gemini Embeddings |
| Vector store | Supabase pgvector (`saorafael_documents`) |
| RAG ingestion | Google Drive + extração PDF/XLSX/CSV/MD via n8n |
| LLM auxiliar (RAG) | OpenRouter (resumo/normalização durante ingestão) |
| APIs externas | IBGE (cidades/UF) · ViaCEP (endereço) |

## Estrutura do Repositório

```
SaoRafael/
├── front.html                    # Aplicação completa (wizard + chat + admin) ~20k linhas
├── front_v2_backup.html          # Backup intermediário do Wizard V2 (~1.8k linhas)
├── front_backup_chat.html        # Backup da UI anterior centrada em chat (~3k linhas)
├── WIZARD_V2_ARCHITECTURE.md     # Spec de design do Wizard V2 (steps condicionais, CRM, Reality Check)
│
├── migrations/                   # SQL versionado — rodar em ordem no Supabase
│   ├── 001_base_tables.sql       # Tabelas chat + submission + view de sessões
│   ├── 002_user_crud_functions.sql # RPCs admin para gestão de usuários
│   ├── 003_rls_policies.sql      # Policies RLS por user/admin/service_role
│   ├── 004_auto_user_id_trigger.sql # Trigger BEFORE INSERT preenche user_id
│   ├── 005_session_management.sql # RPCs list/get/delete/prune sessões de chat
│   ├── 006_seed_admin.sql        # Bootstrap do primeiro admin
│   ├── 007_self_update_name.sql  # RPC usuário atualiza próprio nome
│   ├── 009_fix_delete_policy.sql # Hotfix: policy delete para admin em submissions
│   ├── 010_fix_chat_message_user_id.sql # Hotfix: user_id em chat + recriação de RPCs
│   ├── 011_clients_table_seed.sql # Tabela de clientes + FK + RPCs de busca + backfill
│   └── 012_clients_rls_policies.sql # RLS para clients
│
├── prompts/                      # System prompts dos agentes IA (versionados)
│   ├── system_prompt_chat_assistant.md
│   └── system_prompt_wizard_validation.md
│
├── rag_documents/                # Base de conhecimento para o RAG
│   ├── 01_manual_dimensionamento.md   # Engenharia: painéis, carga térmica, defrost
│   ├── 02_regras_negocio_planilha.md  # Contrato com a planilha + regras comerciais
│   └── 03_guia_interpretacao_casos.md # Heurísticas por setor (cárneo, lácteo, etc.)
│
└── workflows/                    # Workflows n8n (cada um é um conjunto de endpoints)
    ├── São Rafael - AgentRag (Wizard + Chat).json     # Endpoint principal de IA
    ├── São Rafael - Wizard Submit (Save Orçamento).json # POST /saorafael-wizard-submit
    ├── SãoRafael-Chat-DELETE-Session.json
    ├── SãoRafael-Chat-GET-History.json
    ├── SãoRafael-Chat-GET-Sessions.json
    ├── SãoRafael-DatabaseSetup.json                   # Migração automatizada + reset RAG
    ├── SãoRafael-Front.json                            # Serve o front.html via webhook
    └── SãoRafael-RAG.json                              # Ingestão e reindex de documentos
```

## Pré-requisitos

- **Supabase** (projeto novo ou self-hosted), com extensões `pgvector` e `pg_trgm` habilitadas
- **n8n** com credenciais para Supabase/PostgreSQL, Azure OpenAI, Google Drive e Google Gemini
- Conta **Azure OpenAI** com deploys de `gpt-5.4-mini` e `text-embedding-3-small`
- Conta **OpenRouter** (usada na pipeline de RAG)
- Pasta no **Google Drive** com os documentos a indexar
- Navegador moderno (Chrome/Edge/Firefox atualizado)

## Setup

### 1. Banco de dados (Supabase)

Aplique as migrations **em ordem** na SQL editor do Supabase:

```sql
-- 1. Habilite as extensões necessárias antes da primeira migration
create extension if not exists pgvector;
create extension if not exists pg_trgm;

-- 2. Rode em ordem
\i migrations/001_base_tables.sql
\i migrations/002_user_crud_functions.sql
\i migrations/003_rls_policies.sql
\i migrations/004_auto_user_id_trigger.sql
\i migrations/005_session_management.sql
\i migrations/006_seed_admin.sql
\i migrations/007_self_update_name.sql
\i migrations/009_fix_delete_policy.sql
\i migrations/010_fix_chat_message_user_id.sql
\i migrations/011_clients_table_seed.sql
\i migrations/012_clients_rls_policies.sql
```

> **Atalho:** o workflow `SãoRafael-DatabaseSetup.json` permite rodar todo o bundle via webhook (modo `full`) ou só resetar o RAG (modo `rag_only`).

### 2. Criar o primeiro admin

O bootstrap está em [`migrations/006_seed_admin.sql`](migrations/006_seed_admin.sql). Crie o usuário no painel Supabase Auth, depois:

```sql
update auth.users
   set raw_user_meta_data = raw_user_meta_data
        || jsonb_build_object('company','saorafael','role','admin','full_name','Admin')
 where email = 'admin@saorafael.com.br';
```

A partir daí, novos usuários podem ser criados pelo painel admin do frontend (`saorafael_create_user`).

### 3. Importar os workflows n8n

No n8n, importe **todos** os JSONs da pasta `workflows/` e ative-os. Configure as credenciais:

- **Supabase / Postgres** (URL + service role key)
- **Azure OpenAI** (endpoint + key + deploys `gpt-5.4-mini` e `text-embedding-3-small`)
- **Google Gemini Embeddings**
- **OpenRouter** (auxiliar do RAG)
- **Google Drive OAuth2** (acesso à pasta de documentos)

Anote a **base URL pública** dos webhooks (ex.: `https://seu-n8n.dominio.com/webhook`).

### 4. Configurar o frontend

Em [`front.html`](front.html), localize as constantes no topo do `<script>` e substitua:

```js
const SUPABASE_URL  = 'https://<seu-projeto>.supabase.co';
const SUPABASE_ANON = '<sua-anon-key>';
const N8N_BASE      = 'https://<seu-n8n>/webhook';
```

Sirva o arquivo via n8n (workflow `SãoRafael-Front.json`) ou qualquer hosting estático (Vercel, Netlify, S3, etc.).

### 5. Indexar a base de conhecimento (RAG)

Coloque os `.md` de `rag_documents/` (ou PDFs/planilhas equivalentes) na pasta do Google Drive configurada, depois dispare:

```bash
curl -X POST https://<seu-n8n>/webhook/saorafael-index-drive
```

Para reset completo do índice:

```bash
curl -X POST https://<seu-n8n>/webhook/saorafael-reset-rag
```

## Variáveis de Configuração

| Variável | Onde fica | Descrição | Obrigatória |
|---|---|---|:-:|
| `SUPABASE_URL` | `front.html` | URL do projeto Supabase | ✅ |
| `SUPABASE_ANON` | `front.html` | Anon key pública | ✅ |
| `N8N_BASE` | `front.html` | Base URL dos webhooks n8n | ✅ |
| Credencial Supabase | n8n (Postgres) | Connection string com service role | ✅ |
| Credencial Azure OpenAI | n8n | Endpoint + API key + nome dos deploys | ✅ |
| Credencial Google Drive | n8n (OAuth2) | Acesso à pasta de docs RAG | ✅ |
| Credencial Google Gemini | n8n | Embeddings na pipeline de RAG | ✅ |
| Credencial OpenRouter | n8n | LLM auxiliar do RAG | ✅ |

## Endpoints (Webhooks n8n)

| Método | Rota | Workflow | Auth | Descrição |
|---|---|---|:-:|---|
| POST | `/saorafael-AgentRag` | AgentRag | Bearer JWT | Agente unificado: validação de wizard (`wizardValidation: true`) ou chat livre. Retorna JSON estruturado. |
| POST | `/saorafael-prune-history` | AgentRag | Bearer JWT | Apaga mensagens a partir de um `messageId` (suporte a editar/regerar). |
| POST | `/saorafael-wizard-submit` | Wizard Submit | Bearer JWT | Persiste o orçamento final. Gera protocolo `SR-YYYYMM-NNNN`. Upsert por `session_id`. |
| GET | `/saorafael-sessions` | Chat-GET-Sessions | Bearer JWT | Lista sessões de chat do usuário (com título inferido). |
| GET | `/saorafael-history?sessionId=` | Chat-GET-History | Bearer JWT | Histórico ordenado de uma sessão. |
| DELETE | `/saorafael-session?sessionId=` | Chat-DELETE-Session | Bearer JWT | Apaga todas as mensagens de uma sessão. |
| POST | `/saorafael-index-drive` | RAG | — | Faz ingestão/reindex incremental do Google Drive no vector store. |
| POST | `/saorafael-reset-rag` | RAG | — | Reseta o índice RAG e reindexa do zero. |
| POST | `/saorafael-DatabaseSetup` | DatabaseSetup | — | Aplica o bundle SQL (`mode: "full" \| "rag_only"`). |
| GET | `/saorafael-chat` | Front | — | Serve o `front.html`. |
| GET | `/saorafael_health` | AgentRag | — | Health-check do agente. |

A autenticação dos endpoints de aplicação usa o **JWT do Supabase** (header `Authorization: Bearer <access_token>`). O n8n repassa o JWT ao Postgres preservando `auth.uid()` para que as RLS funcionem.

## RPCs do Supabase (chamadas direto do frontend)

| RPC | Permissão | Uso |
|---|---|---|
| `saorafael_search_clients(p_query)` | authenticated | Busca fuzzy de clientes (CNPJ, razão, telefone) |
| `saorafael_client_detail(p_client_id)` | authenticated | Detalhes completos de um cliente |
| `saorafael_client_submissions(p_client_id)` | authenticated | Orçamentos anteriores de um cliente |
| `saorafael_upsert_client(...)` | authenticated | Cria ou atualiza cliente |
| `saorafael_delete_client(p_client_id)` | admin | Apaga cliente + orçamentos vinculados |
| `saorafael_delete_submission_smart(p_id)` | admin | Apaga orçamento; se cliente fica órfão, apaga junto |
| `saorafael_list_sessions()` | authenticated | Suporte ao histórico de chat |
| `saorafael_get_history(p_session_id)` | authenticated | Mensagens da sessão |
| `saorafael_delete_session(p_session_id)` | authenticated | Apaga sessão |
| `saorafael_prune_history(p_session_id, p_keep_last)` | authenticated | Limita histórico |
| `saorafael_list_users()` | admin | Painel admin |
| `saorafael_create_user(email, password, full_name, role)` | admin | Cadastrar usuário |
| `saorafael_confirm_user(id)` | admin | Confirmar e-mail manualmente |
| `saorafael_update_user(id, role?, name?)` | admin | Editar metadata |
| `saorafael_delete_user(id)` | admin | Remover usuário |
| `saorafael_update_own_name(name)` | authenticated | Usuário edita o próprio nome |
| `saorafael_is_admin()` | authenticated | Predicado interno usado pelas policies |

## Banco de Dados

Três tabelas principais (todas com prefixo `saorafael_`):

- **`saorafael_clients`** — CRM leve. Fonte de verdade dos dados cadastrais reaproveitáveis.
- **`saorafael_wizard_submission`** — Cada orçamento submetido. Carrega o `form_data` JSONB completo, status do pipeline comercial, protocolo único e FK para cliente.
- **`saorafael_chat_message`** — Histórico do assistente. Particiona conversas por `session_id` e respeita `auth.uid()` por trigger.

E para o RAG:

- **`saorafael_documents`** — Chunks vetoriais (pgvector).
- **`saorafael_document_metadata`** — Metadados por documento.
- **`saorafael_document_rows`** — Linhas estruturadas (planilhas → linhas) para retrieval tabular.

Diagrama ER completo e fluxos detalhados em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Rodando localmente

Não há build. Para desenvolvimento iterativo do frontend:

```bash
# Servir o HTML diretamente
python -m http.server 8080
# ou
npx serve .
```

Aponte `N8N_BASE` para uma instância de n8n (local ou cloud) com os workflows importados.
Para inspecionar o banco, use o painel SQL do Supabase ou `psql` com a connection string do projeto.

## Segurança

- **RLS habilitado** em todas as tabelas de aplicação. Service role é usado apenas pelo n8n.
- **Admin gating** via `raw_user_meta_data->>'company' = 'saorafael'` AND `role = 'admin'`. Veja [`saorafael_is_admin()`](migrations/002_user_crud_functions.sql).
- O **anon key** do Supabase no `front.html` é seguro por design (público), porque toda escrita relevante exige JWT autenticado + RLS.
- **Secrets** ficam exclusivamente nas credenciais do n8n. Nunca commitar.
- O `.gitignore` já bloqueia `.env*`, `*.key`, `*.pem`, planilhas e PDFs.

## Contribuindo

Convenção de branches: `feature/<descrição>`, `fix/<descrição>`, `docs/<descrição>`.
Commits seguem **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

Ao alterar:
- **Migrations** — sempre adicione um novo arquivo numerado, **nunca edite os anteriores**.
- **Workflows n8n** — exporte de volta como JSON (botão *Download*) e substitua o arquivo correspondente. Confira se a chave `active` está `true` antes do commit se a intenção é deixar ativo.
- **Prompts dos agentes** — edite os `.md` em `prompts/`; os workflows os referenciam por conteúdo, então cole o novo texto no node `set` correspondente ao atualizar n8n.
- **Documentos RAG** — atualize `rag_documents/*.md`, publique no Drive e rode `POST /saorafael-index-drive`.

## Roadmap conhecido

Veja [`WIZARD_V2_ARCHITECTURE.md`](./WIZARD_V2_ARCHITECTURE.md) para o plano completo do Wizard V2 (steps condicionais por produto, módulos visuais de dimensões/portas/prateleiras, Reality Check Engine multi-camada e CRM expandido).
