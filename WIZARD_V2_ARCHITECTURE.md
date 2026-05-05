# Wizard V2 — Arquitetura e Design Document

## Visão Geral

Reformulação completa do wizard de orçamento São Rafael para ser **condicional por tipo de produto**, **visualmente interativo** e com **steps contextuais** que se adaptam ao equipamento selecionado.

---

## 0. Identificação do Cliente (Step Inicial — Pré-Wizard)

### Problema Atual
- Dados do cliente são coletados no meio do wizard (step 2)
- Não há como reaproveitar dados de clientes que já fizeram orçamentos anteriores
- Representante precisa redigitar tudo mesmo para clientes recorrentes

### Solução: Tela de Busca/Cadastro de Cliente como Primeiro Step

```
┌──────────────────────────────────────────────────────────────────┐
│  IDENTIFICAÇÃO DO CLIENTE                                        │
│                                                                  │
│  ┌─ Buscar cliente existente ──────────────────────────────────┐ │
│  │  🔍 [Digite CNPJ, Razão Social ou Telefone...         ]    │ │
│  │                                                             │ │
│  │  Resultados:                                                │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 🏢 Frigorífico ABC Ltda                              │  │ │
│  │  │    CNPJ: 12.345.678/0001-90 · Joinville/SC           │  │ │
│  │  │    📋 3 orçamentos anteriores (último: 15/03/2026)    │  │ │
│  │  │    [Selecionar] [Ver Histórico]                       │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 🏢 ABC Alimentos ME                                  │  │ │
│  │  │    CPF: 123.456.789-00 · São Paulo/SP                │  │ │
│  │  │    📋 1 orçamento anterior (12/01/2026)               │  │ │
│  │  │    [Selecionar] [Ver Histórico]                       │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  Não encontrou? → [+ Cadastrar Novo Cliente]               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ── OU ──                                                        │
│                                                                  │
│  ┌─ Novo Cliente (formulário rápido) ──────────────────────────┐ │
│  │  Razão Social/Nome*:  [_________________________]           │ │
│  │  CNPJ/CPF*:           [___.___.___/____-__]                │ │
│  │  Telefone*:           [(__) _____-____]                     │ │
│  │  E-mail:              [_________________________]           │ │
│  │  Cidade/UF*:          [▼ Busca IBGE]                       │ │
│  │  Endereço:            [_________________________]           │ │
│  │                                                             │ │
│  │  [Salvar e Continuar →]                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Comportamento ao Selecionar Cliente Existente

1. **Auto-preenche** todos os campos de cadastro (step Cadastro e Logística fica pré-populado)
2. **Mostra histórico** de orçamentos anteriores com status:
   - `submitted` — Enviado, aguardando
   - `processing` — Em análise
   - `completed` — Fechado/faturado
   - `cancelled` — Cancelado
3. **Permite "duplicar"** um orçamento anterior como base para o novo (ex: cliente quer a mesma câmara mas com dimensão diferente)
4. **Mantém vínculo**: o novo orçamento fica vinculado ao `client_id`

### Histórico do Cliente (Modal)

```
┌──────────────────────────────────────────────────────────────────┐
│  HISTÓRICO — Frigorífico ABC Ltda                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📋 SR-202603-0012     Status: ✅ Faturado                  │ │
│  │  Câmara com Sistema — 4.48×3.36×3.00m — R-404A             │ │
│  │  Enviado: 15/03/2026  │  Aprovado: 20/03/2026              │ │
│  │  [Duplicar como Base] [Ver Detalhes]                        │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  📋 SR-202601-0005     Status: ❌ Cancelado                 │ │
│  │  Walk In Cooler — 2.24×1.68×2.50m                          │ │
│  │  Enviado: 12/01/2026  │  Cancelado: 18/01/2026             │ │
│  │  [Duplicar como Base] [Ver Detalhes]                        │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  📋 SR-202512-0041     Status: 🔄 Processando              │ │
│  │  Túnel de Congelamento — 8.40×3.36×3.50m                   │ │
│  │  Enviado: 05/12/2025                                        │ │
│  │  [Duplicar como Base] [Ver Detalhes]                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Fechar]  [Usar dados deste cliente + Novo Orçamento →]        │
└──────────────────────────────────────────────────────────────────┘
```

### Duplicar como Base

Quando o usuário clica "Duplicar como Base":
1. Carrega o `form_data` do orçamento selecionado
2. Pré-preenche TODOS os steps do novo wizard com esses dados
3. Remove campos que devem ser únicos (protocol, submitted_at, session_id)
4. Usuário pode alterar o que quiser antes de submeter
5. Ideal para: mesmo cliente, equipamento similar com ajustes

### Tabela de Clientes (Nova)

```sql
CREATE TABLE IF NOT EXISTS saorafael_clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  cnpj_cpf    TEXT UNIQUE,
  inscricao_estadual TEXT,
  telefone    TEXT,
  email       TEXT,
  cidade      TEXT,
  estado      TEXT,
  cep         TEXT,
  endereco    TEXT,
  contato_nome TEXT,
  contato_telefone TEXT,
  contato_email TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Busca por CNPJ, razão social ou telefone
CREATE INDEX idx_saorafael_clients_cnpj ON saorafael_clients (cnpj_cpf);
CREATE INDEX idx_saorafael_clients_razao ON saorafael_clients USING gin(razao_social gin_trgm_ops);
CREATE INDEX idx_saorafael_clients_telefone ON saorafael_clients (telefone);

-- Vincular submissions ao client
ALTER TABLE saorafael_wizard_submission ADD COLUMN client_id UUID REFERENCES saorafael_clients(id);
```

### Fluxo Completo Revisado

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. IDENTIFICAÇÃO DO CLIENTE                                     │
│     ├── Buscar existente → Auto-fill + histórico                │
│     └── Cadastrar novo → Formulário rápido                      │
│                                                                  │
│  2. SELEÇÃO DO PRODUTO (cards visuais)                           │
│     └── Define os steps subsequentes                            │
│                                                                  │
│  3. DADOS COMERCIAIS                                             │
│     └── Representante, comissão, origem contato                 │
│                                                                  │
│  4+ STEPS ESPECÍFICOS DO PRODUTO                                 │
│     └── Dimensões → Portas → Refrigeração → etc.               │
│                                                                  │
│  N. REVISÃO E ENVIO                                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Dados do formData V2 (com client)

```javascript
{
  client_id: 'uuid-do-cliente',           // vinculado
  client: {
    razao_social: 'Frigorífico ABC Ltda',
    cnpj_cpf: '12.345.678/0001-90',
    telefone: '(47) 3333-1234',
    email: 'compras@frigabc.com.br',
    cidade: 'Joinville',
    estado: 'SC',
    endereco: 'Rua Industrial, 500 - Distrito Industrial',
    contato_nome: 'Carlos Silva',
    contato_telefone: '(47) 99999-8888',
    contato_email: 'carlos@frigabc.com.br',
  },
  duplicated_from: 'SR-202603-0012',      // se duplicou de orçamento anterior
  product_type: 'camara_sistema',
  // ... demais steps
}
```

---

## 1. Fluxo Condicional por Tipo de Produto

### Problema Atual
- 6 steps fixos para qualquer produto
- Campos irrelevantes exibidos (ex: "estante" para túnel de congelamento)
- Usuário preenche informações genéricas sem contexto do equipamento

### Solução: Arquitetura de Steps Dinâmicos

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP: Seleção do Produto (cards visuais)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Câmara  │ │ Walk-In │ │ Túnel   │ │ Sala    │   ...         │
│  │ Frig.   │ │ Cooler  │ │ Congel. │ │ Climat. │              │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘              │
│       │            │            │            │                   │
│       ▼            ▼            ▼            ▼                   │
│  [Steps específicos por tipo de produto]                        │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de Produto (PRODUCT_TYPES)

| ID | Nome | Steps | Particularidades |
|----|------|-------|------------------|
| `camara_sistema` | Câmara com Sistema | comercial → cadastro → dimensões → portas/acessórios → refrigeração → instalação | Padrão completo |
| `walkin_cooler` | Walk In Cooler | comercial → cadastro → dimensões → portas/prateleiras → refrigeração (simplficada) → instalação | Temp 0~10°C, compressor hermético |
| `walkin_freezer` | Walk In Freezer | comercial → cadastro → dimensões → portas → refrigeração → instalação | Temp -25~-15°C, degelo obrigatório |
| `camara_modular` | Câmara Modular | comercial → cadastro → módulos visuais → portas → refrigeração → instalação | Dimensões por módulos drag-and-drop |
| `antecamara` | Antecâmara | comercial → cadastro → dimensões (simplificado) → portas → instalação | Sem refrigeração própria |
| `tunel_congelamento` | Túnel de Congelamento | comercial → cadastro → dimensões → esteiras/carros → refrigeração industrial → instalação | Campos de capacidade produtiva |
| `sala_climatizada` | Sala Climatizada | comercial → cadastro → dimensões → HVAC → instalação | Sem portas isotérmicas, foco em HVAC |

### Estrutura de Dados

```javascript
const PRODUCT_TYPES = {
  camara_sistema: {
    id: 'camara_sistema',
    label: 'Câmara com Sistema',
    icon: 'warehouse',        // lucide icon
    description: 'Câmara frigorífica completa com painel isotérmico e sistema de refrigeração',
    tempRange: { min: -35, max: 15 },
    steps: ['comercial', 'cadastro', 'dimensoes_visual', 'portas_visual', 'refrigeracao', 'instalacao'],
    requiredFields: { /* override de required por produto */ }
  },
  // ...
};

// Steps são módulos reutilizáveis
const STEP_MODULES = {
  comercial: { title: 'Dados Comerciais', component: 'StepComercial', fields: [...] },
  cadastro: { title: 'Cadastro e Logística', component: 'StepCadastro', fields: [...] },
  dimensoes_visual: { title: 'Dimensões', component: 'StepDimensoesVisual', fields: [...] },
  portas_visual: { title: 'Portas e Acessórios', component: 'StepPortasVisual', fields: [...] },
  refrigeracao: { title: 'Sistema de Refrigeração', component: 'StepRefrigeracao', fields: [...] },
  instalacao: { title: 'Instalação e Frete', component: 'StepInstalacao', fields: [...] },
  hvac: { title: 'Sistema HVAC', component: 'StepHVAC', fields: [...] },
  esteiras_carros: { title: 'Esteiras e Carros', component: 'StepEsteirasCarros', fields: [...] },
};
```

---

## 2. Componente Visual de Dimensões (StepDimensoesVisual)

### Conceito

Um SVG interativo que mostra a câmara em vista de **planta baixa** (2D top-down) + **corte lateral** (2D lateral).

```
┌──────────────────────────────────────────────────────────────────┐
│  VISTA DE PLANTA (Top-down)           │   CORTE LATERAL          │
│                                       │                          │
│  ◄─── comprimento ───►               │   ┌──────────────────┐   │
│  ┌─────────────────────┐             │   │                  │▲  │
│  │ ░░ Parede ░░░░░░░░░ │             │   │   INTERIOR       ││  │
│  │ ░ ┌───────────────┐ │             │   │                  ││ altura
│  │ ░ │               │ │ ▲           │   │                  ││  │
│  │ ░ │   INTERIOR    │ │ │           │   │                  │▼  │
│  │ ░ │               │ │ largura     │   └──────────────────┘   │
│  │ ░ │               │ │ │           │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│  │ ░ └───────────────┘ │ ▼           │   ←── espessura parede   │
│  │ ░░░░░░░░░░░░░░░░░░░ │             │                          │
│  └─────────────────────┘             │                          │
│     ←espessura→                       │                          │
│                                       │                          │
│  ┌─ Inputs ao lado ─────────────────────────────────────────┐   │
│  │ Comprimento Ext: [____] m    Comprimento Int: [auto] m   │   │
│  │ Largura Ext:     [____] m    Largura Int:     [auto] m   │   │
│  │ Altura Ext:      [____] m    Altura Int:      [auto] m   │   │
│  │ Espessura Painel: [▼ 100mm]                              │   │
│  │ Tipo Isolamento:  [▼ PU]                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Comportamento

1. Usuário digita **dimensão externa** → SVG atualiza proporcionalmente
2. **Espessura do painel** é selecionada → calcula dimensão interna automaticamente
3. As paredes do SVG refletem a espessura visualmente (proporção relativa)
4. Inputs de dimensão interna são **read-only** (calculados)
5. Hover em qualquer parede mostra tooltip com espessura/material
6. **Cores** diferenciam revestimento interno vs externo

### Cálculos Automáticos

```javascript
dimensao_interna = dimensao_externa - (2 * espessura_painel_em_metros)
volume_interno = comprimento_int * largura_int * altura_int
area_piso = comprimento_int * largura_int
area_total_paineis = 2*(C*A) + 2*(L*A) + (C*L) // sem piso ou com piso
```

### Dados Gerados

```javascript
{
  comprimento_ext: 4.48,       // input pelo usuário
  largura_ext: 3.36,           // input pelo usuário
  altura_ext: 3.00,            // input pelo usuário
  espessura_painel_mm: 100,    // selecionado
  tipo_isolamento: 'PU',       // selecionado
  comprimento_int: 4.28,       // calculado
  largura_int: 3.16,           // calculado
  altura_int: 2.90,            // calculado (desconta teto, se com piso desconta piso)
  volume_m3: 39.25,            // calculado
  area_piso_m2: 13.52,         // calculado
  area_paineis_m2: 57.8,       // calculado
  revestimento_interno: 'Galvalume',
  revestimento_externo: 'Galvalume',
  cor_revestimento: 'Branco',
  piso: 'Com Piso Isolado (100mm)',
}
```

---

## 3. Componente Visual de Portas (StepPortasVisual)

### Conceito

A mesma planta baixa do step anterior, mas agora o usuário **clica na parede** onde quer posicionar a porta.

```
┌──────────────────────────────────────────────────────────────────┐
│  POSICIONE AS PORTAS (clique em uma parede)                      │
│                                                                  │
│  ┌─────────────────────────────────────┐                        │
│  │        PAREDE NORTE                  │  ← clicável           │
│  │  ┌───────────────────────────────┐  │                        │
│  │  │                               │  │                        │
│P │  │                               │  │ P                      │
│A │  │       [Porta 1 aqui]          │  │ A                      │
│R │  │         🚪 800x2100           │  │ R                      │
│E │  │                               │  │ E                      │
│D │  │                               │  │ D                      │
│E │  │                               │  │ E                      │
│  │  │                               │  │                        │
│O │  └───────────────────────────────┘  │ L                      │
│E │         PAREDE SUL                   │ E                      │
│S │                                      │ S                      │
│T │                                      │ T                      │
│E │                                      │ E                      │
│  └──────────────────────────────────────┘                        │
│                                                                  │
│  ┌─ Portas Adicionadas ────────────────────────────────────────┐ │
│  │ 🚪 Porta 1: Giratória 800x2100 — Parede Oeste, centro     │ │
│  │    [Editar] [Remover]                                       │ │
│  │                                                             │ │
│  │ [+ Adicionar Porta]                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Fluxo de Interação

1. Usuário clica em uma **parede** → abre modal/popover
2. Modal pergunta:
   - Tipo de porta (Giratória, Correr, Vai-e-Vem, Expositora, etc.)
   - Dimensões (largura x altura)
   - Posição na parede (esquerda/centro/direita ou drag)
   - Acessórios (resistência batente, mola, visor, cortina PVC)
3. Porta aparece no SVG como ícone posicionado
4. Pode arrastar para reposicionar na parede
5. Pode adicionar múltiplas portas em paredes diferentes

### Dados Gerados

```javascript
{
  portas: [
    {
      id: 'porta_1',
      parede: 'oeste',          // norte|sul|leste|oeste
      posicao_percentual: 50,   // % da parede (0=canto esq, 100=canto dir)
      tipo: 'Giratória Isotérmica',
      largura_mm: 800,
      altura_mm: 2100,
      acessorios: ['Resistência no Batente', 'Visor'],
      sentido_abertura: 'interno',  // interno|externo
    }
  ]
}
```

---

## 4. Componente Visual de Prateleiras/Estantes (StepPrateleirasVisual)

### Conceito

Vista lateral da câmara mostrando as paredes internas. O usuário clica onde quer estantes e define níveis visualmente.

```
┌──────────────────────────────────────────────────────────────────┐
│  PRATELEIRAS (clique na parede para adicionar)                   │
│                                                                  │
│  CORTE LATERAL (vista interna - Parede Leste)                    │
│  ┌──────────────────────────────────────────────┐               │
│  │                                              │  3.00m        │
│  │  ┌──┐   ┌──┐   ┌──┐                        │               │
│  │  │▓▓│   │▓▓│   │▓▓│           ← estante 1  │  Nível 4      │
│  │  │▓▓│   │▓▓│   │▓▓│                        │  Nível 3      │
│  │  │▓▓│   │▓▓│   │▓▓│                        │  Nível 2      │
│  │  │▓▓│   │▓▓│   │▓▓│                        │  Nível 1      │
│  │  └──┘   └──┘   └──┘                        │               │
│  └──────────────────────────────────────────────┘               │
│                                                                  │
│  ┌─ Estantes Configuradas ─────────────────────────────────────┐ │
│  │ 📦 Estante 1: Inox 1200x500, 4 níveis — Parede Leste      │ │
│  │ 📦 Estante 2: Aramada 900x450, 5 níveis — Parede Norte    │ │
│  │ [+ Adicionar Estante]                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Ajuste de Níveis (Estante 1 selecionada) ─────────────────┐ │
│  │                                                             │ │
│  │   Níveis: [─────●─────] 4     Tipo: [▼ Macom Inox 1200]   │ │
│  │                                                             │ │
│  │   Espaçamento:  [▼ Igual]  ou  [Custom por nível]          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Componente Visual de Divisórias (StepDivisoriasVisual)

### Conceito

Sobre a planta baixa, o usuário clica para posicionar **divisórias internas** que criam compartimentos.

```
┌──────────────────────────────────────────────────────────────────┐
│  DIVISÓRIAS (clique para traçar uma divisória)                   │
│                                                                  │
│  ┌─────────────────────────────────────┐                        │
│  │                 │                    │                        │
│  │  Compartimento  │  Compartimento     │                        │
│  │      1          │       2            │                        │
│  │   -18°C         │     +2°C           │                        │
│  │                 │                    │                        │
│  │ (congelados)    │  (resfriados)      │                        │
│  │                 │                    │                        │
│  └─────────────────┼────────────────────┘                        │
│                    ▲                                             │
│                Divisória 1                                       │
│                (espessura 100mm)                                  │
│                                                                  │
│  ┌─ Compartimentos ────────────────────────────────────────────┐ │
│  │ Comp 1: 2.24m x 3.16m = 7.08m² — Congelados (-18°C)       │ │
│  │ Comp 2: 2.04m x 3.16m = 6.45m² — Resfriados (+2°C)        │ │
│  │                                                             │ │
│  │ [+ Adicionar Divisória]                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Fluxo

1. Usuário clica em "Adicionar Divisória"
2. Clica no ponto inicial (em uma parede ou outra divisória)
3. Arrasta até o ponto final (parede oposta)
4. Divisória aparece — define espessura e material
5. Cada compartimento gerado pode ter seu próprio **step de refrigeração** (temp, evaporador, etc.)

---

## 6. Opcionais e Extras (StepOpcionais)

### Conceito: Grid de cards toggle

```
┌──────────────────────────────────────────────────────────────────┐
│  OPCIONAIS (selecione o que deseja incluir)                      │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 🔔       │  │ 📷       │  │ 🌡️       │  │ 💡       │       │
│  │ Alarme   │  │ Câmera   │  │ Registr.  │  │ Iluminação│       │
│  │ Temp.    │  │ Interna  │  │ Dados     │  │ Extra    │       │
│  │          │  │          │  │           │  │          │       │
│  │ [✓ ON]   │  │ [ OFF]   │  │ [✓ ON]    │  │ [ OFF]   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 🚿       │  │ 🧊       │  │ 📊       │  │ 🔌       │       │
│  │ Cortina  │  │ Anti     │  │ Painel   │  │ Tomadas  │       │
│  │ PVC      │  │ Gelo     │  │ Controle │  │ Internas │       │
│  │          │  │ Porta    │  │ Digital  │  │          │       │
│  │ [ OFF]   │  │ [✓ ON]   │  │ [ OFF]   │  │ [ OFF]   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌─ Detalhes dos Opcionais Selecionados ──────────────────────┐ │
│  │ 🔔 Alarme: [▼ Sonoro + Visual]  Qtd.: [1]                 │ │
│  │ 🌡️ Registrador: [▼ Digital c/ Nuvem]  Pontos: [2]         │ │
│  │ 🧊 Anti-Gelo: [▼ Resistência batente + soleira]           │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Step de Refrigeração Contextual (StepRefrigeracao)

### Adaptações por Produto

| Campo | Câmara | Walk-In Cooler | Túnel |
|-------|--------|---------------|-------|
| Tipo Compressor | Todos | Hermético/Scroll | Semi-Hermético/Parafuso |
| Temperatura | -35~+15 | 0~+10 (fixo) | -40~-25 (fixo) |
| Degelo | Todos | Natural/Elétrico | Gás Quente/Água |
| Fluido | Todos | R-134a/R-404A | R-717/R-744/R-404A |
| Capacidade produtiva | N/A | N/A | kg/h obrigatório |
| Tempo ciclo | N/A | N/A | Obrigatório |

### Para Túnel: Campos Adicionais

- Capacidade produtiva (kg/h)
- Tempo de ciclo (minutos)
- Tipo de esteira/carro
- Temperatura entrada do produto
- Temperatura saída desejada

---

## 8. Arquitetura de Componentes (Implementação)

### Stack Proposta

```
front.html (SPA)
├── CSS: Variables + Component styles
├── HTML: Shell + dynamic render targets
└── JS:
    ├── ClientFinder        → Busca/cadastro de cliente + histórico
    ├── ProductSelector     → Tela de seleção de produto (cards)
    ├── WizardEngine        → Gerencia steps dinâmicos por produto
    ├── StepRenderer        → Renderiza fields (forms tradicionais)
    ├── DimensionVisual     → SVG interativo de dimensões
    ├── DoorPlacer          → SVG interativo de portas
    ├── ShelfConfigurator   → Configurador visual de estantes
    ├── DivisionPlacer      → SVG interativo de divisórias
    ├── OptionalsGrid       → Grid de cards de opcionais
    └── RefrigerationCalc   → Step de refrigeração contextual
```

### Fluxo Geral

```
1. ClientFinder.search() → Busca/cadastra cliente
2. ClientFinder.select(client) → Auto-fill dados + mostrar histórico
3. ProductSelector.select('camara_sistema') → Define tipo
4. WizardEngine.init(PRODUCT_TYPES['camara_sistema'])
5. WizardEngine.loadSteps() → ['comercial', 'dimensoes_visual', 'portas_visual', ...]
6. Para cada step:
   - Se step tem `component: 'StepDimensoesVisual'` → renderiza SVG
   - Se step tem `component: 'StepComercial'` → renderiza form tradicional
7. Dados de cada step ficam em formData[stepId]
8. Validação cruzada entre steps (AI + local)
9. Submit final com formData completo (client_id vinculado)
```

---

## 9. Reorganização dos Steps por Produto

### Câmara com Sistema / Walk-In / Câmara Modular

| # | Step | Tipo |
|---|------|------|
| 1 | **Identificação do Cliente** | Busca/cadastro + histórico |
| 2 | Seleção do Produto | Cards visuais |
| 3 | Dados Comerciais | Form tradicional |
| 4 | **Dimensões e Paredes** | SVG interativo |
| 5 | **Divisórias** (opcional) | SVG interativo |
| 6 | **Portas** | SVG interativo (clique na parede) |
| 7 | **Prateleiras/Estantes** | Visual (corte lateral) |
| 8 | **Opcionais** | Grid de cards |
| 9 | Refrigeração (por compartimento) | Form contextual |
| 10 | Instalação e Frete | Form tradicional |
| 11 | Revisão e Envio | Resumo visual |

### Túnel de Congelamento

| # | Step | Tipo |
|---|------|------|
| 1 | **Identificação do Cliente** | Busca/cadastro |
| 2 | Seleção do Produto | Cards |
| 3 | Dados Comerciais | Form |
| 4 | **Dimensões do Túnel** | SVG (mais largo que alto) |
| 5 | **Esteiras/Carros** | Visual (configurador) |
| 6 | **Capacidade Produtiva** | Form + calculadora |
| 7 | Refrigeração Industrial | Form contextual |
| 8 | Opcionais | Grid |
| 9 | Instalação e Frete | Form |
| 10 | Revisão e Envio | Resumo |

### Sala Climatizada

| # | Step | Tipo |
|---|------|------|
| 1 | **Identificação do Cliente** | Busca/cadastro |
| 2 | Seleção do Produto | Cards |
| 3 | Dados Comerciais | Form |
| 4 | **Dimensões** | SVG |
| 5 | **HVAC** | Form contextual |
| 6 | Opcionais | Grid |
| 7 | Instalação | Form |
| 8 | Revisão e Envio | Resumo |

### Antecâmara

| # | Step | Tipo |
|---|------|------|
| 1 | **Identificação do Cliente** | Busca/cadastro |
| 2 | Seleção do Produto | Cards |
| 3 | Dados Comerciais | Form |
| 4 | Dimensões | SVG |
| 5 | Portas (obrigatório: dupla porta) | SVG interativo |
| 6 | Opcionais | Grid |
| 7 | Instalação | Form |
| 8 | Revisão | Resumo |

---

## 10. Step de Revisão Visual (Novo)

Último step antes do envio — mostra um **resumo visual** de tudo:

```
┌──────────────────────────────────────────────────────────────────┐
│  REVISÃO DO ORÇAMENTO                                            │
│                                                                  │
│  ┌─ Resumo Visual ──────────────────────────────────────────┐   │
│  │  [Mini SVG da câmara com portas e divisórias]            │   │
│  │  4.48m x 3.36m x 3.00m — Painel PU 100mm               │   │
│  │  Volume: 39.25m³ — Área: 13.52m²                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Dados Comerciais ──────────┐ ┌─ Cliente ───────────────┐   │
│  │ Produto: Câmara com Sistema │ │ Razão: Frigo Ltda       │   │
│  │ Representante: João         │ │ CNPJ: 12.345.678/0001-90│   │
│  │ Comissão: 5%                │ │ Cidade: Joinville/SC    │   │
│  └─────────────────────────────┘ └────────────────────────────┘ │
│                                                                  │
│  ┌─ Acessórios ────────────────────────────────────────────────┐ │
│  │ 🚪 1x Porta Giratória 800x2100 — Parede Oeste             │ │
│  │ 📦 3x Estante Inox 1200x500, 4 níveis                     │ │
│  │ 🔔 Alarme Sonoro + Visual                                  │ │
│  │ 🌡️ Registrador Digital                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Refrigeração ─────────────────────────────────────────────┐ │
│  │ Comp 1: -18°C — Semi-Hermético Copeland — R-404A          │ │
│  │ Comp 2: +2°C — Hermético Embraco — R-134a                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [← Voltar]                          [✅ Enviar Orçamento]      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 11. Implementação Técnica (SVG)

### Motor SVG (DimensionEngine)

```javascript
class DimensionEngine {
  constructor(container) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.container = container;
    this.walls = { north: null, south: null, east: null, west: null };
    this.scale = 1; // pixels per meter
  }

  setDimensions({ comprimento, largura, espessura }) {
    // Calcular scale para caber no container
    // Desenhar retângulo externo
    // Desenhar retângulo interno (descontando espessura)
    // Adicionar cotas (dimension lines)
    // Adicionar labels
  }

  onWallClick(callback) {
    // Registrar click handlers nas 4 paredes
  }

  addDoor(wall, position, width) {
    // Desenhar abertura na parede
  }

  addDivision(from, to, thickness) {
    // Traçar linha de divisória
  }
}
```

### Responsividade

- SVG com viewBox dinâmico
- Container usa `aspect-ratio` para manter proporção
- Em mobile: stack vertical (planta + inputs abaixo)
- Touch-friendly: áreas de clique ampliadas (mínimo 44px)

---

## 12. Migração do Wizard Atual → V2

### Fase 0: Banco de Dados — Tabela de Clientes (0.5 dia)
- [ ] Criar tabela `saorafael_clients` (CNPJ, razão social, contato, endereço)
- [ ] Criar índices (trigrams para busca fuzzy por nome)
- [ ] Alterar `saorafael_wizard_submission` para incluir `client_id`
- [ ] Criar RPC `saorafael_search_clients(query TEXT)` para busca
- [ ] Criar RPC `saorafael_upsert_client(...)` para cadastro/atualização
- [ ] Criar RPC `saorafael_client_submissions(client_id UUID)` para histórico
- [ ] RLS policies (vendedor vê próprios clientes, admin vê todos)

### Fase 1: Infraestrutura + Cliente (2-3 dias)
- [ ] Criar `ClientFinder` — UI de busca com autocomplete
- [ ] Implementar busca por CNPJ/CPF (exato), razão social (fuzzy), telefone
- [ ] Mostrar histórico de orçamentos do cliente selecionado
- [ ] Botão "Duplicar como Base" → carrega form_data anterior no wizard
- [ ] Criar `PRODUCT_TYPES` e `STEP_MODULES`
- [ ] Criar `WizardEngine` (gerencia steps dinâmicos)
- [ ] Criar tela de seleção de produto (cards)
- [ ] Refatorar `formData` para ser indexado por step module ID

### Fase 2: Steps Visuais (3-5 dias)
- [ ] Criar `DimensionEngine` (SVG de planta + corte)
- [ ] Implementar `StepDimensoesVisual`
- [ ] Implementar `StepPortasVisual` (click-to-place)
- [ ] Implementar `StepPrateleirasVisual`
- [ ] Implementar `StepDivisoriasVisual`

### Fase 3: Lógica Condicional (2-3 dias)
- [ ] Steps diferentes por tipo de produto
- [ ] Fields required/hidden condicionais
- [ ] Validação cruzada adaptada
- [ ] Refrigeração contextual (por compartimento)

### Fase 4: Opcionais e Revisão (1-2 dias)
- [ ] Grid de opcionais com cards toggle
- [ ] Sub-configuração de cada opcional selecionado
- [ ] Step de Revisão visual com mini-SVG

### Fase 5: Integração (1-2 dias)
- [ ] AI validation adapter (novo schema → prompt update)
- [ ] Submit adapter (novo formData shape → backend)
- [ ] Session management (salvar/restaurar wizard v2)
- [ ] Backward compatibility (submissions antigas com formato v1)

---

## 13. Schema Resumido do formData V2

```javascript
{
  product_type: 'camara_sistema',
  version: 2,
  comercial: {
    representante: 'João Silva',
    tipo_produto: 'Câmara com Sistema',
    comissao_representante: 5,
    // ...
  },
  cadastro: {
    razao_social: 'Frigorífico ABC Ltda',
    cnpj_cpf: '12.345.678/0001-90',
    // ...
  },
  dimensoes: {
    comprimento_ext: 4.48,
    largura_ext: 3.36,
    altura_ext: 3.00,
    espessura_painel_mm: 100,
    tipo_isolamento: 'PU',
    comprimento_int: 4.28,  // calculado
    largura_int: 3.16,      // calculado
    altura_int: 2.90,       // calculado
    volume_m3: 39.25,       // calculado
    area_piso_m2: 13.52,    // calculado
    revestimento_interno: 'Galvalume',
    revestimento_externo: 'Galvalume',
    piso: 'Com Piso Isolado (100mm)',
  },
  divisorias: [
    { id: 'div1', eixo: 'vertical', posicao_m: 2.24, espessura_mm: 100 }
  ],
  portas: [
    { parede: 'oeste', posicao_pct: 50, tipo: 'Giratória', largura_mm: 800, altura_mm: 2100, acessorios: [...] }
  ],
  estantes: [
    { parede: 'leste', tipo: 'Macom Inox 1200x500', niveis: 4, quantidade: 3 }
  ],
  opcionais: {
    alarme: { ativo: true, tipo: 'Sonoro + Visual' },
    cortina_pvc: { ativo: false },
    registrador: { ativo: true, tipo: 'Digital c/ Nuvem', pontos: 2 },
    // ...
  },
  compartimentos: [
    {
      nome: 'Câmara 1 - Congelados',
      temperatura_setpoint: -18,
      produto_armazenado: 'Carnes bovinas',
      tipo_compressor: 'Semi-Hermético',
      marca: 'Copeland',
      tipo_evaporador: 'Forçado',
      tipo_condensador: 'Ar (Remoto)',
      tensao: '380V Trifásico',
      degelo: 'Elétrico',
      fluido: 'R-404A',
    }
  ],
  instalacao: {
    horario_entrega: 'Comercial (8h-17h)',
    tipo_frete: 'CIF (Incluso)',
    // ...
  }
}
```

---

## 14. Exportação de Lançamentos

### Funcionalidade

O painel de submissions deve permitir **exportar dados** em formato tabular (CSV/Excel) — todos ou selecionados.

### UI

```
┌──────────────────────────────────────────────────────────────────┐
│  ORÇAMENTOS ENVIADOS                        [🔍 Filtrar]         │
│                                                                  │
│  ┌─ Ações em Lote ─────────────────────────────────────────────┐ │
│  │ ☑ Selecionar Todos   │ 3 selecionados                      │ │
│  │ [📥 Exportar CSV] [📊 Exportar Excel] [🗑️ Excluir Sel.]    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ☑ │ SR-202604-0015 │ Cam. Sistema │ Frigo ABC │ 30/04/2026 │ │
│  │ ☐ │ SR-202604-0012 │ Walk-In Cool │ Latic XYZ │ 28/04/2026 │ │
│  │ ☑ │ SR-202603-0008 │ Túnel Congel │ Indústria │ 15/03/2026 │ │
│  │ ☑ │ SR-202603-0005 │ Sala Climat  │ Hosp ABC  │ 10/03/2026 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [📥 Exportar Todos (12 registros)]                             │
└──────────────────────────────────────────────────────────────────┘
```

### Formatos de Exportação

#### CSV
- Separador: `;` (padrão PT-BR, abre direto no Excel)
- Encoding: UTF-8 com BOM (para Excel reconhecer acentos)
- Uma linha por orçamento, colunas achatadas (flat)

#### Excel (XLSX)
- Usando lib `SheetJS` (xlsx) carregada via CDN
- Abas separadas: "Resumo" + "Dados Completos"
- Formatação: cabeçalho em negrito, largura auto

### Colunas da Exportação

| Coluna | Origem |
|--------|--------|
| Protocolo | `protocol` |
| Status | `status` |
| Data Envio | `submitted_at` |
| Cliente | `form_data.step2.razao_social` |
| CNPJ/CPF | `form_data.step2.cnpj_cpf` |
| Cidade/UF | `form_data.step2.cidade` + `estado` |
| Tipo Produto | `form_data.step1.tipo_produto` |
| Comprimento | `form_data.step3.comprimento` |
| Largura | `form_data.step3.largura` |
| Altura | `form_data.step3.altura` |
| Espessura | `form_data.step3.espessura_painel` |
| Temperatura | `form_data.step6.compartimentos[0].temperatura_setpoint` |
| Representante | `form_data.step1.representante` |
| Comissão Rep. | `form_data.step1.comissao_representante` |
| Porta Tipo | `form_data.step4.porta_tipo` |
| Frete | `form_data.step5.tipo_frete` |
| Observações | `notes` |

### Implementação (Front-end)

```javascript
function exportSubmissionsCSV(submissions) {
  const BOM = '\uFEFF';
  const headers = ['Protocolo','Status','Data Envio','Cliente','CNPJ/CPF',
    'Cidade','UF','Tipo Produto','Comp.(m)','Larg.(m)','Alt.(m)',
    'Espessura(mm)','Temperatura(°C)','Representante','Comissão(%)','Porta','Frete'];
  
  const rows = submissions.map(s => {
    const fd = s.form_data || {};
    const s1 = fd.step1 || {};
    const s2 = fd.step2 || {};
    const s3 = fd.step3 || {};
    const s4 = fd.step4 || {};
    const s5 = fd.step5 || {};
    const s6 = fd.step6 || {};
    const comp = (s6.compartimentos || [])[0] || {};
    return [
      s.protocol, s.status,
      new Date(s.submitted_at).toLocaleDateString('pt-BR'),
      s2.razao_social, s2.cnpj_cpf, s2.cidade, s2.estado,
      s1.tipo_produto, s3.comprimento, s3.largura, s3.altura,
      s3.espessura_painel, comp.temperatura_setpoint,
      s1.representante, s1.comissao_representante,
      s4.porta_tipo, s5.tipo_frete
    ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(';');
  });

  const csv = BOM + headers.join(';') + '\n' + rows.join('\n');
  downloadFile(csv, 'orcamentos_saorafael.csv', 'text/csv;charset=utf-8');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Seleção Múltipla

- Checkbox em cada linha da tabela de submissions
- "Selecionar Todos" no topo
- Barra de ações aparece quando ≥1 selecionado
- Exportar selecionados OU exportar todos

---

## 15. Integridade de Dados do Cliente (Anti-Mistura)

### Problema

Ao selecionar um cliente do autocomplete, os campos são preenchidos automaticamente. Porém, o usuário pode alterar manualmente apenas alguns campos (ex: mudar o telefone para o de outro cliente, ou digitar outro endereço) criando um registro "frankenstein" com dados de clientes distintos misturados.

### Solução: Lock + Reset + Validação de Consistência

#### 15.1 Comportamento ao selecionar um cliente existente

1. **Lock visual**: Campos preenchidos pelo autocomplete ganham borda verde + ícone 🔒
2. **Lock lógico**: `formData._client_id` é setado, `formData._client_locked = true`
3. **Se o usuário tentar editar um campo bloqueado**, aparece um prompt:
   - "Você está alterando dados do cliente **Frigorífico ABC Ltda**. Deseja:"
   - `[Atualizar cadastro do cliente]` → salva a alteração no cliente existente
   - `[Criar novo cliente]` → limpa todos campos, desvincula `_client_id`, permite preencher do zero
   - `[Cancelar]` → reverte a edição

#### 15.2 Campos protegidos (grupo de integridade)

Estes campos formam um "bloco" que deve pertencer a UM único cliente:

| Campo | Grupo |
|-------|-------|
| `razao_social` | Identidade |
| `cnpj_cpf` | Identidade |
| `inscricao_estadual` | Identidade |
| `contato_nome` | Contato |
| `contato_telefone` | Contato |
| `contato_email` | Contato |
| `endereco_entrega` | Endereço |
| `cidade` | Endereço |
| `estado` | Endereço |
| `cep` | Endereço |

#### 15.3 Regras de Validação

- **Ao avançar do step 2**: se `_client_id` está setado, verificar se os campos ainda correspondem ao cliente
- **Se algum campo do grupo "Identidade" foi alterado** (razão social ou CNPJ), forçar decisão (atualizar ou criar novo)
- **Se apenas campos do grupo "Contato" ou "Endereço" mudam**, pode ser atualização legítima do cadastro
- **CNPJ duplicado**: se o usuário digita um CNPJ que já pertence a outro cliente → alerta + sugere selecionar o existente

#### 15.4 UI do Campo Bloqueado

```
┌──────────────────────────────────────────────────────────────────┐
│  🔒 Razão Social          [Cliente vinculado: Frigo ABC Ltda]    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Frigorífico ABC Ltda                              🔓 ✏️  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  🔒 CNPJ/CPF                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 12.345.678/0001-90                                🔓 ✏️  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🏢 Cliente vinculado: Frigorífico ABC Ltda                  │ │
│  │    3 orçamentos anteriores                                  │ │
│  │    [🔄 Trocar Cliente] [📋 Ver Histórico]                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### 15.5 "Trocar Cliente" (Reset)

Ao clicar "Trocar Cliente":
1. Limpa TODOS os campos do step 2
2. Remove `_client_id` e `_client_locked`
3. Foco volta para o campo Razão Social
4. Usuário pode buscar outro ou preencher do zero

#### 15.6 Validação no Submit

Antes de enviar o orçamento:
- Se `_client_id` existe → verificar se dados batem. Se não batem, forçar "Atualizar" ou "Criar Novo"
- Se `_client_id` não existe → criar novo cliente automaticamente via `saorafael_upsert_client()`
- **Nunca** submeter um orçamento com dados parciais de clientes diferentes

#### 15.7 Implementação (Front)

```javascript
// Ao selecionar cliente do autocomplete:
function lockClientFields(panel) {
  const fields = ['razao_social', 'cnpj_cpf', 'inscricao_estadual', 
    'contato_nome', 'contato_telefone', 'contato_email',
    'endereco_entrega', 'cidade', 'estado', 'cep'];
  
  fields.forEach(f => {
    const el = panel.querySelector(`[data-field-name="${f}"]`);
    if (el && el.value) {
      el.classList.add('client-locked');
      el.dataset.originalValue = el.value; // para detectar alteração
    }
  });
  formData._client_locked = true;
}

// Ao editar campo bloqueado:
function onLockedFieldEdit(fieldName, newValue, originalValue) {
  if (newValue === originalValue) return;
  
  showClientEditPrompt(fieldName, newValue, () => {
    // Opção: Atualizar cliente
    updateClientField(formData._client_id, fieldName, newValue);
  }, () => {
    // Opção: Novo cliente
    clearClientLock();
  });
}
```

---

## 16. Prioridade de Implementação Recomendada

1. **🔴 Alta** — Tabela de clientes + busca/cadastro (fundação CRM)
2. **🔴 Alta** — Integridade dados do cliente (anti-mistura)
3. **🔴 Alta** — Seleção de produto + steps condicionais (engine)
4. **🔴 Alta** — SVG de dimensões (maior impacto visual imediato)
5. **🟠 Média** — Histórico do cliente + duplicar orçamento
6. **🟠 Média** — Exportação de lançamentos (CSV/Excel)
7. **🟠 Média** — Portas clicáveis no SVG
8. **🟠 Média** — Opcionais como cards
9. **🟡 Normal** — Divisórias visuais
10. **🟡 Normal** — Prateleiras visual
11. **🟢 Nice-to-have** — Step de Revisão com mini-SVG
12. **🟢 Nice-to-have** — Drag-and-drop de módulos (câmara modular)

---

## Próximo Passo
