import { CONTENT, type Content, type Pattern } from '../data/exercise-content';
import { PART2 } from '../data/exercise-content-2';
import { PART3 } from '../data/exercise-content-3';
import { PART4 } from '../data/exercise-content-4';
import legacy from '../data/legacy-catalog.json';
import { GROUP_DEFAULT_REGIONS, REGIONS, type MuscleRegion } from './muscles';
import type { EquipmentId, ExerciseDef, ExerciseKind, GoalId, Metric, MuscleGroup } from './types';

/** Coarse groups of the legacy app; used for quick filters. */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  abs: 'Bauch & Core',
  legs: 'Beine',
  glutes: 'Gesäß',
  back: 'Rücken',
  shoulders: 'Schultern',
  chest: 'Brust',
  arms: 'Arme',
};

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  body: 'Ohne Equipment',
  band: 'Widerstandsband',
  dumbbell: 'Kurzhanteln',
  barbell: 'Langhantel',
  machine: 'Geräte / Kabel',
  cardio: 'Cardio-Gerät',
};

export const METRIC_LABELS: Record<Metric, { short: string; long: string }> = {
  reps: { short: 'Wdh.', long: 'Wiederholungen' },
  seconds: { short: 'Sek.', long: 'Sekunden' },
  minutes: { short: 'Min.', long: 'Minuten' },
};

export const KIND_LABELS: Record<ExerciseKind, string> = {
  strength: 'Kraft', hold: 'Halten', mobility: 'Mobilität', cardio: 'Ausdauer',
};

export const LEVEL_LABELS: Record<1 | 2 | 3, string> = { 1: 'Einsteiger', 2: 'Fortgeschritten', 3: 'Erfahren' };

export const PATTERN_LABELS: Record<Pattern, string> = {
  squat: 'Kniebeuge', hinge: 'Hüftbeuge', lunge: 'Ausfallschritt', bridge: 'Hüftstreckung', 'push-h': 'Drücken (horizontal)',
  'push-v': 'Drücken (vertikal)', 'pull-h': 'Ziehen (horizontal)', 'pull-v': 'Ziehen (vertikal)', arms: 'Arme isoliert', calves: 'Waden',
  'core-stab': 'Rumpfstabilität', 'core-flex': 'Rumpfbeugung', 'core-rot': 'Rotation / Anti-Rotation', carry: 'Tragen',
  cardio: 'Ausdauer', mobility: 'Mobilisation', stretch: 'Dehnung',
};

const LEGACY_METRIC: Record<string, Metric> = { 'Wdh.': 'reps', 'Sek.': 'seconds', 'Min.': 'minutes' };

const PHOTO_CREDIT = {
  credit: 'Free Exercise DB',
  license: 'Unlicense (gemeinfrei)',
  sourceUrl: 'https://github.com/yuhonas/free-exercise-db',
};

const STRENGTH_GOALS: GoalId[] = ['health', 'hypertrophy', 'aesthetic', 'strength', 'muscular', 'athletic'];

export function goalsFor(pattern: Pattern): GoalId[] {
  if (pattern.startsWith('core')) return ['core', 'health', 'athletic', 'muscular'];
  if (pattern === 'cardio') return ['cardio', 'health', 'muscular', 'athletic'];
  if (pattern === 'mobility' || pattern === 'stretch') return ['mobility', 'health'];
  if (pattern === 'carry') return ['strength', 'core', 'athletic', 'health'];
  return STRENGTH_GOALS;
}

export function breathingFor(kind: ExerciseKind, pattern: Pattern): string {
  if (pattern === 'stretch') return 'Entspannt atmen und mit jeder Ausatmung etwas lockerer lassen. Etwa 20–40 Sekunden halten, nie in den Schmerz.';
  if (pattern === 'mobility') return 'Langsam und kontrolliert bewegen, mit der Ausatmung etwas weiter in die Bewegung gehen.';
  if (kind === 'cardio' || pattern === 'cardio') return 'Gleichmäßig atmen. Bei lockerer Belastung solltest du noch in ganzen Sätzen sprechen können.';
  if (kind === 'hold' || pattern === 'core-stab' || pattern === 'carry') return 'Ruhig und gleichmäßig weiteratmen, nicht pressen. Halten, solange die Position sauber bleibt.';
  return 'Ausatmen bei der Anstrengung, einatmen beim Zurückführen. Tempo: kontrolliert, etwa 2 Sekunden in der nachgebenden Phase, ohne Schwung.';
}

const ALL_CONTENT: Record<string, Content & { sameAs?: string }> = { ...CONTENT, ...PART2, ...PART3, ...PART4 };

interface LegacyExercise {
  id: string;
  name: string;
  target: string;
  muscles: string[];
  tip: string;
  easy: string;
  hard: string;
  metric: string;
  equipment: string;
  kind: string;
  photoDir: string | null;
}

function fromLegacy(x: LegacyExercise): ExerciseDef {
  const c = ALL_CONTENT[x.id];
  const kind = x.kind as ExerciseKind;
  const pattern: Pattern = c?.pattern ?? (kind === 'cardio' ? 'cardio' : kind === 'mobility' ? 'mobility' : 'core-stab');
  const legacyGroups = x.muscles.filter((m): m is MuscleGroup => m in MUSCLE_LABELS);
  const fallback = [...new Set(legacyGroups.flatMap((g) => GROUP_DEFAULT_REGIONS[g]))];
  const photo = c?.photo ?? x.photoDir;
  return {
    id: x.id,
    name: x.name,
    nameEn: c?.en ?? '',
    aliases: c?.aliases ?? [],
    primaryMuscles: c?.p ?? fallback.slice(0, 1),
    secondaryMuscles: c ? c.s ?? [] : fallback.slice(1),
    equipment: [x.equipment as EquipmentId],
    kind,
    metric: LEGACY_METRIC[x.metric] ?? 'reps',
    baseTarget: x.target,
    cue: x.tip,
    easier: x.easy,
    harder: x.hard,
    pattern,
    level: c?.level ?? 1,
    goals: goalsFor(pattern),
    steps: c?.steps ?? [],
    mistakes: c?.mistakes ?? [],
    breathing: c?.breath ?? breathingFor(kind, pattern),
    media: photo ? { frames: [0, 1].map((n) => `media/exercises/${photo}/${n}.jpg`), ...PHOTO_CREDIT } : null,
    ...(c?.sameAs ? { sameAs: c.sameAs } : {}),
    source: 'builtin',
  };
}

export const BUILTIN_EXERCISES: readonly ExerciseDef[] = (legacy.exercises as LegacyExercise[]).map(fromLegacy);

/** Exercises shown in the library and pickers (duplicates hidden). */
export const LIBRARY_EXERCISES: readonly ExerciseDef[] = BUILTIN_EXERCISES.filter((x) => !x.sameAs);

const builtinById = new Map(BUILTIN_EXERCISES.map((x) => [x.id, x]));

export function builtinExercise(id: string): ExerciseDef | undefined {
  return builtinById.get(id);
}

/** Library lookup that also knows the user's own exercises. */
export function makeLookup(custom: readonly ExerciseDef[]) {
  const byId = new Map(builtinById);
  for (const x of custom) if (!byId.has(x.id)) byId.set(x.id, x);
  return (id: string) => byId.get(id);
}

export function muscleText(x: Pick<ExerciseDef, 'primaryMuscles' | 'secondaryMuscles'>): string {
  return [...x.primaryMuscles, ...x.secondaryMuscles].map((m) => REGIONS[m].label).join(' · ');
}

export function groupsOf(x: Pick<ExerciseDef, 'primaryMuscles' | 'secondaryMuscles'>): MuscleGroup[] {
  return [...new Set([...x.primaryMuscles, ...x.secondaryMuscles].map((m) => REGIONS[m].group))];
}

export type { MuscleRegion };
