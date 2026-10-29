// Reads the exercise catalogue exactly as the legacy app (V18–V26) builds it at runtime
// and writes it to src/data/legacy-catalog.json. Run again only if the legacy app changes.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { serve } from './static-server.mjs';

const repo = path.resolve(import.meta.dirname, '../..');
const v26 = fs.readFileSync(path.join(repo, 'form-exercise-library-v26.js'), 'utf8');
// Kinds for the 25 original exercises live in a private object inside the V26 script.
const originalMeta = Function(`return ${v26.match(/const originalMeta=(\{[\s\S]*?\});/)[1]}`)();

const server = await serve({ '/form-fitness/': repo });
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/form-fitness/index.html`);
await page.waitForFunction(() => typeof catalog === 'object' && Object.keys(catalog).length > 100);
const data = await page.evaluate(() => ({
  muscleNames,
  exercises: Object.entries(catalog).map(([id, x]) => ({
    id, name: x.name, target: x.target, muscles: x.muscles, tip: x.tip, easy: x.easy, hard: x.hard,
    link: x.link || '', metric: setMetric(id), equipment: x.equipment ?? null, kind: x.kind ?? null, photo: photoSrc(id, 0),
  })),
}));
await browser.close();
server.close();
if (errors.length) throw new Error('Legacy app threw: ' + errors.join('; '));

for (const x of data.exercises) {
  x.equipment ??= 'body';
  x.kind ??= originalMeta[x.id] ?? 'strength';
  // "media/exercises/Plank/0.jpg?v=14" -> "Plank"
  x.photoDir = x.photo ? x.photo.split('/')[2] : null;
  delete x.photo;
  if (x.photoDir) for (const n of [0, 1]) {
    if (!fs.existsSync(path.join(repo, 'media/exercises', x.photoDir, `${n}.jpg`))) throw new Error(`Missing photo ${x.photoDir}/${n}`);
  }
}
const out = path.join(repo, 'app/src/data/legacy-catalog.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
console.log(`${data.exercises.length} exercises, ${data.exercises.filter((x) => x.photoDir).length} with photos -> ${path.relative(repo, out)}`);
