/**
 * يولّد PDF من دليل الترجمة
 * التشغيل: node docs/generate-translation-guide-pdf.mjs
 */
import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = join(__dirname, 'دليل-اضافة-الترجمة-للنظام.md');
const htmlPath = join(__dirname, 'translation-guide-ar.html');
const pdfPath = join(__dirname, 'Hotel-Translation-Guide-AR.pdf');
const pdfPathAr = join(__dirname, 'دليل-اضافة-الترجمة-للنظام.pdf');

const md = readFileSync(mdPath, 'utf8');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function mdToHtml(source) {
  let html = source.replace(/^---[\s\S]*?---\n/, '');
  const lines = html.split('\n');
  const out = [];
  let inCode = false;
  let tableRows = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    out.push('<table>');
    tableRows.forEach((row, i) => {
      const tag = i === 0 ? 'th' : 'td';
      out.push(
        '<tr>' + row.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>'
      );
    });
    out.push('</table>');
    tableRows = [];
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushTable();
      if (!inCode) {
        inCode = true;
        out.push('<pre><code>');
      } else {
        inCode = false;
        out.push('</code></pre>');
      }
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }
    if (line.startsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue;
      tableRows.push(cells);
      continue;
    }
    flushTable();
    if (line.startsWith('# ')) {
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith('- ')) {
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.trim() === '---') {
      out.push('<hr/>');
    } else if (line.trim() === '') {
      out.push('');
    } else if (line.startsWith('*') && line.endsWith('*')) {
      out.push(`<p class="meta"><em>${inline(line)}</em></p>`);
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flushTable();
  return out.join('\n');
}

const body = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>دليل إضافة الترجمة</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1a1a1a;
      direction: rtl;
      text-align: right;
      max-width: 180mm;
      margin: 0 auto;
    }
    h1 { color: #1565c0; font-size: 22pt; border-bottom: 2px solid #1565c0; padding-bottom: 8px; }
    h2 { color: #0d47a1; font-size: 15pt; margin-top: 22px; page-break-after: avoid; }
    h3 { color: #37474f; font-size: 12.5pt; }
    code { direction: ltr; unicode-bidi: embed; font-family: Consolas, monospace; font-size: 9pt; background: #f0f0f0; padding: 1px 4px; }
    pre {
      direction: ltr;
      text-align: left;
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 6px;
      white-space: pre-wrap;
      font-family: Consolas, monospace;
      font-size: 8.5pt;
    }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; }
    th { background: #e3f2fd; }
    li { margin: 4px 0; }
    hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
    .meta { color: #666; font-size: 10pt; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('HTML:', htmlPath);

import { execFileSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';

function findChrome() {
  const base = join(homedir(), '.cache', 'puppeteer', 'chrome');
  if (!existsSync(base)) return null;
  for (const dir of readdirSync(base)) {
    const exe = join(base, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(exe)) return exe;
  }
  return null;
}

function main() {
  const chrome = findChrome();
  const fileUrl = pathToFileURL(htmlPath).href;
  if (chrome) {
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${pdfPath}`,
        fileUrl,
      ],
      { stdio: 'inherit' }
    );
    try {
      copyFileSync(pdfPath, pdfPathAr);
      console.log('PDF (AR name):', pdfPathAr);
    } catch {
      /* ignore */
    }
    console.log('PDF:', pdfPath);
    return;
  }
  console.log('لم يُعثر على Chrome. افتح HTML واطبع إلى PDF:', htmlPath);
}

try {
  main();
} catch (e) {
  console.error('فشل إنشاء PDF:', e.message);
  console.error('افتح الملف HTML في المتصفح → طباعة → حفظ كـ PDF');
  process.exit(1);
}
