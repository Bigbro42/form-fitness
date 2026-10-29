// Copies the production build (app/dist) to /next in the repository root. GitHub Pages serves
// the repository root from main, so the new app goes live at /form-fitness/next/ while the
// legacy app at /form-fitness/ stays untouched. Run via `npm run release`.
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const dist = path.join(app, 'dist');
const target = path.join(app, '..', 'next');

if (!fs.existsSync(path.join(dist, 'index.html')) || !fs.existsSync(path.join(dist, 'sw.js'))) {
  console.error('app/dist is missing or incomplete – run the build first.');
  process.exit(1);
}
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(dist, target, { recursive: true, filter: (src) => !src.endsWith('.map') });
const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`next/: ${count(target)} files from app/dist`);
