# Architecture

**Pattern:** Serverless-orchestrated — sem backend tradicional. Frontend estático fala direto com Supabase (CRUD/auth via RLS) e com webhooks n8n (IA, protocolo, ingestão RAG).

> Documento de referência completo (diagramas C4, sequência, ER): [`ARCHITECTURE.md`](../../ARCHITECTURE.md) na raiz. Este arquivo é o resumo operacional para planejamento de features.

## High-Level Structure

```
Usuário (Rep/Admin)
        │ HTTPS
        ▼
   front.html ──JWT + RPC/table──▶ Supabase (PostgreSQL + RLS + pgvector)
        │                                   ▲
        │ JWT + Webhook                     │ SQL / pgvector
        ▼                                   │
       n8n ─────────────────────────────────┘
        │ REST / OAuth2
        ▼
  Azure OpenAI · Gemini · OpenRouter · Google Drive · IBGE · ViaCEP
```

Três camadas de lógica que precisam ficar em sintonia:
- **SQL (RPCs/policies)** no Supabase — estado e autorização
- **JSON (workflows)** no n8n — orquestração de IA, RAG, protocolo
- **JS (front.html)** — UI, wizard e Reality Check determinístico

## Identified Patterns

### Webhook-as-endpoint
**Location:** `workflows/*.json`
**Purpose:** Cada workflow n8n expõe um ou mais webhooks REST que são a "API" do sistema.
**Implementation:** Trigger Webhook → nodes → resposta JSON.
**Example:** `POST /saorafael-AgentRag`, `POST /saorafael-wizard-submit`.

### Dual-agent compartilhando infra
**Location:** `workflows/São Rafael - AgentRag (Wizard + Chat).json`
**Purpose:** Um único workflow serve dois agentes (validação de wizard vs. chat livre).
**Implementation:** Flag `wizardValidation: true|false` no payload decide o ramo.
**Example:** Wizard Agent (stateless, JSON estruturado) vs. Chat Agent (stateful, Markdown).

### Validação dupla (IA + determinística)
**Location:** IA no workflow `AgentRag`; Reality Check Engine em JS no `front.html`.
**Purpose:** IA sugere/contextualiza; regras JS têm a palavra final em bloqueios.
**Implementation:** IA retorna `{output, suggestions[], complexity}`; Reality Check calcula fit score 0–100 e severidade `ok|warn|block`.

### RLS-first security
**Location:** `migrations/003_rls_policies.sql`, `012_clients_rls_policies.sql`, `002` (`saorafael_is_admin()`).
**Purpose:** Frontend público pode falar direto com o banco sem expor dados.
**Implementation:** Toda tabela com RLS; admin gating via `raw_user_meta_data`; service_role só no n8n.

### RAG sobre pgvector
**Location:** `workflows/SãoRafael-RAG.json` + tabela `saorafael_documents`.
**Purpose:** Respostas do chat e validação ancoradas no manual de engenharia/regras de negócio.
**Implementation:** Google Drive → extração → chunks → embeddings (Gemini) → pgvector. Retrieval por similaridade no agente.

## Data Flow

### Submeter orçamento
`front.html` → (valida steps com `AgentRag` + Reality Check JS) → `POST /saorafael-wizard-submit` → n8n gera protocolo `SR-YYYYMM-NNNN` → UPSERT `saorafael_wizard_submission` (por `session_id`) → retorna `{protocol, status}`.

### Chat com RAG
`front.html` insere msg em `saorafael_chat_message` (trigger preenche `user_id`) → `POST /saorafael-AgentRag` → LangChain Agent faz `similarity_search` no pgvector + consulta `saorafael_wizard_submission` → Azure OpenAI gera resposta → n8n grava msg da IA → render Markdown no front.

### Ingestão RAG
`POST /saorafael-index-drive` (ou schedule) → lista Drive → download → extrai (pdf/xlsx/csv/md) → upsert `saorafael_document_metadata` (+ `saorafael_document_rows` p/ planilhas) → embeddings → insert `saorafael_documents`.

### Auth + RLS
`signInWithPassword()` → JWT com `raw_user_meta_data` (`company`, `role`) → toda chamada (PostgREST direto ou via n8n) carrega `Authorization: Bearer` → RLS avalia `auth.uid()` e `saorafael_is_admin()`.

## Code Organization

**Approach:** Por camada de execução, não por feature: HTML (front), JSON (n8n), SQL (migrations), MD (prompts/RAG).

**Module boundaries:**
- Frontend é um monólito único (`front.html`) — ADR-001.
- Backend é um conjunto de workflows independentes — ADR-002.
- Estado e autorização vivem 100% no Postgres/Supabase — ADR-003.

## Decisões de Arquitetura (ADRs — resumo)

- **ADR-001:** Frontend monolítico em HTML único (deploy = copiar 1 arquivo; custo: difícil escalar dev, ~20k linhas).
- **ADR-002:** n8n como backend orquestrado (sem código a deployar; custo: diffs JSON ruins).
- **ADR-003:** RLS como camada primária de segurança (defesa em profundidade; custo: cada tabela exige migration de policy).
- **ADR-004:** Prompts versionados em `.md`, colados manualmente no n8n (diff legível; custo: sem sync automático).
- **ADR-005:** Validação dupla IA + determinística (submits sempre válidos; custo: manter duas camadas sincronizadas com o manual).

Detalhes completos em [`ARCHITECTURE.md`](../../ARCHITECTURE.md).
