# Base de Conhecimento RAG — São Rafael Refrigeração Industrial

## Documento 02: Regras de Negócio e Validação da Planilha de Orçamento

### 1. Visão Geral do Processo de Orçamento

O wizard de orçamento da São Rafael coleta dados em 6 etapas sequenciais. Os dados alimentam automaticamente uma **planilha de cálculo** que gera o orçamento final. Por isso, TODOS os campos devem respeitar formatos e valores específicos.

**Fluxo completo**:
1. Vendedor/representante preenche wizard (6 etapas)
2. IA valida cada etapa em tempo real
3. Ao finalizar, dados são submetidos para a planilha
4. Planilha calcula custos automaticamente
5. Orçamento gerado para aprovação do gerente
6. Proposta enviada ao cliente

---

### 2. Regras por Etapa (Campos PLANILHA)

#### ETAPA 1 — Dados Comerciais

| Campo | Tipo | Valores Permitidos | Regra de Negócio |
|-------|------|-------------------|------------------|
| tipo_produto | Select | Walk In Cooler, Walk In Freezer, Câmara com Sistema, Câmara Modular, Antecâmara, Túnel de Congelamento, Sala Climatizada | Governa TODAS as validações subsequentes |
| comissao_vendedor | Number | 0 a 15 (%) | Soma com representante ≤ 15% ideal |
| comissao_representante | Number | 0 a 15 (%) | Acima de 10% = incomum |
| vendedor_responsavel | Text | — | Nome do vendedor São Rafael |
| representante | Text (opcional) | — | Nome do representante externo |
| data_proposta | Date | — | Auto-preenchida |
| validade_proposta | Number | 5, 10, 15, 30 (dias) | Padrão: 15 dias |

**Impacto na planilha**: tipo_produto seleciona a aba correta de cálculo. Comissões entram no markup final.

---

#### ETAPA 2 — Cadastro e Logística

| Campo | Tipo | Validação | Regra |
|-------|------|-----------|-------|
| razao_social | Text | Mín 3 chars | — |
| cnpj | Text | 14 dígitos numéricos | Pode ser vazio (PF) |
| contato_nome | Text | Mín 3 chars | — |
| contato_telefone | Text | 10-11 dígitos | — |
| contato_email | Email | Formato válido | — |
| endereco_entrega | Text | Mín 10 chars | Endereço completo |
| local_instalacao_municipio | Text | Formato "Cidade/UF" | Usado para cálculo de ICMS/DIFAL |
| prazo_pagamento | Select | À Vista, 30 dias, 30/60, 30/60/90, Entrada+Parcelas, Especial | Entra no diferimento financeiro |
| dados_tecnicos_resumo | Textarea | Mín 10 chars | Descrição livre do que o cliente precisa |

**Impacto na planilha**: Município gera DIFAL automático. Prazo altera desconto financeiro.

**Validação cruzada**:
- dados_tecnicos_resumo DEVE ser coerente com tipo_produto (step 1)
- "Congelamento" em dados_tecnicos + Walk In Cooler → INCOERÊNCIA

---

#### ETAPA 3 — Especificações Construtivas

| Campo | Tipo | Validação | Impacto Planilha |
|-------|------|-----------|-----------------|
| comprimento | Number | Modular (0,28m) | Quantidade de painéis = (comp - 1,12) / 0,28 + 4 |
| largura | Number | Modular (0,28m) | Idem |
| altura | Number | 0,05m step | Painéis laterais = altura / 0,05 módulos |
| espessura_painel | Select | 40,50,60,75,80,100,125,150,175,200,250 (mm) | Código do produto na tabela de preços |
| tipo_isolamento | Select | PU, PIR | Multiplica preço (PIR ~15-20% mais caro) |
| revestimento_interno | Select | Galvalume, Pré-Pintado, Inox 430, Inox 304, Inox 316 | Código material + preço/m² |
| revestimento_externo | Select | idem | Código material + preço/m² |
| piso | Select | Sem Piso, Com Piso Simples, Com Piso Reforçado | Adiciona componente de custo |
| espessura_piso | Number (condicional) | 75, 100, 150 (mm) | Só se piso ≠ "Sem Piso" |
| iluminacao | Select | Sem Iluminação, LED Hermética IP65, LED Hermética IP67 | Tipo de luminária |
| qtd_luminarias | Number | Soma dos compartimentos | Quantidade total de luminárias |

**Cálculo de luminárias (Reality Check Engine — fonte única de verdade)**

A São Rafael padroniza em **LED hermética 36W (≈ 4500 lm)** para câmaras frigoríficas. O cálculo segue o método luminotécnico simplificado da NBR 5413:

```
lumens_necessarios = area_compartimento_m² × alvo_lux
qtd_recomendada    = ceil(lumens_necessarios / 4500)
qtd_minima         = max(1, floor(area × 0.6 × alvo_lux / 4500))
qtd_maxima         = ceil(area × 1.5 × alvo_lux / 4500) + 1
```

**Alvo de lux por aplicação** (definido pelo Reality Check):

| Aplicação | Temperatura típica | Alvo de Lux | Justificativa |
|-----------|--------------------|-------------|---------------|
| Climatizada / Antecâmara | +10 a +25°C | 150 lux | Ambiente, baixa permanência |
| Resfriamento (Cooler) | 0 a +10°C | 175 lux | Movimentação moderada |
| Congelamento (Freezer) | < -10°C | 200 lux | Compensa neblina e EPI |
| Carnes / Laticínios / Farmacêutico (área de trabalho) | varia | 250 lux | Norma sanitária / produção |

**Exemplos práticos**:

| Câmara | Área (m²) | Temp / Categoria | Alvo lux | Lumens | Recomendado |
|--------|-----------|------------------|----------|--------|-------------|
| Walk In Cooler 3.36 × 2.24 × 2.50m | 7,5 | +4°C / hortifruti | 175 | 1.313 | **1 luminária** |
| Walk In Freezer 5.60 × 4.20 × 2.50m | 23,5 | -20°C / congelados | 200 | 4.704 | **2 luminárias** |
| Câmara carnes 8.40 × 5.60 × 3.00m | 47,0 | -2°C / carnes resfriadas | 250 | 11.760 | **3 luminárias** |
| Sala climatizada 4.20 × 3.36 × 2.80m | 14,1 | +20°C / cosméticos | 150 | 2.117 | **1 luminária** |

**Regras complementares**:

- Múltiplos compartimentos: calcular por compartimento e somar. O total da câmara = Σ recomendados.
- `iluminacao = "Sem Iluminação"` → `qtd_luminarias` deve ser 0 ou vazio. Qualquer outro valor = contradição (🔴).
- O valor recomendado pelo Reality Check é a ÚNICA referência válida — não usar regras antigas como "1 a cada 6m²".
- Quando o vendedor sobrepor (mais que `qtd_maxima`), permitir mas alertar (🟡) — pode ser intencional (área de produção, inspeção visual fina).
- Quando o vendedor subdimensionar (menos que `qtd_minima`), alertar (🟡) — pode comprometer NR-17 / NR-36 (ergonomia/visibilidade no trabalho).

**Cálculo automático da planilha**:
```
Painéis_comprimento = 2 × ((comprimento - 1,12) / 0,28 + 2) × (altura / módulo_alt)
Painéis_largura = 2 × ((largura - 1,12) / 0,28 + 2) × (altura / módulo_alt)
Painéis_teto = ((comprimento - 0,28) / 0,28) × ((largura - 0,28) / 0,28)
Painéis_piso = Painéis_teto (se Com Piso)
Área_total_revestida = Área_superficial × preço/m² do revestimento
```

**SE DIMENSÃO NÃO FOR MODULAR → A PLANILHA QUEBRA (divisão não-inteira)**

---

#### ETAPA 4 — Acessórios e Fechamentos

| Campo | Tipo | Validação | Impacto |
|-------|------|-----------|---------|
| porta_tipo | Select | Giratória Isotérmica, Correr Isotérmica, Vai e Vem, Expositora Vidro, Guilhotina, Porta Rápida, Correr Frigorífica | Código produto + preço |
| porta_largura | Number (mm) | ≤ menor dimensão câmara - 300mm | — |
| porta_altura | Number (mm) | ≤ altura câmara - 200mm | — |
| porta_quantidade | Number | 1-4 | Multiplicador |
| cortina_pvc | Select | Não, Sim - Standard, Sim - Polar (Anti-UV) | Item adicional |
| estantes_quantidade | Number | 0-20 | Item adicional |
| estantes_largura | Select | 1000mm, 1500mm | — |
| estantes_niveis | Number | 2-5 | Multiplicador |
| alarme | Select | Não, Sim - Básico, Sim - Com Datalogger | Item adicional |

**Validação cruzada**:
- porta_altura + 200mm > step3.altura → IMPOSSÍVEL
- porta_largura + 300mm > min(step3.largura, step3.comprimento) → IMPOSSÍVEL

---

#### ETAPA 5 — Instalação e Frete

| Campo | Tipo | Validação | Impacto |
|-------|------|-----------|---------|
| andar_instalacao | Number | 0-20 | Custo manual de transporte |
| transporte_vertical | Select | Não necessário (térreo), Elevador de carga, Munck/Guindaste, Manual (escada) | Custo adicional |
| horario_instalacao | Select | Comercial, Noturno, Madrugada, Fins de Semana | Multiplicador MO |
| distancia_km | Number | 0-5000 | Custo frete |
| modalidade_frete | Select | CIF, FOB | Se CIF entra no orçamento |
| exigencias_local | Multi-select | Documentação NR, Seguro específico, PPRA/PCMSO, Integração HSE, Crachá/Biometria | Custo adicional mobilização |
| prazo_entrega_desejado | Number (dias) | 15-120 | Influencia prioridade produção |

**Cálculo frete (CIF)**:
```
Custo_frete = distancia_km × R$ 4,50/km (carreta) ou R$ 3,00/km (truck)
Adicional_andar = (andar × 500) se manual, (2.500-5.000) se munck
Adicional_horario = MO × fator (1.3 noturno, 1.5 madrugada, 2.0 fds)
```

---

#### ETAPA 6 — Sistema de Refrigeração (Dinâmico)

Cada câmara pode ter N compartimentos (default: 1). Cada compartimento:

| Campo | Tipo | Validação | Impacto |
|-------|------|-----------|---------|
| nome_compartimento | Text | Identificação livre | — |
| temperatura_setpoint | Number (°C) | -45 a +25 | Governa fluido + degelo |
| fluido_refrigerante | Select | R-134a, R-404A, R-507A, R-449A, R-448A, R-290, R-744, R-717 | Código sistema |
| tipo_compressor | Select | Hermético, Scroll, Semi-Hermético, Parafuso, Aberto | Código + preço |
| carga_termica_kcal | Number (opcional) | 500 - 500.000 | Se vazio: auto-cálculo |
| tipo_degelo | Select | Natural, Elétrico, Gás Quente, Água | Componente adicional |
| tensao | Select | 220V Mono, 220V Tri, 380V Tri, 440V Tri | — |
| tipo_evaporador | Select | Forçado (ventilado), Estático (placa/tubo) | Código |
| tipo_condensador | Select | Ar, Água, Evaporativo | Código |

**Cálculo auto de carga** (se não preenchido):
```
Volume = step3.comprimento × step3.largura × step3.altura
Fator = tabela_fator[abs(temperatura_setpoint)]
Carga_base = Volume × Fator
Carga_corrigida = Carga_base × 1.15 (segurança)
```

**Validação crítica**:
- O compartimento MAIS FRIO governa a espessura mínima da câmara inteira
- Se 2+ compartimentos: verificar se espessura do step 3 atende o mais frio

---

### 3. Combinações Proibidas (HARD RULES)

| Combinação | Motivo | Resultado |
|-----------|--------|-----------|
| Parafuso + 220V Mono | Motor não existe nessa tensão | 🔴 Bloqueio |
| Degelo Natural + Temp < 0°C | Gelo não derrete sem energia | 🔴 Bloqueio |
| Degelo Água + Temp < 0°C | Tubulação congela | 🔴 Bloqueio |
| R-134a + Temp < -10°C | Fora da faixa operacional | 🔴 Bloqueio |
| R-717 + área pública | Risco tóxico para pessoas | 🔴 Bloqueio |
| Sem Piso + Temp < 0°C | Solo congela e racha | 🔴 Bloqueio |
| Porta Vai e Vem + Temp < -5°C | Vedação insuficiente | 🔴 Bloqueio |
| Porta Vidro + Temp < -5°C | Embaçamento + perda energética | 🔴 Bloqueio |
| Galvalume + Temp < 0°C interno | Corrosão por condensação | 🔴 Bloqueio |
| Dimensão não-modular | Planilha não calcula | 🔴 Bloqueio |

---

### 4. Combinações que Geram Alerta (SOFT RULES)

| Combinação | Motivo | Resultado |
|-----------|--------|-----------|
| Comissão rep > 10% | Margem baixa | 🟡 Alerta |
| Soma comissões > 15% | Margem muito baixa | 🟡 Alerta |
| R-404A em projeto novo | Phase-out, disponibilidade futura | 🟡 Alerta |
| R-290 sem menção ventilação | Inflamável, risco | 🟡 Alerta |
| Câmara > 200m² modular | Pode precisar obra civil | 🟡 Alerta |
| Manual (escada) + painel > 150mm | Muito pesado | 🟡 Alerta |
| Dist > 500km CIF | Custo alto de frete | 🟡 Alerta |
| Túnel sem cortina PVC | Perda térmica na porta | 🟡 Alerta |
| Temp < -18°C sem alarme | Risco de perda de produto | 🟡 Alerta |
| Mesma temp em compartimentos separados | Desnecessário? | 🟡 Alerta |
| 2+ fluidos diferentes | Complexidade e custo | 🟡 Alerta |
| À Vista + Túnel/Parafuso (> R$150k) | Incomum no mercado | 🟡 Alerta |

---

### 5. Protocolo de Numeração de Orçamentos

Formato: `SR-{ANO}{MÊS}-{SEQUENCIAL:4}`

Exemplos:
- SR-202604-0001 (primeiro orçamento de abril/2026)
- SR-202604-0042 (quadragésimo segundo de abril/2026)

Regras:
- Sequencial reinicia a cada mês
- Protocolo é gerado automaticamente na submissão
- Mesmo session_id = mesmo protocolo (não duplicar)
- Status: submitted → processing → completed | error

---

### 6. Permissões e Visibilidade

| Papel | Ver próprios | Ver de todos | Editar status | Deletar |
|-------|-------------|-------------|---------------|---------|
| Vendedor | ✓ | ✗ | ✗ | ✗ |
| Representante | ✓ | ✗ | ✗ | ✗ |
| Engenheiro | ✓ | ✓ (read-only) | ✗ | ✗ |
| Admin | ✓ | ✓ | ✓ | ✓ |

No chat:
- Usuário comum pergunta "meus orçamentos" → só dele
- Admin pergunta "orçamentos do mês" → todos
- Admin pergunta "orçamentos do João" → filtra por user

---

### 7. Status de Orçamento

| Status | Significado | Próximo Status |
|--------|-------------|----------------|
| submitted | Recém-enviado pelo wizard | processing |
| processing | Em cálculo/aprovação | completed ou error |
| completed | Orçamento gerado com sucesso | — (final) |
| error | Erro no cálculo | submitted (refazer) |
| cancelled | Cancelado pelo usuário/admin | — (final) |

---

### 8. Dados que o Chat Deve Saber Responder sobre Orçamentos

Quando o usuário perguntar sobre orçamentos submetidos:

1. **"Meus orçamentos"** → Listar: protocolo, data, tipo_produto, cliente, status
2. **"Detalhes do orçamento SR-202604-0012"** → Mostrar dados completos em formato legível
3. **"Quantos orçamentos este mês?"** → Count por mês/user
4. **"Qual o status do meu último orçamento?"** → Último por data
5. **"Orçamentos de Walk In Freezer"** → Filtrar por tipo_produto
6. **Admin: "Total de orçamentos por vendedor"** → Agrupar por user
7. **Admin: "Orçamentos com erro"** → Filtrar status = error
