/**
 * يولّد PDF منفصل للباك-اند والفرونت-اند
 * التشغيل: node docs/generate-backend-frontend-pdfs.mjs
 */
import { copyFileSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const JOBS = [
  {
    md: 'ملخص-الباك-اند.md',
    html: 'project-backend-summary-ar.html',
    pdfEn: 'Hotel-Backend-Summary-AR.pdf',
    pdfAr: 'ملخص-الباك-اند.pdf',
    title: 'ملخص الباك-اند — مضياف العرب للفنادق',
    accent: '#0d47a1',
  },
  {
    md: 'ملخص-الفرونت-اند.md',
    html: 'project-frontend-summary-ar.html',
    pdfEn: 'Hotel-Frontend-Summary-AR.pdf',
    pdfAr: 'ملخص-الفرونت-اند.pdf',
    title: 'ملخص الفرونت-اند — مضياف العرب للفنادق',
    accent: '#6a1b9a',
  },
];

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

function buildHtml(body, job) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${job.title}</title>
  <style>
    @page { margin: 16mm 14mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      direction: rtl;
      text-align: right;
      max-width: 182mm;
      margin: 0 auto;
    }
    h1 {
      color: ${job.accent};
      font-size: 19pt;
      border-bottom: 3px solid ${job.accent};
      padding-bottom: 8px;
      margin-top: 0;
    }
    h2 {
      color: ${job.accent};
      font-size: 13pt;
      margin-top: 18px;
      page-break-after: avoid;
      border-right: 4px solid ${job.accent};
      padding-right: 10px;
      opacity: 0.95;
    }
    h3 { color: #37474f; font-size: 11pt; page-break-after: avoid; margin-top: 12px; }
    code {
      direction: ltr;
      unicode-bidi: embed;
      font-family: Consolas, monospace;
      font-size: 8pt;
      background: #f0f4f8;
      padding: 1px 4px;
      border-radius: 3px;
    }
    pre {
      direction: ltr;
      text-align: left;
      background: #f5f7fa;
      border: 1px solid #cfd8dc;
      padding: 8px 10px;
      border-radius: 6px;
      white-space: pre-wrap;
      font-family: Consolas, monospace;
      font-size: 7.5pt;
      page-break-inside: avoid;
      line-height: 1.35;
    }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt; page-break-inside: avoid; }
    th, td { border: 1px solid #b0bec5; padding: 5px 7px; vertical-align: top; }
    th { background: #e8eaf6; color: ${job.accent}; font-weight: 600; }
    tr:nth-child(even) td { background: #fafafa; }
    ul { margin: 5px 0; padding-right: 20px; }
    li { margin: 2px 0; }
    hr { border: none; border-top: 1px solid #ccc; margin: 14px 0; }
    .meta { color: #546e7a; font-size: 9.5pt; }
    strong { color: ${job.accent}; }
    p { margin: 4px 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

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

function generateOne(job, chrome) {
  const mdPath = join(__dirname, job.md);
  const htmlPath = join(__dirname, job.html);
  const pdfPath = join(__dirname, job.pdfEn);
  const pdfPathAr = join(__dirname, job.pdfAr);

  const md = readFileSync(mdPath, 'utf8');
  const body = mdToHtml(md);
  writeFileSync(htmlPath, buildHtml(body, job), 'utf8');
  console.log('HTML:', htmlPath);

  if (!chrome) {
    console.log('  → افتح HTML واطبع PDF يدوياً');
    return;
  }

  const fileUrl = pathToFileURL(htmlPath).href;
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
}

function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.log('لم يُعثر على Chrome/Edge — سيُنشأ HTML فقط.\n');
  }
  for (const job of JOBS) {
    console.log('\n---', job.md, '---');
    generateOne(job, chrome);
  }
}

try {
  main();
} catch (e) {
  console.error('فشل:', e.message);
  process.exit(1);
}
