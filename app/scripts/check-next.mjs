// Fails when /next (the published app) does not match a fresh build in app/dist, i.e. when
// `npm run release` was forgotten after a change. sw.js only differs by its build timestamp.
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const dist = path.join(app, 'dist');
const next = path.join(app, '..', 'next');

const list = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? list(p, base) : [path.relative(base, p)];
}).filter((f) => !f.endsWith('.map')).sort();
const read = (file) => {
  const text = fs.readFileSync(file);
  return file.endsWith('sw.js') ? text.toString().replace(/const VERSION = '[^']*'/, '') : text;
};

const a = list(dist);
const b = fs.existsSync(next) ? list(next) : [];
const problems = [
  ...a.filter((f) => !b.includes(f)).map((f) => `missing in next/: ${f}`),
  ...b.filter((f) => !a.includes(f)).map((f) => `outdated in next/: ${f}`),
  ...a.filter((f) => b.includes(f) && !Buffer.from(read(path.join(dist, f))).equals(Buffer.from(read(path.join(next, f))))).map((f) => `changed: ${f}`),
];
if (problems.length) {
  console.error(`next/ is not up to date with the build – run \`npm run release\` in app/.\n${problems.slice(0, 20).join('\n')}`);
  process.exit(1);
}
console.log(`next/ matches the build (${a.length} files).`);
