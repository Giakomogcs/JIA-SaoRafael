#!/usr/bin/env node
// Anonimiza imagens do Playbook (1).docx (referência) e copia para os slots
// correspondentes em clients/<client>/screenshots/.
// Estratégia: cobre regiões com PII (nome de outro cliente, e-mails, avatar,
// IDs de OAuth, redirect URIs de outros clientes) usando retângulos sólidos.

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REF_DIR = path.join(ROOT, '_reference_playbook', 'word', 'media');
const client = (process.argv.find(a => a.startsWith('--client='))?.split('=')[1]) || 'sao-rafael';
const SHOTS_DIR = path.join(ROOT, 'clients', client, 'screenshots');
// rect: [x, y, w, h] em pixels da imagem original. color: hex.
function rect(x, y, w, h, color = '#000') {
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), color };
}

// Cada entrada:
//   ref:    nome do arquivo na ref (imageN.png)
//   target: caminho relativo dentro de screenshots/
//   masks:  retângulos a desenhar (PII)
//   resize: width opcional pra normalizar tamanho
const MAP = [
  // === CAP 01 — Cloudfy ===
  {
    ref: 'image1.png',
    target: '01-acesso-cloudfy/01-login.png',
    // mask card da direita (foto + citação) + logo "cloudfy" topo-esquerdo? logo é genérica, manter.
    masks: [ rect(1010, 95, 700, 700, '#0a0a0a') ],
  },
  {
    ref: 'image20.png', // Serviços (igual ao nosso 02, mas com Supabase em destaque)
    target: '01-acesso-cloudfy/07-servicos-supabase.png',
    // topo-esquerdo: "Cloudfy / longflatworm"
    // rodapé-esquerdo: "SENAI / istic.sp@gmail.com"
    masks: [
      rect(20, 10, 240, 65, '#000'),    // org name top-left
      rect(0, 1195, 280, 72, '#000'),   // user/org name bottom-left
    ],
  },
  {
    ref: 'image21.png',
    target: '01-acesso-cloudfy/09-aba-database.png',
    masks: [], // já anonimizada na fonte
  },
  {
    ref: 'image27.png',
    target: '01-acesso-cloudfy/10-aba-admin-supabase.png',
    masks: [], // já anonimizada na fonte
  },

  // === CAP 03 — n8n import ===
  {
    ref: 'image14.png', // Editor + menu "..." com "Import from file" destacado
    target: '03-n8n-import/02-import-from-file.png',
    masks: [],
  },
  {
    ref: 'image15.png', // file picker (RAG.json)
    target: '03-n8n-import/02b-file-picker.png', // bônus
    // mask outros arquivos da semana passada (PII potencial)
    masks: [
      rect(160, 210, 580, 90, '#fff'),
    ],
  },
  {
    ref: 'image16.png', // workflow RAG importado (canvas)
    target: '03-n8n-import/03-save-workflow.png',
    masks: [],
  },

  // === CAP 04 — credenciais Postgres/Supabase no n8n ===
  {
    ref: 'image18.png', // dropdown "+ Create new credential" no nó Postgres
    target: '04-credenciais/02-create-new-credential.png',
    masks: [],
  },
  {
    ref: 'image19.png', // form Postgres vazio
    target: '04-credenciais/04-postgres-form.png',
    masks: [],
  },
  {
    ref: 'image25.png', // form Supabase vazio
    target: '04-credenciais/06-supabase-form.png',
    masks: [],
  },

  // === CAP 04 — Google Cloud Console ===
  {
    ref: 'image29.png', // GCP > Clientes
    target: '04-credenciais/10-create-oauth.png',
    masks: [
      // avatar do usuário (top-right)
      rect(1670, 0, 45, 45, '#000'),
      // chip de projeto "MCPs" (top, ao lado de "Google Cloud")
      rect(195, 10, 100, 30, '#1f1f1f'),
      // coluna "ID do cliente" (preserva contexto sem expor IDs)
      rect(1245, 200, 240, 100, '#000'),
    ],
  },
  {
    ref: 'image30.png', // GCP > editar OAuth client (com redirect URIs de outros clientes)
    target: '04-credenciais/11-redirect-uri.png',
    masks: [
      // avatar
      rect(1675, 0, 45, 45, '#000'),
      // chip "MCPs"
      rect(195, 10, 100, 30, '#1f1f1f'),
      // breadcrumb com ID do cliente
      rect(280, 55, 700, 22, '#000'),
      // ID do cliente (Additional information)
      rect(1100, 215, 530, 40, '#000'),
      // URIs 1 e 2 (de outros clientes) — máscara branca por cima
      rect(297, 670, 470, 30, '#fff'),
      rect(297, 720, 470, 30, '#fff'),
      // datas/chaves secretas (sem mascarar "Ativadas" status)
      rect(1100, 770, 200, 30, '#000'),
      rect(1100, 800, 250, 22, '#000'),
      rect(1100, 905, 200, 30, '#000'),
      rect(1100, 935, 250, 22, '#000'),
    ],
  },
];

async function processOne(entry) {
  const src = path.join(REF_DIR, entry.ref);
  const dst = path.join(SHOTS_DIR, entry.target);
  await fs.mkdir(path.dirname(dst), { recursive: true });

  let img = sharp(src);
  const meta = await img.metadata();

  if (entry.masks?.length) {
    const overlays = await Promise.all(entry.masks.map(async m => {
      const w = Math.min(m.w, meta.width - m.x);
      const h = Math.min(m.h, meta.height - m.y);
      if (w <= 0 || h <= 0) return null;
      const buf = await sharp({
        create: { width: w, height: h, channels: 4, background: m.color },
      }).png().toBuffer();
      return { input: buf, left: m.x, top: m.y };
    }));
    img = img.composite(overlays.filter(Boolean));
  }

  await img.png().toFile(dst);
  console.log(`  ✓ ${entry.target}  (← ${entry.ref}, ${entry.masks?.length || 0} mask(s))`);
}

(async () => {
  console.log(`📸 Anonimizando ${MAP.length} imagens de referência → clients/${client}/screenshots/`);
  let ok = 0, fail = 0;
  for (const e of MAP) {
    try { await processOne(e); ok++; }
    catch (err) { console.error(`  ✗ ${e.target}: ${err.message}`); fail++; }
  }
  console.log(`\n${ok} ok · ${fail} falha(s)`);
})();
