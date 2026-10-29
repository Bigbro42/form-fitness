import legacy from '../data/legacy-catalog.json';
import type { EquipmentId, ExerciseDef, ExerciseKind, Metric, MuscleGroup } from './types';

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

const LEGACY_METRIC: Record<string, Metric> = { 'Wdh.': 'reps', 'Sek.': 'seconds', 'Min.': 'minutes' };

const PHOTO_CREDIT = {
  credit: 'Free Exercise DB',
  license: 'Unlicense (gemeinfrei)',
  sourceUrl: 'https://github.com/yuhonas/free-exercise-db',
};

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
  const muscles = x.muscles.filter((m): m is MuscleGroup => m in MUSCLE_LABELS);
  return {
    id: x.id,
    name: x.name,
    aliases: [],
    // The legacy app lists the main muscle first; the rest are treated as supporting.
    primaryMuscles: muscles.slice(0, 1),
    secondaryMuscles: muscles.slice(1),
    equipment: [x.equipment as EquipmentId],
    kind: x.kind as ExerciseKind,
    metric: LEGACY_METRIC[x.metric] ?? 'reps',
    baseTarget: x.target,
    cue: x.tip,
    easier: x.easy,
    harder: x.hard,
    media: x.photoDir
      ? { frames: [0, 1].map((n) => `media/exercises/${x.photoDir}/${n}.jpg`), ...PHOTO_CREDIT }
      : null,
    source: 'builtin',
  };
}

export const BUILTIN_EXERCISES: readonly ExerciseDef[] = (legacy.exercises as LegacyExercise[]).map(fromLegacy);

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
