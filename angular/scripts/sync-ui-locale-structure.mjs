/**
 * يوحّد هيكل ملفات الترجمة (tr.json / zh-Hans.json) مع ar.json:
 * - نفس المفاتيح في sidebarNav / chrome / screenCopy
 * - القيم الموجودة تُحفظ؛ الناقص يُملأ من ui-translations-default.json ثم ""
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hostDir = path.join(
  __dirname,
  '../../aspnet-core/src/Modiaf.Al.Arab.Hotel.HttpApi.Host/UiTranslations',
);
const defaultPath = path.join(
  __dirname,
  '../../aspnet-core/src/Modiaf.Al.Arab.Hotel.Domain/UiTranslations/ui-translations-default.json',
);

const TARGET_LOCALES = ['fr', 'id', 'tr', 'zh-Hans'];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/** دمج مسطح: مفاتيح ar + الاحتفاظ بقيم الهدف أو الافتراضي */
function syncFlat(arObj, targetObj, defaultObj) {
  const out = {};
  const keys = new Set([
    ...Object.keys(arObj ?? {}),
    ...Object.keys(targetObj ?? {}),
    ...Object.keys(defaultObj ?? {}),
  ]);
  for (const k of [...keys].sort()) {
    const existing = (targetObj?.[k] ?? '').toString().trim();
    if (existing) {
      out[k] = targetObj[k];
      continue;
    }
    const fallback = (defaultObj?.[k] ?? '').toString().trim();
    out[k] = fallback || '';
  }
  return out;
}

/** screenCopy: شاشات ومفاتيح مثل ar */
function syncScreenCopy(arScreens, targetScreens, defaultScreens) {
  const out = {};
  const screenIds = new Set([
    ...Object.keys(arScreens ?? {}),
    ...Object.keys(targetScreens ?? {}),
    ...Object.keys(defaultScreens ?? {}),
  ]);
  for (const screenId of [...screenIds].sort()) {
    const arMsgs = arScreens?.[screenId] ?? {};
    const targetMsgs = targetScreens?.[screenId] ?? {};
    const defaultMsgs = defaultScreens?.[screenId] ?? {};
    out[screenId] = syncFlat(arMsgs, targetMsgs, defaultMsgs);
  }
  return out;
}

function syncLocaleFile(locale, ar, target, defaults) {
  const defSidebar = defaults.sidebarNav?.[locale] ?? {};
  const defChrome = defaults.chrome?.[locale] ?? {};
  const defScreen = defaults.screenCopy?.[locale] ?? {};
  const defBrand = defaults.brandSubtitle?.[locale] ?? '';

  const brand =
    (target.brandSubtitle ?? '').toString().trim() ||
    defBrand ||
    '';

  return {
    sidebarNav: syncFlat(ar.sidebarNav, target.sidebarNav, defSidebar),
    brandSubtitle: brand,
    chrome: syncFlat(ar.chrome, target.chrome, defChrome),
    screenCopy: syncScreenCopy(ar.screenCopy, target.screenCopy, defScreen),
  };
}

function countFields(file) {
  let n = file.brandSubtitle ? 1 : 0;
  n += Object.keys(file.sidebarNav ?? {}).length;
  n += Object.keys(file.chrome ?? {}).length;
  for (const s of Object.keys(file.screenCopy ?? {})) {
    n += Object.keys(file.screenCopy[s] ?? {}).length;
  }
  return n;
}

const ar = readJson(path.join(hostDir, 'ar.json'));
const defaults = readJson(defaultPath);

for (const locale of TARGET_LOCALES) {
  const filePath = path.join(hostDir, `${locale}.json`);
  const before = readJson(filePath);
  const synced = syncLocaleFile(locale, ar, before, defaults);
  writeJson(filePath, synced);
  console.log(
    `${locale}.json: ${countFields(before)} → ${countFields(synced)} fields (ar reference: ${countFields(ar)})`,
  );
}

console.log('Done. Run merge-ui-locale-files-to-default.mjs to refresh ui-translations-default.json.');
