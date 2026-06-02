/**
 * يدمج ar.json / tr.json / zh-Hans.json في ui-translations-default.json (شكل API المدمج).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hostDir = path.join(
  __dirname,
  '../../aspnet-core/src/Modiaf.Al.Arab.Hotel.HttpApi.Host/UiTranslations',
);
const outPath = path.join(
  __dirname,
  '../../aspnet-core/src/Modiaf.Al.Arab.Hotel.Domain/UiTranslations/ui-translations-default.json',
);

const locales = ['ar', 'fr', 'id', 'tr', 'zh-Hans'];
const combined = {
  sidebarNav: {},
  brandSubtitle: {},
  chrome: {},
  screenCopy: {},
};

for (const locale of locales) {
  const file = JSON.parse(fs.readFileSync(path.join(hostDir, `${locale}.json`), 'utf8'));
  if (file.sidebarNav && Object.keys(file.sidebarNav).length > 0) {
    combined.sidebarNav[locale] = file.sidebarNav;
  }
  if (file.brandSubtitle?.trim()) {
    combined.brandSubtitle[locale] = file.brandSubtitle;
  }
  if (file.chrome && Object.keys(file.chrome).length > 0) {
    combined.chrome[locale] = file.chrome;
  }
  if (file.screenCopy && Object.keys(file.screenCopy).length > 0) {
    combined.screenCopy[locale] = file.screenCopy;
  }
}

fs.writeFileSync(outPath, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');
console.log('wrote', outPath);
