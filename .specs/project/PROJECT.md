# São Rafael — Wizard de Orçamentos & Assistente IA

**Vision:** Plataforma web que guia representantes comerciais na montagem de orçamentos tecnicamente válidos de câmaras frigoríficas e equipamentos de refrigeração, com validação por IA, RAG sobre documentação de engenharia e CRM leve de clientes.
**For:** Representantes comerciais e administradores da São Rafael.
**Solves:** Orçamentos de refrigeração exigem conhecimento técnico denso (dimensionamento, carga térmica, regras comerciais). O sistema reduz erro humano, reaproveita dados de clientes recorrentes e ancora as decisões no manual de engenharia.

## Goals

- Garantir que todo orçamento submetido seja **tecnicamente válido** (validação dupla: IA + Reality Check determinístico → severidade `ok/warn/block`).
- Reduzir retrabalho de cadastro reaproveitando clientes/orçamentos anteriores (CRM + "duplicar como base").
- Responder dúvidas técnicas/comerciais via assistente com RAG sobre o manual de dimensionamento e regras de negócio.
- Operar **sem servidor próprio** — Supabase + n8n + HTML estático.

## Tech Stack

**Core:**
- Orquestração: n8n (workflows JSON, webhooks REST)
- Banco: Supabase (PostgreSQL 15+) com RLS + pgvector
- Frontend: HTML + JS vanilla (`front.html`), Tailwind via CDN

**Key dependencies:** Azure OpenAI (`gpt-5.4-mini`, `text-embedding-3-small`), Google Gemini Embeddings, OpenRouter (auxiliar RAG), Google Drive (fonte RAG), supabase-js.

## Scope

**v1 inclui (estado atual):**
- Wizard de orçamento com validação IA + Reality Check determinístico
- Assistente conversacional com RAG (manual + regras de negócio)
- CRM leve de clientes (busca fuzzy, histórico, vínculo de orçamentos)
- Autenticação Supabase + RLS por papel (usuário/admin)
- Painel admin (CRUD de usuários, gestão de orçamentos)
- Geração de protocolo `SR-YYYYMM-NNNN`
- Ingestão RAG a partir do Google Drive

**Explicitamente fora de escopo (hoje):**
- Backend tradicional / API própria fora do n8n
- Build pipeline ou framework SPA
- Suíte de testes automatizados
- App mobile nativo

## Constraints

- Técnico: ambiente do cliente sem build pipeline → frontend deve permanecer single-file servível estaticamente.
- Técnico: lógica espalhada em 3 camadas (SQL/RPC, JSON/n8n, JS/front) que precisam ficar sincronizadas.
- Segurança: frontend público fala direto com o banco → RLS é obrigatória em toda tabela nova.
- Operacional: secrets vivem só nas credenciais do n8n; `front.html` carrega apenas anon key + URLs públicas.
