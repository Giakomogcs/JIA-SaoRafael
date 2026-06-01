# Regras de Sanitização — Playbook de Transferência

> **REGRA DE OURO:** o playbook é entregue ao **cliente final**. Nada que identifique o piloto da São Rafael, credenciais, segredos, URLs internas, IDs de tenant ou dados de clientes reais pode aparecer no documento.

## ❌ NUNCA incluir

| Categoria | Exemplos proibidos |
|---|---|
| **Credenciais** | API keys, tokens, senhas, JWTs, service role keys, connection strings com password, OAuth client_secret |
| **URLs específicas do piloto** | `https://saorafael-xxx.supabase.co`, qualquer subdomínio `*.cloudfy.space` real do piloto, links de webhook `https://<nosso-n8n>/webhook/...` |
| **IDs internos** | `project_ref` do Supabase, `workspace_id`/`tenant_id` da Cloudfy, IDs de deploy do Azure, OAuth client_id |
| **Dados de negócio do piloto** | Nomes de clientes, CNPJs, e-mails de representantes, orçamentos, protocolos `SR-YYYYMM-NNNN`, conteúdo dos documentos RAG da São Rafael |
| **Conteúdo proprietário** | Trechos dos prompts `system_prompt_*.md`, regras de negócio da planilha, manual de dimensionamento |
| **Capturas de tela com dados reais** | Qualquer print do n8n/Supabase/front mostrando dados do piloto, e-mails de usuário, nomes de empresa, etc. |
| **Caminhos locais** | `C:\Users\Administrador\...`, paths de máquinas de dev |
| **Branding São Rafael** | Logo, cores, mensagens custom — substituir por `<CLIENTE>` |

## ✅ Sempre usar placeholders

| Em vez de | Use |
|---|---|
| `https://abcd1234.supabase.co` | `https://<SEU-PROJETO>.supabase.co` |
| `eyJhbGciOi...` (anon key real) | `<SUPABASE_ANON_KEY>` |
| `sk-proj-xxxxx` | `<AZURE_OPENAI_KEY>` |
| `admin@saorafael.com.br` | `admin@<seu-dominio>.com.br` |
| `meu-n8n.cloudfy.space` | `<SUA-INSTANCIA>.cloudfy.space` |
| `saorafael_documents` (tabela) | manter — é nome de schema técnico, não dado |

> Nomes de **tabelas, RPCs, workflows e webhooks** com prefixo `saorafael_` **PODEM** permanecer — são identificadores técnicos do produto que o cliente está recebendo. O que não pode aparecer é **conteúdo** (linhas de dados, valores de orçamento, mensagens de chat).

## 🔍 Checklist pré-export (rodar antes de gerar a versão final)

Antes de rodar `npm run build:playbook`, verifique no `content.json`:

- [ ] Nenhuma string que comece com `eyJ` (JWT)
- [ ] Nenhuma string que case `sk-[a-zA-Z0-9-]{20,}` (API keys OpenAI/Azure)
- [ ] Nenhuma string que case `[a-z0-9]{20}\.supabase\.co` real (apenas placeholder)
- [ ] Nenhum CNPJ no formato `\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}`
- [ ] Nenhum protocolo `SR-\d{6}-\d{4}`
- [ ] Nenhum e-mail `@saorafael\.` real
- [ ] Pasta `playbook/screenshots/` revisada print a print: redator com tarja em e-mail, nome de empresa, valores de orçamento

> O script `build-playbook-docx.mjs` executa esses regex automaticamente e **aborta** se encontrar match.
