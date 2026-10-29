/** Search and filters over the exercise library (shared by the picker and the library screen). */
import { EQUIPMENT_LABELS, groupsOf, KIND_LABELS, PATTERN_LABELS } from './catalog';
import { REGIONS, type MuscleRegion } from './muscles';
import type { EquipmentId, ExerciseDef, ExerciseKind, GoalId, MuscleGroup } from './types';

export interface LibraryFilter {
  query: string;
  group: MuscleGroup | null;
  region: MuscleRegion | null;
  equipment: EquipmentId | null;
  goal: GoalId | null;
  level: 1 | 2 | 3 | null;
  kind: ExerciseKind | null;
}

export const EMPTY_FILTER: LibraryFilter = { query: '', group: null, region: null, equipment: null, goal: null, level: null, kind: null };

export const norm = (s: string) => s.toLocaleLowerCase('de-AT').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

function words(q: string): string[] {
  return norm(q).split(/\s+/).filter(Boolean);
}

function haystack(x: ExerciseDef): string {
  return norm([
    x.name, x.nameEn, x.id, ...x.aliases,
    ...[...x.primaryMuscles, ...x.secondaryMuscles].map((m) => REGIONS[m].label),
    ...x.equipment.map((e) => EQUIPMENT_LABELS[e]), KIND_LABELS[x.kind], PATTERN_LABELS[x.pattern],
  ].join(' '));
}

/** Lower is better: exact name, name starts with the query, all words start name words, contained, other fields. */
function rank(x: ExerciseDef, q: string, ws: string[]): number {
  const names = [norm(x.name), norm(x.nameEn), ...x.aliases.map(norm)];
  if (names.includes(q)) return 0;
  if (names.some((n) => n.startsWith(q))) return 1;
  if (names.some((n) => ws.every((w) => n.split(/[\s/-]+/).some((p) => p.startsWith(w))))) return 2;
  if (names.some((n) => ws.every((w) => n.includes(w)))) return 3;
  return 4;
}

export function filterLibrary(all: readonly ExerciseDef[], f: LibraryFilter): ExerciseDef[] {
  const ws = words(f.query);
  const q = ws.join(' ');
  const hit = all.filter((x) => {
    if (x.sameAs) return false;
    if (ws.length && !ws.every((w) => haystack(x).includes(w))) return false;
    if (f.group && !groupsOf(x).includes(f.group)) return false;
    if (f.region && !x.primaryMuscles.includes(f.region) && !x.secondaryMuscles.includes(f.region)) return false;
    if (f.equipment && !x.equipment.includes(f.equipment)) return false;
    if (f.goal && !x.goals.includes(f.goal)) return false;
    if (f.level && x.level !== f.level) return false;
    if (f.kind && x.kind !== f.kind) return false;
    return true;
  });
  // With a muscle region selected, exercises that train it primarily come first.
  const regionRank = (x: ExerciseDef) => (f.region && x.primaryMuscles.includes(f.region) ? 0 : 1);
  return hit.sort((a, b) => (ws.length ? rank(a, q, ws) - rank(b, q, ws) : 0) || regionRank(a) - regionRank(b) || a.name.localeCompare(b.name, 'de'));
}

export function activeFilterCount(f: LibraryFilter): number {
  return [f.group, f.region, f.equipment, f.goal, f.level, f.kind].filter((v) => v !== null).length;
}
