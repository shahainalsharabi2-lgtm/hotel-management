import fs from 'fs';
import path from 'path';

const dir = path.join('src', 'app', 'settings');
const htmlPath = path.join(dir, 'settings.component.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const insert = fs.readFileSync(path.join(dir, '_translations-sections.html'), 'utf8');

const start = html.indexOf('            <h4 style="margin:1.65rem');
const end = html.indexOf('            <motion class="frame-footer"');
const end2 = html.indexOf('            <div class="frame-footer"');
const e = end2 >= 0 ? end2 : end;

if (start < 0 || e < 0) {
  console.error('markers', start, e);
  process.exit(1);
}

html = html.slice(0, start) + insert + html.slice(e);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('OK');
