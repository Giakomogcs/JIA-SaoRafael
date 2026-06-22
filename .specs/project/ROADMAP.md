# Roadmap

**Current Milestone:** Wizard V2
**Status:** In Progress

---

## M0 — Base atual (entregue)

**Goal:** Plataforma funcional de orçamentos + chat + CRM rodando em produção.

### Features

**Wizard de orçamento (V1)** - COMPLETE
- Steps fixos de coleta de dados
- Validação IA por step (`AgentRag`, `wizardValidation`)
- Reality Check Engine determinístico (fit score + severidade)
- Submit com protocolo `SR-YYYYMM-NNNN`

**Assistente IA com RAG** - COMPLETE
- Chat stateful com histórico em `saorafael_chat_message`
- RAG sobre `saorafael_documents` (pgvector)
- Ingestão a partir do Google Drive

**CRM leve de clientes** - COMPLETE
- Tabela `saorafael_clients` + busca fuzzy (`pg_trgm`)
- Vínculo de orçamentos a clientes (`client_id`)

**Auth & Admin** - COMPLETE
- Supabase Auth + RLS por papel
- Painel admin (CRUD usuários, gestão de orçamentos)

---

## M1 — Wizard V2 (em andamento)

**Goal:** Wizard condicional por tipo de produto, visualmente interativo, com CRM expandido.
**Target:** ver `WIZARD_V2_ARCHITECTURE.md`.

### Features

**Step inicial de identificação do cliente** - PLANNED
- Busca/cadastro de cliente como primeiro step
- Histórico de orçamentos + "duplicar como base"

**Steps condicionais por tipo de produto** - PLANNED
- Câmara, Walk-In Cooler/Freezer, Túnel, Sala Climatizada, Antecâmara, Modular
- Steps dinâmicos por `product_type`

**Módulos visuais interativos** - PLANNED
- Dimensões (SVG planta + corte, cálculo de internas)
- Portas (posicionamento por clique na parede)
- Prateleiras/estantes (vista lateral)

**Reality Check Engine multi-camada** - PLANNED
- Severidade `ok/warn/block` + fit score 0–100 refinados

**Contrato de IA padronizado (JSON estrito)** - PLANNED

**Migração de dados preservando submissions** - PLANNED

**Export (PDF do orçamento + XLSX técnico)** - PLANNED

---

## Future Considerations

- Suíte de testes automatizados (prioridade: Reality Check Engine + RLS) — ver CONCERNS.md
- Modularização do `front.html` (sair do monólito ~20k linhas)
- Sync automático prompts `.md` ↔ n8n
- Proteção dos endpoints de infra (index-drive, reset-rag, DatabaseSetup)
- Backfill de `user_id` em mensagens de chat legadas + restaurar isolamento estrito
