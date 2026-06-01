#!/usr/bin/env node
/**
 * capture-screenshots.mjs
 * --------------------------------------------------------------
 * Captura automaticamente os prints definidos em
 *   .github/playbook-agent/capture-recipes.json
 * para os paths exatos esperados por
 *   .github/playbook-agent/content.json
 *
 * Faz mascaramento automatico ANTES do print:
 *   - elementos definidos em recipe.masks + recipe.globalMasks
 *   - regex globais (URLs cloudfy, JWT, senhas) substituídos por bolinhas
 *
 * Credenciais ficam em .github/playbook-agent/scripts/.env (gitignored).
 *
 * Uso:
 *   cd .github/playbook-agent/scripts
 *   npm install
 *   npx playwright install chromium       # primeira vez
 *   npm run capture                       # todos
 *   npm run capture -- --only 01-acesso-cloudfy   # filtro por prefixo
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(__dirname, '..');                // .github/playbook-agent/

dotenv.config({ path: path.join(__dirname, '.env') });

// ────────────────────────────────────────────────────────────────
// Multi-cliente: --client <slug> (ou env PLAYBOOK_CLIENT).
// Resolve recipes, screenshots e .auth sob clients/<slug>/.
// Fallback (sem flag): paths antigos na raiz de AGENT_ROOT.
// ────────────────────────────────────────────────────────────────
function argFlag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
}
const CLIENT = argFlag('client') || process.env.PLAYBOOK_CLIENT || null;
const CLIENT_ROOT = CLIENT ? path.join(AGENT_ROOT, 'clients', CLIENT) : AGENT_ROOT;
if (CLIENT && !fs.existsSync(CLIENT_ROOT)) {
  console.error(`\n❌ Cliente "${CLIENT}" não encontrado em ${CLIENT_ROOT}\n`);
  process.exit(2);
}
if (CLIENT) console.log(`📁 Cliente: ${CLIENT}`);

const RECIPES_PATH = path.join(CLIENT_ROOT, 'capture-recipes.json');
if (!fs.existsSync(RECIPES_PATH)) {
  console.error(`\n❌ capture-recipes.json não encontrado em ${RECIPES_PATH}\n`);
  process.exit(2);
}
const RECIPES = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'));
const OUT_DIR = path.join(CLIENT_ROOT, 'screenshots');
const AUTH_DIR = path.join(CLIENT_ROOT, '.auth');
const HEADLESS = String(process.env.HEADLESS || 'false').toLowerCase() === 'true';

const onlyFlag = argFlag('only');

function envExpand(str) {
  return String(str).replace(/{{(\w+)}}/g, (_, k) => process.env[k] ?? `<${k}>`);
}

// ────────────────────────────────────────────────────────────────
// 🔒 READ-ONLY GUARD
// Bloqueia QUALQUER request HTTP de mutação (POST/PUT/PATCH/DELETE)
// exceto endpoints estritamente necessários para autenticação.
// Aplicado a todo contexto Playwright via page.route('**').
//
// Como o capturador NÃO interage com botões de salvar/excluir/criar
// (só navega + screenshot), qualquer POST/PUT/PATCH/DELETE que NÃO
// seja login é sinal de bug — abortamos a request.
// ────────────────────────────────────────────────────────────────
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Padrões permitidos (apenas auth/login): regex sobre a URL completa.
const AUTH_ALLOWLIST = [
  /\/auth\/v1\/token/i,         // Supabase GoTrue
  /\/auth\/v1\/user/i,
  /\/rest\/v1\/rpc\/auth_/i,
  /\/api\/login/i,
  /\/api\/auth\b/i,
  /\/login\b/i,                 // Cloudfy / formulários genéricos
  /\/signin\b/i,
  /\/sign-in\b/i,
  /\/sso\b/i,
  /\/rest\/v1\/auth/i,
  /\/oauth\b/i,
  /\/session\b/i,
  /\/csrf\b/i,                  // tokens CSRF de login form
  // Read-only POSTs (queries SELECT empacotadas em POST por API design).
  // O nome do path deixa claro que é leitura.
  /\/api\/platform\/pg-meta\/[^/]+\/query/i,           // Supabase Studio: metadados
  /\/api\/platform\/projects\/[^/]+\/(content|api)\b/i, // Supabase Studio: project info
  /\/api\/projects\/[^/]+\/api-keys/i,                  // Supabase: leitura de chaves (Studio)
  /\/rest\/[^/]+\/(workflows|credentials|executions)(\/[^/]+)?\?/i, // n8n queries com filtros
  /\/graphql\b/i,                                       // n8n / Supabase: leituras GraphQL
  /\.json(\?|$)/i,                                      // configs, traduções
];

async function installReadOnlyGuard(ctx, label) {
  await ctx.route('**', async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const url = req.url();
    if (!MUTATING_METHODS.has(method)) return route.continue();
    if (AUTH_ALLOWLIST.some((re) => re.test(url))) return route.continue();
    console.warn(`    🛡  [${label}] BLOQUEADO ${method} ${url.slice(0, 120)}`);
    return route.abort('blockedbyclient');
  });
}

// ────────────────────────────────────────────────────────────────
// Sanitização pré-flight: se alguma env preenchida casa com padrões
// proibidos a gente avisa (mas não bloqueia — o usuário pode estar
// usando contas-demo legítimas que ainda assim batem em regex).
// ────────────────────────────────────────────────────────────────
function preflight() {
  if (!process.env.CLOUDFY_EMAIL || !process.env.CLOUDFY_PASSWORD) {
    console.error('❌ scripts/.env não preenchido. Copie scripts/.env.example e preencha com credenciais de CONTA-DEMO (não do piloto).');
    process.exit(2);
  }
  const looksLikeRealPilot = /saorafael\.com\.br/i.test(process.env.CLOUDFY_EMAIL || '');
  if (looksLikeRealPilot) {
    console.error('❌ CLOUDFY_EMAIL parece ser do piloto. Use uma conta-DEMO. Abortei pra te proteger.');
    process.exit(3);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// ────────────────────────────────────────────────────────────────
// Login por sessão (reaproveita storageState entre runs)
// ────────────────────────────────────────────────────────────────
async function ensureSession(browser, name, def) {
  const statePath = path.join(AUTH_DIR, `${name}.json`);
  // HTTP Basic Auth (ex.: Supabase Studio self-hosted no Cloudfy).
  // Quando recipe tem login.httpAuth=true, criamos o contexto com httpCredentials
  // a partir das envs <SESSION>_EMAIL / <SESSION>_PASSWORD (ou as próprias do login.steps).
  const httpAuth = def.login && def.login.httpAuth === true;
  const ctxOpts = { viewport: { width: 1366, height: 800 } };
  if (httpAuth) {
    const user = envExpand(def.login.username || `{{${name.toUpperCase()}_EMAIL}}`);
    const pass = envExpand(def.login.password || `{{${name.toUpperCase()}_PASSWORD}}`);
    if (user && !user.startsWith('<') && pass && !pass.startsWith('<')) {
      ctxOpts.httpCredentials = { username: user, password: pass };
    } else {
      console.warn(`  ⚠ sessão ${name}: httpAuth pedida mas credenciais não estão no .env.`);
    }
  }
  if (fs.existsSync(statePath)) {
    const ctx = await browser.newContext({ ...ctxOpts, storageState: statePath });
    await installReadOnlyGuard(ctx, name);
    return ctx;
  }
  const ctx = await browser.newContext(ctxOpts);
  await installReadOnlyGuard(ctx, name);
  if (httpAuth) {
    // Não há form de login — só persiste storageState após a 1ª request bem-sucedida.
    const probeUrl = envExpand(def.login.url);
    if (probeUrl && !probeUrl.startsWith('<')) {
      const page = await ctx.newPage();
      await page.goto(probeUrl, { waitUntil: 'domcontentloaded' }).catch(()=>{});
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(()=>{});
      await ctx.storageState({ path: statePath });
      await page.close();
    }
    return ctx;
  }
  const page = await ctx.newPage();
  const url = envExpand(def.login.url);
  if (!url || url.startsWith('<')) {
    console.warn(`  ⚠ sessão ${name}: URL não configurada no .env — pulando login (sessões a partir do contexto anônimo).`);
    return ctx;
  }
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  for (const step of def.login.steps || []) {
    try {
      if (step.fill) {
        const v = envExpand(step.value);
        if (!v || v.startsWith('<')) { console.warn(`  ⚠ ${name}: valor ${step.value} não preenchido no .env`); continue; }
        await page.locator(step.fill).first().fill(v, { timeout: 8000 });
      } else if (step.click) {
        await page.locator(step.click).first().click({ timeout: 8000 });
      } else if (step.waitUrl) {
        await page.waitForURL(new RegExp(step.waitUrl), { timeout: step.timeout || 15000 });
      } else if (step.waitSelector) {
        await page.locator(step.waitSelector).first().waitFor({ timeout: step.timeout || 15000 });
      }
    } catch (e) {
      console.warn(`  ⚠ login ${name}: passo falhou — ${e.message.split('\n')[0]}`);
    }
  }
  await ctx.storageState({ path: statePath });
  await page.close();
  return ctx;
}

// ────────────────────────────────────────────────────────────────
// Overlay de redação: substitui valores sensíveis por bolinhas
// + tarja sólida em texto que casa com regex.
// ────────────────────────────────────────────────────────────────
async function applyRedactions(page, recipe) {
  // masks globais + por-página (URL substring) + da própria receita
  const url = page.url();
  const byPage = RECIPES.globalMasksByPage || {};
  const pageMasks = Object.entries(byPage)
    .filter(([k]) => !k.startsWith('_') && url.includes(k))
    .flatMap(([, v]) => v);
  const masks = [...(RECIPES.globalMasks || []), ...pageMasks, ...(recipe.masks || [])];
  await page.addStyleTag({ content: `
    .__df_redact, .__df_redact * {
      color: #000 !important;
      background-color: #000 !important;
      background-image: none !important;
      text-shadow: none !important;
      caret-color: transparent !important;
      border-color: #000 !important;
    }
    .__df_redact { outline: 2px solid #111 !important; border-radius: 4px !important; }
  ` }).catch(()=>{});

  // 1) Mascarar elementos por seletor + substituir valor de inputs por bolinhas
  for (const sel of masks) {
    try {
      await page.locator(sel).evaluateAll(els => els.forEach(el => {
        el.classList.add('__df_redact');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          try { el.value = '•'.repeat(Math.max(8, Math.min(24, (el.value || '').length))); } catch {}
          el.setAttribute('value', el.value);
          el.setAttribute('type', 'text');
        }
      }));
    } catch {}
  }

  // 2) Tarjar qualquer texto que case com padrões sensíveis (URLs cloudfy, JWT, emails, etc.)
  const patterns = RECIPES.globalRedactPatterns || [];
  if (patterns.length) {
    await page.evaluate((patternStrs) => {
      const regexes = patternStrs.map(p => new RegExp(p, 'gi'));
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const t = (n.nodeValue || '').trim();
          if (!t) return NodeFilter.FILTER_REJECT;
          // ignora style/script
          const p = n.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          const tag = p.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const toReplace = [];
      let n;
      while ((n = walker.nextNode())) {
        if (regexes.some(r => { r.lastIndex = 0; return r.test(n.nodeValue); })) toReplace.push(n);
      }
      for (const node of toReplace) {
        let html = node.nodeValue;
        for (const r of regexes) {
          r.lastIndex = 0;
          html = html.replace(r, (m) => `<span style="background:#000;color:#000;padding:0 2px;border-radius:2px;">${'•'.repeat(Math.min(m.length, 12))}</span>`);
        }
        const span = document.createElement('span');
        span.innerHTML = html;
        node.parentNode.replaceChild(span, node);
      }

      // Também varre VALOR de inputs/textareas (não só text nodes)
      document.querySelectorAll('input, textarea').forEach(el => {
        const v = el.value || el.getAttribute('value') || '';
        if (!v) return;
        if (regexes.some(r => { r.lastIndex = 0; return r.test(v); })) {
          el.classList.add('__df_redact');
          try { el.value = '•'.repeat(Math.max(8, Math.min(24, v.length))); } catch {}
          el.setAttribute('value', el.value);
          if (el.tagName === 'INPUT') el.setAttribute('type', 'text');
        }
      });
    }, patterns);
  }
}

async function highlight(page, selector) {
  try {
    await page.addStyleTag({ content: '.__df_hl { outline: 3px solid #DC2626 !important; outline-offset: 2px; border-radius: 4px; }' }).catch(()=>{});
    await page.locator(selector).first().evaluate(el => el.classList.add('__df_hl'));
    await page.locator(selector).first().scrollIntoViewIfNeeded().catch(()=>{});
  } catch (e) {
    console.warn(`    ⚠ highlight falhou para "${selector}": ${e.message.split('\n')[0]}`);
  }
}

// ────────────────────────────────────────────────────────────────
// Executor de actions de uma receita
// ────────────────────────────────────────────────────────────────
async function runActions(page, actions) {
  for (const a of actions || []) {
    if (a.goto) {
      await page.goto(envExpand(a.goto), { waitUntil: 'domcontentloaded' }).catch(e => console.warn(`    goto falhou: ${e.message.split('\n')[0]}`));
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(()=>{});
    } else if (a.click) {
      await page.locator(a.click).first().click({ timeout: 8000 }).catch(e => console.warn(`    click falhou: ${e.message.split('\n')[0]}`));
    } else if (a.highlight) {
      await highlight(page, a.highlight);
    } else if (a.scrollTo) {
      await page.locator(a.scrollTo).first().scrollIntoViewIfNeeded().catch(()=>{});
    } else if (a.fill) {
      await page.locator(a.fill).first().fill(envExpand(a.value), { timeout: 5000 }).catch(()=>{});
    } else if (a.waitSelector) {
      await page.locator(a.waitSelector).first().waitFor({ timeout: a.timeout || 8000 }).catch(()=>{});
    } else if (a.navigateService) {
      // padrão Cloudfy: navega para Serviços (dashboard), clica no card do serviço pelo nome,
      // e espera o painel de detalhes aparecer (não confiar só em networkidle — SPA pode ficar idle com tela branca).
      const dashUrl = envExpand('{{CLOUDFY_DASHBOARD}}');
      await page.goto(dashUrl, { waitUntil: 'domcontentloaded' }).catch(e => console.warn(`    navigateService goto falhou: ${e.message.split('\n')[0]}`));
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
      // tenta achar o card do serviço — primeiro um link/card clicável, depois fallback text=
      const svc = a.navigateService;
      const cardSelector = `a:has-text("${svc}"), [role="link"]:has-text("${svc}"), [data-testid*="service" i]:has-text("${svc}"), button:has-text("${svc}")`;
      let clicked = false;
      try {
        await page.locator(cardSelector).first().click({ timeout: 8000 });
        clicked = true;
      } catch {
        try { await page.locator(`text=${svc}`).first().click({ timeout: 4000 }); clicked = true; } catch {}
      }
      if (!clicked) console.warn(`    navigateService: não consegui clicar em "${svc}"`);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
      // espera algum indicador de painel de detalhes do serviço (abas Geral/Admin/Database aparecem)
      const tabIndicator = page.getByRole('tab').first()
        .or(page.locator('button:has-text("Admin")').first())
        .or(page.locator('button:has-text("Geral")').first())
        .or(page.locator('button:has-text("Database")').first());
      await tabIndicator.waitFor({ timeout: 8000 }).catch(()=>{});
      await page.waitForTimeout(800);
    } else if (a.clickTab) {
      const tabName = a.clickTab;
      const tabLoc = page.getByRole('tab', { name: tabName })
        .or(page.locator(`button:has-text("${tabName}")`))
        .or(page.locator(`a:has-text("${tabName}")`));
      await tabLoc.first().click({ timeout: 8000 }).catch(e => console.warn(`    clickTab "${tabName}" falhou: ${e.message.split('\n')[0]}`));
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(()=>{});
      await page.waitForTimeout(1000); // dá tempo do conteúdo da aba pintar
    } else if (a.wait) {
      await page.waitForTimeout(a.wait);
    } else if (a.openClientFolder) {
      // Atalho n8n: navega para a pasta do cliente.
      // Estratégia: vai para /workflows e clica na badge "<clientFolder>"
      // que aparece em qualquer workflow do cliente. Como fallback, tenta
      // clicar em pastas pelo nome no menu lateral.
      const client = a.clientFolder || 'São Rafael';
      const parent = a.parentFolder || 'Jornada de IA';
      const base = envExpand('{{N8N_URL}}/workflows');
      await page.goto(base, { waitUntil: 'domcontentloaded' }).catch(()=>{});
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(()=>{});
      await page.waitForTimeout(1500);
      // Tenta filtro por busca (deixa a lista limpa só com workflows do cliente)
      try {
        const search = page.locator('input[placeholder*="Search" i], input[placeholder*="Buscar" i]').first();
        await search.waitFor({ timeout: 3000 });
        await search.fill(client);
        await page.waitForTimeout(1200);
      } catch {}
      // Tenta clicar na badge de pasta do cliente
      let opened = false;
      const candidates = [
        page.locator(`[class*="folder" i] :text("${client}")`).first(),
        page.locator(`a:has-text("${client}")`).first(),
        page.locator(`button:has-text("${client}")`).first(),
        page.locator(`text=${client}`).first(),
      ];
      for (const loc of candidates) {
        try {
          await loc.waitFor({ timeout: 3000 });
          await loc.click({ timeout: 3000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(()=>{});
          await page.waitForTimeout(1200);
          opened = true;
          break;
        } catch {}
      }
      if (!opened) {
        console.warn(`    openClientFolder: não consegui abrir pasta "${client}" — usando lista filtrada por busca.`);
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────
preflight();

// ── Allowlist de sessões interativas ──────────────────────────
// Política do projeto:
//   • SEMPRE interativo  : cloudfy, n8n, supabase, front
//   • NUNCA interativo   : azure, gcp, openrouter, gemini, microsoft, aws
//                          → use imagens anonimizadas em
//                            _reference_playbook/ ou prints manuais
//   • CONDICIONAL        : redis, mongodb, minio, etc. — só rodam se
//                          algum nó em workflows/*.json referencia o serviço
const REPO_ROOT = path.resolve(AGENT_ROOT, '..', '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, 'workflows');
const ALWAYS_SESSIONS = new Set(['cloudfy', 'n8n', 'supabase', 'front']);
const NEVER_INTERACTIVE = new Set(['azure', 'gcp', 'openrouter', 'gemini', 'microsoft', 'aws']);
const CONDITIONAL_HINTS = {
  redis:   /n8n-nodes-base\.redis/i,
  mongodb: /n8n-nodes-base\.mongoDb/i,
  minio:   /n8n-nodes-base\.(s3|minio)\b/i,
};
const usedSessions = new Set(ALWAYS_SESSIONS);
try {
  if (fs.existsSync(WORKFLOWS_DIR)) {
    const allWf = fs.readdirSync(WORKFLOWS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8'))
      .join('\n');
    for (const [name, re] of Object.entries(CONDITIONAL_HINTS)) {
      if (re.test(allWf)) usedSessions.add(name);
    }
  }
} catch (e) {
  console.warn(`⚠ Não consegui ler workflows/ para auditar sessões: ${e.message}`);
}
console.log(`🔐 Sessões permitidas para este cliente: ${[...usedSessions].join(', ')}`);
console.log(`🚫 Sessões bloqueadas (use reference images): ${[...NEVER_INTERACTIVE].join(', ')}`);

const skippedBySession = new Map();
const shots = RECIPES.shots.filter(s => {
  if (!s || !s.path) return false;
  if (onlyFlag && !s.path.includes(onlyFlag)) return false;
  if (s.session) {
    if (NEVER_INTERACTIVE.has(s.session)) {
      skippedBySession.set(`${s.session} (blocked)`, (skippedBySession.get(`${s.session} (blocked)`) || 0) + 1);
      return false;
    }
    if (!usedSessions.has(s.session)) {
      skippedBySession.set(`${s.session} (not-used)`, (skippedBySession.get(`${s.session} (not-used)`) || 0) + 1);
      return false;
    }
  }
  return true;
});
if (skippedBySession.size) {
  for (const [sess, n] of skippedBySession) {
    console.log(`  ↷ ${n} shot(s) pulado(s) — session ${sess}.`);
  }
}
if (!shots.length) {
  console.error(`Nenhum shot bate com --only ${onlyFlag}.`);
  process.exit(1);
}

console.log(`📸  Iniciando captura de ${shots.length} screenshot(s). Headless=${HEADLESS}`);
const browser = await chromium.launch({ headless: HEADLESS });

const contexts = new Map();
async function getCtx(sessionName) {
  if (contexts.has(sessionName)) return contexts.get(sessionName);
  const def = RECIPES.sessions[sessionName];
  if (!def) throw new Error(`Sessão "${sessionName}" não definida em capture-recipes.json`);
  const ctx = await ensureSession(browser, sessionName, def);
  contexts.set(sessionName, ctx);
  return ctx;
}

let ok = 0, fail = 0;
for (const shot of shots) {
  const out = path.join(OUT_DIR, shot.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  console.log(`  → ${shot.path}`);
  try {
    let ctx, ownCtx = false;
    if (shot.useLoginPage) {
      // Sessão limpa (sem cookies/storage) para capturar a tela de login
      ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
      await installReadOnlyGuard(ctx, 'login-only');
      ownCtx = true;
    } else {
      ctx = await getCtx(shot.session);
    }
    const page = await ctx.newPage();
    await runActions(page, shot.actions);
    await page.waitForTimeout(500); // settle
    await applyRedactions(page, shot);
    await page.screenshot({ path: out, fullPage: false });
    await page.close();
    if (ownCtx) await ctx.close();
    ok++;
  } catch (e) {
    console.error(`    ✗ ${e.message.split('\n')[0]}`);
    fail++;
  }
}

for (const ctx of contexts.values()) await ctx.close();
await browser.close();

console.log(`\n✅ ${ok} capturado(s) · ❌ ${fail} falha(s) · → ${path.relative(AGENT_ROOT, OUT_DIR)}`);
if (fail > 0) process.exitCode = 1;
