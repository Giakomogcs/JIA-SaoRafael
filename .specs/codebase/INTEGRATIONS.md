# External Integrations

## LLM / IA

### Azure OpenAI

**Purpose:** Chat assistente e validação de wizard (`gpt-5.4-mini`); embeddings (`text-embedding-3-small`).
**Location:** workflow `São Rafael - AgentRag (Wizard + Chat).json` (nodes LangChain/LLM).
**Configuration:** credencial n8n (endpoint + API key + nomes dos deploys).
**Authentication:** API key (credencial n8n).

### Google Gemini Embeddings

**Purpose:** Geração de embeddings na pipeline de ingestão RAG.
**Location:** workflow `SãoRafael-RAG.json`.
**Configuration:** credencial n8n.
**Authentication:** API key (credencial n8n).

### OpenRouter

**Purpose:** LLM auxiliar para resumo/normalização de conteúdo durante a ingestão RAG.
**Location:** workflow `SãoRafael-RAG.json`.
**Authentication:** API key (credencial n8n).

## Dados / Storage

### Supabase (PostgreSQL + pgvector)

**Purpose:** Auth, clients, orçamentos, histórico de chat e vector store RAG.
**Location:** acessado por `front.html` (supabase-js/PostgREST) e por n8n (Postgres TCP, service role).
**Configuration:** `SUPABASE_URL` + `SUPABASE_ANON` no front; service role como credencial n8n.
**Authentication:** JWT (frontend, preserva `auth.uid()` para RLS) e service role key (n8n, bypass RLS).

### Google Drive

**Purpose:** Repositório dos documentos a indexar no RAG.
**Location:** workflow `SãoRafael-RAG.json`.
**Configuration:** pasta dedicada do Drive.
**Authentication:** OAuth2 (credencial n8n).

## API Integrations

### IBGE

**Purpose:** Listagem de cidades / UF para os campos de localização do wizard/CRM.
**Location:** `front.html` (chamadas diretas do navegador).
**Authentication:** pública, sem auth.

### ViaCEP

**Purpose:** Lookup de endereço por CEP no cadastro de cliente.
**Location:** `front.html`.
**Authentication:** pública, sem auth.

## Webhooks (endpoints expostos pelo próprio sistema)

Todos servidos por n8n sob a base `N8N_BASE` (ex.: `https://<n8n>/webhook`):

| Método | Rota                            | Workflow            | Auth       |
| ------ | ------------------------------- | ------------------- | ---------- |
| POST   | `/saorafael-AgentRag`           | AgentRag            | Bearer JWT |
| POST   | `/saorafael-prune-history`      | AgentRag            | Bearer JWT |
| POST   | `/saorafael-wizard-submit`      | Wizard Submit       | Bearer JWT |
| GET    | `/saorafael-sessions`           | Chat-GET-Sessions   | Bearer JWT |
| GET    | `/saorafael-history?sessionId=` | Chat-GET-History    | Bearer JWT |
| DELETE | `/saorafael-session?sessionId=` | Chat-DELETE-Session | Bearer JWT |
| POST   | `/saorafael-index-drive`        | RAG                 | —          |
| POST   | `/saorafael-reset-rag`          | RAG                 | —          |
| POST   | `/saorafael-DatabaseSetup`      | DatabaseSetup       | —          |
| GET    | `/saorafael-chat`               | Front               | —          |
| GET    | `/saorafael_health`             | AgentRag            | —          |

## Background Jobs

**Queue system:** nenhum dedicado. Ingestão RAG pode rodar por schedule do n8n ou disparo manual via webhook.
**Location:** `SãoRafael-RAG.json` (usa `splitInBatches` para ingestão paralela).
**Jobs:** indexação/reindex incremental do Drive; reset completo do índice RAG.
