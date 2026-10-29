import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackup, importBackup, parseBackup } from '../src/backup/backup';
import { listPhotos, listSnapshots, openFormDb, putPhoto, type Db, type ExercisePhoto } from '../src/db/db';
import { fitInside } from '../src/photos/process';
import { NOW } from './fixtures';

let db: Db;
let n = 0;
beforeEach(async () => {
  db = await openFormDb(`photos-${++n}`);
});
afterEach(() => db.close());

const bytes = (...b: number[]) => new Blob([new Uint8Array(b)], { type: 'image/jpeg' });
const photo = (exerciseId: string, updatedAt: string, ...b: number[]): ExercisePhoto => ({ exerciseId, blob: bytes(...b), width: 640, height: 480, updatedAt });
const content = async (p: ExercisePhoto | undefined) => (p ? [...new Uint8Array(await p.blob.arrayBuffer())] : null);

describe('own exercise photos', () => {
  it('scales photos down to 1280 px on the long side, never up', () => {
    expect(fitInside(4032, 3024)).toEqual({ width: 1280, height: 960 });
    expect(fitInside(3024, 4032)).toEqual({ width: 960, height: 1280 });
    expect(fitInside(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('travel through a backup file byte for byte', async () => {
    await putPhoto(db, photo('bird', '2026-10-01T10:00:00.000Z', 255, 216, 0, 1, 2, 250));
    const text = JSON.stringify(await createBackup(db, NOW));
    const other = await openFormDb(`photos-${++n}`);
    const parsed = parseBackup(text, 'b.json', NOW);
    const outcome = await importBackup(other, parsed, 'merge', 'b.json', NOW);
    expect(outcome.photos).toBe(1);
    const [p] = await listPhotos(other);
    expect(p).toMatchObject({ exerciseId: 'bird', width: 640, height: 480, updatedAt: '2026-10-01T10:00:00.000Z' });
    expect(p!.blob.type).toBe('image/jpeg');
    expect(await content(p)).toEqual([255, 216, 0, 1, 2, 250]);
    other.close();
  });

  it('are added or replaced by newer ones, but never deleted by an import – also not when replacing', async () => {
    await putPhoto(db, photo('bird', '2026-10-05T00:00:00.000Z', 1));
    await putPhoto(db, photo('wall', '2026-10-05T00:00:00.000Z', 2));
    const source = await openFormDb(`photos-${++n}`);
    await putPhoto(source, photo('bird', '2026-10-01T00:00:00.000Z', 9)); // older: ignored
    await putPhoto(source, photo('wall', '2026-10-09T00:00:00.000Z', 8)); // newer: wins
    await putPhoto(source, photo('catcow', '2026-10-01T00:00:00.000Z', 7)); // missing: added
    const parsed = parseBackup(JSON.stringify(await createBackup(source, NOW)), 'b.json', NOW);
    source.close();
    const outcome = await importBackup(db, parsed, 'replace', 'b.json', NOW);
    expect(outcome.photos).toBe(2);
    const byId = Object.fromEntries(await Promise.all((await listPhotos(db)).map(async (p) => [p.exerciseId, await content(p)])));
    expect(byId).toEqual({ bird: [1], wall: [8], catcow: [7] });
  });

  it('keeps photos out of the internal snapshot before an import', async () => {
    await putPhoto(db, photo('bird', '2026-10-05T00:00:00.000Z', 1));
    const parsed = parseBackup(JSON.stringify({ format: 'form-backup', schemaVersion: 1, app: 'FORM.', exportedAt: NOW.toISOString(), data: { sessions: [], plans: [] }, legacyRaw: null }), 'x.json', NOW);
    await importBackup(db, parsed, 'merge', 'x.json', NOW);
    const snap = (await listSnapshots(db)).find((s) => s.kind === 'user-data')!;
    expect(JSON.parse(snap.payload).photos).toBeUndefined();
    expect(await listPhotos(db)).toHaveLength(1);
  });

  it('skips broken photo entries of a backup and reports them', () => {
    const file = { format: 'form-backup', schemaVersion: 1, app: 'FORM.', exportedAt: NOW.toISOString(), data: { sessions: [], plans: [] }, legacyRaw: null,
      photos: [{ exerciseId: 'bird', type: 'image/jpeg', data: 'AQID', width: 1, height: 1, updatedAt: 'x' }, { exerciseId: 'x', type: 'text/html', data: 'AQID', width: 1, height: 1, updatedAt: 'x' }, { exerciseId: 'y', type: 'image/jpeg', data: '<script>', width: 1, height: 1, updatedAt: 'x' }] };
    const parsed = parseBackup(JSON.stringify(file), 'b.json', NOW);
    expect(parsed.kind === 'form' && parsed.photos.map((p) => p.exerciseId)).toEqual(['bird']);
    expect(parsed.kind === 'form' && parsed.skipped).toEqual(['Foto #2', 'Foto #3']);
  });
});
