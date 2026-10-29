/// <reference types="vitest/config" />
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

const repoRoot = path.resolve(import.meta.dirname, '..');
const mediaDir = path.join(repoRoot, 'media');

/**
 * Exercise photos live once in the repository's /media folder (shared with the legacy app).
 * Dev: served from there. Build: copied into dist/media.
 */
function sharedMedia(): Plugin {
  return {
    name: 'form-shared-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0] ?? '');
        const marker = '/media/';
        const at = url.indexOf(marker);
        if (at === -1) return next();
        const file = path.join(mediaDir, url.slice(at + marker.length));
        if (!file.startsWith(mediaDir) || !fs.existsSync(file)) return next();
        res.setHeader('content-type', 'image/jpeg');
        fs.createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true })
        .flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
      for (const file of walk(mediaDir)) {
        this.emitFile({ type: 'asset', fileName: path.relative(repoRoot, file).split(path.sep).join('/'), source: fs.readFileSync(file) });
      }
    },
  };
}

/** Writes sw.js with the list of all built files, so the app works offline after one visit. */
function serviceWorker(): Plugin {
  return {
    name: 'form-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const template = fs.readFileSync(path.resolve(import.meta.dirname, 'src/sw-template.js'), 'utf8');
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map')).sort();
      const version = String(Date.now());
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__PRECACHE__', JSON.stringify(['./', ...files])).replace('__VERSION__', version),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [preact(), sharedMedia(), serviceWorker()],
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
