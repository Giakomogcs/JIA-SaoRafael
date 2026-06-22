# Tech Stack

**Analyzed:** 2026-06-22

## Core

- Arquitetura: Serverless-orchestrated (sem backend tradicional a compilar)
- Orquestração: n8n (workflows exportados como JSON) — cada webhook é um endpoint REST
- Banco de dados: Supabase (PostgreSQL 15+) com RLS, RPC e `auth.users`
- Extensões Postgres: `pgvector` (vetores RAG), `pg_trgm` (busca fuzzy)
- Linguagem de dados/lógica: SQL (migrations versionadas) + JSON (workflows) + JS vanilla (frontend)

## Frontend

- Entrega: `front.html` — single-page application em HTML + JavaScript vanilla (~20k linhas)
- UI: Tailwind CSS via CDN
- Bibliotecas via CDN: Marked (markdown), Highlight.js (syntax highlight), Lucide (ícones), SheetJS/XLSX (export planilha)
- Cliente Supabase: `supabase-js` (auth + RPC + PostgREST)
- State Management: estado local em JS (sem framework SPA, sem store externa)
- Form Handling: lógica de wizard manual em JS + Reality Check Engine determinístico

## Backend (n8n)

- API Style: REST via webhooks n8n
- Auth: JWT do Supabase repassado pelo n8n ao Postgres (preserva `auth.uid()`)
- Lógica: nodes n8n (Set, Function, HTTP Request, Postgres, LangChain Agent)

## IA / LLM

- IA Wizard: Azure OpenAI `gpt-5.4-mini` (validação determinística por step, stateless)
- IA Chat: Azure OpenAI `gpt-5.4-mini` + LangChain Agent (stateful, memória em `saorafael_chat_message`)
- Embeddings RAG: Azure OpenAI `text-embedding-3-small` e Google Gemini Embeddings
- Vector store: Supabase pgvector (`saorafael_documents`)
- LLM auxiliar (ingestão RAG): OpenRouter (resumo/normalização durante ingestão)

## Testing

- Unit: nenhum framework configurado
- Integration: nenhum
- E2E: nenhum
- Validação atual: manual (n8n execution logs + SQL no painel Supabase)

## External Services

- LLM: Azure OpenAI (chat + embeddings)
- Embeddings: Google Gemini
- LLM auxiliar: OpenRouter
- Documentos RAG: Google Drive (OAuth2)
- Geo/Endereço: API IBGE (cidades/UF), ViaCEP (endereço por CEP)

## Development Tools

- Versionamento: Git (Conventional Commits)
- Build: nenhum (zero build pipeline — tudo declarativo)
- Hosting frontend: n8n (`SãoRafael-Front.json`) ou qualquer hosting estático (Vercel/Netlify/S3)
