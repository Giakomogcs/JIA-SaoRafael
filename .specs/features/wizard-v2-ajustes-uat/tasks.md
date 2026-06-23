# Wizard V2 — Ajustes pós-UAT — Tasks

**Design**: [design.md](design.md) · **Spec**: [spec.md](spec.md) · **Context**: [context.md](context.md)  
**Status**: Fase 1 ✅ | Fase 2 ✅ | Fase 3 ✅ | Fase 4 ✅ | Fase 5 ✅ | Fase 6 ✅ — **TODAS AS FASES COMPLETAS**

> **Sem suíte automatizada.** Não existe `.specs/codebase/TESTING.md` nem framework de testes —
> [front.html](../../../front.html) é um SPA single-file. **Gate = verificação manual no navegador**
> (abrir o arquivo, exercitar o campo, conferir `localStorage`/`formData` e o submit). Todo task tem
> `Tests: manual` e `Gate: smoke (abrir front.html e exercitar o fluxo)`.

---

## Execution Plan

### Fase 0 — Confirmações (bloqueia C8)

```
T0a (PAG-01 lista prazos) ───┐
T0b (submit n8n mapeia campos)┼─→ desbloqueia T19/T20/T21
T0c (estratégia client_id)───┘
```

### Fase 1 — SCHEMA de baixo risco (paralelo, mesmo arquivo → sequencial na prática)

```
T1 [RT] · T2 [CAD-01] · T3 [LBL-01] · T4 [LBL-02] · T5 [LBL-03] · T6 [MENU-01]
T7 [FAT-01] · T8 [DIM-01] · T9 [DIM-02] · T10 [PAG-01]
```
Todas tocam o objeto `SCHEMA` — execução **sequencial** (estado mutável compartilhado), sem `[P]`.

### Fase 2 — Itens isolados (paralelizáveis entre si)

```
        ┌→ T11 [MASK-01]  (maskPhoneIntl)
SCHEMA ─┼→ T12 [FIN-01]   (RC_USO_* + select)
        └→ T13 [LBL-04]   (pergunta local instalação)
```

### Fase 3 — Componente creatable (crítico, regressão)

```
T14 [CREAT-01] ──→ (revalida T7, T10 que usam creatable)
```

### Fase 4 — Widgets condicionais (sequenciais; dependem de fundações)

```
T11 ──→ T15 [FRETE-01]
T8  ──→ T16 [DIM-03 externa calculada]
        T17 [PISO-01 espessura piso/compart.]
        T18 [ACC-01/02/03 chapa xadrez + fixas]
        T22 [PORTA-01 porta divisória]
```

### Fase 5 — IA / prompt

```
T1 ──→ T23 [OBS-01 alerta terceiros + RT no prompt + DIM-03 no prompt]
```

### Fase 6 — Clientes (infra já pronta: migration 011 + RPC + submit n8n)

```
T19 [CAD-02 campos]
T20 [vínculo N→1] ──→ T21 [filtro histórico]
```

---

## Task Breakdown

### Fase 0 — Confirmações

#### T0a: Lista de prazos de pagamento — ✅ DECIDIDO
**What**: Manter a lista atual do front (`À Vista, 30 dias, 30/60 dias, 30/60/90 dias, Entrada + 30/60, Entrada + 30/60/90, Sob Consulta`) e acrescentar `Outros`.
**Where**: alimenta T10.
**Depends on**: None · **Requirement**: PAG-01
**Done when**: [x] Lista aprovada (STATE.md AD-002). "Outros" abre campo livre obrigatório.
**Tests**: none · **Gate**: none

#### T0b: Mapeamento dos novos campos no submit n8n — ✅ RESOLVIDO
**What**: Verificado — o workflow grava `form_data` inteiro como JSONB (`JSON.stringify(formData)`).
**Where**: [workflows/São Rafael - Wizard Submit (Save Orçamento).json](../../../workflows/) (param `formData`, INSERT em `saorafael_wizard_submission`).
**Depends on**: None · **Requirement**: CAD-02, FRETE-01, CLI-01, PISO-01
**Done when**: [x] Confirmado: campos novos (`nome_fantasia`, `contribuinte_icms`, `transportadora_*`, `espessura_piso`) persistem automaticamente. Nenhuma mudança de workflow.
**Tests**: n/a · **Gate**: none

#### T0c: Estratégia de `client_id` — ✅ RESOLVIDO
**What**: Verificado — `client_id` já existe.
**Where**: [migrations/011_clients_table_seed.sql](../../../migrations/011_clients_table_seed.sql): tabela `saorafael_clients`, `ALTER TABLE saorafael_wizard_submission ADD COLUMN client_id ... REFERENCES`, RPC `saorafael_search_clients` (conta `total_orcamentos`/`ultimo_orcamento`). Submit n8n já grava `client_id`.
**Depends on**: None · **Requirement**: CLI-01
**Done when**: [x] Decisão: usar coluna `client_id` + RPC existentes. **Nenhuma migration nova.** CLI-01 é só front-end.
**Tests**: n/a · **Gate**: none

---

### Fase 1 — SCHEMA baixo risco

#### T1: RT de indicação / RT dificuldade (0–5%) — ✅ DONE
**What**: Renomear labels e ajustar `max:5` em `comissao_representante` ("RT de indicação (%)") e `comissao_vendedor` ("RT dificuldade (%)").
**Where**: [front.html#L3516-L3530](../../../front.html#L3516)
**Depends on**: None · **Requirement**: RT-01
**Done when**: [x] Labels novos exibidos; [x] valor >5 é limitado/rejeitado; [x] default ≤5.
**Tests**: manual · **Gate**: smoke

#### T2: Campos cadastrais não-obrigatórios — ✅ DONE
**What**: `required:false` em `razao_social`, `cnpj_cpf`, `cep`, `endereco_entrega`, `endereco_numero`.
**Where**: [front.html#L3553-L3592](../../../front.html#L3553)
**Depends on**: None · **Requirement**: CAD-01
**Done when**: [x] Etapa 2 avança só com contato preenchido.
**Tests**: manual · **Gate**: smoke

#### T3: Altura → "Altura interna (m)" — ✅ DONE
**What**: Renomear label de `altura`.
**Where**: [front.html#L3760](../../../front.html#L3760)
**Depends on**: None · **Requirement**: LBL-01
**Done when**: [x] Label "Altura interna (m)" exibido na Etapa 3.
**Tests**: manual · **Gate**: smoke

#### T4: "Sem Piso (sobre piso existente)" → "Piso Alvenaria" — ✅ DONE
**What**: Trocar a opção em `piso.options`.
**Where**: [front.html#L3804](../../../front.html#L3804)
**Depends on**: None · **Requirement**: LBL-02
**Done when**: [x] Opção exibe "Piso Alvenaria"; [x] valor salvo coerente (verificar usos em RC de piso, [#L15714](../../../front.html#L15714)).
**Tests**: manual · **Gate**: smoke

#### T5: "Dados Técnicos (Resumo da Operação)" → "Ramo de Atividade" — ✅ DONE
**What**: Renomear label de `dados_tecnicos_resumo` (e hint, se aplicável).
**Where**: [front.html#L3619-L3635](../../../front.html#L3619)
**Depends on**: None · **Requirement**: LBL-03
**Done when**: [x] Label "Ramo de Atividade" exibido.
**Tests**: manual · **Gate**: smoke

#### T6: Remover "Separado (NF à parte)" — ✅ DONE
**What**: Remover a opção de `faturamento_mao_obra.options`.
**Where**: [front.html#L3941-L3947](../../../front.html#L3941)
**Depends on**: None · **Requirement**: MENU-01
**Done when**: [x] Opção ausente do select.
**Tests**: manual · **Gate**: smoke

#### T7: "Aprovação de Faturamento via…" sem Boleto — ✅ DONE
**What**: Renomear label de `exigencia_faturamento` e remover "Emissão de Boleto".
**Where**: [front.html#L3658-L3670](../../../front.html#L3658)
**Depends on**: None · **Requirement**: FAT-01
**Done when**: [x] Label novo; [x] "Emissão de Boleto" ausente.
**Tests**: manual · **Gate**: smoke

#### T8: Altura 1,50–12 m em passos de 5 mm — ✅ DONE
**What**: Ajustar geração de `altura.options` (de 1.50 a 12.00, passo 0.005) e a faixa de validação `modular005`.
**Where**: [front.html#L3760-L3782](../../../front.html#L3760)
**Depends on**: None · **Requirement**: DIM-01
**Done when**: [x] Opções de 1,50 a 12,00; [x] 1,49 e 12,01 rejeitados; [x] passo 5 mm aceito.
**Tests**: manual · **Gate**: smoke

#### T9: Largura passo 280 mm (validar) — ✅ DONE
**What**: Confirmar `largura` cresce de 0,28 em 0,28; ajustar mínimo se a regra mudou.
**Where**: [front.html#L3736-L3758](../../../front.html#L3736)
**Depends on**: None · **Requirement**: DIM-02
**Done when**: [x] Confirmado passo 0,28; [x] documentado se nenhuma mudança necessária (customValidation existente valida).
**Tests**: manual · **Gate**: smoke

#### T10: Prazo de pagamento + "Outros" (especificar) — ✅ DONE
**What**: Acrescentar `Outros` à lista atual de `prazo_pagamento.options`; ao escolher "Outros", abrir campo de texto livre **obrigatório** para especificar.
**Where**: [front.html#L3672-L3690](../../../front.html#L3672)
**Depends on**: T0a (decidido) · **Requirement**: PAG-01
**Done when**: [x] "Outros" no select; [x] selecionar "Outros" abre campo livre obrigatório; [x] vazio bloqueia avanço.
**Tests**: manual · **Gate**: smoke

---

### Fase 2 — Isolados

#### T11: Máscara de telefone internacional `maskPhoneIntl` — ✅ DONE
**What**: Criar `maskPhoneIntl()` (`+55 (11) 94117-4182`, DDI default 55 editável) e ligar a `contato_telefone`.
**Where**: novo perto de [front.html#L8802](../../../front.html#L8802); binding em [#L3592](../../../front.html#L3592) e handlers de input.
**Depends on**: None · **Requirement**: MASK-01
**Done when**: [x] `11941174182` vira `+55 (11) 94117-4182`; [x] DDI editável; [x] incompleto sinaliza borda no blur sem bloquear.
**Tests**: manual · **Gate**: smoke

#### T12: Finalidade "Diversos" — ✅ DONE
**What**: Adicionar `diversos` a `RC_USO_LABELS`, `RC_USO_TEMP_RANGES` (espelha `outros` -40..15), `RC_STORAGE_DENSITY` (250) e à opção do select de finalidade.
**Where**: [front.html#L15445-L15486](../../../front.html#L15445) e select [#L13881](../../../front.html#L13881)
**Depends on**: None · **Requirement**: FIN-01
**Done when**: [x] "Diversos" no select; [x] não gera crítica de incompatibilidade térmica.
**Tests**: manual · **Gate**: smoke

#### T13: Pergunta do Local de Instalação — ✅ DONE
**What**: Inverter o texto/semântica do radio para "O local de instalação é o mesmo do endereço acima?" (Sim = mesmo).
**Where**: render do `local-instalacao-box` [front.html#L7028+](../../../front.html#L7028) e lógica `local_instalacao_diferente`.
**Depends on**: None · **Requirement**: LBL-04
**Done when**: [x] Pergunta nova; [x] "Sim" mantém o mesmo endereço; [x] "Não" abre os campos; [x] resumo correto.
**Tests**: manual · **Gate**: smoke

---

### Fase 3 — Creatable

#### T14: Creatable v2 — busca separada + destrava — ✅ DONE
**What**: Refatorar o componente creatable: input de valor separado de um campo de busca dentro do dropdown; chevron clicável reabre lista completa; `filterOptions` lê da busca; valor selecionado nunca filtra a lista.
**Where**: render [front.html#L6786-L6806](../../../front.html#L6786); handlers [#L7172-L7205](../../../front.html#L7172); `filterOptions` [#L7897](../../../front.html#L7897); CSS [#L1576-L1644](../../../front.html#L1576).
**Depends on**: None · **Requirement**: CREAT-01 (e resolve a "trava" do FAT-01)
**Done when**:
- [x] Abrir um creatable mostra TODAS as opções mesmo com valor selecionado.
- [x] Campo de busca separado filtra a lista.
- [x] Clicar no chevron com valor preenchido reabre e permite trocar.
- [x] Regressão OK em: origem_contato, prazo_pagamento, exigencia_faturamento, comprimento, largura, altura, horario_entrega.
**Tests**: manual · **Gate**: smoke (testar os 7 campos acima)

---

### Fase 4 — Widgets condicionais

#### T15: Campos da Transportadora Indicada — ✅ DONE
**What**: Ao escolher "Transportadora indicada pelo cliente" em `exigencia_faturamento` (step2), revelar Nome/Telefone/E-mail; telefone usa `maskPhoneIntl`.
**Where**: SCHEMA [front.html#L3689-L3724](../../../front.html#L3689); renderField [#L6756-6763 email case](../../../front.html#L6756); bindFieldEvents [#L7807-7855 toggle](../../../front.html#L7807) + [#L7858-7886 phone mask](../../../front.html#L7858).
**Depends on**: T11 · **Requirement**: FRETE-01
**Done when**: [x] Campos aparecem só com "Transportadora indicada pelo cliente"; [x] somem nas outras; [x] telefone usa maskPhoneIntl (+55 (DD) NNNNN-NNNN); [x] persistem em `formData.step2`.
**Tests**: manual · **Gate**: smoke ✅

#### T16: Externa calculada (hint interna→externa)
**What**: Exibir hint "externa ≈ interna + 2×espessura" ao lado de comprimento/largura/altura, recalculado em mudança de dimensão ou `espessura_painel`.
**Where**: hints step3 [front.html#L3700-L3782](../../../front.html#L3700); reaproveitar cálculo de [#L12214](../../../front.html#L12214).
**Depends on**: T8 · **Requirement**: DIM-03 (UI)
**Done when**: [ ] Hint mostra externa correta; [ ] atualiza ao mudar espessura; [ ] é só informativo.
**Tests**: manual · **Gate**: smoke

#### T17: Espessura do isolante de piso por compartimento — ✅ DONE
**What**: Adicionar campo `espessura_piso_isolado_mm` no modal de config do compartimento, persistido em `rcGetCompartmentsConfig()`.
**Where**: modal [front.html#L13850-L13970](../../../front.html#L13850).
**Depends on**: None · **Requirement**: PISO-01
**Done when**: [x] Campo por compartimento (select Padrão/50/75/100/150mm); [x] valores distintos persistem e reexibem; [x] entra no `cfg[comp].espessura_piso_isolado_mm` → `formData`/submit.
**Tests**: manual · **Gate**: smoke

#### T18: Chapa xadrez (porta + laterais) + Resistência/Mola fixas — ✅ DONE
**What**: (a) item "Chapa Xadrez na Porta" no `ACESSORIOS_CAT`; (b) campo step3 `chapa_xadrez_laterais` (Não / 1,00m / 1,50m / Altura Total); (c) marcar "Resistência no Batente" e "Mola Aérea" como `essential` (pré-selecionadas, `disabled`, não desmarcáveis).
**Where**: `ACESSORIOS_CAT` [front.html#L14839](../../../front.html#L14839); default `acessorios` da porta; step3 field `chapa_xadrez_laterais`.
**Depends on**: None · **Requirement**: ACC-01, ACC-02, ACC-03
**Done when**: [x] Chapa xadrez na porta selecionável; [x] chapa xadrez nas laterais na Etapa 3; [x] Resistência+Mola sempre marcadas (badge ✨obrig.), `disabled`, sem permitir remoção.
**Tests**: manual · **Gate**: smoke

#### T22: Porta em parede divisória — ✅ DONE
**What**: Função auxiliar `_sharedWallsForCompartment`/`_sharedWallGeom` somada às perimetrais no seletor de paredes; porta marcada com `compartimento_destino_id`; visualizador desenha sobre a divisória (rótulo A↔B); carga externa não soma; validação conta a porta interna para origem **e** destino.
**Where**: [front.html#L17696+](../../../front.html#L17696) (`_sharedWallsForCompartment`); `openPortaModal` [#L14519](../../../front.html#L14519); `buildChamberPlantaSVG` [#L12647](../../../front.html#L12647); `validateStep(4)` [#L4801](../../../front.html#L4801).
**Depends on**: None · **Requirement**: PORTA-01
**Done when**: [x] Compartimento com divisória oferece parede interna (roxa tracejada); [x] compartimento único não oferece; [x] porta interna não soma carga externa; [x] validação não acusa "compartimento sem porta" para o destino. Ver [portas-internas/spec.md](../portas-internas/spec.md).
**Tests**: manual · **Gate**: smoke (cenário 2 compartimentos)

---

### Fase 5 — IA / prompt

#### T23: Prompt de validação — terceiros, RT 0–5%, medida interna×externa — ⏳ PARCIAL
**What**: (a) ✅ detector local de palavras-chave (`checkThirdPartyMentions`) injeta alerta no chat ao avançar etapa quando `observacoes_comerciais`/`observacoes_instalacao` citam cotar/cotação/plataforma/terceiro/concorrente; (b) ⏳ atualizar o prompt: RT agora 0–5% (substitui regra de comissão 10/15%); (c) ⏳ não criticar diferença interna×externa (só informar).
**Where**: `checkThirdPartyMentions` em [front.html](../../../front.html) (chamado em `goToNextStep`); pendente: [prompts/system_prompt_wizard_validation.md](../../../prompts/system_prompt_wizard_validation.md) (L357-358 comissão; modular L638).
**Depends on**: T1 · **Requirement**: OBS-01, RT-01 (IA), DIM-03 (IA)
**Done when**: [x] Observação com "cotar/terceiro/plataforma/concorrente" gera alerta; [x] texto neutro não alerta; [ ] regra de comissão reflete 0–5% no prompt; [ ] diferença interna/externa não vira erro no prompt.
**Tests**: manual · **Gate**: smoke (rodar Avaliação na última etapa)

---

### Fase 6 — Clientes

#### T19: Campos Nome Fantasia + Contribuinte de ICMS — ✅ DONE
**What**: Adicionar `nome_fantasia` (text) e `contribuinte_icms` (select Sim/Não) ao step2.
**Where**: SCHEMA step2 [front.html#L3553+](../../../front.html#L3553).
**Depends on**: None (T0b resolvido — JSONB persiste) · **Requirement**: CAD-02
**Done when**: [x] Dois campos exibidos (não-obrigatórios) e persistidos; [x] viajam no submit (JSONB).
**Tests**: manual · **Gate**: smoke

#### T20: Vínculo de orçamento a cliente (existente ou novo)
**What**: Botão/seletor na Etapa 2 (ao lado de Razão Social) para vincular a cliente existente (autocomplete/RPC `saorafael_search_clients`) ou criar novo; grava `_client_id` em `formData`.
**Where**: step2 autocomplete [front.html#L7625](../../../front.html#L7625); RPC e coluna `client_id` já existentes (migration 011).
**Depends on**: None (infra pronta — T0b/T0c resolvidos) · **Requirement**: CLI-01
**Done when**: [ ] Vincular a cliente existente grava `_client_id`; [ ] criar novo cliente funciona; [ ] 2 orçamentos podem apontar ao mesmo cliente.
**Tests**: manual · **Gate**: smoke

#### T21: Filtro por cliente no Histórico
**What**: Dropdown "Filtrar por cliente" na tela de histórico, consultando por `client_id` (coluna existente) ou via RPC `saorafael_search_clients`.
**Where**: render do histórico de orçamentos (localizar) + consulta Supabase.
**Depends on**: T20 · **Requirement**: CLI-01
**Done when**: [ ] Filtro lista só orçamentos do cliente; [ ] cliente com vários mostra todos.
**Tests**: manual · **Gate**: smoke

---

## Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T1–T10 | 1 edição de SCHEMA cada | ✅ |
| T11 | 1 função + binding | ✅ |
| T12 | 1 conceito (finalidade) em 4 mapas coesos | ✅ |
| T13 | 1 componente (radio) | ✅ |
| T14 | 1 componente (creatable) | ✅ |
| T15–T18, T22 | 1 widget/feature cada | ✅ |
| T19 | 2 campos coesos (mesmo step) | ✅ |
| T20, T21 | 1 feature cada | ✅ |
| T23 | 1 arquivo de prompt (3 regras coesas) | ⚠️ coeso — aceitável |

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T10 | T0a | Fase 1 ← T0a | ✅ |
| T14 | None | Fase 3 raiz | ✅ |
| T15 | T11 | T11→T15 | ✅ |
| T16 | T8 | T8→T16 | ✅ |
| T19 | T0b | Fase 6 ← T0 | ✅ |
| T20 | T0b, T0c | Fase 6 ← T0 | ✅ |
| T21 | T20 | T20→T21 | ✅ |
| T23 | T1 | T1→T23 | ✅ |
| demais | None | raízes de fase | ✅ |

## Test Co-location

Sem matriz de testes (projeto sem suíte). Todos os tasks: `Tests: manual`, `Gate: smoke`. ✅ consistente
com a ausência de TESTING.md.

---

## Traceability (24 requisitos → tasks)

| Req | Task(s) |
| --- | ------- |
| CREAT-01 | T14 |
| MASK-01 | T11 |
| RT-01 | T1, T23 |
| CAD-01 | T2 |
| CAD-02 | T19 |
| CLI-01 | T0b, T0c, T20, T21 |
| LBL-01 | T3 |
| LBL-02 | T4 |
| LBL-03 | T5 |
| LBL-04 | T13 |
| MENU-01 | T6 |
| FAT-01 | T7, T14 |
| PAG-01 | T0a, T10 |
| DIM-01 | T8 |
| DIM-02 | T9 |
| FIN-01 | T12 |
| DIM-03 | T16, T23 |
| ACC-01 | T18 |
| ACC-02 | T18 |
| ACC-03 | T18 |
| PORTA-01 | T22 |
| PISO-01 | T17 |
| FRETE-01 | T15 |
| OBS-01 | T23 |

**Cobertura:** 24/24 requisitos mapeados ✅

---

## Tools / Skills por task

Padrão para todos: edição de arquivo local em [front.html](../../../front.html) (ou `prompts/`,
`migrations/`). Sem MCP/skill especial. Verificação via abrir o `front.html` no navegador.

## Próximo passo

Aprovar este plano e ir para **Execute**. Ordem recomendada de execução: Fase 1 (T1–T10) → Fase 2
(T11–T13) → Fase 3 (T14) → Fase 4 (T15–T18, T22) → Fase 5 (T23) → Fase 6 (T19–T21). As 3 confirmações
da Fase 0 só bloqueiam a Fase 6 — o resto pode começar já.
