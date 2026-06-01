# Playbook Agent

Pacote **isolado e auto-contido** que vive em `.github/playbook-agent/` e produz o
`Playbook.docx` — documento de transferência de tecnologia (Cloudfy + n8n +
Supabase + Redis) entregue ao cliente final.

> Este pacote NÃO faz parte do produto São Rafael. Pode ser apagado sem afetar
> a aplicação (front, n8n, Supabase). Existe apenas para gerar a documentação
> de handover.

## Estrutura

```
.github/playbook-agent/
├── README.md                 ← este arquivo
├── schema.md                 ← contrato JSON do content.json
├── sanitization.md           ← regras anti-vazamento (regex obrigatórios)
├── content.json              ← FONTE DE VERDADE do playbook
├── capture-recipes.json      ← receitas Playwright para os prints
├── screenshots/              ← PNGs incorporados ao .docx
├── prompts/
│   └── system_prompt.md      ← prompt-pai do agente
├── scripts/
│   ├── build-playbook-docx.mjs   ← content.json → Playbook.docx
│   ├── capture-screenshots.mjs   ← Playwright → PNGs (com tarja automática)
│   ├── package.json
│   ├── .env.example
│   └── .env                       ← credenciais (gitignored)
└── Playbook.docx             ← saída final (gerada, gitignored)
```

O agente principal e os dois subagentes vivem em
[`.github/agents/`](../agents) (formato VS Code Custom Agents):

- [`playbook.agent.md`](../agents/playbook.agent.md) — agente principal, aparece em **Configure Custom Agents**.
- [`playbook-navigator.agent.md`](../agents/playbook-navigator.agent.md) — subagente leitor do repo (`user-invocable: false`).
- [`playbook-screenshotter.agent.md`](../agents/playbook-screenshotter.agent.md) — subagente do Playwright (`user-invocable: false`).

## Subagentes

O Playbook Agent delega trabalho repetitivo a dois especialistas:

| Subagente | Responsabilidade |
|---|---|
| **playbook-navigator** | Lê o repositório (`workflows/`, `migrations/`, `rag_documents/`, `front.html`, `ARCHITECTURE.md`, etc.) e devolve fatos sanitizados prontos para virar passos / tabelas / diagramas em `content.json`. |
| **playbook-screenshotter** | Opera o Playwright: confere `capture-recipes.json`, lista prints faltantes, dispara `npm run capture`, audita máscaras e reporta o que veio limpo / suspeito. |

Cada subagente tem escopo, ferramentas permitidas e regras anti-vazamento próprios. O agente principal os invoca como subagents (tool `agent`).

## Como usar (via Copilot Chat)

1. No seletor de modo do Copilot Chat, escolha **Playbook Agent**.
2. Peça em linguagem natural:
   - *"gera o playbook do zero"*
   - *"adiciona uma seção sobre Redis no capítulo 1"*
   - *"o navegador olha o workflow `SãoRafael-RAG.json` e me traz o passo-a-passo"*
   - *"o screenshotter captura só o capítulo 04"*
   - *"revisa o playbook procurando dados que vazaram"*
   - *"gera o .docx"*

## Como usar (linha de comando)

```powershell
cd .github\playbook-agent\scripts
npm install                                # primeira vez
npx playwright install chromium            # primeira vez (só p/ capture)

npm run build:playbook                     # gera ..\Playbook.docx
npm run capture                            # tira todos os prints
npm run capture -- --only 01-acesso-cloudfy   # filtra por prefixo
```

## Segurança

Antes de rodar `capture`, edite `scripts/.env` (gitignored) com credenciais do
**workspace-demo** do Cloudfy. Nunca use credenciais de produção/piloto.

O capturador aplica 3 camadas de proteção antes de cada print:

1. Máscaras CSS em `input[readonly]`, `input[type=password]`.
2. Substituição de valor por bolinhas (`••••`) em inputs sensíveis.
3. Regex global tarjando textos contendo URLs `*.cloudfy.live`, JWTs, senhas, e-mails do piloto.

O build (`build-playbook-docx.mjs`) **aborta** se detectar credenciais reais em `content.json` — ver lista completa em [`sanitization.md`](./sanitization.md).
