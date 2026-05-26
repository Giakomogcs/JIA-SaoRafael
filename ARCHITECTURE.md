# Arquitetura — São Rafael

> Setup e uso do dia-a-dia: [`README.md`](./README.md)
> Spec do redesenho em andamento: [`WIZARD_V2_ARCHITECTURE.md`](./WIZARD_V2_ARCHITECTURE.md)

## Visão Geral

São Rafael é um sistema **serverless-orchestrated**: não há backend tradicional. O frontend (HTML estático) fala diretamente com o **Supabase** para operações CRUD/autenticação protegidas por RLS, e fala com **webhooks n8n** quando precisa de IA, cálculo determinístico de protocolo ou ingestão de documentos. O n8n hospeda a *lógica orquestral* (validação por IA, ingestão RAG, geração de protocolos, setup de banco), enquanto o **Supabase** hospeda *estado* (usuários, clientes, orçamentos, histórico de chat, vetores RAG).

Esse desenho tem três trade-offs principais:

- **+** Zero servidor próprio: deploy e operação se resumem a Supabase + n8n + um HTML hospedado.
- **+** Segurança forte por RLS: o frontend pode falar direto com o banco sem expor risco, pois cada tabela tem policies por papel.
- **−** A "lógica de negócio" se espalha entre SQL (RPCs), JSON (workflows n8n) e JS (frontend). É preciso disciplina para manter as três camadas em sintonia (especialmente prompts vs. RAG vs. validação).

## Diagrama de Contexto (C4 — Nível 1)

```mermaid
C4Context
  title São Rafael — Contexto

  Person(rep, "Representante Comercial", "Monta orçamentos e consulta o assistente")
  Person(admin, "Administrador", "Gerencia usuários, orçamentos e clientes")

  System(saorafael, "São Rafael", "Wizard de orçamentos + Assistente IA + CRM leve")

  System_Ext(azure, "Azure OpenAI", "gpt-5.4-mini + text-embedding-3-small")
  System_Ext(gemini, "Google Gemini", "Embeddings para RAG")
  System_Ext(openrouter, "OpenRouter", "LLM auxiliar na ingestão RAG")
  System_Ext(gdrive, "Google Drive", "Repositório de documentos para o RAG")
  System_Ext(ibge, "API IBGE", "Listagem de cidades / UF")
  System_Ext(viacep, "ViaCEP", "Lookup de endereço por CEP")

  Rel(rep, saorafael, "Usa via", "HTTPS / Navegador")
  Rel(admin, saorafael, "Administra via", "HTTPS / Navegador")
  Rel(saorafael, azure, "Chama LLM e embeddings", "REST")
  Rel(saorafael, gemini, "Embeddings (ingest)", "REST")
  Rel(saorafael, openrouter, "Resumo na ingest", "REST")
  Rel(saorafael, gdrive, "Lê documentos", "OAuth2")
  Rel(saorafael, ibge, "Consulta cidades", "REST")
  Rel(saorafael, viacep, "Consulta CEP", "REST")
```

## Diagrama de Containers (C4 — Nível 2)

```mermaid
C4Container
  title Containers — São Rafael

  Person(user, "Usuário (Rep/Admin)")

  Container_Boundary(sistema, "São Rafael") {
    Container(front, "front.html", "HTML + JS vanilla, Supabase JS, Tailwind", "Wizard, chat, painel admin, CRM")
    Container(n8n, "n8n", "Workflows JSON", "Orquestra IA, RAG, protocolo, ingest")
    ContainerDb(pg, "PostgreSQL", "Supabase + pgvector", "Auth, clients, orçamentos, chat, RAG")
  }

  System_Ext(azure, "Azure OpenAI")
  System_Ext(gemini, "Gemini Embeddings")
  System_Ext(gdrive, "Google Drive")

  Rel(user, front, "Acessa", "HTTPS")
  Rel(front, pg, "Auth + RPC + tables", "supabase-js / PostgREST")
  Rel(front, n8n, "Webhooks", "POST/GET/DELETE JSON")
  Rel(n8n, pg, "SQL + pgvector", "Postgres TCP")
  Rel(n8n, azure, "Chat + Embeddings", "REST")
  Rel(n8n, gemini, "Embeddings (RAG)", "REST")
  Rel(n8n, gdrive, "Ingestão", "OAuth2")
```

## Comunicação entre Componentes

```mermaid
flowchart LR
  USR(["Usuário"])
  FE["front.html<br/>(HTML + JS vanilla)"]
  N8N["n8n<br/>(workflows)"]
  SB[("Supabase<br/>PostgreSQL + RLS")]
  PGV[("pgvector<br/>saorafael_documents")]
  AZ["Azure OpenAI<br/>gpt-5.4-mini"]
  GD["Google Drive"]
  GEM["Gemini Embeddings"]

  USR -->|HTTPS| FE
  FE -->|JWT + RPC/table| SB
  FE -->|JWT + Webhook| N8N
  N8N -->|SQL| SB
  N8N -->|pgvector query| PGV
  N8N -->|chat + embed| AZ
  N8N -->|OAuth2| GD
  N8N -->|embed| GEM
  SB --- PGV
```

## Estrutura Interna do Frontend (`front.html`)

```mermaid
graph TD
  subgraph "front.html (~20k linhas)"
    L["Login overlay<br/>(supabase.auth)"]
    HDR["Header + Sidebar<br/>colapsável"]
    subgraph "Wizard"
      ST["Step indicator"]
      SP["Step panels<br/>(condicionais por produto)"]
      VT["Validation tracker"]
      RC["Reality Check Engine<br/>(JS determinístico)"]
    end
    subgraph "Chat"
      CL["Sessions list"]
      CH["History view"]
      CI["Input + prune/edit"]
    end
    subgraph "Admin"
      UM["Users CRUD"]
      SM["Submissions mgmt"]
    end
    subgraph "CRM"
      CS["Client search<br/>(autocomplete)"]
      CHM["Client history modal"]
    end
  end

  L --> HDR
  HDR --> ST
  ST --> SP
  SP --> VT
  SP --> RC
  HDR --> CL --> CH --> CI
  HDR --> UM
  HDR --> SM
  SP --> CS --> CHM
```

## Fluxo: Submeter um Orçamento

```mermaid
sequenceDiagram
  actor U as Representante
  participant FE as front.html
  participant SB as Supabase (RLS)
  participant N as n8n / AgentRag
  participant AZ as Azure OpenAI
  participant W as n8n / Wizard Submit

  U->>FE: Inicia wizard
  FE->>SB: saorafael_search_clients(query)
  SB-->>FE: Cliente existente (ou null)
  U->>FE: Preenche step N
  FE->>N: POST /saorafael-AgentRag (wizardValidation=true)
  N->>AZ: gpt-5.4-mini + RAG context
  AZ-->>N: JSON estruturado<br/>{output, suggestions, complexity}
  N-->>FE: Validação + sugestões
  FE->>FE: Reality Check determinístico (JS)
  U->>FE: Confirma todos os steps
  FE->>W: POST /saorafael-wizard-submit
  W->>SB: Gera protocolo SR-YYYYMM-NNNN
  W->>SB: UPSERT saorafael_wizard_submission
  W-->>FE: { protocol, status: "submitted" }
  FE-->>U: Confirmação + protocolo
```

## Fluxo: Chat com Assistente (com RAG)

```mermaid
sequenceDiagram
  actor U as Usuário
  participant FE as front.html
  participant N as n8n / AgentRag
  participant LC as LangChain Agent
  participant VS as pgvector<br/>saorafael_documents
  participant SB as Supabase
  participant AZ as Azure OpenAI

  U->>FE: Envia mensagem
  FE->>SB: insert saorafael_chat_message<br/>(trigger preenche user_id)
  FE->>N: POST /saorafael-AgentRag<br/>{ sessionId, message }
  N->>LC: Chat Agent (system prompt + tools)
  LC->>VS: similarity_search(query)
  VS-->>LC: chunks relevantes
  LC->>SB: tool: saorafael_wizard_submission<br/>(consulta orçamentos do user)
  SB-->>LC: rows
  LC->>AZ: gpt-5.4-mini (final answer)
  AZ-->>LC: resposta
  LC-->>N: resposta + tool traces
  N->>SB: insert AI message<br/>(saorafael_chat_message)
  N-->>FE: stream/JSON
  FE-->>U: render Markdown + highlight
```

## Fluxo: Ingestão RAG

```mermaid
sequenceDiagram
  participant T as Trigger<br/>(POST /saorafael-index-drive ou Schedule)
  participant N as n8n / RAG
  participant GD as Google Drive
  participant EX as Extractors<br/>(pdf/xlsx/csv/md)
  participant GEM as Gemini Embeddings
  participant SB as Supabase
  participant VS as pgvector

  T->>N: dispara workflow
  N->>GD: lista arquivos da pasta
  GD-->>N: file metadata
  loop por arquivo
    N->>GD: download
    N->>EX: extract content
    EX-->>N: chunks + metadata
    N->>SB: upsert saorafael_document_metadata
    opt planilhas
      N->>SB: upsert saorafael_document_rows (linhas estruturadas)
    end
    N->>GEM: embeddings(chunks)
    GEM-->>N: vectors
    N->>VS: insert saorafael_documents (chunk + vector)
  end
  N-->>T: status + counters
```

## Diagrama de Entidades

```mermaid
erDiagram
  AUTH_USERS ||--o{ SAORAFAEL_CHAT_MESSAGE        : "escreve"
  AUTH_USERS ||--o{ SAORAFAEL_WIZARD_SUBMISSION   : "submete"
  AUTH_USERS ||--o{ SAORAFAEL_CLIENTS             : "cadastra"
  SAORAFAEL_CLIENTS ||--o{ SAORAFAEL_WIZARD_SUBMISSION : "tem orçamentos"
  SAORAFAEL_DOCUMENT_METADATA ||--o{ SAORAFAEL_DOCUMENTS      : "1:N chunks"
  SAORAFAEL_DOCUMENT_METADATA ||--o{ SAORAFAEL_DOCUMENT_ROWS  : "1:N linhas"

  AUTH_USERS {
    uuid id PK
    text email
    jsonb raw_user_meta_data
  }

  SAORAFAEL_CLIENTS {
    uuid   id PK
    text   razao_social
    text   cnpj_cpf
    text   telefone
    text   email
    text   cidade
    text   estado
    text   cep
    text   endereco
    text   contato_nome
    uuid   created_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  SAORAFAEL_WIZARD_SUBMISSION {
    bigserial   id PK
    text        session_id UK
    uuid        user_id FK
    uuid        client_id FK
    jsonb       form_data
    text        status
    text        protocol
    timestamptz submitted_at
    timestamptz processed_at
    text        notes
  }

  SAORAFAEL_CHAT_MESSAGE {
    bigserial   id PK
    text        session_id
    uuid        user_id FK
    jsonb       message
    timestamptz created_at
  }

  SAORAFAEL_DOCUMENTS {
    bigserial id PK
    text      content
    vector    embedding
    jsonb     metadata
  }

  SAORAFAEL_DOCUMENT_METADATA {
    text title PK
    text source
    text url
    timestamptz updated_at
  }

  SAORAFAEL_DOCUMENT_ROWS {
    bigserial id PK
    text      dataset_id FK
    jsonb     row_data
  }
```

## Fluxo de Autenticação e RLS

```mermaid
sequenceDiagram
  actor U as Usuário
  participant FE as front.html
  participant SA as Supabase Auth
  participant PG as PostgREST + RLS
  participant N as n8n

  U->>FE: email + senha
  FE->>SA: signInWithPassword()
  SA-->>FE: { access_token, refresh_token, user.metadata }
  Note right of FE: company === 'saorafael'<br/>role ∈ {admin, usuario}

  U->>FE: ação CRUD (ex.: listar clientes)
  FE->>PG: GET /rest/v1/rpc/saorafael_search_clients<br/>Authorization: Bearer
  PG->>PG: RLS checa auth.uid()<br/>e saorafael_is_admin()
  PG-->>FE: rows permitidos

  U->>FE: ação IA / submit
  FE->>N: POST /webhook/...<br/>Authorization: Bearer
  N->>PG: query com mesmo JWT<br/>(preserva auth.uid())
  PG-->>N: rows permitidos
  N-->>FE: resposta
```

### Modelo de papéis

| Papel | `raw_user_meta_data` | Permissões |
|---|---|---|
| **anon** | — | Login apenas |
| **usuário comum** | `{ company: "saorafael", role: "usuario" }` | CRUD próprio (chat, submissions), leitura de clientes, edição do próprio nome |
| **admin** | `{ company: "saorafael", role: "admin" }` | Tudo acima + CRUD de usuários, leitura de todos os orçamentos, delete de clientes/orçamentos |
| **service_role** | (chave do projeto) | Bypass total — usado **apenas** pelo n8n |

A função `saorafael_is_admin()` é o predicado canônico — todas as policies admin a chamam.

## Agentes IA

Dois agentes vivem no workflow [`São Rafael - AgentRag (Wizard + Chat).json`](./workflows/) e compartilham a mesma infra (Azure OpenAI + Supabase pgvector + ferramentas Postgres):

| Agente | System prompt | Modelo | Stateful? | Saída |
|---|---|---|---|---|
| **Wizard Validation Agent** | [`prompts/system_prompt_wizard_validation.md`](./prompts/system_prompt_wizard_validation.md) | `gpt-5.4-mini` | Não (stateless por step) | JSON estruturado `{output, suggestions[], complexity}` |
| **Chat Assistant Agent** | [`prompts/system_prompt_chat_assistant.md`](./prompts/system_prompt_chat_assistant.md) | `gpt-5.4-mini` | Sim (memória em `saorafael_chat_message`) | Markdown pt-BR |

Ambos têm acesso a:
- **Vector store tool** sobre `saorafael_documents` (RAG)
- **Postgres tool** sobre `saorafael_wizard_submission` (consulta de orçamentos do usuário)
- **Postgres tool** sobre `saorafael_document_metadata` (catálogo de fontes RAG)

A separação acontece via flag `wizardValidation: true|false` na payload do webhook `/saorafael-AgentRag`.

## Reality Check Engine

Independente da IA, o frontend executa um motor de validação **determinístico em JavaScript** sobre o `formData` ao final de cada step. Ele aplica:

- Regras dimensionais (módulos múltiplos de 56cm, altura mínima/máxima por temperatura)
- Combinações proibidas (ex.: piso isolado + temperatura positiva, painel 50mm + congelamento profundo)
- Coerência comercial (descontos > X% exigem aprovação, frete CIF/FOB vs. UF do cliente)
- Cálculo de **fit score** (0–100) e severidade (`ok | warn | block`)

Resultado `block` impede o submit; `warn` pede confirmação. A spec completa está em [`WIZARD_V2_ARCHITECTURE.md`](./WIZARD_V2_ARCHITECTURE.md), seção *Reality Check Engine*.

## Decisões de Arquitetura

### ADR-001: Frontend monolítico em HTML único
- **Status:** Aceito
- **Contexto:** Equipe pequena, deploys frequentes, ambiente do cliente sem build pipeline.
- **Decisão:** Manter `front.html` como artefato único, sem bundler. Dependências via CDN.
- **Consequências:** + Deploy é copiar 1 arquivo. − Difícil escalar para múltiplos devs no mesmo arquivo; pré-V2 está atingindo limite de manutenção (~20k linhas). O Wizard V2 planeja modularizar em scripts separados.

### ADR-002: n8n como backend orquestrado
- **Status:** Aceito
- **Contexto:** Necessidade de integrar Azure OpenAI, Google Drive, Postgres, embeddings, sem manter um serviço HTTP próprio.
- **Decisão:** Cada endpoint é um workflow n8n. Lógica versionada como JSON.
- **Consequências:** + Sem código a deployar. + Observabilidade visual no n8n. − Diffs JSON são ruins de revisar; lógica complexa fica ilegível.

### ADR-003: RLS como camada primária de segurança
- **Status:** Aceito
- **Contexto:** Frontend público chama Supabase diretamente.
- **Decisão:** Toda tabela liga RLS; admin gating em `raw_user_meta_data`. Service role só no n8n.
- **Consequências:** + Defesa em profundidade real (vazar anon key não vaza dados). − Toda nova tabela exige migration de policies; já tivemos hotfixes ([`009`](migrations/009_fix_delete_policy.sql), [`010`](migrations/010_fix_chat_message_user_id.sql)).

### ADR-004: Prompts versionados em `.md`, não em JSON
- **Status:** Aceito
- **Contexto:** Iterar em prompt longo dentro do editor do n8n é doloroso.
- **Decisão:** Prompts canônicos vivem em `prompts/*.md`. O JSON do workflow recebe o conteúdo colado no node `set` correspondente.
- **Consequências:** + Diff legível, revisão em PR. − Precisa lembrar de propagar mudanças para o n8n (não há sync automático).

### ADR-005: Validação dupla (IA + determinística)
- **Status:** Aceito
- **Contexto:** Confiar só na IA gera variabilidade; só em regras hard-coded engessa.
- **Decisão:** Camada IA sugere e contextualiza; Reality Check (JS) tem a palavra final em bloqueios.
- **Consequências:** + Submits sempre tecnicamente válidos. − Custo cognitivo de manter as duas camadas em sintonia com o manual de engenharia.

## Segurança

- **Autenticação:** Supabase Auth (email + password). JWTs assinados pela chave do projeto. Refresh token automático pelo `supabase-js`.
- **Autorização:** RLS por tabela. Admin gate via `saorafael_is_admin()` lendo `raw_user_meta_data`. Frontend nunca toma a decisão sozinho — ele só esconde botões; o banco realmente bloqueia.
- **Dados sensíveis:** Não há cartão, CPF/CNPJ não é tratado como crítico mas está atrás de RLS. Telefones e e-mails de clientes só leitura para `authenticated`.
- **Comunicação interna:** n8n ↔ Supabase via TLS + service role key (armazenada como credencial). Frontend ↔ n8n via HTTPS + JWT do usuário (n8n repassa).
- **Segredos:** Apenas credenciais n8n. `front.html` carrega só anon key + URLs públicas. `.gitignore` veda `.env*` e chaves.

## Performance e Observabilidade

- **Cache:** Não há cache aplicacional. Supabase faz pooling no PostgREST.
- **Paginação:** Wizard tem volume baixo (centenas de orçamentos/mês). Listagens admin usam `limit/offset` na RPC.
- **RAG:** Embeddings reusados durante a sessão; `splitInBatches` no n8n para ingestão paralela. `pg_trgm` em `razao_social` para busca textual rápida (`011_clients_table_seed.sql`).
- **Observabilidade:** Cada execução de workflow fica auditável no painel n8n (status, logs, payloads). Supabase tem logs de query e Auth. Não há tracing distribuído.

## Riscos conhecidos e hotfixes históricos

- [`migrations/009_fix_delete_policy.sql`](migrations/009_fix_delete_policy.sql) — primeira versão das policies esqueceu o `DELETE` para admin em `saorafael_wizard_submission`. Hotfix dedicado.
- [`migrations/010_fix_chat_message_user_id.sql`](migrations/010_fix_chat_message_user_id.sql) — mensagens antigas tinham `user_id NULL`; a coluna foi reafirmada como nullable, o trigger reescrito, e os RPCs `saorafael_list_sessions/get_history/delete_session` foram recriados sem filtro estrito por `auth.uid()` para não esconder histórico legítimo. **Atenção:** isso reduz o isolamento por usuário no chat — revisitar quando houver tempo.
- Workflow [`SãoRafael-DatabaseSetup.json`](workflows/SãoRafael-DatabaseSetup.json) tem **SQL embutido com typos** em alguns nomes de tabela (`saorefael_*` em vez de `saorafael_*`). Não é usado no caminho feliz porque o setup recomendado é via migrations versionadas — mas se for executado em "modo full", validar antes.
- Migration `008` está ausente da pasta (pulo numérico). Histórico Git pode ter contexto; documentar quando recuperar.

## Roadmap Técnico

Resumo do que o [`WIZARD_V2_ARCHITECTURE.md`](./WIZARD_V2_ARCHITECTURE.md) descreve:

1. **Step inicial de identificação do cliente** com busca, histórico e "duplicar como base".
2. **Steps condicionais por tipo de produto** (Câmara, Walk-In, Túnel, Sala Climatizada, etc.).
3. **Módulos visuais interativos** para dimensões, portas, prateleiras e divisões.
4. **Reality Check Engine multi-camada** com severidade `ok/warn/block` e fit score 0–100.
5. **Contrato com a IA** padronizado em JSON estrito.
6. **Migração de dados** preservando submissions existentes.
7. **Export** (PDF do orçamento, XLSX com a planilha técnica preenchida).
