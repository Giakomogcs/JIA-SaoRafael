# Codebase Concerns

**Analysis Date:** 2026-06-22

## Tech Debt

**Frontend monolítico (~20k linhas):**

- Issue: `front.html` concentra wizard, chat, admin e CRM em um único arquivo sem build/modularização.
- Files: `front.html`
- Why: ADR-001 (deploy simples, equipe pequena, ambiente sem pipeline).
- Impact: dificulta trabalho paralelo de devs e revisão; atinge limite de manutenção.
- Fix approach: modularizar em scripts separados conforme planejado no Wizard V2.

**Prompts sem sync automático com n8n:**

- Issue: prompts canônicos vivem em `prompts/*.md` mas precisam ser colados manualmente nos nodes `set` do workflow.
- Files: `prompts/system_prompt_chat_assistant.md`, `prompts/system_prompt_wizard_validation.md`, `workflows/São Rafael - AgentRag (Wizard + Chat).json`
- Why: ADR-004 (diff legível em PR).
- Impact: divergência silenciosa entre o `.md` versionado e o que roda em produção.
- Fix approach: checklist de propagação no PR; ou um node que leia o prompt de uma fonte única.

## Known Bugs

**SQL com typos no DatabaseSetup (`saorefael_*`):**

- Symptoms: nomes de tabela incorretos (`saorefael_*` em vez de `saorafael_*`) no SQL embutido.
- Trigger: executar o workflow em "modo full".
- Files: `workflows/SãoRafael-DatabaseSetup.json`
- Workaround: usar o caminho recomendado (migrations versionadas em `migrations/`), não o setup embutido.
- Root cause: SQL embutido divergiu das migrations canônicas.

**Migration `008` ausente:**

- Symptoms: pulo numérico (001→007, 009→012).
- Files: `migrations/`
- Workaround: nenhum necessário; sequência funciona sem ela.
- Root cause: desconhecido; possível contexto no histórico Git. Documentar quando recuperado.

## Security Considerations

**Isolamento de chat por usuário reduzido:**

- Risk: `migrations/010_fix_chat_message_user_id.sql` recriou `saorafael_list_sessions/get_history/delete_session` sem filtro estrito por `auth.uid()` para não esconder histórico legado com `user_id NULL`.
- Files: `migrations/010_fix_chat_message_user_id.sql`
- Current mitigation: RLS ainda em vigor nas tabelas; o relaxamento é nos RPCs.
- Recommendations: backfill de `user_id` em mensagens antigas e restaurar o filtro estrito.

**Divergência de chave de metadata (`company` vs `company_name`):**

- Risk: docs dizem `raw_user_meta_data->>'company'`, código usa `company_name`. Código novo que use a chave errada pode falhar o admin gating (ou conceder/negar acesso incorretamente).
- Files: `migrations/002_user_crud_functions.sql` (usa `company_name`); `README.md`, `ARCHITECTURE.md` (dizem `company`).
- Current mitigation: `saorafael_is_admin()` é o predicado canônico no banco.
- Recommendations: alinhar docs ao código (ou vice-versa) e padronizar a chave em uma migration.

**Endpoints de infra sem auth:**

- Risk: `/saorafael-index-drive`, `/saorafael-reset-rag`, `/saorafael-DatabaseSetup` não exigem JWT.
- Files: workflows RAG e DatabaseSetup.
- Current mitigation: rotas não divulgadas; dependem de obscuridade da URL.
- Recommendations: proteger com token/secret no header ou restringir por IP/rede.

## Fragile Areas

**Três camadas de lógica para manter em sintonia:**

- Files: `front.html` (Reality Check JS), `workflows/*.json` (IA/validação), `rag_documents/*.md` + `prompts/*.md`.
- Why fragile: regra de engenharia/comercial mudada em uma camada precisa ser refletida nas outras manualmente.
- Common failures: validação IA e Reality Check discordando; RAG desatualizado vs. regra nova.
- Safe modification: ao alterar regra de negócio, atualizar Reality Check + prompt + doc RAG juntos e reindexar (`POST /saorafael-index-drive`).

**Workflows n8n versionados como JSON:**

- Files: `workflows/*.json`
- Why fragile: diffs ilegíveis; lógica complexa difícil de revisar; fácil commitar `active:false` sem querer.
- Safe modification: exportar do n8n, conferir `active`, descrever a mudança no corpo do commit.

## Dependencies at Risk

**Dependências de frontend via CDN sem lock:**

- Risk: Tailwind, Marked, Highlight.js, Lucide, SheetJS carregados por CDN sem versão fixada/SRI garantem.
- Impact: mudança upstream ou indisponibilidade de CDN quebra a UI; risco de supply chain.
- Migration plan: fixar versões + Subresource Integrity, ou self-host os assets críticos.

## Test Coverage Gaps

**Ausência total de testes automatizados:**

- What's not tested: Reality Check Engine, RPCs SQL, fluxos de wizard/chat, ingestão RAG.
- Risk: regressões silenciosas em regras de dimensionamento e em permissões RLS.
- Priority: High (Reality Check e RLS), Medium (workflows).
- Difficulty to test: Reality Check é JS isolável (testável com pouco esforço); RLS exige ambiente Supabase de teste; workflows n8n são os mais difíceis.

---

_Concerns audit: 2026-06-22_
_Atualizar conforme itens forem corrigidos ou novos surgirem._
