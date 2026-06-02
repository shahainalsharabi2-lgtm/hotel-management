/**
 * إنشاء fr.json / id.json من هيكل ar.json وإضافة مفاتيح localeFr / localeId لكل اللغات.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hostDir = path.join(
  __dirname,
  '../../aspnet-core/src/Modiaf.Al.Arab.Hotel.HttpApi.Host/UiTranslations',
);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function cloneEmptyStrings(obj) {
  if (typeof obj === 'string') {
    return '';
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = cloneEmptyStrings(v);
    }
    return out;
  }
  return obj;
}

const localeLabels = {
  ar: {
    localeFr: 'Français — فرنسية',
    localeId: 'Bahasa Indonesia — إندونيسية',
    translationsPageIntro:
      'اختر لغة عرض القائمة والنصوص. الترجمات (فرنسية / إندونيسية / تركية / صينية) من ملفات JSON في المشروع — لا حاجة لإدخال نصوص هنا.',
  },
  fr: {
    localeFr: 'Français',
    localeId: 'Indonésien',
    localeAr: 'Arabe',
    localeTr: 'Turc',
    localeZh: 'Chinois simplifié',
    translationsPageIntro:
      'Choisissez la langue d’affichage du menu et des textes. Les traductions sont dans les fichiers JSON du projet.',
  },
  id: {
    localeFr: 'Prancis',
    localeId: 'Bahasa Indonesia',
    localeAr: 'Arab',
    localeTr: 'Turki',
    localeZh: 'Tionghoa Sederhana',
    translationsPageIntro:
      'Pilih bahasa tampilan menu dan teks. Terjemahan ada di berkas JSON proyek.',
  },
  tr: {
    localeFr: 'Fransızca',
    localeId: 'Endonezce',
  },
  'zh-Hans': {
    localeFr: '法语',
    localeId: '印尼语',
  },
};

const ar = readJson(path.join(hostDir, 'ar.json'));

for (const locale of ['fr', 'id']) {
  const file = cloneEmptyStrings(ar);
  file.brandSubtitle = '';
  const labels = localeLabels[locale];
  if (file.screenCopy?.settings) {
    Object.assign(file.screenCopy.settings, labels);
  }
  writeJson(path.join(hostDir, `${locale}.json`), file);
  console.log('created', `${locale}.json`);
}

for (const locale of ['ar', 'tr', 'zh-Hans']) {
  const filePath = path.join(hostDir, `${locale}.json`);
  const file = readJson(filePath);
  const labels = localeLabels[locale];
  if (file.screenCopy?.settings && labels) {
    Object.assign(file.screenCopy.settings, labels);
  }
  writeJson(filePath, file);
  console.log('updated labels in', `${locale}.json`);
}
