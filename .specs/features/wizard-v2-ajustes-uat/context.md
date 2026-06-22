# Wizard V2 — Ajustes pós-UAT — Context (Discuss)

**Gathered:** 2026-06-22
**Spec:** [.specs/features/wizard-v2-ajustes-uat/spec.md](spec.md)
**Status:** Ready for design

---

## Feature Boundary

Rodada de ajustes pós-UAT do Wizard V2 (single-file [front.html](../../../front.html)): correções de
UX, regras de cadastro/comissão, grade dimensional, acessórios e gatilhos de alerta do Agente. Esta
discussão apenas esclarece **como** implementar os 4 gray areas — não adiciona capacidades novas
fora dos 24 requisitos da spec.

---

## Implementation Decisions

### CLI-01 — Vincular vários orçamentos a um cliente + filtro

- A listagem/filtro por cliente vive **na tela de Histórico de orçamentos existente**, adicionando
  um filtro "por cliente" (não criar painel novo).
- O vínculo aceita **ambos os caminhos**: escolher um cliente já cadastrado **ou** criar um cliente
  on-the-fly durante o vínculo (reaproveitar `bindClientAutocomplete` + `_client_id`; criar via
  fluxo de clients das migrations 011/012).
- Modelo de dados: 1 cliente → N orçamentos (FK `client_id` no orçamento). Filtro no histórico
  consulta por `client_id`/nome.

### DIM-03 — Medida interna x externa (oscilação do pedido 311388)

- O wizard **coleta a medida interna** (padrão SR) e **exibe a externa calculada** ao lado
  (externa = interna + 2× espessura do painel, por eixo). Rótulos passam a deixar claro "interna".
- O Reality Check **trata a diferença interna/externa como esperada e NÃO critica** — apenas informa
  (texto neutro). Ajustar o prompt de validação
  ([prompts/system_prompt_wizard_validation.md](../../../prompts/system_prompt_wizard_validation.md))
  e a lógica de RC para não emitir erro por essa diferença.

### FIN-01 — Finalidade "Diversos"

- "Diversos" usa **faixa térmica ampla como `outros` (-40 a 15 °C)**, **sem crítica de
  incompatibilidade** de produto/temperatura. Adicionar a `RC_USO_LABELS`, `RC_USO_TEMP_RANGES`
  (espelhar `outros`), `RC_STORAGE_DENSITY` (densidade `outros`/250) e ao select de finalidade do
  modal de compartimento ([front.html#L13881](../../../front.html#L13881)).

### PORTA-01 — Porta em parede divisória

- **Modelagem: agent's discretion** (ver abaixo). Decisão do agente: habilitar a parede divisória
  como alvo de porta em `_perimeterWallsForCompartment` (passar a considerar paredes divisórias além
  das perimetrais), representando **uma porta interna única** que conecta os dois compartimentos
  (sem somar carga térmica externa para essa folga). O visualizador e a validação marcam a porta como
  "interna/divisória".
- Acessórios anti-condensação (Resistência no Batente / Anti-Gelo) em porta divisória são oferecidos
  **conforme a diferença de temperatura entre os dois compartimentos** (se ΔT relevante, sugerir;
  se ambos na mesma faixa, não sugerir).

### Agent's Discretion

- **PORTA-01 modelagem** — usuário respondeu "Você decide". Abordagem adotada: porta interna única
  compartilhada, parede divisória habilitada no seletor de paredes, marcada como interna sem impacto
  na carga térmica externa. Revisável se a engenharia preferir par de portas.
- Detalhes visuais de como exibir a "externa calculada" (badge ao lado do campo vs. hint) ficam a
  critério do design.

---

## Specific References

- Tabela de prazo de pagamento (RAG, [rag_documents/02_regras_negocio_planilha.md](../../../rag_documents/02_regras_negocio_planilha.md) L48):
  `À Vista, 30 dias, 30/60, 30/60/90, Entrada+Parcelas, Especial` — base para PAG-01 (fora do discuss,
  mas confirmado aqui). Acrescentar "Outros (especificar)" conforme requisito do usuário.
- Cálculo externo já implícito: a câmara usa `espessura_painel` para derivar dimensões externas
  ([front.html#L12214](../../../front.html#L12214), [#L13308](../../../front.html#L13308)).

---

## Deferred Ideas

- Conversão automática de orçamentos antigos com comissão > 5% para o novo limite de RT — fora de
  escopo (sem migração de dados nesta feature).
- Painel/CRM completo de clientes (além do filtro no histórico) — fica como ideia futura.
