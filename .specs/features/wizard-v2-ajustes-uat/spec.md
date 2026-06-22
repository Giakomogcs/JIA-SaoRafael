# Wizard V2 — Ajustes pós-UAT (rodada de feedback) — Specification

> Fase: **Specify** (tlc-spec-driven). Escopo avaliado: **Complex** — 19 grupos de requisitos
> tocando schema do formulário, componentes de UI (creatable dropdown, máscaras), modais de
> compartimento/porta, motor de Reality Check, integração de clientes e prompts do agente.
> Arquivo principal afetado: [front.html](../../../front.html) (~20.7k linhas, SPA single-file).

## Problem Statement

Após uso real do Wizard V2, vendedores/representantes e equipe técnica levantaram uma série de
correções de usabilidade, de regra de negócio e de modelagem de dados. O feedback vai de bugs
concretos (dropdown que "trava" após seleção, falta de máscara em telefone) a mudanças de regra
(comissões viram RT 0–5%, campos cadastrais deixam de ser obrigatórios) e novos recursos (vincular
vários orçamentos a um cliente, chapa xadrez, alerta de IA em observações).

## Goals

- [ ] Corrigir os bugs de UX dos selects "creatable" (filtro semântico confunde, botão trava após seleção).
- [ ] Aplicar máscaras corretas (telefone/celular + DDI, CEP já existe) e renomear/ajustar campos conforme regras.
- [ ] Tornar campos cadastrais não-obrigatórios e introduzir cadastro/vínculo de clientes com filtro.
- [ ] Ajustar grade dimensional (altura 1,50–12 m em passos de 5 mm; largura em passos de 280 mm) e finalidades.
- [ ] Adicionar acessórios faltantes (chapa xadrez na porta e nas laterais) e dados de transportadora.
- [ ] Estender o alerta do Agente para observações com pedidos de terceiros/cotação.

## Out of Scope

| Item                                                 | Motivo                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Reescrever o wizard fora do `front.html` single-file | Mudança arquitetural não solicitada; manter padrão atual              |
| Recalcular fórmulas da planilha de carga térmica     | Feedback é de UI/regra de cadastro, não de engenharia de refrigeração |
| Migração de dados de orçamentos já salvos            | Nenhum requisito pede retrocompatibilidade de registros antigos       |

---

## User Stories

### P1: Selects "creatable" mostram todas as opções e não travam ⭐ MVP

**User Story**: Como vendedor, quero ver todas as opções de um select mesmo depois de escolher uma,
e digitar para pesquisar em um campo separado, para não me confundir nem ficar "preso" na primeira escolha.

**Contexto técnico**: Hoje o input do componente `creatable` é, ao mesmo tempo, a caixa de busca e o
campo de valor. `filterOptions()` esconde (`.hidden`) as opções que não batem com o texto digitado
([front.html](../../../front.html#L7897-L7908)), então após selecionar "Feira" a lista some / mostra
só o que contém "feira". O comportamento de foco/clique está em
[front.html](../../../front.html#L7172-L7205).

**Acceptance Criteria**:

1. WHEN o usuário abre um select creatable THEN o sistema SHALL exibir **todas** as opções, independente do valor já selecionado.
2. WHEN o usuário quer pesquisar THEN o sistema SHALL oferecer um campo de busca **separado** do campo que mostra o valor escolhido.
3. WHEN o usuário já selecionou uma opção e clica de novo no dropdown (seta ▼) THEN o sistema SHALL reabrir a lista completa e permitir trocar a seleção (corrige o "trava após selecionar" relatado na Etapa 2).

**Independent Test**: Selecionar "Feira" em Origem do Contato, reabrir e confirmar que todas as origens aparecem; trocar para "Site".

---

### P1: Máscaras corretas + DDI em telefone/celular ⭐ MVP

**User Story**: Como vendedor, quero que telefone/celular tenham máscara e DDI, e que CEP/CNPJ
continuem mascarados, para evitar dados inconsistentes.

**Contexto técnico**: `maskCep` ([L8802](../../../front.html#L8802)) e `maskCpfCnpj`
([L8864](../../../front.html#L8864)) existem e estão ligados. O campo `contato_telefone`
([L3592](../../../front.html#L3592)) tem apenas `pattern`, **sem máscara** e **sem DDI**.

**Acceptance Criteria**:

1. WHEN o usuário digita no telefone do contato THEN o sistema SHALL aplicar máscara `+DD (DD) DDDDD-DDDD` (DDI + DDD + número).
2. WHEN o DDI não é informado THEN o sistema SHALL assumir `+55` como padrão (Brasil) editável.
3. WHEN o usuário digita CEP/CNPJ THEN o sistema SHALL manter o mascaramento atual.
4. WHEN o número está incompleto no blur THEN o sistema SHALL sinalizar visualmente (borda de erro) sem bloquear.

**Independent Test**: Digitar `11941174182` e ver `+55 (11) 94117-4182`.

---

### P1: Comissões viram RT (0–5%) ⭐ MVP

**User Story**: Como gestor comercial, quero que "Comissão Representante" vire "RT de indicação" e
"Comissão Vendedor" vire "RT dificuldade", ambos limitados a 0–5%.

**Contexto técnico**: `comissao_representante` (`max: 15`, default 5) e `comissao_vendedor`
(`max: 10`, default 3) em [L3516-L3530](../../../front.html#L3516-L3530).

**Acceptance Criteria**:

1. WHEN a Etapa 1 é exibida THEN o sistema SHALL rotular os campos como "RT de indicação (%)" e "RT dificuldade (%)".
2. WHEN o usuário informa valor > 5 ou < 0 THEN o sistema SHALL rejeitar/limitar a faixa 0–5%.
3. WHEN o orçamento é salvo THEN o sistema SHALL persistir os novos rótulos/limites (verificar binding com planilha/workflow).

**Independent Test**: Tentar digitar 8 em RT de indicação e ver bloqueio em 5.

---

### P1: Campos cadastrais não-obrigatórios + Nome Fantasia + Contribuinte ICMS ⭐ MVP

**User Story**: Como vendedor, quero que Razão Social, CNPJ, CEP, Endereço e nº **não** sejam
obrigatórios, e quero campos "Nome Fantasia" e "Contribuinte de ICMS (S/N)".

**Contexto técnico**: Campos `razao_social`, `cnpj_cpf`, `cep`, `endereco_entrega`,
`endereco_numero` em [L3553-L3592](../../../front.html#L3553-L3592) com `required: true`.

**Acceptance Criteria**:

1. WHEN a Etapa 2 valida THEN o sistema SHALL **não** exigir Razão Social, CNPJ, CEP, Endereço, nº.
2. WHEN a Etapa 2 é exibida THEN o sistema SHALL incluir "Nome Fantasia" (texto) e "Contribuinte de ICMS (S/N)" (sim/não).
3. WHEN nenhum desses campos é preenchido THEN o sistema SHALL permitir avançar.

**Independent Test**: Avançar a Etapa 2 com apenas contato preenchido.

---

### P1: Vincular vários orçamentos a um cliente + filtrar por cliente ⭐ MVP

**User Story**: Como vendedor, quero um botão/select para vincular diversos orçamentos a um mesmo
cliente e poder filtrar a lista por cliente.

**Contexto técnico**: Já existe autocomplete de clientes (`bindClientAutocomplete`, `_client_id`,
`_client_locked`, [L7625-L7640](../../../front.html#L7625-L7640)) e tabela/RLS de clients
([migrations/011_clients_table_seed.sql](../../../migrations/011_clients_table_seed.sql),
[012_clients_rls_policies.sql](../../../migrations/012_clients_rls_policies.sql)). Falta o vínculo
N orçamentos → 1 cliente e o filtro de listagem.

**Acceptance Criteria**:

1. WHEN o usuário está em um orçamento THEN o sistema SHALL permitir vinculá-lo a um cliente existente (botão + select).
2. WHEN o usuário lista orçamentos THEN o sistema SHALL permitir filtrar por cliente.
3. WHEN um cliente tem vários orçamentos THEN o sistema SHALL exibi-los agrupados/filtrados.

**Independent Test**: Vincular 2 orçamentos ao mesmo cliente e filtrar para ver os 2.

> ⚠️ Gray area — precisa **discuss**: onde fica a listagem/filtro (tela de histórico? novo painel?) e
> se o vínculo exige cliente já cadastrado ou cria on-the-fly. Ver [discuss.md](../../../.github/skills/tlc-spec-driven/references/discuss.md).

---

### P2: Renomeações e ajustes de menu

**User Story**: Como vendedor, quero os rótulos/menus alinhados ao vocabulário da empresa.

**Acceptance Criteria**:

1. WHEN Etapa 3 exibe altura THEN o sistema SHALL rotular "Altura interna (m)" e a especificação SHALL ser a **altura interna** (padrão SR). (`altura`, [L3760](../../../front.html#L3760))
2. WHEN Etapa 3 exibe piso THEN o sistema SHALL substituir "Sem Piso (sobre piso existente)" por "Piso Alvenaria". (`piso`, [L3804](../../../front.html#L3804))
3. WHEN Etapa 2 exibe o resumo THEN o sistema SHALL renomear "Dados Técnicos (Resumo da Operação)" para "Ramo de Atividade". (`dados_tecnicos_resumo`, [L3619](../../../front.html#L3619))
4. WHEN Etapa 2 exibe local de instalação THEN o sistema SHALL usar a pergunta "O local de instalação é o mesmo do endereço acima?" (hoje "...é diferente do endereço acima?", render do `local-instalacao-box`, [L7028-L7090](../../../front.html#L7028-L7090) e fallback [L7000+](../../../front.html#L7000)).
5. WHEN Etapa 5 exibe faturamento de mão de obra THEN o sistema SHALL remover a opção "Separado (NF à parte)". (`faturamento_mao_obra`, [L3941](../../../front.html#L3947))

---

### P2: "Aprovação de Faturamento via…" — remover Boleto, destravar re-seleção

**User Story**: Como vendedor, quero renomear "Exigência de Faturamento" para "Aprovação de
Faturamento via…", sem "Emissão de Boleto" (é forma de pagamento), e poder reabrir o select para
trocar a opção.

**Contexto técnico**: `exigencia_faturamento` (creatable, opções incluem "Emissão de Boleto",
[L3658-L3670](../../../front.html#L3658-L3670)). O "trava" é o mesmo bug do creatable (P1 #1).
`prazo_pagamento` em [L3672-L3690](../../../front.html#L3672-L3690).

**Acceptance Criteria**:

1. WHEN Etapa 2 exibe o campo THEN o sistema SHALL rotular "Aprovação de Faturamento via…".
2. WHEN o menu é aberto THEN o sistema SHALL **não** conter "Emissão de Boleto".
3. WHEN o usuário já selecionou e clica de novo THEN o sistema SHALL permitir trocar (resolvido junto do P1 #1).
4. WHEN Etapa 2 exibe Prazo de Pagamento THEN o sistema SHALL usar as opções da tabela de Regras de Negócio ([rag_documents/02_regras_negocio_planilha.md](../../../rag_documents/02_regras_negocio_planilha.md)).
5. WHEN o usuário escolhe "Outros" THEN o sistema SHALL permitir especificar (campo livre) — inclui "Incluir opções de pagamento como outros e especificar".

---

### P2: Grade dimensional e finalidades

**User Story**: Como engenheiro de orçamento, quero a grade dimensional alinhada à fabricação e a
finalidade "Diversos" disponível.

**Contexto técnico**: `altura` gera opções de 2,0 a 6,0 em passos de 0,05 com `modular005`
([L3760-L3782](../../../front.html#L3760-L3782)). `largura` já cresce de 0,28 em 0,28
([L3736-L3758](../../../front.html#L3736-L3758)). Finalidades em `RC_USO_LABELS`/`RC_USO_TEMP_RANGES`
([L15461-L15486](../../../front.html#L15461-L15486)) e no select de finalidade do modal de
compartimento ([L13881](../../../front.html#L13881)).

**Acceptance Criteria**:

1. WHEN Etapa 3 calcula opções de altura THEN o sistema SHALL ir de **1,50 m a 12 m** em passos de **5 mm** (0,005).
2. WHEN o usuário escolhe largura THEN o sistema SHALL crescer de **280 em 280 mm** (já atende — validar).
3. WHEN Etapa 3 oferece finalidade THEN o sistema SHALL incluir "Diversos" (categoria genérica, faixa térmica ampla como `outros`).
4. WHEN o usuário insere medida externa (ex.: pedido 311388) THEN o sistema SHALL tratar a oscilação medida-externa-vs-interna sem criticar indevidamente (alinhar Reality Check à definição de altura interna do P2 #1).

> ⚠️ Gray area — precisa **discuss**: a crítica do agente no pedido 311388 era de medida **externa**;
> definir se o wizard passa a coletar medida interna (padrão) e converter para externa, e como o
> Reality Check ([prompts/system_prompt_wizard_validation.md](../../../prompts/system_prompt_wizard_validation.md)) deve tratar a folga de painel.

---

### P2: Acessórios — chapa xadrez (laterais + porta) e Resistência/Mola obrigatórias

**User Story**: Como engenheiro, quero acrescentar chapa xadrez nas laterais da câmara e na porta, e
que Resistência no Batente e Mola Aérea deixem de ser opcionais.

**Contexto técnico**: Catálogo de acessórios de porta `ACESSORIOS_CAT`
([L14380-L14432](../../../front.html#L14380-L14432)) — contém "Resistência no Batente" e "Mola Aérea"
como itens selecionáveis. Acessórios estáticos da câmara em Etapa 4 (`estante_*`, `cortina_pvc`,
`alarme`, `estrutura_unidade_condensadora`, [L3850-L3920](../../../front.html#L3850-L3920)) — **não**
há "chapa xadrez".

**Acceptance Criteria**:

1. WHEN o modal de porta é aberto THEN o sistema SHALL apresentar "Resistência no Batente" e "Mola Aérea" como **sempre incluídas** (não desmarcáveis / fixas no menu).
2. WHEN Etapa 4 é exibida THEN o sistema SHALL oferecer "Chapa Xadrez na Porta" como acessório.
3. WHEN Etapa 4/Etapa 3 é exibida THEN o sistema SHALL oferecer "Chapa Xadrez nas Laterais da Câmara".

---

### P2: Porta para dentro do compartimento (divisória)

**User Story**: Como engenheiro, quero posicionar uma porta numa parede **divisória** (interna entre
compartimentos), não só nas paredes do perímetro.

**Contexto técnico**: As paredes permitidas vêm de `_perimeterWallsForCompartment`
([L14222](../../../front.html#L14222), uso [L14692-L15225](../../../front.html#L14692-L15225)). A
direção de abertura já tem "Abre p/ Dentro" ([L14377](../../../front.html#L14377)), mas a _parede_
disponível é só perimetral.

**Acceptance Criteria**:

1. WHEN um compartimento faz divisa com outro THEN o sistema SHALL permitir colocar uma porta na parede divisória.
2. WHEN a porta é divisória THEN o sistema SHALL refletir isso no visualizador e na validação.

> ⚠️ Gray area — precisa **discuss**: regra de negócio sobre portas em divisórias (par de portas?
> única folga? impacto térmico). Confirmar com técnica.

---

### P2: Editar espessura do isolante de piso por compartimento

**User Story**: Como engenheiro, quero definir a espessura do isolante de piso individualmente por compartimento.

**Contexto técnico**: Hoje o piso é único na Etapa 3 (`piso`, [L3804](../../../front.html#L3804)). A
config por compartimento fica no modal (`categoria_produto`, `temperatura_setpoint`,
`qtd_luminarias`, [L13850-L13970](../../../front.html#L13850-L13970)).

**Acceptance Criteria**:

1. WHEN o usuário configura um compartimento THEN o sistema SHALL permitir definir a espessura do isolante de piso desse compartimento.
2. WHEN compartimentos têm espessuras diferentes THEN o sistema SHALL persistir e exibir cada valor.

---

### P2: Transportadora Indicada abre dados da transportadora

**User Story**: Como vendedor, quando escolho "Transportadora indicada", quero informar nome,
telefone e e-mail da transportadora (não obrigatórios).

**Contexto técnico**: `tipo_frete` (select) em [L3973-L3989](../../../front.html#L3973-L3989).

**Acceptance Criteria**:

1. WHEN "Transportadora indicada" é selecionada THEN o sistema SHALL exibir campos Nome, Telefone, E-mail da transportadora.
2. WHEN outra opção é selecionada THEN o sistema SHALL ocultar esses campos.
3. WHEN os campos ficam vazios THEN o sistema SHALL permitir avançar (não obrigatórios).

---

### P2: Alerta do Agente em observações com pedidos de terceiros/cotação

**User Story**: Como gestor, quero que qualquer observação pedindo cotação ou uso de plataformas/recursos
de terceiros dispare um alerta do Agente, como já ocorre na Etapa 1.

**Contexto técnico**: Existe detecção de recursos de terceiros na Etapa 1 (referência no prompt
[prompts/system_prompt_chat_assistant.md](../../../prompts/system_prompt_chat_assistant.md) e na
lógica de alerta do wizard). Campos de observação: `observacoes_comerciais`
([L3536](../../../front.html#L3536)) e `observacoes_instalacao` ([L3997](../../../front.html#L3997)).

**Acceptance Criteria**:

1. WHEN uma observação menciona cotação/terceiros THEN o sistema SHALL exibir um alerta do Agente equivalente ao da Etapa 1.
2. WHEN o texto é neutro THEN o sistema SHALL **não** alertar.

---

## Edge Cases

- WHEN um orçamento antigo tem comissão > 5% salva THEN o sistema SHALL exibir sem quebrar (somente novos limites na edição).
- WHEN o telefone é estrangeiro (DDI ≠ 55) THEN a máscara SHALL aceitar DDI editável.
- WHEN a câmara tem 1 só compartimento THEN não há parede divisória → opção de porta divisória SHALL ficar oculta.
- WHEN altura digitada = 1,49 m ou 12,01 m THEN o sistema SHALL rejeitar (fora da faixa 1,50–12).
- WHEN "Outros" é escolhido em pagamento mas o campo livre fica vazio THEN o sistema SHALL pedir especificação.

---

## Requirement Traceability

| ID       | História                                           | Local em front.html                              | Fase      | Status    |
| -------- | -------------------------------------------------- | ------------------------------------------------ | --------- | --------- |
| CREAT-01 | P1 creatable mostra tudo / não trava               | filterOptions L7897; handlers L7172              | Design    | Pending   |
| MASK-01  | P1 máscara + DDI telefone                          | maskCep L8802; contato_telefone L3592            | Design    | Pending   |
| RT-01    | P1 RT indicação/dificuldade 0–5%                   | comissao\_\* L3516-L3530                         | Tasks     | Pending   |
| CAD-01   | P1 campos cadastrais opcionais                     | step2 L3553-L3592                                | Tasks     | Pending   |
| CAD-02   | P1 Nome Fantasia + Contribuinte ICMS               | step2 fields                                     | Design    | Pending   |
| CLI-01   | P1 vincular N orçamentos a cliente + filtro        | bindClientAutocomplete L7625; migrations 011/012 | In Design | Discussed |
| LBL-01   | P2 Altura interna (def. interna)                   | altura L3760                                     | Tasks     | Pending   |
| LBL-02   | P2 "Piso Alvenaria"                                | piso L3804                                       | Tasks     | Pending   |
| LBL-03   | P2 "Ramo de Atividade"                             | dados_tecnicos_resumo L3619                      | Tasks     | Pending   |
| LBL-04   | P2 pergunta local de instalação                    | local-instalacao-box render L7028                | Tasks     | Pending   |
| MENU-01  | P2 remover "Separado (NF à parte)"                 | faturamento_mao_obra L3941                       | Tasks     | Pending   |
| FAT-01   | P2 "Aprovação de Faturamento via…" + sem Boleto    | exigencia_faturamento L3658                      | Tasks     | Pending   |
| PAG-01   | P2 prazo pagamento p/ Regras de Negócio + "Outros" | prazo_pagamento L3672                            | Design    | Pending   |
| DIM-01   | P2 altura 1,50–12 m passo 5 mm                     | altura options L3760                             | Tasks     | Pending   |
| DIM-02   | P2 largura passo 280 mm (validar)                  | largura L3736                                    | Tasks     | Pending   |
| FIN-01   | P2 finalidade "Diversos"                           | RC*USO*\* L15461; select L13881                  | In Design | Discussed |
| DIM-03   | P2 medida externa/oscilação (pedido 311388)        | Reality Check + prompt validação                 | In Design | Discussed |
| ACC-01   | P2 Resistência+Mola obrigatórias                   | ACESSORIOS_CAT L14380                            | Design    | Pending   |
| ACC-02   | P2 chapa xadrez na porta                           | ACESSORIOS_CAT L14380                            | Design    | Pending   |
| ACC-03   | P2 chapa xadrez nas laterais                       | Etapa 4 fields L3850                             | Design    | Pending   |
| PORTA-01 | P2 porta em divisória                              | \_perimeterWallsForCompartment L14222            | In Design | Discussed |
| PISO-01  | P2 espessura isolante piso por compartimento       | modal compartimento L13850                       | Design    | Pending   |
| FRETE-01 | P2 dados transportadora indicada                   | tipo_frete L3973                                 | Design    | Pending   |
| OBS-01   | P2 alerta agente em observações                    | observacoes\_\* L3536/L3997 + prompts            | Design    | Pending   |

**Cobertura:** 24 requisitos · 4 gray areas **resolvidos no Discuss** ([context.md](context.md)) · 0 mapeados a tasks ainda ⚠️

**ID format:** `[CATEGORIA]-[NUM]` · **Status:** Pending → In Design → In Tasks → Implementing → Verified

---

## Success Criteria

- [ ] Vendedor consegue reabrir e trocar qualquer select sem ficar travado.
- [ ] Telefone exibe DDI + máscara; CEP/CNPJ seguem mascarados.
- [ ] RT de indicação e RT dificuldade limitados a 0–5%.
- [ ] Etapa 2 avança sem Razão Social/CNPJ/CEP/Endereço/nº; Nome Fantasia e Contribuinte ICMS presentes.
- [ ] É possível vincular ≥2 orçamentos a um cliente e filtrar a listagem por cliente.
- [ ] Altura aceita 1,50–12 m em passos de 5 mm; finalidade "Diversos" disponível.
- [ ] Chapa xadrez (porta e laterais) e dados da transportadora indicada disponíveis.
- [ ] Resistência no Batente e Mola Aérea sempre presentes (não opcionais).
- [ ] Observações com pedidos de terceiros disparam alerta do Agente.

---

## Próximos passos (auto-sizing)

1. **Discuss** (obrigatório antes de Design) para os 4 gray areas: CLI-01, DIM-03, FIN-01/medida, PORTA-01.
2. **Design** dos itens que mexem em componentes compartilhados: CREAT-01 (reescrita do creatable),
   CLI-01 (vínculo + filtro), OBS-01 (gatilho de IA), ACC-01/02/03 e PISO-01.
3. **Quick-mode/Tasks** para os renomeios e ajustes de opção (LBL-\*, MENU-01, FAT-01, DIM-01/02, RT-01,
   CAD-01) — baixo risco, edições pontuais no SCHEMA.
