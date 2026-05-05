# Base de Conhecimento RAG — São Rafael Refrigeração Industrial

## Documento 03: Guia de Interpretação de Casos e Decisões Técnicas

### 1. Metodologia de Interpretação

Quando um vendedor descreve uma necessidade do cliente, siga este processo mental:

```
1. IDENTIFICAR o processo/atividade do cliente
2. DEDUZIR o tipo de produto necessário
3. INFERIR temperatura operacional
4. DETERMINAR espessura mínima
5. RECOMENDAR sistema de refrigeração
6. ALERTAR riscos ou requisitos especiais
```

---

### 2. Árvore de Decisão por Segmento

#### 2.1 Alimentício — Carnes e Frigorífico

| Atividade | Temperatura | Tipo Produto | Espessura | Observação |
|-----------|-------------|-------------|-----------|------------|
| Recebimento/Desossa | 0 a +5°C | Câmara com Sistema | 75mm PU | Inox 430 interno obrigatório |
| Resfriamento carcaças | -1 a +2°C | Câmara com Sistema | 100mm PU | Trilho aéreo, pé-direito 4,5m |
| Câmara de maturação | +2 a +4°C | Walk In Cooler | 75mm PU | Controle umidade 75-85% |
| Estoque congelados | -18 a -22°C | Walk In Freezer | 150mm PU | Piso reforçado, empilhadeira |
| Congelamento rápido | -30 a -35°C | Túnel | 175mm PU | Parafuso, porta rápida |
| Expedição | +5 a +10°C | Antecâmara | 75mm PU | Cortina PVC |

**Dicas de interpretação**:
- Se cliente menciona "abatedouro" → Norma NR-36 + ANVISA obrigatório
- Se menciona "trilho" → pé-direito mínimo 4,50m
- Se menciona "paletização" → piso reforçado + largura > 3m

#### 2.2 Alimentício — Laticínios

| Atividade | Temperatura | Tipo Produto | Observação |
|-----------|-------------|-------------|------------|
| Câmara de leite | +2 a +4°C | Walk In Cooler | Lavagem diária → Inox |
| Câmara de queijos | +8 a +12°C | Walk In Cooler | Controle umidade 85-90% |
| Armazenamento sorvete | -22 a -25°C | Walk In Freezer | Alta resistência térmica |
| Produção sorvete | -30 a -35°C | Túnel | Volume alto → parafuso |
| Iogurtes/embalados | +2 a +5°C | Walk In Cooler | Volume alto de movimentação |

#### 2.3 Alimentício — Pescados

| Atividade | Temperatura | Tipo Produto | Observação |
|-----------|-------------|-------------|------------|
| Recebimento/Limpeza | 0 a +2°C | Câmara com Sistema | Inox 304 obrigatório (sal) |
| Armazenamento fresco | -1 a +1°C | Walk In Cooler | Controle preciso ±0,5°C |
| Congelamento | -25 a -30°C | Walk In Freezer ou Túnel | Congelamento rápido preserva |
| Estoque longo prazo | -18 a -22°C | Walk In Freezer | — |

**Alerta especial**: Pescados + sal = ALTAMENTE CORROSIVO. Obrigatório Inox 304 ou 316.

#### 2.4 Alimentício — Hortifruti

| Atividade | Temperatura | Tipo Produto | Observação |
|-----------|-------------|-------------|------------|
| Câmara geral | +6 a +10°C | Walk In Cooler | Ventilação suave (não ressecar) |
| Frutas tropicais | +10 a +14°C | Walk In Cooler | Banana, mamão NÃO refrigerar demais |
| Verduras/folhosas | +2 a +5°C | Walk In Cooler | Umidade alta (90%+) |
| Pré-processados | +2 a +4°C | Walk In Cooler | ANVISA: temp máx +5°C |

**Dica**: Frutas tropicais abaixo de +10°C → dano por frio (chilling injury)

#### 2.5 Farmacêutico e Hospitalar

| Atividade | Temperatura | Tipo Produto | Observação |
|-----------|-------------|-------------|------------|
| Medicamentos gerais | +15 a +25°C | Sala Climatizada | ANVISA: monitoramento contínuo |
| Termolábeis | +2 a +8°C | Walk In Cooler | Redundância obrigatória |
| Vacinas | +2 a +8°C | Walk In Cooler | Alarme + datalogger + gerador |
| Hemoderivados | +2 a +6°C | Walk In Cooler | Inox 304, cleanroom prep |
| Reagentes congel. | -20 a -30°C | Walk In Freezer | Alarme crítico |

**REGRA FARMACÊUTICA**: Sempre alarme com datalogger + backup de energia + relatório de qualificação IQ/OQ/PQ.

#### 2.6 Indústria (Não-Alimentício)

| Atividade | Temperatura | Tipo Produto | Observação |
|-----------|-------------|-------------|------------|
| Chocolataria | +18 a +20°C | Sala Climatizada | Umidade controlada (<60%) |
| Cervejaria (fermentação) | +12 a +22°C | Sala Climatizada | Precisão ±0,5°C |
| Cervejaria (maturação) | +0 a +4°C | Walk In Cooler | Inox 304 (CIP) |
| Vinícola (adega) | +12 a +16°C | Sala Climatizada | Umidade 65-75%, vibrações |
| Flores/Plantas | +4 a +8°C | Walk In Cooler | Iluminação, ventilação suave |
| Cosméticos | +20 a +25°C | Sala Climatizada | Temperatura + umidade |
| Tintas e Químicos | +15 a +25°C | Sala Climatizada | Ventilação forçada (VOCs) |

---

### 3. Perguntas-Chave para Interpretar o Caso

Quando o vendedor descreve o pedido de forma vaga, use estas perguntas mentais:

#### 3.1 Sobre o PRODUTO armazenado:
- É perecível? Se sim, em quanto tempo se degrada?
- Qual a temperatura de entrada do produto?
- Qual a temperatura de conservação ideal?
- Produz gases ou odores? (etileno em frutas → separar)
- Tem umidade própria? (carne fresca = sim)
- É embalado ou exposto? (embalado = menos troca térmica)

#### 3.2 Sobre a OPERAÇÃO:
- Quantas vezes a porta abre por hora? (frequência → cortina, porta rápida)
- Quantas pessoas entram simultaneamente?
- Usam empilhadeira ou paleteira?
- Horário de operação: 8h/dia ou 24h/dia?
- Há sazonalidade? (Natal = pico em sorvetes/congelados)

#### 3.3 Sobre o LOCAL:
- Que andar? Tem acesso para painéis?
- Temperatura ambiente externa? (Manaus ≠ Porto Alegre)
- Exposta ao sol? (parede externa → fator +15%)
- Área já tem energia trifásica?
- Normas especiais? (ANVISA, NR-36, clean room?)

---

### 4. Padrões de Erro Comuns dos Vendedores

#### 4.1 Subdimensionamento por pressa
**Sintoma**: Vendedor coloca dimensão pequena "pra ficar mais barato"
**Problema**: Câmara cheia = desempenho ruim, não atinge temperatura
**Regra**: Volume útil = 60-70% do volume total (espaço para circulação de ar)
**Correção**: Multiplicar necessidade por 1,4-1,6 para obter dimensão real

#### 4.2 Espessura mínima sem calcular
**Sintoma**: Escolhe 75mm "padrão" para tudo
**Problema**: Se for freezer ou túnel, isolamento insuficiente
**Correção**: Sempre cruzar com tipo_produto e tabela de espessura mínima

#### 4.3 Confundir Cooler com Freezer
**Sintoma**: Walk In Cooler mas no resumo técnico menciona "congelados"
**Problema**: Cooler ≠ Freezer. Cooler = resfriamento (0/+5°C), Freezer = congelamento (-18°C)
**Correção**: Perguntar: "O produto já chega congelado (armazenagem)?" ou "Precisa CONGELAR (processo)?"

#### 4.4 Dimensão não-modular
**Sintoma**: Vendedor coloca 3,00m ou 2,50m (números "redondos")
**Problema**: Não é múltiplo de 0,28m → planilha quebra
**Correção**: Arredondar para o modular mais próximo (3,00m → 2,80m ou 3,08m)

#### 4.5 Porta superdimensionada
**Sintoma**: Porta de 2000mm largura em câmara de 2,24m
**Problema**: 2000 + 300 (montantes) = 2300mm > 2240mm → NÃO CABE
**Correção**: Porta máx = dimensão câmara - 300mm

#### 4.6 Fluido errado
**Sintoma**: R-134a selecionado para Walk In Freezer -18°C
**Problema**: R-134a opera até -10°C. Não atinge -18°C.
**Correção**: R-404A, R-449A ou R-507A para temperaturas abaixo de -10°C

---

### 5. Lógica de Priorização de Alertas

Quando múltiplos problemas são detectados, priorize:

1. **SEGURANÇA** (amônia em público, R-290 sem ventilação) → PRIMEIRO
2. **IMPOSSIBILIDADE FÍSICA** (parafuso em 220V, porta > câmara) → SEGUNDO
3. **PLANILHA QUEBRA** (dimensão não-modular, campo inválido) → TERCEIRO
4. **INCOERÊNCIA TÉCNICA** (espessura insuf., degelo errado) → QUARTO
5. **SUBÓTIMO** (comissão alta, sem alarme, sem cortina) → ÚLTIMO

---

### 6. Fórmulas de Cálculo Rápido para o Chat

#### 6.1 Volume da Câmara
```
Volume = Comprimento × Largura × Altura (m³)
Volume_útil = Volume × 0,65 (circulação de ar)
```

#### 6.2 Carga Térmica Estimada
```
Carga_base = Volume × Fator_temp (Kcal/h)
Carga_corrigida = Carga_base × Fator_porta × Fator_produto × Fator_segurança
```
Fatores:
- Porta alta frequência: ×1,25
- Produto quente na entrada: ×1,30
- Segurança: ×1,10

#### 6.3 Quantidade de Painéis (estimativa)
```
Painéis_laterais ≈ 2×(C + L) × H / (0,28 × módulo_altura)
Painéis_teto ≈ (C/0,28) × (L/0,28)
Total_painéis ≈ Painéis_laterais + Painéis_teto + Painéis_piso(se houver)
```

#### 6.4 Consumo Energético Estimado (kWh/mês)
```
Potência_compressor (kW) ≈ Carga_kcal/h / (COP × 860)
COP típico: Hermético=2,5 | Scroll=3,0 | Semi-herm=3,5 | Parafuso=4,0
Horas_operação/dia ≈ 16h (compressor não roda 100%)
Consumo_mensal = Potência × 16 × 30 (kWh)
```

---

### 7. Respostas para Perguntas Frequentes

#### "Quanto custa uma câmara frigorífica?"
> Depende de dimensões, temperatura, acessórios e local. Uma câmara Walk In Cooler básica de 2,24×1,68×2,20m parte de ~R$ 15-25 mil (com sistema). Walk In Freezer similar: R$ 30-50 mil. Túneis de congelamento: R$ 150-500 mil. Para orçamento preciso, preencha o wizard.

#### "Qual a diferença entre PU e PIR?"
> Ambos são espumas rígidas. PIR (Poliisocianurato) tem ~10% melhor isolamento térmico E melhor resistência ao fogo (classe B1). Custa 15-20% mais que PU. Recomendado para farmacêutica, locais com exigência de bombeiros, ou quando quer mesma performance com painel mais fino.

#### "Posso usar R-404A em 2026?"
> R-404A ainda está disponível mas em phase-out por alto GWP (3.922). Recomendamos R-449A (Opteon XP40) ou R-448A (Solstice N40) como substitutos diretos — mesma faixa operacional (-35 a +10°C), menor impacto ambiental, compatível com mesmos equipamentos.

#### "Preciso de câmara ANVISA?"
> Para alimentos: RDC 216/2004 exige controle de temperatura com registro. Para farmacêutica: RDC 430/2020 exige monitoramento contínuo + relatório de qualificação (IQ/OQ/PQ) + alarme + backup de energia. Em ambos os casos, alarme com datalogger é obrigatório.

#### "Qual compressor para minha câmara?"
> Depende da carga térmica:
> - Até 15.000 Kcal/h → Hermético (econômico, zero manutenção)
> - 5.000-50.000 → Scroll (boa eficiência, silencioso)
> - 10.000-150.000 → Semi-Hermético (industrial, manutenível)
> - 50.000+ → Parafuso (grandes volumes, alta eficiência)
> Preciso saber suas dimensões e temperatura para calcular a carga e recomendar.

#### "O que é barreira de vapor?"
> É uma membrana impermeável instalada no lado QUENTE do painel (externo). Impede que a umidade do ar ambiente penetre o isolamento. Sem ela, a umidade condensa DENTRO do painel, perde eficiência e pode mofar. OBRIGATÓRIA em temp < -18°C e em pisos isolados.

---

### 8. Glossário de Termos Técnicos

| Termo | Significado |
|-------|-------------|
| COP | Coeficiente de Performance (eficiência do compressor) |
| BTU | British Thermal Unit (1 BTU = 0,252 Kcal) |
| TR | Tonelada de Refrigeração (1 TR = 3.024 Kcal/h = 12.000 BTU/h) |
| Superheat | Superaquecimento — controle da válvula de expansão |
| Subcooling | Sub-resfriamento — melhora eficiência do ciclo |
| ΔT | Diferença de temperatura (evaporador vs câmara, típico 6-10K) |
| URE | Unidade de Refrigeração Estática (sem ventilador) |
| URA | Unidade de Refrigeração com Ar forçado |
| IQF | Individually Quick Frozen (congelamento individual rápido) |
| DIFAL | Diferencial de Alíquota ICMS (compra interestadual) |
| CIF | Cost Insurance Freight (frete incluso) |
| FOB | Free On Board (frete por conta do cliente) |
| PU | Poliuretano (espuma isolante) |
| PIR | Poliisocianurato (espuma isolante superior) |
| GWP | Global Warming Potential (impacto ambiental do fluido) |
| ODP | Ozone Depletion Potential |
| RLS | Row Level Security (controle de acesso por linha no banco) |
