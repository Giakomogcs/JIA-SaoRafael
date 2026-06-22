# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** nenhum framework configurado.
**E2E:** nenhum.
**Coverage:** não medido.

> O projeto **não tem suíte de testes automatizados**. Validação é feita manualmente
> e por camadas determinísticas em produção (Reality Check Engine + RLS).

## Test Organization

Não há diretório `test/`, `spec/` ou arquivos `*.test.*` / `*.spec.*` no repositório.

## Testing Patterns (estado atual)

### Validação determinística (substitui parcialmente testes de domínio)

- **Reality Check Engine** (JS em `front.html`): aplica regras dimensionais, combinações
  proibidas e coerência comercial sobre o `form_data`; produz `fit score` 0–100 e severidade
  `ok | warn | block`. É a rede de segurança funcional do wizard.
- **Validação IA por step** (`AgentRag`, `wizardValidation: true`): retorno JSON estruturado.

### Verificação de banco

- SQL manual no painel Supabase / `psql`.
- RPCs de admin têm guards (`saorafael_is_admin()`) que falham com `RAISE EXCEPTION`.

### Verificação de workflows

- Execuções do n8n são auditáveis no painel (status, logs, payloads).

## Test Execution

**Commands:** não há comando de teste. Validação manual:

- Frontend: `python -m http.server 8080` ou `npx serve .` e testar no navegador.
- Banco: SQL editor do Supabase / `psql`.
- Workflows: aba _Executions_ do n8n.

## Coverage Targets

**Current:** 0% automatizado.
**Goals:** não documentados.
**Enforcement:** nenhum (sem CI).

## Test Coverage Matrix

| Code Layer                | Required Test Type | Location Pattern               | Run Command      |
| ------------------------- | ------------------ | ------------------------------ | ---------------- |
| Frontend wizard/chat (JS) | none (hoje)        | `front.html`                   | manual (browser) |
| Reality Check Engine (JS) | none (hoje)        | `front.html`                   | manual (browser) |
| RPCs / policies (SQL)     | none (hoje)        | `migrations/`                  | SQL manual       |
| Workflows (n8n)           | none (hoje)        | `workflows/`                   | n8n Executions   |
| RAG ingestion             | none (hoje)        | `workflows/SãoRafael-RAG.json` | n8n manual       |

> Todas as camadas estão marcadas como `none` — ver "Test Coverage Gaps" em CONCERNS.md.

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence                |
| --------- | -------------- | --------------- | ----------------------- |
| (n/a)     | (n/a)          | sem testes      | nenhum arquivo de teste |

## Gate Check Commands

| Gate Level | When to Use              | Command                                                          |
| ---------- | ------------------------ | ---------------------------------------------------------------- |
| Quick      | após mudança no frontend | abrir `front.html` no navegador e exercitar o fluxo afetado      |
| Full       | após mudança em SQL/RPC  | aplicar migration em ambiente de teste + rodar RPC no SQL editor |
| Build      | após mudança em workflow | importar JSON no n8n + executar o webhook manualmente            |

> Não invente comandos de teste — não existem scripts de build/test neste repo.
> Se for introduzir testes, defina aqui o framework e os comandos antes de criar tarefas.
