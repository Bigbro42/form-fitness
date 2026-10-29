/**
 * Goal- and exercise-type-aware orientation values.
 *
 * Basis: ACSM position stands on resistance training progression and on exercise for healthy
 * adults, and later meta-analyses (e.g. Schoenfeld et al. on load and hypertrophy): hypertrophy
 * works across a broad repetition range when sets are close to failure; maximal strength
 * benefits from heavy loads and longer rests; muscular endurance uses higher repetitions and
 * shorter rests; cardio is dosed by time and intensity; mobility by controlled movement and holds.
 *
 * These are ranges for orientation, never prescriptions. No kilogram values are invented here;
 * load guidance only refers to the user's own previous sets.
 */
import type { ExerciseDef, GoalId, Metric } from './types';

export interface Recommendation {
  sets: [number, number];
  /** Target per set in the exercise's metric. */
  target: [number, number];
  metric: Metric;
  restSeconds: [number, number];
  effort: string;
  note: string;
}

type Kind = ExerciseDef['kind'];
type Table = Partial<Record<GoalId, Omit<Recommendation, 'metric'>>> & { default: Omit<Recommendation, 'metric'> };

const R = (sets: [number, number], target: [number, number], rest: [number, number], effort: string, note = '') => ({ sets, target, restSeconds: rest, effort, note });

const STRENGTH: Table = {
  default: R([2, 3], [8, 15], [60, 90], '2–3 Wiederholungen Reserve', ''),
  hypertrophy: R([3, 4], [6, 15], [90, 150], '0–3 Wiederholungen Reserve', 'Muskelaufbau gelingt auch mit mehr oder weniger Wiederholungen – entscheidend ist, dass die letzten Wiederholungen schwer werden.'),
  aesthetic: R([2, 4], [8, 15], [60, 120], '1–3 Wiederholungen Reserve', 'Steigere über die Wochen Gewicht oder Wiederholungen in kleinen Schritten.'),
  strength: R([3, 5], [3, 6], [120, 240], '1–3 Wiederholungen Reserve', 'Saubere Technik vor Gewicht. Lange Pausen helfen, jeden Satz mit voller Kraft zu machen.'),
  muscular: R([2, 3], [15, 25], [30, 60], '2–4 Wiederholungen Reserve', ''),
  cardio: R([2, 3], [12, 20], [30, 45], 'Zügig, aber sauber', 'Im Zirkel mit kurzen Pausen hält es den Puls oben.'),
  core: R([2, 3], [8, 15], [45, 75], 'Spannung bis zur letzten Wiederholung', ''),
  mobility: R([1, 2], [8, 12], [30, 60], 'Leicht, voller Bewegungsumfang', ''),
  athletic: R([3, 4], [4, 8], [90, 150], 'Schnell und kontrolliert, nicht bis zur Erschöpfung', ''),
};

const HOLD: Table = {
  default: R([2, 3], [20, 40], [45, 60], 'Halten, solange die Haltung sauber bleibt', ''),
  strength: R([3, 4], [15, 30], [60, 90], 'Schwerere Variante statt längerer Haltezeit', ''),
  hypertrophy: R([3, 4], [20, 45], [60, 90], 'Schwerere Variante statt längerer Haltezeit', ''),
  muscular: R([2, 3], [30, 60], [30, 45], 'Bis kurz vor dem Technikverlust', ''),
  core: R([3, 3], [20, 45], [45, 60], 'Ruhig weiteratmen', ''),
  mobility: R([2, 3], [20, 40], [20, 40], 'Entspannt, ohne Schmerz', ''),
};

const MOBILITY: Table = {
  default: R([1, 2], [6, 10], [20, 40], 'Langsam und schmerzfrei', 'Bewege dich nur so weit, wie es sich kontrolliert anfühlt.'),
};

const CARDIO: Table = {
  default: R([1, 1], [10, 20], [0, 0], 'Mäßig: Sprechen ist noch möglich', ''),
  cardio: R([1, 1], [20, 45], [0, 0], 'Meist mäßig, gelegentlich Intervalle', 'Für Intervalle: z. B. 30–60 Sek. zügig, gleich lang locker.'),
  health: R([1, 1], [15, 30], [0, 0], 'Mäßig: Sprechen ist noch möglich', ''),
  strength: R([1, 1], [5, 10], [0, 0], 'Locker als Aufwärmen', ''),
  hypertrophy: R([1, 1], [5, 10], [0, 0], 'Locker als Aufwärmen', ''),
};

const TABLES: Record<Kind, Table> = { strength: STRENGTH, hold: HOLD, mobility: MOBILITY, cardio: CARDIO };

export function recommend(def: Pick<ExerciseDef, 'kind' | 'metric'>, goal: GoalId | null): Recommendation {
  const table = TABLES[def.kind];
  const base = (goal && table[goal]) || table.default;
  // A mobility drill measured in seconds is dosed like a hold.
  const fixed = def.kind === 'mobility' && def.metric === 'seconds' ? (HOLD.mobility ?? HOLD.default) : base;
  return { ...fixed, metric: def.metric };
}

export function range([a, b]: [number, number]): string {
  return a === b ? String(a) : `${a}–${b}`;
}

export function restLabel([a, b]: [number, number]): string {
  if (b === 0) return 'Keine Satzpause';
  const fmt = (s: number) => (s >= 120 && s % 60 === 0 ? `${s / 60}` : String(s));
  return b >= 120 && a % 60 === 0 && b % 60 === 0 ? `${fmt(a)}–${fmt(b)} Min. Pause` : `${a}–${b} Sek. Pause`;
}
