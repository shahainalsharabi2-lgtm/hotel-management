/**
 * تنسيق نموذج.xlsx: ألوان عصرية + صفوف # ثابتة + ترقيم تلقائي بعدها.
 * node tools/format-namudaj-excel.mjs
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '../..');
const TARGET = path.join(BASE, 'نموذج.xlsx');
const BACKUP = path.join(BASE, 'نموذج-أصلي.xlsx');

const C = {
  titleBg: 'FF1E3A5F',
  titleText: 'FFFFFFFF',
  headerBg: 'FF0891B2',
  headerText: 'FFFFFFFF',
  exampleBg: 'FFFFFBEB',
  exampleAccent: 'FFF59E0B',
  exampleText: 'FF92400E',
  rowEven: 'FFF0FDFA',
  rowOdd: 'FFFFFFFF',
  border: 'FFE2E8F0',
  guideBg: 'FFECFEFF',
};

const DATA_START = 3;
const ENTRY_ROWS = 50;
const HEADERS = ['#', 'الاسم (عربي)', 'الاسم الأجنبي', 'الوصف'];
const SKIP_SHEETS = new Set(['دليل الاستخدام']);

function border(cell, color = C.border) {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
}

function cellText(cell, value, opts = {}) {
  cell.value = value;
  cell.font = { name: 'Calibri', size: opts.size ?? 11, bold: !!opts.bold, color: opts.color };
  cell.alignment = {
    vertical: 'middle',
    horizontal: opts.center ? 'center' : 'right',
    wrapText: true,
  };
  if (opts.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
  }
  border(cell, opts.borderColor);
}

function findExampleEndRow(ws) {
  let last = DATA_START - 1;
  for (let r = DATA_START; r <= 200; r++) {
    const b = ws.getCell(r, 2).value;
    const text = b == null ? '' : String(b).trim();
    if (text) {
      last = r;
    } else if (last >= DATA_START) {
      break;
    }
  }
  return last >= DATA_START ? last : DATA_START - 1;
}

function styleTitleRow(ws) {
  const title = ws.getCell(1, 1).value ?? ws.name;
  try {
    ws.mergeCells(1, 1, 1, 4);
  } catch {
    // already merged
  }
  cellText(ws.getCell(1, 1), title, {
    bold: true,
    size: 15,
    center: true,
    fill: C.titleBg,
    color: { argb: C.titleText },
    borderColor: C.titleBg,
  });
  ws.getRow(1).height = 36;
}

function styleHeaderRow(ws) {
  const row = ws.getRow(2);
  row.height = 26;
  HEADERS.forEach((h, i) => {
    cellText(row.getCell(i + 1), h, {
      bold: true,
      center: i === 0,
      fill: C.headerBg,
      color: { argb: C.headerText },
      borderColor: 'FF0E7490',
    });
  });
}

function styleDataSheet(ws) {
  ws.properties.rightToLeft = true;
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 2, activeCell: 'B3' }];
  ws.columns = [{ width: 8 }, { width: 32 }, { width: 32 }, { width: 38 }];

  styleTitleRow(ws);
  styleHeaderRow(ws);

  const exampleEnd = findExampleEndRow(ws);
  const entryStart = exampleEnd + 1;
  const entryEnd = entryStart + ENTRY_ROWS - 1;

  for (let r = DATA_START; r <= exampleEnd; r++) {
    const row = ws.getRow(r);
    row.height = 22;
    cellText(row.getCell(1), '#', {
      center: true,
      bold: true,
      fill: C.exampleBg,
      color: { argb: C.exampleText },
      borderColor: C.exampleAccent,
    });
    row.getCell(1).note = 'مثال للعميل — ثابت';

    for (let col = 2; col <= 4; col++) {
      const cell = row.getCell(col);
      cellText(cell, cell.value ?? '', {
        fill: C.exampleBg,
        borderColor: C.exampleAccent,
      });
    }
  }

  for (let r = entryStart; r <= entryEnd; r++) {
    const row = ws.getRow(r);
    row.height = 22;
    const fill = (r - entryStart) % 2 === 0 ? C.rowEven : C.rowOdd;

    const a = row.getCell(1);
    a.value = { formula: `IF(B${r}="","",COUNTA($B$${entryStart}:B${r}))` };
    a.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F766E' } };
    a.alignment = { vertical: 'middle', horizontal: 'center' };
    a.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    a.numFmt = '0';
    border(a);

    for (let col = 2; col <= 4; col++) {
      const cell = row.getCell(col);
      const v = cell.value == null ? '' : cell.value;
      cellText(cell, v, { fill });
    }
  }
}

function styleGuideSheet(ws) {
  ws.properties.rightToLeft = true;
  ws.views = [{ rightToLeft: true }];
  ws.columns = [{ width: 22 }, { width: 76 }];

  ws.eachRow((row, rowNumber) => {
    const a = row.getCell(1);
    const b = row.getCell(2);
    const label = String(a.value ?? '').trim();
    row.height = label ? 24 : 12;

    if (label) {
      cellText(a, a.value, {
        bold: true,
        fill: C.guideBg,
        color: { argb: 'FF0E7490' },
      });
    }
    cellText(b, b.value ?? '', { fill: label ? C.guideBg : C.rowOdd });

    if (rowNumber === 1) {
      cellText(a, a.value, { bold: true, size: 14, fill: C.titleBg, color: { argb: C.titleText } });
      cellText(b, b.value, { bold: true, size: 14, fill: C.titleBg, color: { argb: C.titleText } });
      row.height = 34;
    }
  });
}

async function main() {
  if (!fs.existsSync(TARGET)) {
    console.error('Not found:', TARGET);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(TARGET, BACKUP);
    console.log('Backup:', BACKUP);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TARGET);

  for (const ws of wb.worksheets) {
    if (SKIP_SHEETS.has(ws.name)) {
      styleGuideSheet(ws);
    } else {
      styleDataSheet(ws);
    }
  }

  await wb.xlsx.writeFile(TARGET);
  console.log('Updated:', TARGET);
  console.log('Sheets styled:', wb.worksheets.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
