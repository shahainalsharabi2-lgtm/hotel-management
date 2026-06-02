import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const htmlPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/app/settings/settings.component.html',
);
let html = fs.readFileSync(htmlPath, 'utf8');

const tabMarker = '<div class="tab-content" *ngIf="activeTab === \'translations\'">';
const tabStart = html.indexOf(tabMarker);
if (tabStart < 0) {
  console.error('translations tab not found');
  process.exit(1);
}

const removeStart = html.indexOf('\n\n          <motion class="settings-frame full-width">', tabStart);
const removeStart2 = html.indexOf('\n\n          <div class="settings-frame full-width">', tabStart);
const cutStart = removeStart2 >= 0 ? removeStart2 : removeStart;
const cutEnd = html.indexOf('\n        </div>\n      </div>\n    </div>', cutStart);
if (cutStart < 0 || cutEnd < 0) {
  console.error('cut markers', cutStart, cutEnd);
  process.exit(1);
}

html = html.slice(0, cutStart) + html.slice(cutEnd);

html = html.replace(
  /<p class="translation-editing-locale-badge">\s*<i class="fas fa-pen"><\/i>/,
  '<p class="translation-editing-locale-badge">\n                  <i class="fas fa-check-circle"></i>',
);

const hintBlock = `                <p class="hint" style="margin-top:12px">
                  {{ uiTranslations.screenText('settings', 'translationsManagedOnServerHint') }}
                </p>`;

if (!html.includes('translationsManagedOnServerHint')) {
  html = html.replace(
    /(<strong>\{\{ translationEditingLocaleLabel\(\) \}\}<\/strong>\n                <\/p>)(\n              <\/div>)/,
    `$1\n${hintBlock}$2`,
  );
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('OK');
