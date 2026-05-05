# Base de Conhecimento RAG — São Rafael Refrigeração Industrial

## Documento 01: Manual de Dimensionamento de Câmaras Frigoríficas

### 1. Módulos Dimensionais (Painéis Isotérmicos)

#### 1.1 Regra Fundamental
Todas as câmaras São Rafael são construídas com painéis modulares. As dimensões DEVEM seguir a grade modular:

- **Planta (Comprimento e Largura)**: Múltiplos de 0,28m a partir de 1,12m
- **Altura**: Múltiplos de 0,05m (mínimo 2,00m, máximo 6,00m)

#### 1.2 Fórmula de Validação
```
Módulos = (Dimensão - 1,12) / 0,28
```
O resultado DEVE ser um número inteiro (tolerância ±0,01m).

#### 1.3 Tabela de Dimensões Válidas (Planta)
| Módulos | Dimensão (m) |
|---------|-------------|
| 0 | 1,12 |
| 1 | 1,40 |
| 2 | 1,68 |
| 3 | 1,96 |
| 4 | 2,24 |
| 5 | 2,52 |
| 6 | 2,80 |
| 7 | 3,08 |
| 8 | 3,36 |
| 9 | 3,64 |
| 10 | 3,92 |
| 11 | 4,20 |
| 12 | 4,48 |
| 13 | 4,76 |
| 14 | 5,04 |
| 15 | 5,32 |
| 16 | 5,60 |
| 17 | 5,88 |
| 18 | 6,16 |
| 19 | 6,44 |
| 20 | 6,72 |

#### 1.4 Tabela de Alturas Válidas
Mínimo: 2,00m | Máximo: 6,00m | Incremento: 0,05m
Exemplos: 2,00 | 2,05 | 2,10 | ... | 2,50 | ... | 3,00 | ... | 6,00

#### 1.5 Limites Práticos
- Câmara mínima útil: 1,40m × 1,40m × 2,00m (Walk In pequeno)
- Câmara modular máxima recomendada: ~200m² de área (acima disso → obra civil)
- Para empilhadeira: largura interna mínima 3,00m, altura mínima 4,00m
- Para paleteira manual: largura interna mínima 2,24m

---

### 2. Espessuras de Painel Isotérmico

#### 2.1 Tipos de Isolamento
- **PU (Poliuretano)**: Densidade 38-42 kg/m³, λ = 0,022 W/m·K. Padrão, mais econômico.
- **PIR (Poliisocianurato)**: Densidade 40-45 kg/m³, λ = 0,020 W/m·K. Melhor performance térmica, maior resistência ao fogo (classe B1).

#### 2.2 Tabela de Espessura Mínima por Aplicação

| Aplicação | Faixa Temperatura | Espessura PU | Espessura PIR | Observação |
|-----------|-------------------|-------------|---------------|------------|
| Sala Climatizada | +15°C a +25°C | 50mm | 40mm | Ambientes controlados |
| Antecâmara | +5°C a +15°C | 75mm | 60mm | Transição térmica |
| Resfriamento (Walk In Cooler) | 0°C a +5°C | 75mm | 60mm | Hortifruti, laticínios |
| Resfriamento médio | -5°C a 0°C | 100mm | 80mm | Carnes, pescados |
| Congelamento (Walk In Freezer) | -18°C a -25°C | 150mm | 125mm | Armazenagem congelados |
| Congelamento profundo | -25°C a -35°C | 175mm | 150mm | Sorvetes, túneis |
| Ultra-congelamento | -35°C a -45°C | 200mm | 175mm | Túnel de congelamento |

#### 2.3 Regra de Ouro
> Para cada 10°C abaixo de 0°C, adicionar ~25mm de PU (ou ~20mm de PIR) à espessura base de 75mm.

#### 2.4 Espessuras Disponíveis na São Rafael
40mm | 50mm | 60mm | 75mm | 80mm | 100mm | 125mm | 150mm | 175mm | 200mm | 250mm

---

### 3. Revestimentos

#### 3.1 Opções Disponíveis
| Revestimento | Temperatura | Ambiente | Custo Relativo |
|-------------|-------------|----------|----------------|
| Galvalume (Aluzinc) | ≥ +5°C | Seco, sem ácidos | $ (econômico) |
| Aço Pré-Pintado (branco) | ≥ 0°C | Padrão | $$ |
| Inox 430 | ≥ -25°C | Húmido, lavagem | $$$ |
| Inox 304 | Qualquer | Amônia, ácidos, extremo | $$$$ |
| Inox 316 | Qualquer | Marítimo, altamente corrosivo | $$$$$ |

#### 3.2 Regras de Seleção
- **Temperatura < -18°C**: Inox 430 ou 304 internamente (formação de gelo agride pinturas)
- **Ambiente com amônia (R-717)**: OBRIGATÓRIO Inox 304 ou superior
- **Indústria alimentícia com lavagem**: Inox 430 mínimo internamente
- **Galvalume**: NUNCA para freezers ou câmaras com lavagem
- **Externo de fachada**: Considerar UV e chuva → pré-pintado ou galvalume

---

### 4. Piso

#### 4.1 Opções
| Tipo | Descrição | Aplicação |
|------|-----------|-----------|
| Sem Piso | Apenas painéis laterais e teto | Temp ≥ +5°C sobre piso existente nivelado |
| Com Piso Simples | Painel de piso isolado, sem reforço | Temp < +5°C, sem tráfego pesado |
| Com Piso Reforçado | Painel + chapa estrutural + proteção | Câmaras > 3×3m ou com empilhadeira/paleteira |

#### 4.2 Regras Obrigatórias
- **Temp < 0°C** → Piso isolado OBRIGATÓRIO (mín 75mm)
- **Temp < -18°C** → Piso isolado mín 100mm + barreira de vapor + resistência aquecida (previne congelamento do solo)
- **Túnel de congelamento** → Piso isolado mín 150mm + barreira de vapor + sistema de aquecimento de solo
- **"Sem Piso" + Temperatura negativa** → PROIBIDO: causa condensação, gelo no solo, destruição do piso da edificação
- **Empilhadeira** → Piso reforçado obrigatório (carga pontual ≥ 5 ton/m²)

---

### 5. Cálculo de Carga Térmica (Estimativa Rápida)

#### 5.1 Fórmula Simplificada
```
Carga Térmica (Kcal/h) = Volume_interno (m³) × Fator_de_Carga (Kcal/h·m³)
```

#### 5.2 Fatores de Carga por Aplicação
| Aplicação | Temperatura | Fator (Kcal/h·m³) | Observação |
|-----------|-------------|-------------------|------------|
| Climatização | +15 a +25°C | 20 – 40 | Baixa carga |
| Resfriamento leve | +5 a +10°C | 40 – 60 | Bebidas, hortifruti |
| Resfriamento padrão | 0 a +5°C | 60 – 80 | Carnes, laticínios |
| Congelamento | -18 a -25°C | 100 – 150 | Armazenagem |
| Congelamento rápido | -30 a -35°C | 200 – 300 | Túnel |
| Ultra-congelamento | -40 a -45°C | 300 – 450 | Túnel rápido IQF |

#### 5.3 Fatores de Correção
Aplicar SOBRE a carga base:
- Porta de alta frequência (>10 aberturas/hora): +20-30%
- Produto quente na entrada (>15°C acima do setpoint): +25-40%
- Iluminação interna (>10W/m²): +5-10%
- Pessoal (>3 pessoas simultâneas): +10-15%
- Empilhadeira elétrica operando dentro: +10-15%
- Localização (clima quente, parede externa exposta ao sol): +10-20%

#### 5.4 Exemplo de Cálculo
```
Walk In Freezer: 3,36m × 2,24m × 2,50m = 18,8 m³
Fator (congelamento -18°C): 120 Kcal/h·m³
Carga base = 18,8 × 120 = 2.256 Kcal/h
Correção porta (+20%): 2.256 × 1,20 = 2.707 Kcal/h
Fator segurança (+10%): 2.707 × 1,10 = 2.978 Kcal/h

→ Compressor: Hermético (faixa 500-15.000 Kcal/h) ✓
→ Fluido: R-404A ou R-449A
→ Degelo: Elétrico
```

---

### 6. Sistemas de Refrigeração

#### 6.1 Compressores

| Tipo | Capacidade (Kcal/h) | Tensão | Aplicação Típica |
|------|---------------------|--------|------------------|
| Hermético | 500 – 15.000 | 220V Mono/Tri | Walk In pequeno/médio |
| Scroll | 5.000 – 50.000 | 220/380V Tri | Walk In médio/grande |
| Semi-Hermético | 10.000 – 150.000 | 380/440V Tri | Câmaras industriais |
| Parafuso (Screw) | 50.000 – 500.000+ | 380/440V Tri | Grandes instalações |
| Aberto (Open-type) | 20.000 – 300.000 | 380/440V Tri | Amônia, especiais |

**Regras de seleção**:
- Dimensionar com folga de +15-20% sobre a carga calculada
- Hermético: econômico, manutenção zero, mas não desmontável
- Semi-hermético: permite manutenção (troca de válvulas, anéis)
- Parafuso: grandes cargas, operação contínua, alta eficiência
- Se carga > 15.000 Kcal/h → NÃO usar hermético (subdimensionado)
- Se carga < 5.000 Kcal/h → NÃO usar scroll (superdimensionado)

#### 6.2 Fluidos Refrigerantes

| Fluido | Faixa Operação | GWP | ODP | Classe Segurança | Status |
|--------|---------------|-----|-----|-----------------|--------|
| R-134a | -10 a +15°C | 1.430 | 0 | A1 (não inflam.) | Ativo, phase-down gradual |
| R-404A | -40 a +5°C | 3.922 | 0 | A1 | Phase-out 2025+ (alto GWP) |
| R-507A | -40 a +5°C | 3.985 | 0 | A1 | Phase-out 2025+ (alto GWP) |
| R-449A (Opteon XP40) | -35 a +10°C | 1.397 | 0 | A1 | Substituto R-404A ✓ |
| R-448A (Solstice N40) | -35 a +10°C | 1.387 | 0 | A1 | Substituto R-404A ✓ |
| R-290 (Propano) | -30 a +10°C | 3 | 0 | A3 (inflamável!) | Natural, alta eficiência |
| R-744 (CO₂) | -50 a +5°C | 1 | 0 | A1 | Alta pressão, subcrítico/transcrítico |
| R-717 (Amônia) | -50 a +10°C | 0 | 0 | B2L (tóxico) | Industrial, proibido em público |

**Regras de seleção**:
- Para novos projetos: preferir R-449A ou R-448A (substitutos diretos do R-404A)
- R-290: apenas com carga limitada (<150g em sistemas herméticos) ou sala de máquinas ventilada
- R-717: somente instalações industriais com operadores treinados, longe do público
- R-744: ideal para cascata (CO₂ em baixa + HFC em alta) em supermercados
- Dois fluidos diferentes no mesmo projeto → COMPLEXIDADE e CUSTO muito maiores

#### 6.3 Sistemas de Degelo

| Tipo | Faixa Temperatura | Mecanismo | Frequência Típica |
|------|-------------------|-----------|-------------------|
| Natural (Off-cycle) | > 0°C apenas | Para compressor, calor ambiente derrete | Contínuo |
| Elétrico | -25°C a +5°C | Resistências aquecedoras no evaporador | 2-4×/dia |
| Gás Quente | < -18°C | Gás quente do compressor aquece evaporador | 2-6×/dia |
| Água | 0°C a +10°C | Aspersão de água sobre serpentina | 1-2×/dia |

**Regras**:
- Natural/Off-cycle: IMPOSSÍVEL abaixo de 0°C (gelo não derrete sozinho)
- Elétrico: padrão para freezers comerciais, simples e confiável
- Gás quente: mais eficiente em grandes instalações (usa calor do sistema)
- Água: PROIBIDO abaixo de 0°C (congela a tubulação imediatamente)
- Túneis de congelamento: degelo elétrico ou gás quente, com ciclo a cada 4-6h de operação

#### 6.4 Tensão Elétrica

| Compressor | 220V Mono | 220V Tri | 380V Tri | 440V Tri |
|-----------|-----------|----------|----------|----------|
| Hermético | ✓ (até 3HP) | ✓ | ✓ | ✗ (raro) |
| Scroll | ✗ | ✓ | ✓ | ✗ |
| Semi-Hermético | ✗ | ✗ | ✓ | ✓ |
| Parafuso | ✗ | ✗ | ✓ | ✓ |
| Aberto | ✗ | ✗ | ✓ | ✓ |

**Regra crítica**: Parafuso ou Semi-Hermético com 220V Monofásico = NÃO EXISTE. Sempre 380V ou 440V Trifásico.

---

### 7. Portas

#### 7.1 Tipos Disponíveis

| Tipo | Temperatura | Vedação | Frequência | Aplicação |
|------|-------------|---------|-----------|-----------|
| Giratória Isotérmica | até -40°C | Excelente | Baixa/Média | Freezers, câmaras padrão |
| Correr Isotérmica | até -40°C | Excelente | Baixa/Média | Câmaras com espaço lateral |
| Vai e Vem | 0 a +15°C | Boa | Alta | Antecâmaras, cozinhas |
| Expositora de Vidro | 0 a +10°C | Baixa | Leitura visual | Exposição de produtos |
| Guilhotina | até -35°C | Excelente | Média | Docas, carga/descarga |
| Porta Rápida | -10 a +15°C | Média | Muito Alta (>30×/h) | Túneis, antecâmaras |
| Correr Frigorífica (grande) | até -40°C | Excelente | Baixa | Câmaras industriais |

#### 7.2 Dimensionamento de Portas
- **Altura máxima** = Altura da câmara - 200mm (folga frame superior)
- **Largura máxima** = Menor dimensão da câmara - 300mm (montantes laterais)
- **Para empilhadeira**: Largura mín 2.400mm, Altura mín 3.000mm
- **Para paleteira**: Largura mín 1.500mm, Altura mín 2.200mm
- **Para pessoa**: Largura mín 800mm, Altura mín 2.000mm

#### 7.3 Regras de Seleção
- Temp < -18°C → OBRIGATÓRIO porta isotérmica (giratória ou correr)
- "Vai e Vem" a -18°C → PROIBIDO (vedação insuficiente, consumo energético dispara)
- Porta de vidro a -18°C → PROIBIDO (embaçamento constante, vedação inexistente)
- Túnel de congelamento → Porta rápida na entrada + isotérmica para manutenção
- Se frequência > 20 aberturas/hora → considerar cortina PVC adicional

---

### 8. Acessórios

#### 8.1 Cortina PVC
| Tipo | Temperatura | Aplicação |
|------|-------------|-----------|
| Standard (transparente) | 0 a +15°C | Antecâmaras, resfriamento |
| Polar (anti-UV, flexível -40°C) | até -40°C | Freezers, túneis |
| Anti-inseto (com overlap) | ≥ +5°C | Docas, áreas abertas |

**Quando usar**: Portas com alta frequência de abertura + temperatura < +5°C

#### 8.2 Alarme de Temperatura
- **Recomendado**: Todas as câmaras com produto perigoso ou alto valor
- **Obrigatório**: Anvisa exige monitoramento para alimentos congelados
- **Tipos**: Sensor com alarme sonoro/visual + registro datalogger
- **Perda de carga sem alarme em -18°C**: pode significar milhares de R$ em produto perdido

#### 8.3 Estantes
- Largura padrão: 1.000mm ou 1.500mm
- Para câmara com estante 1.500mm: largura interna mínima 2,24m
- Material: Aço inox 304 para câmaras com lavagem; aço galvanizado para demais
- Não usar estantes + empilhadeira no mesmo corredor (risco de colisão)

---

### 9. Logística e Instalação

#### 9.1 Transporte Vertical
| Situação | Solução | Custo Adicional |
|----------|---------|-----------------|
| Térreo | Nenhuma | Incluso |
| Andar > 0, com elevador de carga | Uso do elevador | Baixo (+5-10%) |
| Andar > 0, sem elevador | Munck ou guindaste | Alto (+30-50%) |
| Andar > 0, sem acesso externo | Manual (escada) — SOMENTE painéis ≤ 100mm | Muito alto (+50-80%) |

**Regras**:
- Painéis > 150mm são MUITO PESADOS para transporte manual por escada
- Sempre confirmar dimensão da abertura vs tamanho do painel

#### 9.2 Horários de Trabalho
| Período | Adicional MO |
|---------|-------------|
| Comercial (8h-18h) | 0% (padrão) |
| Noturno (18h-22h) | +30-50% |
| Madrugada (22h-6h) | +50-70% |
| Sábados | +50% |
| Domingos/Feriados | +100% |

#### 9.3 Prazo de Instalação Estimado
| Tamanho Câmara | Equipe | Prazo |
|---------------|--------|-------|
| Até 10m² | 2 pessoas | 1-2 dias |
| 10-30m² | 3 pessoas | 2-4 dias |
| 30-80m² | 4 pessoas | 4-7 dias |
| 80-200m² | 5+ pessoas | 7-15 dias |
| > 200m² | Sob consulta | 15-30 dias |

---

### 10. Tipos de Produto São Rafael

| Tipo Produto | Descrição | Temperatura Típica | Aplicação |
|-------------|-----------|-------------------|-----------|
| Walk In Cooler | Câmara de resfriamento modular | 0 a +10°C | Restaurantes, açougues, hortifruti |
| Walk In Freezer | Câmara de congelamento modular | -18 a -25°C | Armazenagem de congelados |
| Câmara com Sistema | Câmara + sistema de refrigeração completo | -35 a +15°C | Personalizado |
| Câmara Modular | Apenas painéis (sem sistema) | N/A | Cliente fornece refrigeração |
| Antecâmara | Câmara de transição/preparo | +5 a +15°C | Antes de câmaras frias |
| Túnel de Congelamento | Congelamento rápido de produtos | -30 a -40°C | Indústria alimentícia |
| Sala Climatizada | Ambiente com temperatura controlada | +15 a +25°C | Farmacêutica, vinhos, chocolate |

---

### 11. Regras Comerciais

#### 11.1 Comissões
- **Vendedor interno**: 0 a 10% (padrão: 3-5%)
- **Representante externo**: 0 a 15% (padrão: 5-8%)
- **Soma máxima recomendada**: ≤ 15% (acima disso, margem de lucro fica comprometida)
- **Acima de 10% para representante**: incomum, verificar se é justificável

#### 11.2 Prazo de Pagamento
- À Vista: desconto possível (negociar com diretoria)
- 30/60/90 dias: padrão mercado
- Entrada + parcelas: mais comum em projetos grandes
- Para Túneis e Parafusos (> R$ 150k): pagamento à vista é INCOMUM (alertar)

#### 11.3 Frete
- **CIF (incluso)**: São Rafael assume custo — alertar se > 500km
- **FOB (cliente)**: Cliente contrata transportadora
- **Rota comum**: Diadema/SP → destino
- **Custo estimado**: ~R$ 3-5/km para carreta truck com painéis

---

### 12. Interpretação de Casos Comuns

#### 12.1 Açougue / Casa de Carnes
- Tipo: Walk In Cooler (+2°C) + Freezer de estoque (-18°C)
- Painel: 75mm PU (cooler) + 150mm PU (freezer)
- Porta: Vai e vem no cooler, isotérmica no freezer
- Atenção: Lavagem diária → Inox 430 interno

#### 12.2 Restaurante
- Tipo: Walk In Cooler (+3°C) pequeno
- Dimensão típica: 1,68m × 1,68m × 2,20m
- Painel: 75mm PU
- Porta: Giratória isotérmica (facilidade, vedação)
- Compressor: Hermético pequeno (~2.000 Kcal/h)

#### 12.3 Indústria de Sorvetes
- Tipo: Túnel de Congelamento (-35°C) + Armazém (-25°C)
- Painel: 175mm PU (túnel) + 150mm PU (armazém)
- Porta: Rápida (túnel) + Correr isotérmica (armazém)
- Compressor: Parafuso (túnel) + Semi-hermético (armazém)
- Fluido: R-449A ou R-744 (cascata)
- Degelo: Gás quente no túnel, elétrico no armazém

#### 12.4 Supermercado
- Tipo: Walk In Cooler (hortifruti +8°C) + Walk In Freezer (-20°C)
- Painel: 75mm (cooler) + 150mm (freezer)
- Porta: Expositor vidro (cooler clientes), isotérmica (freezer)
- Volume alto → Scroll ou semi-hermético
- Considerar R-744 cascata para sustentabilidade

#### 12.5 Cervejaria Artesanal
- Tipo: Sala Climatizada (+18°C para fermentação) + Walk In Cooler (+2°C para maturação)
- Painel: 50mm PU (sala) + 75mm PU (cooler)
- Controle preciso de temperatura ±0,5°C
- Inox 304 interno (lavagem com soda cáustica)

#### 12.6 Farmacêutica
- Tipo: Sala Climatizada (+20°C ±2°C) com monitoramento ANVISA
- Painel: 50mm PIR (melhor resistência fogo)
- Alarme: OBRIGATÓRIO com datalogger certificado
- Backup: Gerador ou sistema redundante
- Validação: Protocolo IQ/OQ/PQ

#### 12.7 Câmara de Carcaças (Frigorífico)
- Tipo: Câmara com Sistema (-1°C a +2°C), pé-direito alto
- Dimensão: > 6m de comprimento, altura ~4,50m
- Trilho aéreo: necessário
- Painel: 100mm PU (devido ao tamanho, compensar com URE)
- Porta: Correr frigorífica grande (2,40m × 3,50m)
- Piso reforçado para empilhadeira

---

### 13. Normas e Regulamentações Relevantes

- **ANVISA RDC 216/2004**: Boas práticas para serviços de alimentação
- **ANVISA RDC 275/2002**: POP e BPF para alimentos
- **NBR 16401**: Instalações de ar-condicionado (sistemas centrais)
- **NBR 15848**: Sistemas de refrigeração — Requisitos de segurança
- **NR-36**: Segurança e saúde no trabalho em empresas de abate
- **Portaria INMETRO 372**: Eficiência energética de sistemas comerciais
- **Protocolo de Montreal / Kigali**: Phase-down de HFCs (R-404A, R-507A)
- **EN 13313**: Competência de pessoal de refrigeração

---

### 14. Troubleshooting — Problemas Comuns

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| Câmara não atinge temperatura | Espessura insuficiente / porta inadequada | Verificar isolamento, trocar porta |
| Gelo excessivo no evaporador | Degelo desligado/insuficiente | Reconfigar timer, verificar resistências |
| Condensação externa | Espessura subdimensionada | Trocar painéis por espessura maior |
| Consumo energético alto | Porta de alta frequência sem cortina | Instalar cortina PVC Polar |
| Piso congelando | Sem isolamento ou sem aquecimento de solo | Instalar barreira de vapor + aquecimento |
| Alarme disparando | Degelo ou porta aberta muito tempo | Verificar rotina operacional |
| Compressor desliga por alta | Condensador sujo ou ventilação insuficiente | Limpeza, verificar espaço ao redor |
