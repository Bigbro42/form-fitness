// Extracts the SVG geometry of the Body Muscles atlas (Apache-2.0, see third-party/) that the
// legacy app ships, into src/data/atlas.json for the new body map.
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../..');
const src = fs.readFileSync(path.join(repo, 'form-anatomy-v20.js'), 'utf8');
const atlas = JSON.parse(src.match(/const ATLAS=(\{[\s\S]*?\});\n/)[1]);
const out = { front: { viewBox: '0 0 35 93', paths: atlas.front }, back: { viewBox: '37 0 35 93', paths: atlas.back } };
fs.writeFileSync(path.join(repo, 'app/src/data/atlas.json'), JSON.stringify(out) + '\n');
console.log('front', atlas.front.length, 'back', atlas.back.length);
