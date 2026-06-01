#!/usr/bin/env node
/**
 * build-playbook-docx.mjs  ·  v2
 * --------------------------------------------------------------
 * Lê <client>/content.json e gera <client>/Playbook.docx.
 *
 * Melhorias v2:
 *  - Substitui <CLIENTE> globalmente (meta.clientName).
 *  - Imagens preservam aspect-ratio (lê IHDR do PNG; fallback p/ outros).
 *  - Capa estilizada (sem depender de PNG externo).
 *  - TOC real do Word (campo TableOfContents).
 *  - Tabelas zebra + larguras de coluna por header.
 *  - Passos com badge numerado.
 *  - Callouts com ícone + barra lateral grossa.
 *  - Header com título à esquerda + nome do cliente à direita.
 *  - Mermaid renderizado em PNG (cache) com aspect-ratio real.
 *
 * Uso:
 *   cd .github/playbook-agent/scripts
 *   npm install
 *   npm run build:playbook -- --client sao-rafael
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, PageBreak, Footer, Header, PageNumber, LevelFormat,
  TableOfContents, ExternalHyperlink, StyleLevel, convertInchesToTwip,
  PageOrientation,
} from 'docx';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(__dirname, '..');

// ─── client args ────────────────────────────────────────────────
function argFlag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
}
const CLIENT = argFlag('client') || process.env.PLAYBOOK_CLIENT || null;
const CLIENT_ROOT = CLIENT ? path.join(AGENT_ROOT, 'clients', CLIENT) : AGENT_ROOT;
if (CLIENT) {
  if (!fs.existsSync(CLIENT_ROOT)) {
    console.error(`\n❌ Cliente "${CLIENT}" não encontrado em ${CLIENT_ROOT}\n`);
    process.exit(2);
  }
  console.log(`📁 Cliente: ${CLIENT}`);
}
const CONTENT = path.join(CLIENT_ROOT, 'content.json');
const SHOTS_DIR = path.join(CLIENT_ROOT, 'screenshots');
const CACHE_DIR = path.join(CLIENT_ROOT, '.cache', 'mermaid');
const OUT = path.join(CLIENT_ROOT, 'Playbook.docx');

// ─── sanitization ───────────────────────────────────────────────
const FORBIDDEN = [
  { re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, name: 'JWT real' },
  { re: /sk-(proj-|or-|ant-)?[A-Za-z0-9_-]{30,}/, name: 'API key' },
  { re: /\b[a-z0-9]{20}\.supabase\.co\b/, name: 'URL Supabase real' },
  { re: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/, name: 'CNPJ formatado' },
  { re: /\bSR-\d{6}-\d{4}\b/, name: 'Protocolo do piloto' },
  { re: /@saorafael\.com\.br/, name: 'E-mail do domínio piloto' },
  { re: /C:\\Users\\[A-Za-z0-9_.-]+\\/, name: 'Caminho local de máquina dev' },
];
function sanitize(json) {
  const s = JSON.stringify(json);
  const hits = [];
  for (const f of FORBIDDEN) {
    const m = s.match(f.re);
    if (m) hits.push(`  - ${f.name}: «${m[0].slice(0, 60)}»`);
  }
  if (hits.length) {
    console.error('\n❌ SANITIZAÇÃO FALHOU:\n' + hits.join('\n') + '\n');
    process.exit(2);
  }
}

// ─── <CLIENTE> substitution everywhere ──────────────────────────
function deepReplace(node, from, to) {
  if (typeof node === 'string') return node.split(from).join(to);
  if (Array.isArray(node)) return node.map(n => deepReplace(n, from, to));
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = deepReplace(node[k], from, to);
    return out;
  }
  return node;
}

// ─── mermaid → PNG (cached) ─────────────────────────────────────
function findLocalMmdc() {
  const bin = process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc';
  // walk up from script dir looking for node_modules/.bin/mmdc
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'node_modules', '.bin', bin);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
const LOCAL_MMDC = findLocalMmdc();
let MERMAID_WARNED = false;

function renderMermaidToPng(code) {
  const hash = crypto.createHash('sha1').update(code).digest('hex').slice(0, 12);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const out = path.join(CACHE_DIR, `${hash}.png`);
  if (fs.existsSync(out)) return out;
  const src = path.join(CACHE_DIR, `${hash}.mmd`);
  fs.writeFileSync(src, code);
  const args = ['-i', src, '-o', out, '-b', 'white', '-w', '1600', '-s', '2'];
  const attempts = LOCAL_MMDC
    ? [{ cmd: LOCAL_MMDC, args, shell: process.platform === 'win32' }]
    : [{ cmd: 'npx', args: ['-y', '@mermaid-js/mermaid-cli', ...args], shell: process.platform === 'win32' }];
  for (const a of attempts) {
    try {
      execFileSync(a.cmd, a.args, { stdio: 'pipe', shell: a.shell });
      if (fs.existsSync(out)) return out;
    } catch (err) {
      if (!MERMAID_WARNED) {
        MERMAID_WARNED = true;
        const msg = (err.stderr || err.stdout || err.message || '').toString().split('\n').slice(0, 4).join('\n');
        console.warn(`⚠️  Falha ao renderizar Mermaid via ${a.cmd}:\n${msg}`);
      }
    }
  }
  return null;
}

// ─── PNG IHDR parse → real width/height ─────────────────────────
function pngSize(buf) {
  // signature 8 bytes, then IHDR length(4)+'IHDR'(4)+W(4)+H(4)
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// ─── style constants ────────────────────────────────────────────
const FONT = 'Calibri';
const MONO = 'Consolas';
const CONTENT_PX = 660; // ≈ printable width @ A4 with our margins (px units in docx ImageRun)

// Default palette (overridden per-document by meta.brand)
let COLOR = {
  accent:   'E30613',  // SENAI red
  accent2:  '8B0410',  // deep red
  ink:      '0B0B0B',
  ink2:     '1F2937',
  gray:     '6B7280',
  gray2:    '9CA3AF',
  rule:     'D1D5DB',
  zebra:    'F9F7F7',
  cellHdr:  'FBE9EB',  // faint red wash
  danger:   'B91C1C',
  warn:     'B45309',
  tip:      '047857',
  info:     '1D4ED8',
  codeBg:   '0B0B0B',
  codeFg:   'E5E7EB',
};
function applyBrand(brand) {
  if (!brand) return;
  if (brand.accentColor) COLOR.accent = brand.accentColor;
  if (brand.accentDark)  COLOR.accent2 = brand.accentDark;
  if (brand.inkColor)    COLOR.ink = brand.inkColor;
  if (brand.primaryColor) COLOR.ink = brand.primaryColor;
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: COLOR.rule };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

// ─── basic helpers ──────────────────────────────────────────────
function run(text, opts = {}) {
  return new TextRun({ font: FONT, size: 22, color: COLOR.ink2, ...opts, text });
}
function P(content, opts = {}) {
  const runs = Array.isArray(content)
    ? content.map(r => r instanceof TextRun ? r : new TextRun({ font: FONT, size: 22, color: COLOR.ink2, ...r }))
    : [new TextRun({ font: FONT, size: 22, color: COLOR.ink2, text: content })];
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: 80, after: 80, line: 320 },
    ...opts.paragraph,
    children: runs,
  });
}

function H(text, level, opts = {}) {
  const sizes = { 1: 44, 2: 32, 3: 26, 4: 22 };
  const colors = { 1: COLOR.accent, 2: COLOR.ink, 3: COLOR.ink, 4: COLOR.ink2 };
  return new Paragraph({
    heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][level - 1],
    spacing: { before: level === 1 ? 200 : 320, after: level === 1 ? 120 : 140 },
    ...opts.paragraph,
    children: [new TextRun({ text, font: FONT, size: sizes[level], bold: true, color: colors[level] })],
  });
}

// inline mini-markdown: **bold**, *italic*, `code`
function inlineRuns(md) {
  const tokens = [];
  let i = 0;
  while (i < md.length) {
    if (md.startsWith('**', i)) {
      const j = md.indexOf('**', i + 2);
      if (j > -1) { tokens.push({ text: md.slice(i + 2, j), bold: true }); i = j + 2; continue; }
    }
    if (md[i] === '`') {
      const j = md.indexOf('`', i + 1);
      if (j > -1) {
        tokens.push({ text: md.slice(i + 1, j), font: MONO, size: 20, shading: { fill: 'EEF2FF', type: ShadingType.CLEAR, color: 'auto' } });
        i = j + 1; continue;
      }
    }
    if (md[i] === '*') {
      const j = md.indexOf('*', i + 1);
      if (j > -1) { tokens.push({ text: md.slice(i + 1, j), italics: true }); i = j + 1; continue; }
    }
    let k = i;
    while (k < md.length && md[k] !== '*' && md[k] !== '`') k++;
    tokens.push({ text: md.slice(i, k) });
    i = k;
  }
  return tokens.length ? tokens : [{ text: md }];
}

// ─── horizontal rule (thin colored bar) ─────────────────────────
function rule(color = COLOR.rule, size = 6) {
  return new Paragraph({
    spacing: { before: 40, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
    children: [new TextRun({ text: '' })],
  });
}

// ─── images with real aspect ratio ──────────────────────────────
function fittedImage(absPath, maxW = CONTENT_PX, maxH = 460) {
  const data = fs.readFileSync(absPath);
  const ext = path.extname(absPath).slice(1).toLowerCase();
  let w = maxW, h = Math.round(maxW * 0.5625);
  if (ext === 'png') {
    const s = pngSize(data);
    if (s) {
      const r = s.w / s.h;
      w = maxW; h = Math.round(w / r);
      if (h > maxH) { h = maxH; w = Math.round(h * r); }
    }
  }
  return new ImageRun({ data, transformation: { width: w, height: h }, type: ext === 'jpg' ? 'jpeg' : ext });
}

function imageOrPlaceholder(relPath, caption) {
  const blocks = [];
  const abs = relPath ? path.join(SHOTS_DIR, relPath) : null;
  if (abs && fs.existsSync(abs)) {
    blocks.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      children: [fittedImage(abs)],
    }));
    if (caption) blocks.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: caption, font: FONT, size: 18, italics: true, color: COLOR.gray })],
    }));
  } else {
    blocks.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [new TableCell({
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
        borders: {
          top: { style: BorderStyle.DASHED, size: 6, color: COLOR.gray2 },
          bottom: { style: BorderStyle.DASHED, size: 6, color: COLOR.gray2 },
          left: { style: BorderStyle.DASHED, size: 6, color: COLOR.gray2 },
          right: { style: BorderStyle.DASHED, size: 6, color: COLOR.gray2 },
        },
        margins: { top: 600, bottom: 600, left: 200, right: 200 },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: '📷  SCREENSHOT PENDENTE', font: FONT, size: 22, bold: true, color: COLOR.gray }),
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: relPath || '(sem path)', font: MONO, size: 18, color: COLOR.gray }),
          ]}),
          ...(caption ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: caption, font: FONT, size: 18, italics: true, color: COLOR.gray }),
          ]})] : []),
        ],
      })] })],
    }));
  }
  return blocks;
}

// ─── tables (zebra + col widths) ────────────────────────────────
function renderTable(tbl) {
  const blocks = [];
  if (tbl.caption) blocks.push(new Paragraph({
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text: tbl.caption, italics: true, color: COLOR.gray, size: 20, font: FONT })],
  }));

  const colCount = tbl.headers.length;
  // basic auto: first column 28%, rest divide remainder
  const widths = colCount === 1 ? [100] : [28, ...Array(colCount - 1).fill(Math.floor(72 / (colCount - 1)))];

  const header = new TableRow({ tableHeader: true, children: tbl.headers.map((h, i) => new TableCell({
    width: { size: widths[i], type: WidthType.PERCENTAGE },
    shading: { fill: COLOR.cellHdr, type: ShadingType.CLEAR, color: 'auto' },
    borders, margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, size: 20, bold: true, color: COLOR.ink })] })],
  }))});

  const rows = tbl.rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => new TableCell({
    width: { size: widths[ci], type: WidthType.PERCENTAGE },
    shading: ri % 2 ? { fill: COLOR.zebra, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    borders, margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 280 },
      children: inlineRuns(String(c ?? '')).map(t => new TextRun({ font: FONT, size: 20, color: COLOR.ink2, ...t })),
    })],
  }))}));

  blocks.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] }));
  return blocks;
}

// ─── code blocks ────────────────────────────────────────────────
function renderCode(cb) {
  const blocks = [];
  if (cb.caption) blocks.push(new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text: cb.caption, italics: true, color: COLOR.gray, size: 20, font: FONT })],
  }));
  const lines = (cb.body || '').split('\n');
  const langTag = cb.language ? `  ${cb.language.toUpperCase()}` : '';
  blocks.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill: COLOR.codeBg, type: ShadingType.CLEAR, color: 'auto' },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.codeBg },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.codeBg },
        left: { style: BorderStyle.SINGLE, size: 16, color: COLOR.accent },
        right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.codeBg },
      },
      margins: { top: 180, bottom: 180, left: 220, right: 220 },
      children: [
        ...(langTag ? [new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: langTag.trim(), font: MONO, size: 16, color: '7AB7FF', bold: true })],
        })] : []),
        ...lines.map(ln => new Paragraph({
          spacing: { before: 0, after: 0, line: 260 },
          children: [new TextRun({ text: ln || ' ', font: MONO, size: 19, color: COLOR.codeFg })],
        })),
      ],
    })] })],
  }));
  return blocks;
}

// ─── callouts (info / tip / warning / danger / checklist) ───────
const CALLOUT = {
  info:      { bg: 'EFF6FF', bar: COLOR.info,   icon: 'ℹ',  label: 'INFO' },
  tip:       { bg: 'ECFDF5', bar: COLOR.tip,    icon: '✓',  label: 'DICA' },
  warning:   { bg: 'FFFBEB', bar: COLOR.warn,   icon: '!',  label: 'ATENÇÃO' },
  danger:    { bg: 'FEF2F2', bar: COLOR.danger, icon: '✕',  label: 'CUIDADO' },
  checklist: { bg: 'F9FAFB', bar: COLOR.gray,   icon: '☑',  label: 'CHECKLIST' },
};

function calloutBox(c) {
  const p = CALLOUT[c.type] || { bg: 'F9FAFB', bar: COLOR.gray, icon: '•', label: (c.type || '').toUpperCase() };
  const children = [];
  children.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [
      new TextRun({ text: `${p.icon}  `, font: FONT, size: 22, bold: true, color: p.bar }),
      new TextRun({ text: p.label, font: FONT, size: 16, bold: true, color: p.bar, characterSpacing: 40 }),
      ...(c.title ? [new TextRun({ text: '   ·   ' + c.title, font: FONT, size: 22, bold: true, color: COLOR.ink })] : []),
    ],
  }));
  if (c.body) children.push(new Paragraph({
    spacing: { before: 0, after: 40, line: 300 },
    children: inlineRuns(c.body).map(r => new TextRun({ font: FONT, size: 22, color: COLOR.ink2, ...r })),
  }));
  if (c.items?.length) {
    for (const it of c.items) {
      children.push(new Paragraph({
        spacing: { before: 30, after: 30 },
        indent: { left: 200 },
        children: [
          new TextRun({ text: c.type === 'checklist' ? '☐   ' : '•   ', font: FONT, size: 22, color: p.bar, bold: true }),
          ...inlineRuns(it).map(r => new TextRun({ font: FONT, size: 22, color: COLOR.ink2, ...r })),
        ],
      }));
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill: p.bg, type: ShadingType.CLEAR, color: 'auto' },
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 4,  color: p.bar },
        bottom: { style: BorderStyle.SINGLE, size: 4,  color: p.bar },
        right:  { style: BorderStyle.SINGLE, size: 4,  color: p.bar },
        left:   { style: BorderStyle.SINGLE, size: 32, color: p.bar },
      },
      margins: { top: 180, bottom: 180, left: 240, right: 200 },
      children,
    })] })],
  });
}

// ─── diagrams ───────────────────────────────────────────────────
function renderDiagram(d) {
  if (d.kind === 'mermaid') {
    const png = renderMermaidToPng(d.code);
    if (png) {
      const blocks = [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 60 },
        children: [fittedImage(png, CONTENT_PX, 520)],
      })];
      if (d.caption) blocks.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: d.caption, font: FONT, size: 18, italics: true, color: COLOR.gray })],
      }));
      return blocks;
    }
    return [
      calloutBox({ type: 'info', title: 'Diagrama (fonte Mermaid)', body: 'Instale `@mermaid-js/mermaid-cli` para renderizar este diagrama como imagem.' }),
      ...renderCode({ language: 'mermaid', body: d.code }),
      ...(d.caption ? [P([{ text: d.caption, italics: true, color: COLOR.gray }])] : []),
    ];
  }
  if (d.kind === 'image') return imageOrPlaceholder(d.path, d.caption);
  return [];
}

// ─── numbered step ──────────────────────────────────────────────
function stepBadge(n) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [600, 8000],
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        verticalAlign: 'center',
        shading: { fill: COLOR.accent, type: ShadingType.CLEAR, color: 'auto' },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 4, color: COLOR.accent },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.accent },
          left:   { style: BorderStyle.SINGLE, size: 4, color: COLOR.accent },
          right:  { style: BorderStyle.SINGLE, size: 4, color: COLOR.accent },
        },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(n), font: FONT, size: 28, bold: true, color: 'FFFFFF' })],
        })],
      }),
      new TableCell({
        width: { size: 92, type: WidthType.PERCENTAGE },
        verticalAlign: 'center',
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        margins: { top: 80, bottom: 80, left: 200, right: 0 },
        children: [new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: 22 })] })],
      }),
    ]})],
  });
}

function renderStep(step) {
  const blocks = [];
  // header line: PASSO N  ·  ação em negrito
  blocks.push(new Paragraph({
    spacing: { before: 220, after: 60 },
    children: [
      new TextRun({ text: `PASSO ${String(step.n).padStart(2, '0')}`, font: FONT, size: 16, bold: true, color: COLOR.accent, characterSpacing: 60 }),
      new TextRun({ text: '   ·   ', font: FONT, size: 18, color: COLOR.gray }),
      ...inlineRuns(step.action).map(r => new TextRun({ font: FONT, size: 22, bold: true, color: COLOR.ink, ...r })),
    ],
  }));
  if (step.detail) blocks.push(P([{ text: step.detail, color: COLOR.ink2 }]));
  if (step.code) blocks.push(...renderCode(step.code));
  if (step.screenshot) blocks.push(...imageOrPlaceholder(step.screenshot, step.caption));
  if (step.expected) blocks.push(calloutBox({ type: 'tip', title: 'Resultado esperado', body: step.expected }));
  return blocks;
}

// ─── sections ───────────────────────────────────────────────────
// Word merges two consecutive <Table> blocks visually unless a paragraph sits
// between them. This helper appends an empty paragraph after any Table so the
// next block (another table, callout, code) renders as its own unit.
function pushBlocks(target, items) {
  for (const it of items) {
    target.push(it);
    if (it instanceof Table) {
      target.push(new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '', size: 2 })] }));
    }
  }
}

function renderSection(sec) {
  const blocks = [];
  blocks.push(H(sec.heading, 3));
  blocks.push(rule(COLOR.rule, 4));
  if (sec.intro) blocks.push(P(inlineRuns(sec.intro)));
  if (sec.diagram) pushBlocks(blocks, renderDiagram(sec.diagram));
  if (sec.table) pushBlocks(blocks, renderTable(sec.table));
  if (sec.code) pushBlocks(blocks, renderCode(sec.code));
  if (sec.steps) for (const s of sec.steps) pushBlocks(blocks, renderStep(s));
  if (sec.notes) for (const n of sec.notes) pushBlocks(blocks, [calloutBox(n)]);
  if (sec.links?.length) {
    blocks.push(P([{ text: 'Links: ', bold: true }]));
    for (const l of sec.links) {
      blocks.push(new Paragraph({ children: [
        new TextRun({ text: '• ', font: FONT, size: 22 }),
        new ExternalHyperlink({ link: l.url, children: [new TextRun({ text: l.label, font: FONT, size: 22, color: COLOR.accent, underline: {} })] }),
      ]}));
    }
  }
  return blocks;
}

// ─── chapter ────────────────────────────────────────────────────
function chapterTitlePage(ch) {
  // big chapter number + title block
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 0 },
      children: [new TextRun({ text: `CAPÍTULO ${String(ch.number).padStart(2, '0')}`, font: FONT, size: 18, bold: true, color: COLOR.accent, characterSpacing: 80 })],
    }),
    new Paragraph({
      spacing: { before: 100, after: 200 },
      children: [new TextRun({ text: ch.title, font: FONT, size: 48, bold: true, color: COLOR.ink })],
    }),
    rule(COLOR.accent, 12),
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: ch.summary, font: FONT, size: 24, italics: true, color: COLOR.gray })],
    }),
  ];
}

function renderChapter(ch) {
  const blocks = [...chapterTitlePage(ch)];
  if (ch.objectives?.length) {
    pushBlocks(blocks, [calloutBox({
      type: 'info',
      title: 'Objetivos deste capítulo',
      items: ch.objectives,
    })]);
  }
  if (ch.prerequisites?.length) {
    pushBlocks(blocks, [calloutBox({ type: 'warning', title: 'Pré-requisitos', body: ch.prerequisites.join('  ·  ') })]);
  }
  for (const sec of ch.sections) blocks.push(...renderSection(sec));
  return blocks;
}

// ─── cover ──────────────────────────────────────────────────────
function logoImage(brand, targetW = 220) {
  if (!brand?.logoPath) return null;
  const abs = path.isAbsolute(brand.logoPath) ? brand.logoPath : path.join(CLIENT_ROOT, brand.logoPath);
  if (!fs.existsSync(abs)) return null;
  const data = fs.readFileSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  let w = targetW, h = Math.round(targetW * 0.55);
  if (ext === 'png') {
    const s = pngSize(data);
    if (s) { const r = s.w / s.h; w = targetW; h = Math.round(w / r); }
  }
  return new ImageRun({ data, transformation: { width: w, height: h }, type: ext === 'jpg' ? 'jpeg' : ext });
}

function buildCover(meta) {
  const brand = meta.brand || {};
  const accent = COLOR.accent;
  const accentDark = COLOR.accent2;
  const logo = logoImage(brand, 200);

  const blocks = [];

  // Top accent band with logo + program tagline (white on red)
  blocks.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill: accent, type: ShadingType.CLEAR, color: 'auto' },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      margins: { top: 700, bottom: 700, left: 500, right: 500 },
      children: [
        new Paragraph({ alignment: AlignmentType.LEFT, children: [
          new TextRun({ text: 'PLAYBOOK   ·   TRANSFERÊNCIA DE TECNOLOGIA', font: FONT, size: 18, bold: true, color: 'FFFFFF', characterSpacing: 140 }),
        ]}),
        new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.LEFT, children: [
          new TextRun({ text: brand.programName || 'Programa de Inovação', font: FONT, size: 20, color: 'FFFFFF' }),
        ]}),
      ],
    })] })],
  }));

  // Logo block on white below band
  if (logo) {
    blocks.push(new Paragraph({
      spacing: { before: 600, after: 200 }, alignment: AlignmentType.LEFT,
      children: [logo],
    }));
  } else {
    blocks.push(new Paragraph({ spacing: { before: 600 } }));
  }

  blocks.push(new Paragraph({ spacing: { before: 800, after: 0 }, alignment: AlignmentType.LEFT, children: [
    new TextRun({ text: 'CLIENTE', font: FONT, size: 16, bold: true, color: COLOR.gray, characterSpacing: 120 }),
  ]}));
  blocks.push(new Paragraph({ spacing: { before: 80, after: 200 }, alignment: AlignmentType.LEFT, children: [
    new TextRun({ text: meta.clientName || '<CLIENTE>', font: FONT, size: 36, bold: true, color: COLOR.ink }),
  ]}));
  blocks.push(rule(accent, 14));
  blocks.push(new Paragraph({ spacing: { before: 240, after: 100 }, alignment: AlignmentType.LEFT, children: [
    new TextRun({ text: meta.title.replace(/^Playbook de Transferência\s+—\s+/, ''), font: FONT, size: 48, bold: true, color: COLOR.ink }),
  ]}));
  blocks.push(new Paragraph({ spacing: { before: 0, after: 400 }, alignment: AlignmentType.LEFT, children: [
    new TextRun({ text: meta.subtitle, font: FONT, size: 22, italics: true, color: COLOR.ink2 }),
  ]}));

  // info grid
  blocks.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [
      new TableRow({ children: [
        coverInfoCell('Versão', meta.version),
        coverInfoCell('Gerado em', meta.generatedAt),
        coverInfoCell('Confidencialidade', meta.confidentiality, COLOR.accent),
      ]}),
      new TableRow({ children: [
        coverInfoCell('Público-alvo', meta.audience, undefined, 2),
        coverInfoCell('Programa', 'SENAI-SP / DT', undefined, 1),
      ]}),
    ],
  }));

  // Footer band
  blocks.push(new Paragraph({ spacing: { before: 1800 } }));
  blocks.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill: accentDark, type: ShadingType.CLEAR, color: 'auto' },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      margins: { top: 240, bottom: 240, left: 500, right: 500 },
      children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [
        new TextRun({ text: brand.footerNote || 'Confidencial · não distribua sem autorização.', font: FONT, size: 16, bold: true, color: 'FFFFFF', characterSpacing: 80 }),
      ]})],
    })] })],
  }));

  return blocks;
}
function coverInfoCell(label, value, valColor, span = 1) {
  return new TableCell({
    width: { size: 33 * span, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    margins: { top: 120, bottom: 120, left: 0, right: 200 },
    children: [
      new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), font: FONT, size: 14, bold: true, color: COLOR.gray, characterSpacing: 80 })] }),
      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: value || '—', font: FONT, size: 22, bold: true, color: valColor || COLOR.ink })] }),
    ],
  });
}

// ─── TOC ────────────────────────────────────────────────────────
function buildToc(chapters) {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    H('Sumário', 1),
    rule(COLOR.accent, 12),
    new Paragraph({ spacing: { before: 100, after: 200 }, children: [
      new TextRun({ text: 'No Word, com o documento aberto, clique com o botão direito no sumário abaixo e selecione "Atualizar campo → Atualizar o índice inteiro" para regenerar os números de página.', font: FONT, size: 18, italics: true, color: COLOR.gray }),
    ]}),
    new TableOfContents('Sumário', {
      hyperlink: true,
      headingStyleRange: '1-3',
      stylesWithLevels: [new StyleLevel('Heading1', 1), new StyleLevel('Heading2', 2), new StyleLevel('Heading3', 3)],
    }),
    // visual chapter list (always renders even if TOC field not refreshed)
    new Paragraph({ children: [new PageBreak()] }),
    H('Capítulos', 2),
    rule(COLOR.rule, 4),
    ...chapters.flatMap(ch => [
      new Paragraph({ spacing: { before: 200, after: 0 }, children: [
        new TextRun({ text: String(ch.number).padStart(2, '0') + '  ', font: FONT, size: 26, bold: true, color: COLOR.accent }),
        new TextRun({ text: ch.title, font: FONT, size: 26, bold: true, color: COLOR.ink }),
      ]}),
      new Paragraph({ spacing: { before: 40, after: 80 }, indent: { left: 700 }, children: [
        new TextRun({ text: ch.summary, font: FONT, size: 20, italics: true, color: COLOR.gray }),
      ]}),
    ]),
  ];
}

// ────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────
let content = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
sanitize(content);
content.meta.generatedAt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
if (content.meta.clientName) content = deepReplace(content, '<CLIENTE>', content.meta.clientName);
applyBrand(content.meta.brand);

const children = [
  ...buildCover(content.meta),
  ...buildToc(content.chapters),
  ...content.chapters.flatMap(renderChapter),
];

const doc = new Document({
  creator: 'Playbook Agent',
  title: content.meta.title,
  description: content.meta.subtitle,
  styles: {
    default: {
      document: { run: { font: FONT, size: 22, color: COLOR.ink2 } },
      heading1: { run: { font: FONT, size: 44, bold: true, color: COLOR.accent } },
      heading2: { run: { font: FONT, size: 32, bold: true, color: COLOR.ink } },
      heading3: { run: { font: FONT, size: 26, bold: true, color: COLOR.ink } },
      heading4: { run: { font: FONT, size: 22, bold: true, color: COLOR.ink2 } },
    },
  },
  features: { updateFields: true },
  sections: [{
    properties: {
      page: {
        margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 },
        size: { orientation: PageOrientation.PORTRAIT },
      },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR.accent, space: 6 } },
          tabStops: [{ type: 'right', position: 9000 }],
          children: [
            ...(logoImage(content.meta.brand, 80) ? [logoImage(content.meta.brand, 80), new TextRun({ text: '   ', size: 16 })] : []),
            new TextRun({ text: (content.meta.brand?.programName || ''), font: FONT, size: 14, color: COLOR.gray, characterSpacing: 60 }),
            new TextRun({ text: '\t' + (content.meta.clientName || ''), font: FONT, size: 16, bold: true, color: COLOR.accent }),
          ],
        }),
      ] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.rule, space: 6 } },
        children: [
          new TextRun({ text: `${content.meta.confidentiality}   ·   v${content.meta.version}   ·   `, font: FONT, size: 16, color: COLOR.gray }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: COLOR.gray, bold: true }),
          new TextRun({ text: ' / ', font: FONT, size: 16, color: COLOR.gray }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: COLOR.gray }),
        ],
      })] }),
    },
    children,
  }],
});

const buf = await Packer.toBuffer(doc);
let outPath = OUT;
try {
  fs.writeFileSync(outPath, buf);
} catch (err) {
  if (err.code === 'EBUSY' || err.code === 'EPERM') {
    outPath = OUT.replace(/\.docx$/i, '.new.docx');
    fs.writeFileSync(outPath, buf);
    console.warn(`⚠️  ${path.basename(OUT)} estava aberto (provavelmente no Word). Salvei em ${path.basename(outPath)}.`);
  } else {
    throw err;
  }
}
console.log(`✅ Playbook gerado: ${outPath}`);
console.log(`   ${content.chapters.length} capítulos · ${(buf.length / 1024).toFixed(0)} KB`);
