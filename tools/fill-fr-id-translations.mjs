/**
 * يملأ fr.json و id.json من ar.json عبر ترجمة MyMemory (مجاني).
 * الاستخدام: node tools/fill-fr-id-translations.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.resolve(
  __dirname,
  '../aspnet-core/src/Modiaf.Al.Arab.Hotel.HttpApi.Host/UiTranslations',
);

const DELAY_MS = 150;
const SAVE_EVERY = 25;
const ONLY_LOCALE = process.argv.find((a) => a.startsWith('--locale='))?.split('=')[1];
const TARGETS = [
  { locale: 'fr', langpair: 'ar|fr', sourceLocale: 'ar' },
  { locale: 'id', langpair: 'tr|id', sourceLocale: 'tr', fallbackLangpair: 'ar|id', fallbackSourceLocale: 'ar' },
].filter((t) => !ONLY_LOCALE || t.locale === ONLY_LOCALE);

const cachePath = path.join(__dirname, '.translation-cache.json');
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch {
    cache = {};
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateViaGoogle(text, langpair) {
  const [sl, tl] = langpair.split('|');
  const lingvaUrl =
    'https://lingva.ml/api/v1/' +
    encodeURIComponent(sl) +
    '/' +
    encodeURIComponent(tl) +
    '/' +
    encodeURIComponent(text);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(lingvaUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.ok) {
        const json = await res.json();
        const out = json?.translation?.trim();
        if (out) {
          return out;
        }
      }
    } catch {
      // try gtx next
    }

    try {
      const gtxUrl =
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
        encodeURIComponent(sl) +
        '&tl=' +
        encodeURIComponent(tl) +
        '&dt=t&q=' +
        encodeURIComponent(text);
      const res = await fetch(gtxUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const raw = await res.text();
      if (raw.startsWith('[')) {
        const json = JSON.parse(raw);
        const out = json?.[0]?.[0]?.[0]?.trim();
        if (out) {
          return out;
        }
      }
    } catch {
      // retry
    }

    await sleep(800 * (attempt + 1));
  }

  return text;
}

async function translateText(text, langpair) {
  const key = `${langpair}::${text}`;
  if (cache[key]) {
    return cache[key];
  }

  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=' +
    encodeURIComponent(langpair);

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url);
    const json = await res.json();
    const out = json?.responseData?.translatedText?.trim();
    if (out && !out.toUpperCase().includes('MYMEMORY WARNING')) {
      cache[key] = out;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      return out;
    }
    await sleep(400 * (attempt + 1));
  }

  const googleOut = await translateViaGoogle(text, langpair);
  cache[key] = googleOut;
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  return googleOut;
}

function collectStrings(node, prefix, out) {
  if (typeof node === 'string') {
    out.push({ path: prefix, value: node });
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    collectStrings(v, prefix ? `${prefix}.${k}` : k, out);
  }
}

function setByPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function getByPath(obj, dotPath) {
  return dotPath.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function shouldTranslate(text) {
  if (!text || !text.trim()) {
    return false;
  }
  if (/^[\d\s\-_./:\\]+$/.test(text.trim())) {
    return false;
  }
  return true;
}

function countFilled(node) {
  let total = 0;
  let filled = 0;
  function walk(o) {
    if (typeof o === 'string') {
      total++;
      if (o.trim()) filled++;
      return;
    }
    if (o && typeof o === 'object') Object.values(o).forEach(walk);
  }
  walk(node);
  return { total, filled };
}

async function fillLocale(ar, sources, existing, target, localePath) {
  const { langpair, sourceLocale, fallbackLangpair, fallbackSourceLocale } = target;
  const primarySource = sources[sourceLocale] ?? ar;
  const fallbackSource = fallbackSourceLocale ? sources[fallbackSourceLocale] ?? ar : ar;

  const result = structuredClone(existing);
  const entries = [];
  collectStrings(ar, '', entries);

  let done = 0;
  const total = entries.length;
  let translatedSinceSave = 0;

  for (const { path: dotPath, value: arText } of entries) {
    done++;
    const current = getByPath(result, dotPath);
    if (typeof current === 'string' && current.trim()) {
      process.stdout.write(`\r[${langpair}] skip ${done}/${total}`);
      continue;
    }

    const primaryText = getByPath(primarySource, dotPath);
    const fallbackText = getByPath(fallbackSource, dotPath);
    const sourceText =
      typeof primaryText === 'string' && primaryText.trim()
        ? primaryText
        : typeof fallbackText === 'string' && fallbackText.trim()
          ? fallbackText
          : arText;

    if (!shouldTranslate(sourceText)) {
      setByPath(result, dotPath, sourceText);
      continue;
    }

    const activePair =
      typeof primaryText === 'string' && primaryText.trim()
        ? langpair
        : fallbackLangpair ?? langpair;

    const translated = await translateText(sourceText, activePair);
    setByPath(result, dotPath, translated);
    translatedSinceSave++;
    process.stdout.write(`\r[${activePair}] ${done}/${total} ${dotPath.slice(0, 40)}`);
    await sleep(DELAY_MS);

    if (translatedSinceSave >= SAVE_EVERY) {
      fs.writeFileSync(localePath, JSON.stringify(result, null, 2) + '\n', 'utf8');
      const assetsDir = path.resolve(__dirname, '../angular/src/assets/ui-translations');
      const dest = path.join(assetsDir, `${target.locale}.json`);
      if (fs.existsSync(assetsDir)) {
        fs.copyFileSync(localePath, dest);
      }
      translatedSinceSave = 0;
    }
  }

  console.log('');
  return result;
}

async function main() {
  const arPath = path.join(uiDir, 'ar.json');
  const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  const sources = { ar };
  for (const locale of ['tr', 'fr']) {
    const p = path.join(uiDir, `${locale}.json`);
    if (fs.existsSync(p)) {
      sources[locale] = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }

  const assetsDir = path.resolve(__dirname, '../angular/src/assets/ui-translations');

  for (const target of TARGETS) {
    const { locale, langpair } = target;
    const localePath = path.join(uiDir, `${locale}.json`);
    const existing = fs.existsSync(localePath)
      ? JSON.parse(fs.readFileSync(localePath, 'utf8'))
      : {};
    const before = countFilled(existing);
    if (before.filled >= before.total - 1 && before.total > 0) {
      console.log(`\n=== ${locale}.json === already complete (${before.filled}/${before.total})`);
    } else {
      console.log(`\n=== ${locale}.json === (${before.filled}/${before.total} filled)`);
      const filled = await fillLocale(ar, sources, existing, target, localePath);
      fs.writeFileSync(localePath, JSON.stringify(filled, null, 2) + '\n', 'utf8');
      console.log(`Saved ${localePath}`);
    }

    const src = path.join(uiDir, `${locale}.json`);
    const dest = path.join(assetsDir, `${locale}.json`);
    if (fs.existsSync(assetsDir) && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied to ${dest}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
