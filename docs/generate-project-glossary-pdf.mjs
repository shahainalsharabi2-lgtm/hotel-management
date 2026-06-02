/**
 * يولّد PDF من ملف مصطلحات المشروع
 * التشغيل: node docs/generate-project-glossary-pdf.mjs
 */
import { copyFileSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = join(__dirname, 'مصطلحات-وأدوات-المشروع.md');
const htmlPath = join(__dirname, 'project-glossary-ar.html');
const pdfPath = join(__dirname, 'Hotel-Project-Glossary-AR.pdf');
const pdfPathAr = join(__dirname, 'مصطلحات-المشروع.pdf');

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
      out.push('');
    } else if (line.startsWith('*') && line.endsWith('*')) {
      closeLi();
      out.push(`<p class="meta"><em>${inline(line)}</em></p>`);
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
  <title>مصطلحات مشروع مضياف العرب للفنادق</title>
  <style>
    @page { margin: 18mm 16mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1a1a1a;
      direction: rtl;
      text-align: right;
      max-width: 180mm;
      margin: 0 auto;
    }
    h1 {
      color: #1565c0;
      font-size: 20pt;
      border-bottom: 3px solid #1565c0;
      padding-bottom: 8px;
      margin-top: 0;
    }
    h2 {
      color: #0d47a1;
      font-size: 14pt;
      margin-top: 20px;
      page-break-after: avoid;
      border-right: 4px solid #1976d2;
      padding-right: 10px;
    }
    h3 { color: #37474f; font-size: 12pt; page-break-after: avoid; }
    code {
      direction: ltr;
      unicode-bidi: embed;
      font-family: Consolas, monospace;
      font-size: 8.5pt;
      background: #f0f4f8;
      padding: 1px 5px;
      border-radius: 3px;
    }
    pre {
      direction: ltr;
      text-align: left;
      background: #f5f7fa;
      border: 1px solid #cfd8dc;
      padding: 10px 12px;
      border-radius: 6px;
      white-space: pre-wrap;
      font-family: Consolas, monospace;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5pt; page-break-inside: avoid; }
    th, td { border: 1px solid #b0bec5; padding: 6px 8px; vertical-align: top; }
    th { background: #e3f2fd; color: #0d47a1; }
    tr:nth-child(even) td { background: #fafafa; }
    ul { margin: 6px 0; padding-right: 22px; }
    li { margin: 3px 0; }
    hr { border: none; border-top: 1px solid #ccc; margin: 18px 0; }
    .meta { color: #546e7a; font-size: 10pt; }
    strong { color: #0d47a1; }
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
      for (const dir of readdirSync(c)) {
        const exe = join(c, dir, 'chrome-win64', 'chrome.exe');
        if (existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

function main() {
  const chrome = findChrome();
  const fileUrl = pathToFileURL(htmlPath).href;
  if (chrome) {
    execFileSync(
      chrome,
      ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, fileUrl],
      { stdio: 'inherit' }
    );
    try {
      copyFileSync(pdfPath, pdfPathAr);
      console.log('PDF (عربي):', pdfPathAr);
    } catch {
      /* ignore */
    }
    console.log('PDF:', pdfPath);
    return;
  }
  console.log('لم يُعثر على Chrome/Edge. افتح HTML واطبع إلى PDF:');
  console.log(htmlPath);
}

try {
  main();
} catch (e) {
  console.error('فشل إنشاء PDF:', e.message);
  console.error('افتح الملف HTML في المتصفح → طباعة → حفظ كـ PDF');
  process.exit(1);
}

