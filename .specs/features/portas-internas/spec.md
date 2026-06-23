# Feature: Portas entre compartimentos (portas internas / de passagem)

**Status:** ✅ Done (implementado e verificado no navegador)
**Scope:** Large — single-file (`front.html`) wizard feature touching data model, wizard UI, validation, planta SVG e payload de saída.

## Problema

Hoje cada porta pertence a **um** compartimento (`compartimento_id`) e só pode ser
colocada em uma **parede externa** (`_perimeterWallsForCompartment` exclui explicitamente
as divisórias internas). Falta poder criar uma porta na **divisória interna** que liga
dois compartimentos adjacentes (porta de passagem A ↔ B).

## Decisões (do usuário)

1. **Modelo de dados:** manter `compartimento_id` (origem) + novo campo opcional
   `compartimento_destino_id` (destino). Porta é "interna" quando `destino` está preenchido.
2. **Seleção da parede:** o wizard passa a oferecer também as **divisórias internas
   compartilhadas** entre 2 compartimentos, detectando automaticamente o vizinho.
3. **Visualizador:** desenhar a porta interna sobre a divisória, na planta SVG.

## Requisitos

- **R1** — Detectar paredes internas compartilhadas entre compartimentos adjacentes
  (orientação, posição e segmento de sobreposição).
- **R2** — Persistir `compartimento_destino_id` no objeto porta (`formData.step4.portas[]`).
- **R3** — Wizard Etapa "Parede" oferece paredes externas **e** internas; ao escolher uma
  interna, define origem→destino automaticamente.
- **R4** — Posição (%) da porta interna usa o segmento compartilhado como referência.
- **R5** — Validação: cada compartimento precisa de ≥1 porta — uma porta interna conta
  para origem **e** destino.
- **R6** — Planta SVG desenha a porta interna sobre a divisória com rótulo `A↔B`.
- **R7** — Resumo/payload de saída mostra a ligação `A ↔ B`.
- **R8** — Sincronização: porta interna cujo destino deixou de existir tem o destino limpo.

## Verificação

- Criar câmara com ≥2 compartimentos (1 divisória na Etapa 3).
- Na Etapa 4, adicionar uma porta na divisória interna → destino preenchido.
- Porta aparece na planta sobre a divisória com rótulo `C1↔C2`.
- Validação não acusa "compartimento sem porta" para o destino.
- Resumo final mostra a ligação.

## Status de Implementação (R1–R8)

| Req | Descrição | Status |
| --- | --------- | ------ |
| R1 | Detectar paredes internas compartilhadas (`_sharedWallsForCompartment`, `_sharedWallGeom`) | ✅ |
| R2 | Persistir `compartimento_destino_id` em `formData.step4.portas[]` | ✅ |
| R3 | Wizard oferece paredes externas **e** internas (roxas tracejadas) com origem→destino automático | ✅ |
| R4 | Posição (%) usa o segmento compartilhado como referência | ✅ |
| R5 | Validação conta porta interna para origem **e** destino | ✅ |
| R6 | Planta SVG desenha a porta sobre a divisória com rótulo `A↔B` | ✅ |
| R7 | Resumo/payload mostra a ligação `A ↔ B` | ✅ |
| R8 | Destino órfão (compartimento removido) é limpo em `syncStep4PortasWithCompartments` | ✅ |

> Rastreado também como **PORTA-01 / T22** em [wizard-v2-ajustes-uat](../wizard-v2-ajustes-uat/tasks.md).
