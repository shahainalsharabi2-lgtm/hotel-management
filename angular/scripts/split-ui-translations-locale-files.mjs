/**
 * يقسّم ui-translations-default.json المدمج إلى ar.json / tr.json / zh-Hans.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const combinedPath = path.join(
  __dirname,
  '../../aspnet-core/src/Modiaf.Al.Arab.Hotel.Domain/UiTranslations/ui-translations-default.json',
);
const outDir = path.join(
  __dirname,
  '../../aspnet-core/src/Modiaf.Al.Arab.Hotel.HttpApi.Host/UiTranslations',
);

const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
const locales = ['ar', 'fr', 'id', 'tr', 'zh-Hans'];

fs.mkdirSync(outDir, { recursive: true });

for (const locale of locales) {
  const file = {
    sidebarNav: combined.sidebarNav?.[locale] ?? {},
    brandSubtitle: combined.brandSubtitle?.[locale] ?? '',
    chrome: combined.chrome?.[locale] ?? {},
    screenCopy: combined.screenCopy?.[locale] ?? {},
  };
  const outPath = path.join(outDir, `${locale}.json`);
  fs.writeFileSync(outPath, JSON.stringify(file, null, 2), 'utf8');
  console.log('wrote', outPath);
}
