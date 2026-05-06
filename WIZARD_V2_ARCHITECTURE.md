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

## 17. Análise Inteligente de Viabilidade (Reality Check Engine)

### 17.1 Objetivo

Conforme o representante preenche o wizard, o agente deve **analisar em tempo real** se as dimensões, acessórios e usos pretendidos da câmara fazem sentido em conjunto, evitando orçamentos com configurações:

- Tecnicamente impossíveis (ex: piso "sem isolamento" a -18°C)
- Subdimensionadas (ex: câmara de 80m³ com porta de 800mm para uso com empilhadeira)
- Superdimensionadas (ex: cliente quer guardar 200kg de carne mas pediu uma câmara de 60m³)
- Comercialmente inviáveis (ex: hermético com carga térmica acima de 15.000 Kcal/h)
- Fora da grade modular São Rafael (ex: 3,50m de comprimento — não é múltiplo de 0,28)

A ideia é que o representante receba **feedback imediato e didático**, similar a um "code linter", antes de avançar para o próximo step.

### 17.2 Arquitetura — Camadas de Validação

```
┌──────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — Validação Local (síncrona, instantânea)              │
│  ├── ModularGridValidator     (grade 0,28m / altura 0,05m)      │
│  ├── PanelThicknessValidator  (espessura vs temperatura)        │
│  ├── FloorValidator           (piso vs temperatura/uso)         │
│  ├── DoorValidator            (porta vs temperatura/uso)        │
│  ├── RefrigerationValidator   (compressor vs carga térmica)    │
│  ├── AccessoryValidator       (acessórios obrigatórios/proib.) │
│  └── CapacityValidator        (volume vs uso pretendido)        │
│                                                                  │
│  CAMADA 2 — Cálculos Derivados (motor de física)                 │
│  ├── ThermalLoadCalculator    (carga térmica + correções)       │
│  ├── VolumeCalculator         (volume útil descontando estantes)│
│  ├── PowerEstimator           (potência elétrica estimada kW)   │
│  └── UseCaseFitScore          (0-100, encaixe com o uso)        │
│                                                                  │
│  CAMADA 3 — Análise por IA (assíncrona, deep reasoning)          │
│  ├── Validação cruzada multi-step                               │
│  ├── Sugestões de otimização                                    │
│  ├── Detecção de incoerências comerciais                        │
│  └── Comparação com casos similares (RAG)                       │
└──────────────────────────────────────────────────────────────────┘
```

A Camada 1 e 2 rodam 100% no front-end (sem latência). A Camada 3 é acionada ao final de cada step (debounce ~800ms) e na revisão final.

### 17.3 Severidade dos Alertas

| Nível | Cor | Comportamento | Exemplo |
|-------|-----|---------------|---------|
| `error` | 🔴 Vermelho | **Bloqueia avanço** do step | Piso "sem isolamento" + temperatura -18°C |
| `warning` | 🟠 Laranja | Avança, mas exige confirmação | Compressão hermético com carga 14.500 Kcal/h (próximo do limite) |
| `info` | 🔵 Azul | Apenas informativo | "Sua câmara terá ~39m³ de volume útil" |
| `suggestion` | 🟢 Verde | Recomendação otimizada | "Usar PIR 125mm em vez de PU 150mm: mesma performance, 17% mais leve" |

### 17.4 Regras de Validação (Catálogo)

#### A. Grade Modular (`ModularGridValidator`)

```javascript
function validateModularGrid({ comprimento, largura, altura }) {
  const issues = [];
  const checkPlanta = (label, val) => {
    const mod = (val - 1.12) / 0.28;
    if (Math.abs(mod - Math.round(mod)) > 0.01) {
      const sugLow  = 1.12 + Math.floor(mod) * 0.28;
      const sugHigh = 1.12 + Math.ceil(mod)  * 0.28;
      issues.push({
        level: 'error',
        field: label,
        message: `${label} ${val}m fora da grade modular. Sugestões: ${sugLow.toFixed(2)}m ou ${sugHigh.toFixed(2)}m.`,
        autofix: { value: sugHigh.toFixed(2) }
      });
    }
  };
  checkPlanta('comprimento', comprimento);
  checkPlanta('largura', largura);

  if (altura < 2.00 || altura > 6.00) {
    issues.push({ level: 'error', field: 'altura',
      message: `Altura ${altura}m fora dos limites (2,00m a 6,00m).` });
  } else if (Math.abs((altura * 100) % 5) > 0.5) {
    issues.push({ level: 'warning', field: 'altura',
      message: `Altura deve ser múltipla de 0,05m.` });
  }
  return issues;
}
```

#### B. Espessura de Painel × Temperatura (`PanelThicknessValidator`)

Mapa mínimo (PU; PIR permite -25mm):

```javascript
const MIN_THICKNESS_PU = [
  { tempMax:  25, tempMin:  15, mm:  50 },
  { tempMax:  15, tempMin:   5, mm:  75 },
  { tempMax:   5, tempMin:   0, mm:  75 },
  { tempMax:   0, tempMin:  -5, mm: 100 },
  { tempMax:  -5, tempMin: -18, mm: 125 },
  { tempMax: -18, tempMin: -25, mm: 150 },
  { tempMax: -25, tempMin: -35, mm: 175 },
  { tempMax: -35, tempMin: -45, mm: 200 },
];

function validatePanelThickness({ temperatura_setpoint, espessura_painel_mm, tipo_isolamento }) {
  const row = MIN_THICKNESS_PU.find(r => temperatura_setpoint >= r.tempMin && temperatura_setpoint < r.tempMax);
  const minMm = (tipo_isolamento === 'PIR') ? row.mm - 25 : row.mm;
  if (espessura_painel_mm < minMm) {
    return [{
      level: 'error',
      message: `Espessura ${espessura_painel_mm}mm é insuficiente para ${temperatura_setpoint}°C. Mínimo: ${minMm}mm (${tipo_isolamento}).`,
      autofix: { espessura_painel_mm: minMm }
    }];
  }
  if (espessura_painel_mm > minMm + 50) {
    return [{
      level: 'suggestion',
      message: `Espessura ${espessura_painel_mm}mm pode estar superdimensionada. ${minMm}mm já atende ${temperatura_setpoint}°C — economia de ~${Math.round((espessura_painel_mm - minMm)/espessura_painel_mm*100)}% em material.`
    }];
  }
  return [];
}
```

#### C. Piso × Temperatura × Uso (`FloorValidator`)

```javascript
function validateFloor({ piso, temperatura_setpoint, area_piso_m2, usa_empilhadeira }) {
  const issues = [];
  if (temperatura_setpoint < 0 && piso === 'sem_piso') {
    issues.push({ level: 'error', field: 'piso',
      message: `Temperatura ${temperatura_setpoint}°C exige piso isolado. "Sem piso" provoca condensação e destruição do contrapiso.`,
      autofix: { piso: temperatura_setpoint < -18 ? 'piso_reforcado_100mm' : 'piso_isolado_75mm' }
    });
  }
  if (usa_empilhadeira && piso !== 'piso_reforcado') {
    issues.push({ level: 'error', field: 'piso',
      message: `Operação com empilhadeira (carga >5 ton/m²) requer piso reforçado.` });
  }
  if (area_piso_m2 > 9 && piso === 'sem_piso' && temperatura_setpoint >= 0) {
    issues.push({ level: 'warning',
      message: `Câmaras > 9m² sem piso isolado: tempo de descida de temperatura aumenta significativamente.` });
  }
  if (temperatura_setpoint < -18 && piso === 'piso_isolado_75mm') {
    issues.push({ level: 'warning',
      message: `Para -18°C ou menos, recomenda-se piso 100mm + barreira de vapor + aquecimento de solo.` });
  }
  return issues;
}
```

#### D. Carga Térmica e Compressor (`ThermalLoadCalculator` + `RefrigerationValidator`)

```javascript
function calculateThermalLoad({ volume_m3, temperatura_setpoint, fatores }) {
  const FACTOR_TABLE = [
    { tempMin:  15, tempMax:  25, factor: 30 },
    { tempMin:   5, tempMax:  15, factor: 50 },
    { tempMin:   0, tempMax:   5, factor: 70 },
    { tempMin: -18, tempMax:   0, factor: 95 },
    { tempMin: -25, tempMax: -18, factor: 125 },
    { tempMin: -35, tempMax: -25, factor: 250 },
    { tempMin: -45, tempMax: -35, factor: 380 },
  ];
  const row = FACTOR_TABLE.find(r => temperatura_setpoint >= r.tempMin && temperatura_setpoint < r.tempMax);
  let carga = volume_m3 * row.factor;

  // Correções
  if (fatores.porta_alta_frequencia) carga *= 1.25;
  if (fatores.produto_quente)        carga *= 1.30;
  if (fatores.iluminacao_intensa)    carga *= 1.08;
  if (fatores.muitas_pessoas)        carga *= 1.12;
  if (fatores.empilhadeira_interna)  carga *= 1.12;
  if (fatores.parede_externa_sol)    carga *= 1.15;

  carga *= 1.10; // fator de segurança

  return { kcal_h: Math.round(carga), kw_termico: +(carga / 860).toFixed(2) };
}

function validateCompressor({ kcal_h, tipo_compressor, tensao }) {
  const issues = [];
  const ranges = {
    hermetico:     [500, 15000],
    scroll:        [5000, 50000],
    semi_hermetico:[10000, 150000],
    parafuso:      [50000, 500000],
  };
  const [min, max] = ranges[tipo_compressor] || [0, Infinity];
  if (kcal_h < min) {
    issues.push({ level: 'warning', message: `Compressor ${tipo_compressor} superdimensionado para ${kcal_h} Kcal/h. Considere uma classe abaixo.` });
  }
  if (kcal_h > max) {
    issues.push({ level: 'error', message: `Compressor ${tipo_compressor} subdimensionado: carga ${kcal_h} Kcal/h excede máximo de ${max}.`, autofix: { tipo_compressor: kcal_h > 150000 ? 'parafuso' : kcal_h > 50000 ? 'semi_hermetico' : 'scroll' } });
  }
  if ((tipo_compressor === 'parafuso' || tipo_compressor === 'semi_hermetico') && tensao === '220V Mono') {
    issues.push({ level: 'error', message: `${tipo_compressor} não existe em 220V Monofásico. Requer 380V ou 440V Trifásico.` });
  }
  return issues;
}
```

#### E. Porta × Temperatura × Uso (`DoorValidator`)

```javascript
function validateDoor({ porta, temperatura_setpoint, altura_camara, largura_camara, usa_empilhadeira, usa_paleteira, frequencia_abertura_hora }) {
  const issues = [];

  // Vedação proibida em baixa temperatura
  if (temperatura_setpoint < -10 && ['vai_e_vem', 'expositora_vidro'].includes(porta.tipo)) {
    issues.push({ level: 'error', field: 'porta_tipo',
      message: `Porta "${porta.tipo}" é proibida abaixo de -10°C (vedação inadequada, condensação, gelo).`,
      autofix: { tipo: 'giratoria_isotermica' } });
  }

  // Alturas/larguras
  const alturaMaxima = (altura_camara * 1000) - 200;
  if (porta.altura_mm > alturaMaxima) {
    issues.push({ level: 'error',
      message: `Altura da porta (${porta.altura_mm}mm) excede limite (câmara ${altura_camara}m → max ${alturaMaxima}mm).` });
  }
  const larguraMinCamara = Math.min(largura_camara, /*comprimento já validado*/ 999) * 1000;
  if (porta.largura_mm > larguraMinCamara - 300) {
    issues.push({ level: 'error',
      message: `Largura da porta (${porta.largura_mm}mm) deixa menos de 300mm de montante na parede.` });
  }

  // Uso vs dimensão da porta
  if (usa_empilhadeira && (porta.largura_mm < 2400 || porta.altura_mm < 3000)) {
    issues.push({ level: 'error',
      message: `Empilhadeira exige porta mínima 2400×3000mm. Atual: ${porta.largura_mm}×${porta.altura_mm}mm.` });
  }
  if (usa_paleteira && !usa_empilhadeira && (porta.largura_mm < 1500 || porta.altura_mm < 2200)) {
    issues.push({ level: 'warning',
      message: `Paleteira exige porta mínima 1500×2200mm. Atual: ${porta.largura_mm}×${porta.altura_mm}mm.` });
  }

  // Cortina PVC em alta frequência
  if (frequencia_abertura_hora >= 20 && !porta.cortina_pvc) {
    issues.push({ level: 'suggestion',
      message: `Frequência ${frequencia_abertura_hora} aberturas/h: instalar cortina PVC reduz consumo em ~15-25%.` });
  }
  return issues;
}
```

#### F. Capacidade × Uso Pretendido (`CapacityValidator` + `UseCaseFitScore`)

Esta é a validação **mais "humana"** — verifica se o tamanho da câmara faz sentido para o que o cliente declara que vai armazenar.

```javascript
// Densidade de armazenamento (kg/m³ de volume útil) por categoria
const STORAGE_DENSITY = {
  carne_carcaca:     180,  // pendurada, com folga
  carne_caixa:       350,
  pescado_caixa:     400,
  laticinios:        300,
  hortifruti:        250,  // requer ventilação
  congelados_caixa:  450,
  sorvete:           500,
  bebidas_garrafa:   600,
  farmacia_caixa:    250,
  flores:             80,  // muito volumoso
};

function validateCapacity({ volume_m3, categoria_produto, kg_estoque_alvo, num_estantes, tem_corredor }) {
  const issues = [];
  const densidade = STORAGE_DENSITY[categoria_produto] || 250;

  // Volume útil = 60-70% do bruto (corredores, evaporador, folga)
  const fatorUtil = tem_corredor ? 0.55 : 0.70;
  const volumeUtil = volume_m3 * fatorUtil;
  const capacidadeKg = Math.round(volumeUtil * densidade);

  if (kg_estoque_alvo) {
    const ratio = kg_estoque_alvo / capacidadeKg;
    if (ratio > 1.10) {
      issues.push({ level: 'error',
        message: `Câmara subdimensionada: comporta ~${capacidadeKg}kg, mas precisa de ${kg_estoque_alvo}kg (${Math.round(ratio*100)}% da capacidade).`,
        autofix_suggestion: `Aumentar comprimento ou largura em ~${Math.ceil((ratio-1)*100)}%.`
      });
    } else if (ratio < 0.40) {
      issues.push({ level: 'warning',
        message: `Câmara muito superdimensionada: comporta ~${capacidadeKg}kg, mas usará apenas ${kg_estoque_alvo}kg (${Math.round(ratio*100)}%). Custo desnecessário em material e refrigeração.`
      });
    } else if (ratio < 0.65) {
      issues.push({ level: 'info',
        message: `Você usará ~${Math.round(ratio*100)}% da capacidade. Há folga para crescimento.`
      });
    } else {
      issues.push({ level: 'info',
        message: `Câmara bem dimensionada: ${kg_estoque_alvo}kg em ~${capacidadeKg}kg de capacidade (${Math.round(ratio*100)}%).`
      });
    }
  }

  // Coerência número de estantes
  if (num_estantes && volume_m3 > 0) {
    const estantes_por_m3 = num_estantes / volume_m3;
    if (estantes_por_m3 > 0.5) {
      issues.push({ level: 'warning',
        message: `Densidade de estantes alta (${num_estantes} em ${volume_m3.toFixed(1)}m³). Pode prejudicar circulação de ar e descida de temperatura.` });
    }
  }
  return issues;
}
```

#### G. Coerência de Acessórios (`AccessoryValidator`)

```javascript
function validateAccessories({ temperatura_setpoint, opcionais, categoria_produto, segmento_cliente }) {
  const issues = [];

  // Alarme obrigatório em farmácia/hospital
  if (['farmaceutica', 'hospitalar', 'banco_sangue', 'vacinas'].includes(segmento_cliente)
      && !opcionais.alarme?.ativo) {
    issues.push({ level: 'error',
      message: `Segmento ${segmento_cliente}: ANVISA exige alarme + datalogger.`,
      autofix: { 'opcionais.alarme': { ativo: true, tipo: 'Sonoro+Visual+Datalogger Certificado' } } });
  }

  // Cortina anti-inseto + freezer = inviável
  if (temperatura_setpoint < 0 && opcionais.cortina_pvc?.tipo === 'anti_inseto') {
    issues.push({ level: 'error',
      message: `Cortina anti-inseto não funciona abaixo de 0°C. Use cortina Polar.`,
      autofix: { 'opcionais.cortina_pvc.tipo': 'polar' } });
  }

  // Iluminação extra sem necessidade
  if (opcionais.iluminacao_extra?.ativo && opcionais.alarme?.ativo === false
      && segmento_cliente === 'restaurante') {
    issues.push({ level: 'suggestion',
      message: `Cliente restaurante: alarme tem mais retorno que iluminação extra (perda de produto).` });
  }
  return issues;
}
```

### 17.5 Use Case Fit Score (0–100)

Pontuação consolidada que aparece no Step de Revisão como um "selo de qualidade" do orçamento.

```javascript
function computeFitScore(formData) {
  const allIssues = runAllValidators(formData);
  let score = 100;
  for (const it of allIssues) {
    if (it.level === 'error')      score -= 20;
    if (it.level === 'warning')    score -= 7;
    if (it.level === 'info')       score -= 0;
    if (it.level === 'suggestion') score -= 2;
  }
  // Bônus por preenchimento completo + coerência cruzada
  if (formData._client_id)                score += 3;
  if (formData.dimensoes && formData.compartimentos?.length) score += 2;
  return Math.max(0, Math.min(100, score));
}

// Faixas de qualidade
// 90-100: Excelente — pode submeter sem ressalvas
// 70-89:  Bom — alguns avisos, revisar
// 50-69:  Atenção — múltiplos avisos, requer confirmação
// 0-49:   Bloqueado — erros críticos, não pode enviar
```

### 17.6 Engine Orquestrador (`RealityCheckEngine`)

```javascript
class RealityCheckEngine {
  constructor(formData) {
    this.formData = formData;
    this.issues = [];
    this.derived = {};
  }

  run() {
    const { dimensoes, compartimentos, portas, opcionais, uso, instalacao } = this.formData;

    // Cálculos derivados (Camada 2)
    if (dimensoes) {
      this.derived.volume_m3 = dimensoes.volume_m3;
      this.derived.area_piso_m2 = dimensoes.area_piso_m2;
    }
    if (compartimentos?.[0] && dimensoes) {
      const carga = calculateThermalLoad({
        volume_m3: this.derived.volume_m3,
        temperatura_setpoint: compartimentos[0].temperatura_setpoint,
        fatores: this.collectThermalFactors()
      });
      this.derived.carga_termica = carga;
    }

    // Validações locais (Camada 1)
    if (dimensoes) this.collect(validateModularGrid(dimensoes));
    if (dimensoes && compartimentos?.[0]) {
      this.collect(validatePanelThickness({
        temperatura_setpoint: compartimentos[0].temperatura_setpoint,
        espessura_painel_mm: dimensoes.espessura_painel_mm,
        tipo_isolamento: dimensoes.tipo_isolamento,
      }));
      this.collect(validateFloor({
        piso: dimensoes.piso,
        temperatura_setpoint: compartimentos[0].temperatura_setpoint,
        area_piso_m2: this.derived.area_piso_m2,
        usa_empilhadeira: uso?.empilhadeira,
      }));
    }
    (portas || []).forEach(p => this.collect(validateDoor({ porta: p, /* ... */ })));
    if (this.derived.carga_termica && compartimentos?.[0]) {
      this.collect(validateCompressor({
        kcal_h: this.derived.carga_termica.kcal_h,
        tipo_compressor: compartimentos[0].tipo_compressor,
        tensao: instalacao?.tensao,
      }));
    }
    if (uso) this.collect(validateCapacity({ volume_m3: this.derived.volume_m3, ...uso }));
    this.collect(validateAccessories({ ...this.formData }));

    this.derived.fit_score = computeFitScore(this.formData);
    return { issues: this.issues, derived: this.derived };
  }

  collect(arr) { this.issues.push(...(arr || [])); }
  collectThermalFactors() {
    const f = {};
    const portas = this.formData.portas || [];
    f.porta_alta_frequencia = portas.some(p => (p.frequencia_abertura_hora || 0) > 10);
    f.produto_quente = !!this.formData.uso?.produto_quente_entrada;
    f.iluminacao_intensa = !!this.formData.opcionais?.iluminacao_extra?.ativo;
    f.muitas_pessoas = (this.formData.uso?.pessoas_simultaneas || 0) > 3;
    f.empilhadeira_interna = !!this.formData.uso?.empilhadeira;
    f.parede_externa_sol = !!this.formData.instalacao?.parede_exposta_sol;
    return f;
  }
}
```

### 17.7 Novo Step: "Uso Pretendido" (Pré-Refrigeração)

Para alimentar o `CapacityValidator`, é necessário coletar **o que o cliente vai colocar dentro da câmara**. Esse step entra entre Dimensões e Refrigeração.

```
┌──────────────────────────────────────────────────────────────────┐
│  USO DA CÂMARA                                                   │
│                                                                  │
│  Categoria do Produto: [▼ Carne em caixa]                       │
│  Estoque alvo (kg):    [______ kg]   ou   [Estimar pelo volume] │
│  Giro semanal:         [▼ Alto / Médio / Baixo]                 │
│  Produto entra a:      [▼ Resfriado / Ambiente / Quente]        │
│                                                                  │
│  ┌─ Operação ────────────────────────────────────────────────┐  │
│  │ ☐ Empilhadeira elétrica                                   │  │
│  │ ☐ Paleteira manual                                        │  │
│  │ ☐ Movimentação só com carrinho                            │  │
│  │ ☐ Pessoas simultâneas:  [▼ 1-2 / 3-5 / >5]              │  │
│  │ Aberturas de porta/hora: [▼ <5 / 5-10 / 10-20 / >20]    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ 📊 Análise em tempo real ───────────────────────────────┐   │
│  │ Volume: 39,25m³  →  Volume útil: ~21,6m³                  │   │
│  │ Capacidade estimada: ~7.560kg de carne em caixa           │   │
│  │ Você informou: 5.000kg (66% da capacidade)                │   │
│  │ ✅ Bem dimensionada — folga para giro semanal alto       │   │
│  │                                                            │   │
│  │ Carga térmica estimada: 4.870 Kcal/h (5,7 kW)             │   │
│  │ Compressor sugerido: Scroll 220/380V Trifásico            │   │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 17.8 UI do Painel de Análise (Sidebar Persistente)

Em todos os steps a partir de Dimensões, um painel lateral fixo mostra o estado atual da análise:

```
┌────────────────────────────┐
│  📊 ANÁLISE DA CÂMARA     │
│  ─────────────────────     │
│  Volume:      39,25 m³     │
│  Área piso:   13,52 m²     │
│  Carga térm.: 4.870 Kcal/h │
│  Potência:    5,7 kW       │
│  Capacidade:  ~7.560 kg    │
│                            │
│  Fit Score: ████████░ 86   │
│                            │
│  ⚠️ 2 avisos               │
│  🔴 0 erros                │
│  💡 1 sugestão             │
│                            │
│  [Ver Detalhes ▼]          │
└────────────────────────────┘
```

### 17.9 Integração com IA (Camada 3)

A IA não substitui as validações locais — ela **complementa** com raciocínio que regras determinísticas não capturam:

- "Cliente é açougue de bairro mas pediu túnel de congelamento — provável erro de produto."
- "Câmara tem 80m³ mas cliente disse 'pequena loja'. Conferir se a área comporta."
- "Combinação Inox 304 + R-134a + farmacêutica — falta especificar protocolo IQ/OQ."

**Prompt de validação cruzada** (estende `system_prompt_wizard_validation.md`):

```
Você recebe o formData e o resultado de RealityCheckEngine.run().
Sua tarefa: identificar APENAS incoerências que as regras locais não capturaram.
Retorne JSON: { "ai_issues": [{level, field, message, suggestion}] }
NÃO repita issues já presentes em derived.issues.
NÃO sugira nada já em derived.issues.autofix.
```

A chamada acontece com debounce de 800ms ao final de cada step e novamente no Step de Revisão.

### 17.10 Schema de Output (`formData._reality_check`)

```javascript
{
  _reality_check: {
    timestamp: '2026-05-05T14:30:00Z',
    derived: {
      volume_m3: 39.25,
      area_piso_m2: 13.52,
      carga_termica: { kcal_h: 4870, kw_termico: 5.7 },
      capacidade_kg: 7560,
      fit_score: 86,
    },
    issues: [
      {
        level: 'warning',
        category: 'door',
        field: 'portas[0].largura_mm',
        message: 'Empilhadeira exige porta mínima 2400×3000mm.',
        autofix: { 'portas[0].largura_mm': 2400, 'portas[0].altura_mm': 3000 },
        source: 'local',
      },
      {
        level: 'suggestion',
        category: 'panel',
        message: 'PIR 125mm equivale a PU 150mm — economia de peso.',
        source: 'local',
      },
      {
        level: 'warning',
        category: 'cross_step',
        message: 'Cliente é açougue de bairro mas pediu túnel de congelamento.',
        source: 'ai',
      }
    ],
    blocking: false,  // true se algum issue for level='error'
  }
}
```

### 17.11 Bloqueio de Submit

```javascript
function canSubmit(formData) {
  const rc = formData._reality_check;
  if (!rc) return false;                // não rodou ainda
  if (rc.blocking) return false;        // tem erro crítico
  if (rc.derived.fit_score < 50) return false;
  return true;
}
```

Erros (`level: 'error'`) **bloqueiam o avanço** do step atual. Warnings exigem que o usuário marque um checkbox "Estou ciente e desejo prosseguir mesmo assim". O motivo é registrado em `formData._reality_check.acknowledgements`.

### 17.12 Fases de Implementação

| Fase | Entregáveis | Esforço |
|------|------------|---------|
| 17-A | `ModularGridValidator`, `PanelThicknessValidator`, `FloorValidator` (regras óbvias e bloqueantes) | 1 dia |
| 17-B | `ThermalLoadCalculator` + `RefrigerationValidator` + sidebar de análise | 1-2 dias |
| 17-C | Step "Uso Pretendido" + `CapacityValidator` + `UseCaseFitScore` | 1-2 dias |
| 17-D | `DoorValidator` + `AccessoryValidator` + autofix UI | 1 dia |
| 17-E | Integração IA (Camada 3) + prompt de validação cruzada + bloqueio de submit | 1-2 dias |
| 17-F | Persistência do `_reality_check` no submission + exibição no painel admin | 0,5 dia |

### 17.13 Prioridade

🔴 **Alta** — Após Fase 1 (Engine + Cliente) e Fase 2 (SVG Dimensões), o RealityCheckEngine é o **diferencial competitivo** do wizard: transforma o representante em consultor, reduz orçamentos refeitos por incoerência técnica e antecipa objeções do engenheiro de pré-venda.

---

## Próximo Passo
