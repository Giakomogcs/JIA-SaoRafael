# Schema do Playbook (JSON)

Fonte de verdade para o `.docx`, para a saída do agente n8n e para a skill do Copilot.

```ts
type Playbook = {
  meta: {
    title: string;                 // ex: "Playbook de Transferência — Plataforma <CLIENTE>"
    subtitle?: string;
    version: string;               // semver: "1.0.0"
    generatedAt: string;           // ISO date (preenchido pelo script)
    audience: string;              // "Equipe técnica e operacional do <CLIENTE>"
    confidentiality: "Interno" | "Confidencial";
    coverImage?: string;           // path em playbook/screenshots/
  };
  chapters: Chapter[];
};

type Chapter = {
  id: string;                      // "00-visao-geral", "01-supabase", ...
  number: number;                  // 0, 1, 2, ...
  title: string;
  summary: string;                 // 2-4 linhas, vai pro sumário executivo
  objectives: string[];            // "Ao final deste capítulo você será capaz de ..."
  prerequisites?: string[];        // capítulos ou conhecimentos necessários
  sections: Section[];
};

type Section = {
  heading: string;
  intro?: string;                  // parágrafo introdutório
  steps?: Step[];                  // passo-a-passo numerado
  notes?: Callout[];               // info/warning/danger/tip
  diagram?: Diagram;               // mermaid ou imagem
  table?: TableBlock;
  code?: CodeBlock;
  links?: { label: string; url: string }[]; // URLs públicas apenas (docs oficiais)
};

type Step = {
  n: number;                       // ordem dentro da seção
  action: string;                  // "Clique em **Serviços** no menu lateral"
  detail?: string;                 // explicação adicional
  screenshot?: string;             // ex: "01-supabase/01-menu-servicos.png"
  caption?: string;                // legenda da imagem
  expected?: string;               // "Deve aparecer a lista de serviços com Supabase e n8n"
};

type Callout = {
  type: "info" | "tip" | "warning" | "danger" | "checklist";
  title?: string;
  body: string;                    // markdown inline permitido (bold/italic/code)
  items?: string[];                // para checklist
};

type Diagram =
  | { kind: "mermaid"; code: string; caption?: string }
  | { kind: "image"; path: string; caption?: string };

type TableBlock = {
  caption?: string;
  headers: string[];
  rows: string[][];
};

type CodeBlock = {
  language: "sql" | "bash" | "json" | "ts" | "js" | "yaml" | "text";
  caption?: string;
  body: string;
};
```

## Convenções

- **IDs de capítulo** seguem `NN-slug` (zero-padded). Reordenação é feita pelo `number`.
- **Screenshots** referenciam paths relativos a `playbook/screenshots/`. Se o arquivo não existir, o renderer emite uma caixa cinza com `[SCREENSHOT FALTANDO: <path> — <caption>]` para guiar a captura.
- **Callouts** viram boxes coloridos no .docx (verde/azul/amarelo/vermelho/cinza-checklist).
- **Mermaid** é renderizado para PNG via `@mermaid-js/mermaid-cli` no build (cache em `playbook/.cache/mermaid/`). Se o CLI não estiver disponível, o script emite o código fonte em monoespaçado e segue.
- **Nada de credencial real** — ver [`sanitization.md`](./sanitization.md). O script aborta se detectar padrões proibidos.

## Capítulos canônicos (ordem)

| # | id | Título |
|---|---|---|
| 0 | `00-visao-geral` | Visão Geral da Arquitetura |
| 1 | `01-acesso-cloudfy` | Acesso ao Cloudfy e aos Serviços |
| 2 | `02-supabase-setup` | Setup do Banco de Dados (Supabase) |
| 3 | `03-n8n-import` | Importação dos Workflows no n8n |
| 4 | `04-credenciais` | Configuração de Credenciais (Postgres, Supabase, Azure OpenAI, Google Drive, Gemini, OpenRouter) |
| 5 | `05-deploy-frontend` | Deploy do Frontend (`front.html`) |
| 6 | `06-operacao` | Operação Dia-a-Dia (usuários, sessões, RAG) |
| 7 | `07-troubleshooting` | Troubleshooting e FAQ |
| 8 | `08-treinamento` | Roteiro de Treinamento |
| 9 | `09-handover` | Checklist de Aceite / Handover |

> O `content.json` deve seguir essa ordem. Capítulos podem ser estendidos pelo agente, mas a numeração precisa ser preservada.
