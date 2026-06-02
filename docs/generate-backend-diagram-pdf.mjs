/**
 * PDF لمخطط ترجمة الواجهة (باك‌اند)
 * node docs/generate-backend-diagram-pdf.mjs
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = join(__dirname, 'مخطط-ترجمة-الواجهة-الباك-اند.md');
const htmlPath = join(__dirname, 'backend-translations-diagram-ar.html');
const pdfPath = join(__dirname, 'Hotel-Backend-Translations-Diagram-AR.pdf');
const pdfPathAr = join(__dirname, 'مخطط-ترجمة-الواجهة-الباك-اند.pdf');

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
  const lines = source.replace(/^---[\s\S]*?---\n/, '').split('\n');
  const out = [];
  let inCode = false;
  let tableRows = [];
  let inLi = false;

  const flushTable = () => {
    if (!tableRows.length) return;
    out.push('<table>');
    tableRows.forEach((row, i) => {
      const tag = i === 0 ? 'th' : 'td';
      out.push('<tr>' + row.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>');
    });
    out.push('</table>');
    tableRows = [];
  };

  const closeLi = () => {
    if (inLi) {
      out.push('</ul>');
      inLi = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushTable();
      closeLi();
      if (!inCode) {
        inCode = true;
        out.push('<pre class="diagram"><code>');
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
      closeLi();
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue;
      tableRows.push(cells);
      continue;
    }
    flushTable();
    if (line.startsWith('# ')) {
      closeLi();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      closeLi();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      closeLi();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith('- ')) {
      if (!inLi) {
        out.push('<ul>');
        inLi = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.trim() === '---') {
      closeLi();
      out.push('<hr/>');
    } else if (line.trim() === '') {
      closeLi();
    } else {
      closeLi();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flushTable();
  closeLi();
  return out.join('\n');
}

const body = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>مخطط ترجمة الواجهة — الباك‌اند</title>
  <style>
    @page { margin: 14mm 12mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #1a1a1a;
      direction: rtl;
      text-align: right;
      max-width: 185mm;
      margin: 0 auto;
    }
    h1 { color: #1565c0; font-size: 19pt; border-bottom: 3px solid #1565c0; padding-bottom: 6px; }
    h2 { color: #0d47a1; font-size: 13.5pt; margin-top: 16px; border-right: 4px solid #1976d2; padding-right: 8px; page-break-after: avoid; }
    h3 { color: #37474f; font-size: 11.5pt; }
    code { direction: ltr; unicode-bidi: embed; font-family: Consolas, monospace; font-size: 8.5pt; background: #eef4fb; padding: 1px 4px; }
    pre.diagram {
      direction: ltr;
      text-align: left;
      background: #1e3a5f;
      color: #e3f2fd;
      border: none;
      padding: 14px 16px;
      border-radius: 8px;
      white-space: pre;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 7.5pt;
      line-height: 1.35;
      page-break-inside: avoid;
      overflow-x: auto;
    }
    pre:not(.diagram) {
      direction: ltr;
      text-align: left;
      background: #f5f7fa;
      border: 1px solid #cfd8dc;
      padding: 10px;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt; page-break-inside: avoid; }
    th, td { border: 1px solid #b0bec5; padding: 5px 7px; }
    th { background: #e3f2fd; }
    ul { padding-right: 20px; }
    hr { border: none; border-top: 1px solid #ccc; margin: 14px 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('HTML:', htmlPath);

function findChrome() {
  const candidates = [
    join(homedir(), '.cache', 'puppeteer', 'chrome'),
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  for (const c of candidates) {
    if (c.endsWith('.exe') && existsSync(c)) return c;
    if (existsSync(c)) {
      try {
        for (const dir of readdirSync(c)) {
          const exe = join(c, dir, 'chrome-win64', 'chrome.exe');
          if (existsSync(exe)) return exe;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

const chrome = findChrome();
if (chrome) {
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { stdio: 'inherit' });
  try {
    copyFileSync(pdfPath, pdfPathAr);
    console.log('PDF (عربي):', pdfPathAr);
  } catch { /* ignore */ }
  console.log('PDF:', pdfPath);
} else {
  console.log('افتح HTML واطبع إلى PDF:', htmlPath);
}
