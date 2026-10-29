import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN_EXERCISES, LIBRARY_EXERCISES, makeLookup } from '../src/domain/catalog';
import { EMPTY_FILTER, filterLibrary } from '../src/domain/library';
import { REGION_IDS, regionOfAtlas } from '../src/domain/muscles';
import atlas from '../src/data/atlas.json';

const repo = path.resolve(import.meta.dirname, '../..');

describe('exercise library data', () => {
  it('keeps all 124 legacy ids (history depends on them)', () => {
    const legacy = JSON.parse(fs.readFileSync(path.join(repo, 'app/src/data/legacy-catalog.json'), 'utf8'));
    expect(BUILTIN_EXERCISES.map((x) => x.id)).toEqual(legacy.exercises.map((x: { id: string }) => x.id));
  });

  it('every visible exercise is fully curated', () => {
    for (const x of LIBRARY_EXERCISES) {
      expect(x.steps.length, x.id).toBeGreaterThanOrEqual(3);
      expect(x.steps.length, x.id).toBeLessThanOrEqual(5);
      expect(x.mistakes.length, x.id).toBeGreaterThanOrEqual(1);
      expect(x.primaryMuscles.length, x.id).toBeGreaterThanOrEqual(1);
      expect(x.nameEn, x.id).not.toBe('');
      expect(x.breathing, x.id).not.toBe('');
      expect(x.goals.length, x.id).toBeGreaterThan(0);
      for (const m of [...x.primaryMuscles, ...x.secondaryMuscles]) expect(REGION_IDS, `${x.id}: ${m}`).toContain(m);
      expect(x.primaryMuscles.filter((m) => x.secondaryMuscles.includes(m)), x.id).toEqual([]);
    }
  });

  it('visible names are unique; duplicates point to an existing exercise', () => {
    const names = LIBRARY_EXERCISES.map((x) => x.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const x of BUILTIN_EXERCISES.filter((e) => e.sameAs)) expect(LIBRARY_EXERCISES.some((y) => y.id === x.sameAs), x.id).toBe(true);
  });

  it('every referenced photo exists on disk', () => {
    const withPhotos = BUILTIN_EXERCISES.filter((x) => x.media);
    expect(withPhotos.length).toBe(59);
    for (const x of withPhotos) {
      expect(x.media!.frames).toHaveLength(2);
      for (const f of x.media!.frames) expect(fs.existsSync(path.join(repo, f)), `${x.id}: ${f}`).toBe(true);
      expect(x.media!.license).toContain('Unlicense');
    }
  });

  it('the body map covers every muscle region in the atlas', () => {
    const covered = new Set([...atlas.front.paths, ...atlas.back.paths].map((p) => regionOfAtlas(p.id)).filter(Boolean));
    expect([...covered].sort()).toEqual([...REGION_IDS].sort());
  });
});

describe('library search and filters', () => {
  const find = (query: string) => filterLibrary(LIBRARY_EXERCISES, { ...EMPTY_FILTER, query }).map((x) => x.id);

  it('ranks exact and prefix matches first, also for English names and aliases', () => {
    expect(find('glute bridge')[0]).toBe('bridge');
    expect(find('kniebeugen')[0]).toBe('squat');
    expect(find('deadlift')).toContain('barbdeadlift');
    expect(find('push up')[0]).toBe('pushup');
    expect(find('hampelmann')[0]).toBe('jumpingjack');
  });

  it('ignores accents and ß', () => {
    expect(find('gesass').length).toBeGreaterThan(5);
    expect(find('ruckenheben')).toContain('superman');
  });

  it('filters by region, equipment, goal, level and kind', () => {
    const hams = filterLibrary(LIBRARY_EXERCISES, { ...EMPTY_FILTER, region: 'hamstrings' });
    expect(hams.length).toBeGreaterThan(5);
    expect(hams[0]!.primaryMuscles).toContain('hamstrings');
    const bands = filterLibrary(LIBRARY_EXERCISES, { ...EMPTY_FILTER, equipment: 'band' });
    expect(bands.every((x) => x.equipment.includes('band'))).toBe(true);
    const mob = filterLibrary(LIBRARY_EXERCISES, { ...EMPTY_FILTER, goal: 'mobility' });
    expect(mob.every((x) => x.goals.includes('mobility'))).toBe(true);
    expect(filterLibrary(LIBRARY_EXERCISES, { ...EMPTY_FILTER, level: 3 }).every((x) => x.level === 3)).toBe(true);
    expect(filterLibrary(LIBRARY_EXERCISES, { ...EMPTY_FILTER, kind: 'cardio' }).every((x) => x.kind === 'cardio')).toBe(true);
  });

  it('hides duplicates from the library but still resolves them for history', () => {
    expect(find('seitlicher ausfallschritt')).not.toContain('lateral_lunge');
    expect(makeLookup([])('lateral_lunge')?.name).toBe('Seitlicher Ausfallschritt');
  });
});
