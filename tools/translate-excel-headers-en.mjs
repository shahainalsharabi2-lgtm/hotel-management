/**
 * Translate column headers (row 2) to English on general-code Excel sheets.
 * Usage: node tools/translate-excel-headers-en.mjs "<path-to.xlsx>"
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const HEADERS_EN = ['#', 'Name (Arabic)', 'Foreign Name', 'Description'];

const HEADER_ALIASES = new Set([
  '#',
  'م',
  'الاسم',
  'الاسم (عربي)',
  'الاسم الأجنبي',
  'الاسم الاجنبي',
  'الوصف',
  'Name (Arabic)',
  'Foreign Name',
  'Description',
]);

const target = process.argv[2];
if (!target) {
  console.error('Usage: node translate-excel-headers-en.mjs "<file.xlsx>"');
  process.exit(1);
}

const filePath = path.resolve(target);
if (!fs.existsSync(filePath)) {
  console.error('Not found:', filePath);
  process.exit(1);
}

const backup = filePath.replace(/\.xlsx$/i, '-before-headers-en.xlsx');
if (!fs.existsSync(backup)) {
  fs.copyFileSync(filePath, backup);
  console.log('Backup:', backup);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(filePath);

let updated = 0;
for (const ws of wb.worksheets) {
  const row = ws.getRow(2);
  const h2 = String(row.getCell(2).value ?? '').trim();
  const h3 = String(row.getCell(3).value ?? '').trim();
  if (!HEADER_ALIASES.has(h2) && !HEADER_ALIASES.has(h3)) {
    console.warn('Skip (unknown layout):', ws.name);
    continue;
  }

  HEADERS_EN.forEach((text, i) => {
    const cell = row.getCell(i + 1);
    cell.value = text;
    cell.font = { ...(cell.font ?? {}), name: 'Calibri', size: 11, bold: true };
    cell.alignment = {
      vertical: 'middle',
      horizontal: i === 0 ? 'center' : 'left',
      wrapText: true,
    };
  });
  updated++;
  console.log('Headers EN:', ws.name);
}

await wb.xlsx.writeFile(filePath);
console.log(`Saved: ${filePath} (${updated} sheets)`);
