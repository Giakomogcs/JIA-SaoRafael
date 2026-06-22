# State

**Last Updated:** 2026-06-22T00:00:00Z
**Current Work:** Feature **wizard-v2-ajustes-uat** — Tasks aprovadas; Fase 0 confirmada; pronta para Execute (Fase 1)

---

## Recent Decisions (Last 60 days)

### AD-002: wizard-v2-ajustes-uat — Discuss + Fase 0 ([2026-06-22])

**Discuss (gray areas):**

- CLI-01: filtro por cliente no Histórico existente; vínculo aceita cliente existente OU novo; 1 cliente : N orçamentos.
- DIM-03: coletar medida interna + exibir externa calculada (interna + 2× espessura); Reality Check não critica a diferença (só informa).
- FIN-01: finalidade "Diversos" = espelho de `outros` (-40..15 °C), sem crítica de incompatibilidade.
- PORTA-01: porta interna única em divisória (sem carga externa); anti-condensação conforme ΔT.

**Fase 0 (confirmações):**

- T0a prazos: manter lista atual do front + acrescentar "Outros".
- T0a "Outros": abre campo de texto livre **obrigatório** para especificar.
- T0b RESOLVIDO: submit n8n grava `form_data` inteiro como JSONB → campos novos persistem sem mudar workflow.
- T0c RESOLVIDO: `client_id` já existe (migration 011) + FK + RPC `saorafael_search_clients`; submit já grava `client_id`. Nenhuma migration nova — CLI-01 é só front-end.
- CLI-01 UI: botão de vincular na Etapa 2, ao lado de Razão Social (reusa autocomplete). Escopo: vínculo + filtro no Histórico juntos.

**Impact:** Fase 6 simplificada (infra pronta). Apenas T0a exigia decisão do usuário.

### AD-001: Adoção do tlc-spec-driven com brownfield mapping ([2026-06-22])

**Decision:** Gerar `.specs/codebase/` (7 docs) + `.specs/project/` para não re-explorar o repo a cada feature.
**Reason:** Reduzir custo de contexto e iteração em demandas futuras.
**Trade-off:** Docs precisam ser mantidos em sincronia com o código.
**Impact:** Próximas features carregam contexto on-demand a partir de `.specs/`.

---

## Active Blockers

_(nenhum)_

---

## Lessons Learned

### L-002: Conferir n8n + migrations antes de planejar backend

**Context:** Fase 0 de wizard-v2-ajustes-uat (CLI-01).
**Problem:** Spec/design assumiram que faltava migration e mapeamento de submit para clientes.
**Solution:** Migration 011 já tinha tabela `saorafael_clients`, coluna `client_id` + FK e RPC `saorafael_search_clients`; o submit n8n já grava `client_id` e `form_data` JSONB inteiro.
**Prevents:** Criar migration/workflow desnecessários — CLI-01 e campos novos são só front-end.

### L-001: Divergência docs vs. código no admin gating

**Context:** Mapeamento da base de código.
**Problem:** README/ARCHITECTURE citam `raw_user_meta_data->>'company'`, mas a migration usa `company_name`.
**Solution:** Documentado em CONCERNS.md; `saorafael_is_admin()` é a fonte de verdade.
**Prevents:** Código novo quebrar o gate de admin por usar a chave errada.

---

## Quick Tasks Completed

| #   | Description | Date | Commit | Status |
| --- | ----------- | ---- | ------ | ------ |
| —   | —           | —    | —      | —      |

---

## Deferred Ideas

- [ ] Suíte de testes para o Reality Check Engine (JS isolável) — Captured during: brownfield mapping
- [ ] Proteger endpoints de infra sem auth (index-drive/reset-rag/DatabaseSetup) — Captured during: brownfield mapping
- [ ] Self-host/SRI das dependências CDN do frontend — Captured during: brownfield mapping

---

## Todos

- [ ] Recuperar contexto da migration `008` ausente
- [ ] Alinhar docs ao código quanto a `company` vs `company_name`

---

## Preferences

**Model Guidance Shown:** 2026-06-22
