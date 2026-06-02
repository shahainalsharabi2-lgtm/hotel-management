/**
 * يحوّل تجربة.xlsx إلى نموذج Excel منسّق كامل.
 * الاستخدام: node tools/format-tajriba-excel.mjs
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '../..');
const SOURCE = path.join(BASE, 'تجربة.xlsx');
const BACKUP = path.join(BASE, 'تجربة-أصلي.xlsx');
const OUTPUT_FORMATTED = path.join(BASE, 'تجربة-منسق.xlsx');
const OUTPUT_MAIN = path.join(BASE, 'تجربة.xlsx');

const COLORS = {
  primary: 'FF1F4E79',
  primaryLight: 'FFD6E4F0',
  headerText: 'FFFFFFFF',
  altRow: 'FFF8FAFC',
  border: 'FFB4C6E7',
};

const HEADERS = ['#', 'الاسم (عربي)', 'الاسم الأجنبي', 'الوصف', 'ترتيب العرض', 'نشط'];
const EMPTY_ROWS = 12;

const EN_BY_AR = {
  'مفردة': 'Single',
  'ثنائية': 'Double',
  'ثلاثية': 'Triple',
  'رباعية': 'Quad',
  'خماسية': 'Quintuple',
  'سداسية': 'Sextuple',
  'سباعي': 'Septuple',
  'سعر المجموعات': 'Group pricing',
  'ضيافة': 'Complimentary',
  'سعر الافراد': 'Individual pricing',
  'مباشر': 'Walk-in',
  'الكتروني': 'Online',
  'وكالة': 'Agency',
  'شركة': 'Corporate',
  'عام': 'Standard',
  'افضل سعر متوفر': 'Best Available Rate',
  'شركات': 'Corporate Rate',
  'مجموعات': 'Group Rate',
  'حكومي': 'Government Rate',
  'حج': 'Hajj Rate',
  'موظفي الفندق': 'Hotel Staff Rate',
  'حجوزات بوكنج.كوم': 'Booking.com Rate',
  'سعر افتراضي': 'Default Rate',
  'بيزنس': 'Business',
  'قياسي': 'Standard',
  'ديلوكس': 'Deluxe',
  'فاميلي': 'Family',
  'فاميلي ديلوكس': 'Family Deluxe',
  'جناح رئاسي': 'Presidential Suite',
  'جناح ملكي': 'Royal Suite',
  'جناح ملكي ديلوكس': 'Royal Deluxe Suite',
  'جناح ملكي سويت': 'Royal Sweet Suite',
  'عمل': 'Business',
  'سياحة': 'Tourism',
  'زيارة عائلية': 'Family visit',
  'علاج': 'Medical treatment',
  'دراسة': 'Study',
  'عمرة': 'Umrah',
  'زيارة دينية': 'Religious visit',
  'زيارة طبية': 'Medical visit',
  'مرضية': 'Medical leave',
  'الطابق الأول': 'First floor',
  'طابق الاستقبال': 'Reception floor',
  'صيانة دورية': 'Scheduled maintenance',
  'تجديد': 'Renovation',
  'الإمارات العربية': 'United Arab Emirates',
  'سوريا': 'Syria',
};

const AR_FIXES = {
  'سورياء': 'سوريا',
  'عام\nعام': 'عام',
  'الامارات العربية': 'الإمارات العربية',
};

const SKIP_AR = new Set(['الاسم', 'رمز السعر', 'مصادر الحجز', 'فئة السعر', 'رموز السوق']);

/** كل الأوراق: code = ربط النظام، items = مصفوفة {ar, en} */
const SHEETS = [
  {
    sheet: 'انواع الغرف',
    title: 'أنواع الغرف (السعة)',
    code: 'room-types',
    system: 'مرجعي — نوع/سعة الغرفة',
    pick: ['مفردة', 'ثنائية', 'ثلاثية', 'رباعية', 'خماسية', 'سداسية', 'سباعي'],
  },
  {
    sheet: 'فئات الأسعار',
    title: 'فئات و رموز الأسعار',
    code: 'rate-codes',
    system: 'مرجعي — التسعير',
    pick: ['سعر المجموعات', 'ضيافة', 'سعر الافراد', 'افضل سعر متوفر', 'شركات', 'مجموعات', 'حكومي', 'حج', 'موظفي الفندق', 'حجوزات بوكنج.كوم', 'سعر افتراضي'],
  },
  {
    sheet: 'مصادر الحجز',
    title: 'مصادر الحجز',
    code: 'booking-sources',
    system: 'مرجعي — مصدر الحجز',
    pick: ['مباشر', 'الكتروني', 'وكالة', 'شركة'],
  },
  {
    sheet: 'مميزات الغرف',
    title: 'مميزات الغرف',
    code: 'room-features',
    system: 'room-features',
    pick: ['مكيّف', 'تلفاز', 'ثلاجة', 'خزانة', 'دش', 'حمام'],
  },
  {
    sheet: 'تصميم الغرف',
    title: 'تصميم الغرف',
    code: 'room-architecture',
    system: 'room-architecture',
    pick: ['عام'],
  },
  {
    sheet: 'مناظر الغرف',
    title: 'مناظر الغرف',
    code: 'room-views',
    system: 'room-views',
    pick: ['على الشارع', 'على البحر', 'على الحديقة', 'على المسبح', 'على الجبل', 'على البحيرة'],
  },
  {
    sheet: 'رموز السوق',
    title: 'رموز السوق / القنوات',
    code: 'market-codes',
    system: 'مرجعي — قنوات التوزيع',
    pick: ['بيزنس', 'Booking.com', 'Expedia', 'Agoda'],
  },
  {
    sheet: 'فئات الغرف',
    title: 'فئات الغرف',
    code: 'room-classes',
    system: 'room-classes',
    pick: ['قياسي', 'ديلوكس', 'فاميلي', 'فاميلي ديلوكس', 'جناح رئاسي', 'جناح ملكي', 'جناح ملكي ديلوكس', 'جناح ملكي سويت'],
  },
  {
    sheet: 'الغرض من الزيارة',
    title: 'الغرض من الزيارة',
    code: 'purposes-of-stay',
    system: 'purposes-of-stay',
    pick: ['عمل', 'سياحة', 'زيارة عائلية', 'علاج', 'دراسة', 'حج', 'عمرة', 'زيارة دينية', 'زيارة طبية', 'مرضية'],
  },
  {
    sheet: 'انواع الهوية',
    title: 'أنواع الهوية',
    code: 'identification-types',
    system: 'identification-types',
    fromCategory: 'انواع الهوية',
  },
  {
    sheet: 'تصنيف العملاء',
    title: 'تصنيف العملاء',
    code: 'guest-classification',
    system: 'مرجعي — تصنيف النزيل',
    fromCategory: 'تصنيف العملاء',
  },
  {
    sheet: 'الفئات العمرية',
    title: 'الفئات العمرية',
    code: 'age-qualifying-codes',
    system: 'age-qualifying-codes',
    fromCategory: 'الفئات العمرية',
  },
  {
    sheet: 'انواع الطوابق',
    title: 'أنواع الطوابق',
    code: 'floor-types',
    system: 'floor-types',
    fromCategory: 'أنواع الطوابق',
  },
  {
    sheet: 'مواقع الغرف',
    title: 'مواقع الغرف',
    code: 'room-locations',
    system: 'room-locations',
    fromCategory: 'مواقع الغرف',
  },
  {
    sheet: 'صيانة الغرف',
    title: 'أسباب صيانة الغرف',
    code: 'room-maintenance-reasons',
    system: 'room-maintenance-reasons',
    fromCategory: 'أسباب صيانة الغرف',
  },
  {
    sheet: 'نقل الغرف',
    title: 'أسباب نقل الغرف',
    code: 'room-move-reasons',
    system: 'room-move-reasons',
    fromCategory: 'أسباب نقل الغرف',
  },
  {
    sheet: 'الجنسيات',
    title: 'الجنسيات',
    code: 'nationalities',
    system: 'nationalities',
    fromCategory: 'الجنسيات',
  },
];

function cleanText(value) {
  return String(value ?? '')
    .replace(/\t/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function cleanItem(item) {
  let ar = cleanText(item.ar);
  let en = cleanText(item.en);
  ar = AR_FIXES[ar] ?? ar;
  if (!ar || SKIP_AR.has(ar)) return null;
  if (en === '...' || en === 'الاسم الأجنبي' || en === ar) en = '';
  if (!en) en = EN_BY_AR[ar] ?? '';
  else en = EN_BY_AR[ar] ?? en;
  return { ar, en };
}

function styleBorder(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
}

function styleHeaderRow(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    styleBorder(cell);
  });
}

function applySheetLayout(ws, title, subtitle, colCount = 6) {
  const lastCol = String.fromCharCode(64 + colCount);
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 3, activeCell: 'B4' }];
  ws.properties.defaultRowHeight = 20;

  ws.mergeCells(`A1:${lastCol}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerText }, name: 'Calibri' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 34;

  ws.mergeCells(`A2:${lastCol}2`);
  const subCell = ws.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { italic: true, size: 10, color: { argb: COLORS.primary }, name: 'Calibri' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.getRow(2).height = 24;

  const headerRow = ws.getRow(3);
  HEADERS.forEach((h, idx) => {
    headerRow.getCell(idx + 1).value = h;
  });
  styleHeaderRow(headerRow);

  ws.columns = [
    { width: 6 },
    { width: 30 },
    { width: 30 },
    { width: 36 },
    { width: 14 },
    { width: 10 },
  ];
}

async function readSourceCategories() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SOURCE);
  const ws = wb.worksheets[0];
  const categories = [];
  for (let c = 1; c <= 56; c += 4) {
    const title = cleanText(ws.getCell(1, c).value);
    const items = [];
    for (let r = 3; r <= 200; r++) {
      const ar = ws.getCell(r, c).value;
      const en = ws.getCell(r, c + 2).value;
      if (ar && cleanText(ar) && cleanText(ar) !== '...') {
        items.push({ ar: cleanText(ar), en: en ? cleanText(en) : '' });
      }
    }
    categories.push({ title, items });
  }
  return categories;
}

function buildAllItems(categories) {
  const map = new Map();
  for (const cat of categories) {
    map.set(cat.title, cat.items.map(cleanItem).filter(Boolean));
  }

  const pool = [];
  for (const items of map.values()) {
    pool.push(...items);
  }

  const byAr = new Map(pool.map((i) => [i.ar, i]));

  return SHEETS.map((meta) => {
    let items = [];
    if (meta.fromCategory) {
      items = (map.get(meta.fromCategory) ?? []).map((i) => ({ ...i }));
    } else if (meta.pick) {
      items = meta.pick
        .map((ar) => byAr.get(AR_FIXES[ar] ?? ar) ?? { ar: AR_FIXES[ar] ?? ar, en: EN_BY_AR[ar] ?? '' })
        .map(cleanItem)
        .filter(Boolean);
    }
    return { ...meta, items };
  });
}

function writeCategorySheet(wb, meta) {
  const ws = wb.addWorksheet(meta.sheet, { properties: { rightToLeft: true } });
  applySheetLayout(
    ws,
    meta.title,
    `رمز الفئة: ${meta.code}  |  ربط النظام: ${meta.system}  |  أضف صفوفاً جديدة في الأسفل`,
  );

  let rowNum = 4;
  meta.items.forEach((item, idx) => {
    const row = ws.getRow(rowNum++);
    [idx + 1, item.ar, item.en, '', idx + 1, 'نعم'].forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 0 || colIdx >= 4 ? 'center' : 'right',
        wrapText: true,
      };
      cell.font = { name: 'Calibri', size: 11 };
      if (idx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
      }
      styleBorder(cell);
    });
  });

  for (let i = 0; i < EMPTY_ROWS; i++) {
    const row = ws.getRow(rowNum++);
    HEADERS.forEach((_, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = colIdx === 5 ? 'نعم' : '';
      cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'right' };
      styleBorder(cell);
    });
  }

  ws.dataValidations.add(`F4:F${rowNum - 1}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"نعم,لا"'],
  });

  return meta.items.length;
}

function writeGuideSheet(wb) {
  const ws = wb.addWorksheet('دليل الاستخدام', { properties: { rightToLeft: true } });
  ws.views = [{ rightToLeft: true }];
  ws.columns = [{ width: 20 }, { width: 72 }];

  const lines = [
    ['عنوان النموذج', 'نموذج جمع الترميزات العامة — فندق مضياف العرب'],
    ['', ''],
    ['الغرض', 'إدخال بيانات الترميزات (أنواع الغرف، المميزات، المناظر، الجنسيات...) قبل ربطها بنظام الفندق.'],
    ['', ''],
    ['طريقة التعبئة', '① افتح الورقة المناسبة من التبويبات السفلية'],
    ['', '② املأ «الاسم (عربي)» — مطلوب | «الاسم الأجنبي» — للتقارير الإنجليزية'],
    ['', '③ «ترتيب العرض» = ترتيب الظهور في القوائم | «نشط» = نعم أو لا'],
    ['', '④ استخدم الصفوف الفارغة في أسفل كل ورقة لإضافة عناصر جديدة'],
    ['', ''],
    ['هيكل الملف', `${SHEETS.length} ورقة بيانات + فهرس + جميع البيانات + هذا الدليل`],
    ['ربط النظام', 'عمود «رمز الفئة» في الصف 2 يطابق تبويبات: الإعدادات ← الترميزات العامة'],
    ['', ''],
    ['تنبيه', 'لا تغيّر أسماء الأوراق أو صف العناوين (الصف 3).'],
    ['', 'تم نقل كل البيانات من الملف الأصلي وتصنيفها في أوراق منفصلة.'],
  ];

  lines.forEach(([a, b], idx) => {
    const row = ws.getRow(idx + 1);
    row.getCell(1).value = a;
    row.getCell(2).value = b;
    row.getCell(1).font = { bold: !!a, name: 'Calibri', size: 12, color: { argb: COLORS.primary } };
    row.getCell(2).font = { name: 'Calibri', size: 11 };
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    row.getCell(2).alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    if (['عنوان النموذج', 'الغرض', 'طريقة التعبئة'].includes(a)) {
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    }
  });
}

function writeIndexSheet(wb, sheetData) {
  const ws = wb.addWorksheet('فهرس الترميزات', { properties: { rightToLeft: true } });
  applySheetLayout(ws, 'فهرس الترميزات العامة', 'انقر على اسم الورقة في التبويب السفلي للانتقال');

  const headers = ['#', 'الفئة', 'رمز الفئة', 'ربط النظام', 'عدد العناصر', 'الورقة'];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  styleHeaderRow(headerRow);
  ws.columns = [{ width: 6 }, { width: 26 }, { width: 22 }, { width: 30 }, { width: 12 }, { width: 22 }];

  sheetData.forEach((s, idx) => {
    const row = ws.getRow(4 + idx);
    [idx + 1, s.title, s.code, s.system, s.count, s.sheet].forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.alignment = { horizontal: colIdx === 0 || colIdx === 4 ? 'center' : 'right', vertical: 'middle' };
      styleBorder(cell);
      if (idx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
      }
    });
  });
}

function writeMasterSheet(wb, sheetData) {
  const ws = wb.addWorksheet('جميع البيانات', { properties: { rightToLeft: true } });
  const headers = ['#', 'الفئة', 'رمز الفئة', 'الاسم (عربي)', 'الاسم الأجنبي', 'الوصف', 'ترتيب العرض', 'نشط'];
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];

  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  styleHeaderRow(headerRow);
  ws.columns = [{ width: 6 }, { width: 24 }, { width: 22 }, { width: 28 }, { width: 28 }, { width: 32 }, { width: 12 }, { width: 10 }];

  let n = 0;
  sheetData.forEach((s) => {
    s.items.forEach((item, idx) => {
      n++;
      const row = ws.getRow(n + 1);
      [n, s.title, s.code, item.ar, item.en, '', idx + 1, 'نعم'].forEach((v, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = v;
        cell.alignment = { horizontal: colIdx <= 2 || colIdx >= 6 ? 'center' : 'right', vertical: 'middle', wrapText: true };
        styleBorder(cell);
        if (n % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
        }
      });
    });
  });
}

async function buildWorkbook() {
  const categories = await readSourceCategories();
  const sheetData = buildAllItems(categories);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Modiaf Al Arab Hotel';
  wb.created = new Date();
  wb.modified = new Date();

  writeGuideSheet(wb);

  const summary = [];
  for (const meta of sheetData) {
    const count = writeCategorySheet(wb, meta);
    summary.push({ title: meta.title, code: meta.code, system: meta.system, count, sheet: meta.sheet, items: meta.items });
  }

  writeIndexSheet(wb, summary);
  writeMasterSheet(wb, summary);

  return { wb, summary, total: summary.reduce((a, s) => a + s.count, 0) };
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source not found:', SOURCE);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(SOURCE, BACKUP);
    console.log('Backup:', BACKUP);
  }

  const { wb, summary, total } = await buildWorkbook();

  await wb.xlsx.writeFile(OUTPUT_FORMATTED);
  console.log('Saved:', OUTPUT_FORMATTED);

  try {
    await wb.xlsx.writeFile(OUTPUT_MAIN);
    console.log('Saved:', OUTPUT_MAIN);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn('تعذّر تحديث تجربة.xlsx — الملف مفتوح في Excel. أغلقه ثم أعد تشغيل السكربت.');
    } else {
      throw err;
    }
  }
  console.log('Sheets:', wb.worksheets.length);
  console.log('Categories:', summary.length);
  console.log('Total items:', total);
  summary.forEach((s) => console.log(`  ${s.sheet}: ${s.count}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
