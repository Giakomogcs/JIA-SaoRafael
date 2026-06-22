# Code Conventions

## Naming Conventions

**Prefixo global:** tudo no banco usa prefixo `saorafael_` (tabelas, RPCs, índices).
Exemplos: `saorafael_clients`, `saorafael_wizard_submission`, `saorafael_chat_message`, `saorafael_documents`.

**RPCs (funções SQL):** `snake_case` com verbo + recurso.
Exemplos: `saorafael_search_clients`, `saorafael_upsert_client`, `saorafael_list_users`, `saorafael_is_admin`, `saorafael_update_own_name`.

**Migrations:** `NNN_descricao_em_snake_case.sql`, numeração sequencial com zero-padding.
Exemplos: `001_base_tables.sql`, `010_fix_chat_message_user_id.sql`, `011_clients_table_seed.sql`.

**Workflows n8n:** nomes legíveis, dois estilos coexistindo (legado):

- Com espaços: `São Rafael - AgentRag (Wizard + Chat).json`
- Hifenizado: `SãoRafael-Chat-GET-History.json`

**Webhooks/rotas:** kebab-case com prefixo `saorafael-`.
Exemplos: `/saorafael-AgentRag`, `/saorafael-wizard-submit`, `/saorafael-index-drive`.

**Protocolo de orçamento:** `SR-YYYYMM-NNNN` (gerado deterministicamente no n8n).

**Frontend (JS):** `camelCase` para variáveis/funções; constantes de config em `UPPER_SNAKE_CASE` (`SUPABASE_URL`, `SUPABASE_ANON`, `N8N_BASE`).

**Form data:** chaves em `snake_case` dentro do `form_data` JSONB (ex.: `comprimento_ext`, `espessura_painel_mm`, `product_type`, `client_id`).

## Code Organization

**SQL (migrations):**

- Cada arquivo abre com um header em comentário (`-- ===== São Rafael — NNN: Título =====`).
- Seções marcadas com `-- =======  UP  ========`.
- Funções declaradas com `CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- RPCs de admin começam com guard: `IF NOT saorafael_is_admin() THEN RAISE EXCEPTION '...' END IF;`.
- **Imutabilidade:** nunca editar migration existente — sempre criar novo arquivo numerado.

**Workflows (n8n):**

- Editados visualmente no n8n e exportados como JSON.
- Conferir `active: true` antes de commitar se a intenção é deixar ativo.

**Prompts:**

- Fonte canônica em `prompts/*.md`; propagação manual para o node `set` correspondente no n8n.

## Type Safety / Documentation

- Sem TypeScript. Frontend é JS vanilla; tipagem implícita.
- Contratos de IA são documentados via JSON estruturado (`{output, suggestions[], complexity}`).
- `form_data` é JSONB sem schema rígido no banco — o "schema" vive no JS do wizard e nos docs RAG (`02_regras_negocio_planilha.md`).

## Error Handling

- **SQL:** `RAISE EXCEPTION` com mensagem em pt-BR amigável para violações de permissão.
- **n8n:** erros visíveis no painel de execução; resposta de webhook carrega status.
- **Frontend:** tratamento manual por chamada; mensagens ao usuário em pt-BR.

## Comments / Documentation

- **Idioma:** comentários, mensagens de erro e UI em **português (pt-BR)**; identificadores de código em inglês/snake_case.
- SQL usa blocos de comentário como cabeçalho e separadores de seção.
- Documentação arquitetural mora em `ARCHITECTURE.md` / `WIZARD_V2_ARCHITECTURE.md` (com diagramas Mermaid).

## Git / Commits

- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Branches: `feature/<descrição>`, `fix/<descrição>`, `docs/<descrição>`.

## ⚠️ Inconsistência observada (verificar antes de usar)

Os docs (`README.md`, `ARCHITECTURE.md`) descrevem o admin gating como
`raw_user_meta_data->>'company' = 'saorafael'`, mas a migration real
(`migrations/002_user_crud_functions.sql`) usa **`company_name`**. Ao escrever código
que dependa do metadata, confira a chave real no banco. Ver CONCERNS.md.
