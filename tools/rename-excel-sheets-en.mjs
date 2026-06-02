/**
 * Rename Excel worksheet tabs (and row-1 titles) from Arabic to English.
 * Usage: node tools/rename-excel-sheets-en.mjs "<path-to.xlsx>"
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const SHEET_MAP = {
  'انواع الغرف': { sheet: 'Room Types', title: 'Room Types' },
  'فئات الأسعار': { sheet: 'Rate Categories', title: 'Rate & Price Codes' },
  'مصادر الحجز': { sheet: 'Booking Sources', title: 'Booking Sources' },
  'مميزات الغرف': { sheet: 'Room Features', title: 'Room Features' },
  'تصميم الغرف': { sheet: 'Room Design', title: 'Room Design' },
  'مناظر الغرف': { sheet: 'Room Views', title: 'Room Views' },
  'رموز السوق': { sheet: 'Market Codes', title: 'Market Codes' },
  'فئات الغرف': { sheet: 'Room Classes', title: 'Room Classes' },
  'الغرض من الزيارة': { sheet: 'Purpose of Visit', title: 'Purpose of Visit' },
  'انواع الهوية': { sheet: 'ID Types', title: 'ID Types' },
  'تصنيف العملاء': { sheet: 'Guest Classification', title: 'Guest Classification' },
  'الفئات العمرية': { sheet: 'Age Groups', title: 'Age Groups' },
  'انواع الطوابق': { sheet: 'Floor Types', title: 'Floor Types' },
  'مواقع الغرف': { sheet: 'Room Locations', title: 'Room Locations' },
  'صيانة الغرف': { sheet: 'Room Maintenance', title: 'Room Maintenance Reasons' },
  'نقل الغرف': { sheet: 'Room Transfer', title: 'Room Move Reasons' },
  الجنسيات: { sheet: 'Nationalities', title: 'Nationalities' },
};

const target = process.argv[2];
if (!target) {
  console.error('Usage: node rename-excel-sheets-en.mjs "<file.xlsx>"');
  process.exit(1);
}

const filePath = path.resolve(target);
if (!fs.existsSync(filePath)) {
  console.error('Not found:', filePath);
  process.exit(1);
}

const backup = filePath.replace(/\.xlsx$/i, '-ar-backup.xlsx');
if (!fs.existsSync(backup)) {
  fs.copyFileSync(filePath, backup);
  console.log('Backup:', backup);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(filePath);

const used = new Set();
for (const ws of wb.worksheets) {
  const key = ws.name.trim();
  const mapping = SHEET_MAP[key] ?? SHEET_MAP[ws.name];
  if (!mapping) {
    console.warn('Skip (no mapping):', ws.name);
    continue;
  }
  if (used.has(mapping.sheet)) {
    console.error('Duplicate English name:', mapping.sheet);
    process.exit(1);
  }
  used.add(mapping.sheet);

  ws.name = mapping.sheet;
  const titleCell = ws.getCell(1, 1);
  titleCell.value = mapping.title;
  console.log(`${key} → ${mapping.sheet}`);
}

await wb.xlsx.writeFile(filePath);
console.log('Saved:', filePath);
