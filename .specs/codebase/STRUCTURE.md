# Project Structure

**Root:** `SaoRafael/`

## Directory Tree

```
SaoRafael/
├── front.html                    # App completa (wizard + chat + admin + CRM) ~20k linhas
├── front_v2_backup.html          # Backup intermediário do Wizard V2 (~1.8k linhas)
├── front_backup_chat.html        # Backup da UI anterior centrada em chat (~3k linhas)
├── README.md                     # Setup e uso do dia-a-dia
├── ARCHITECTURE.md               # Arquitetura técnica (diagramas C4, fluxos, ADRs)
├── WIZARD_V2_ARCHITECTURE.md     # Spec de design do Wizard V2 (roadmap futuro)
│
├── migrations/                   # SQL versionado — rodar em ordem no Supabase
│   ├── 000_ownership_guard.sql
│   ├── 001_base_tables.sql       # Tabelas chat + submission + view de sessões
│   ├── 002_user_crud_functions.sql # RPCs admin + saorafael_is_admin()
│   ├── 003_rls_policies.sql      # Policies RLS por user/admin/service_role
│   ├── 004_auto_user_id_trigger.sql # Trigger BEFORE INSERT preenche user_id
│   ├── 005_session_management.sql # RPCs list/get/delete/prune sessões
│   ├── 006_seed_admin.sql        # Bootstrap do primeiro admin
│   ├── 007_self_update_name.sql  # RPC usuário atualiza próprio nome
│   ├── 009_fix_delete_policy.sql # Hotfix: policy delete admin (008 ausente)
│   ├── 010_fix_chat_message_user_id.sql # Hotfix: user_id em chat + RPCs
│   ├── 011_clients_table_seed.sql # Tabela clients + FK + RPCs busca + backfill
│   └── 012_clients_rls_policies.sql # RLS para clients
│
├── prompts/                      # System prompts dos agentes IA (canônicos)
│   ├── system_prompt_chat_assistant.md
│   └── system_prompt_wizard_validation.md
│
├── rag_documents/                # Base de conhecimento para o RAG
│   ├── 01_manual_dimensionamento.md   # Engenharia: painéis, carga térmica, defrost
│   ├── 02_regras_negocio_planilha.md  # Contrato com a planilha + regras comerciais
│   └── 03_guia_interpretacao_casos.md # Heurísticas por setor (cárneo, lácteo, etc.)
│
└── workflows/                    # Workflows n8n (cada um expõe endpoints)
    ├── São Rafael - AgentRag (Wizard + Chat).json     # Endpoint IA principal
    ├── São Rafael - Wizard Submit (Save Orçamento).json # POST /saorafael-wizard-submit
    ├── SãoRafael-Chat-DELETE-Session.json
    ├── SãoRafael-Chat-GET-History.json
    ├── SãoRafael-Chat-GET-Sessions.json
    ├── SãoRafael-DatabaseSetup.json                   # Migração automatizada + reset RAG
    ├── SãoRafael-Front.json                            # Serve o front.html
    └── SãoRafael-RAG.json                              # Ingestão e reindex de documentos
```

## Module Organization

### Frontend (`front.html`)
**Purpose:** Toda a interface (wizard, chat, admin, CRM) num único arquivo HTML.
**Location:** raiz do repo.
**Áreas internas:** Login overlay · Header/Sidebar · Wizard (step indicator, painéis condicionais, validation tracker, Reality Check Engine) · Chat (sessões, histórico, input/prune/edit) · Admin (users CRUD, submissions) · CRM (busca de cliente, modal de histórico).
**Config:** constantes no topo do `<script>`: `SUPABASE_URL`, `SUPABASE_ANON`, `N8N_BASE`.

### Banco de dados (`migrations/`)
**Purpose:** Schema, RPCs, triggers e policies RLS versionados.
**Convenção:** arquivos numerados sequenciais; nunca editar os anteriores — sempre adicionar novo. Cada arquivo costuma ter seção `-- UP`.

### Orquestração (`workflows/`)
**Purpose:** Lógica de backend — IA, RAG, protocolo, setup de banco.
**Edição:** exportar de volta como JSON do n8n e substituir o arquivo.

### Prompts (`prompts/`)
**Purpose:** Fonte de verdade dos system prompts. Precisam ser propagados manualmente para os nodes `set` do n8n.

### Conhecimento RAG (`rag_documents/`)
**Purpose:** Documentos `.md` indexados no vector store via Google Drive + `POST /saorafael-index-drive`.

## Where Things Live

**Wizard de orçamento:**
- UI: `front.html` (seção Wizard)
- Validação IA: workflow `São Rafael - AgentRag` (flag `wizardValidation: true`)
- Validação determinística: Reality Check Engine em JS dentro de `front.html`
- Persistência: workflow `Wizard Submit` → `saorafael_wizard_submission`

**Chat assistente:**
- UI: `front.html` (seção Chat)
- Lógica IA/RAG: workflow `AgentRag` (LangChain Agent + pgvector)
- Histórico: tabela `saorafael_chat_message` + workflows Chat-GET/DELETE

**CRM de clientes:**
- UI: `front.html` (busca + modal)
- Dados: tabela `saorafael_clients` + RPCs `saorafael_*_client*`

**Autenticação / autorização:**
- Frontend: `supabase-js` (`signInWithPassword`)
- Banco: RLS policies (`migrations/003`, `012`) + `saorafael_is_admin()`

## Special Directories

**`migrations/`** — SQL imutável e ordenado. Migration `008` ausente (pulo numérico documentado).
**`workflows/`** — JSON exportado do n8n; diffs ruins de revisar por natureza.
