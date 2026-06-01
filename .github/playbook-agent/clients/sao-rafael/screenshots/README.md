# Capturas de Tela — Guia de Captura

> Cada item abaixo é uma captura referenciada por algum passo do `content.json`. Tire os prints na **conta de demonstração** (NÃO no piloto). Salve em `.png` no caminho exato indicado.

## Regras gerais

1. **Resolução mínima:** 1280×720. Janela do navegador maximizada.
2. **Zoom:** 100%.
3. **Tema:** claro (melhor para impressão / PDF).
4. **Anonimização obrigatória:**
   - Tarja preta em e-mails, nomes de empresa, valores monetários, CNPJs.
   - Trocar nomes de workspace/projeto reais por `<CLIENTE>-demo` antes do print.
   - Apagar/mascarar quaisquer linhas de dado real visíveis em listas.
5. **Realces:** use **retângulo vermelho 2px sem preenchimento** sobre o elemento que o passo manda clicar. Nada de setas/comentários — a legenda do passo já explica.
6. **Não capture:** abas vizinhas do navegador, barra de favoritos, notificações do SO, qualquer URL/token completo.

## Estrutura de pastas

```
playbook/screenshots/
├── 00-cover/
│   └── cover.png                       # opcional, capa visual do documento
├── 01-acesso-cloudfy/
│   ├── 01-login.png
│   ├── 02-menu-servicos.png
│   ├── 03-card-n8n.png
│   ├── 04-aba-admin-n8n.png
│   ├── 05-url-n8n.png
│   ├── 06-copiar-email-senha.png
│   ├── 07-servicos-supabase.png
│   ├── 08-card-supabase.png
│   ├── 09-aba-database.png
│   └── 10-aba-admin-supabase.png
├── 02-supabase-setup/
│   ├── 01-sql-editor.png
│   └── 02-add-user.png
├── 03-n8n-import/
│   ├── 01-create-workflow.png
│   ├── 02-import-from-file.png
│   ├── 03-save-workflow.png
│   └── 04-toggle-active.png
├── 04-credenciais/
│   ├── 01-no-vermelho.png
│   ├── 02-create-new-credential.png
│   ├── 03-postgres-node.png
│   ├── 04-postgres-form.png
│   ├── 05-supabase-node.png
│   ├── 06-supabase-form.png
│   ├── 07-gcp-project.png
│   ├── 08-drive-enable.png
│   ├── 09-oauth-consent.png
│   ├── 10-create-oauth.png
│   ├── 11-redirect-uri.png
│   ├── 12-n8n-google-signin.png
│   ├── 13-azure-create.png
│   ├── 14-azure-deployments.png
│   ├── 15-azure-credential.png
│   ├── 16-gemini-key.png
│   └── 17-openrouter-key.png
├── 05-deploy-frontend/
│   ├── 01-workflow-front.png
│   └── 02-code-node-html.png
├── 06-operacao/
│   ├── 01-login-admin.png
│   ├── 02-admin-users.png
│   ├── 03-create-user.png
│   ├── 04-edit-user.png
│   ├── 05-delete-user.png
│   ├── 06-clients-search.png
│   ├── 07-client-detail.png
│   ├── 08-submissions-list.png
│   └── 09-gdrive-folder.png
└── 07-troubleshooting/
    ├── 01-n8n-executions.png
    ├── 02-supabase-logs.png
    └── 03-devtools.png
```

> O script `build-playbook-docx.mjs` **não falha** se faltar imagem: insere uma caixa cinza com `[SCREENSHOT FALTANDO: <path>]`. Isso permite gerar versões parciais para revisão enquanto as capturas estão sendo feitas.
