/**
 * Workout generator ("Zufallstraining"). Builds a session from slots of movement patterns
 * so a workout is balanced, then fills each slot with a fitting exercise. Randomness only
 * chooses among suitable candidates; the structure is deterministic for a given setup.
 */
import type { Pattern } from '../data/exercise-content';
import { recommend } from './recommendations';
import type { EquipmentId, ExerciseDef, GoalId, IsoDate, WorkoutSession } from './types';
import { REGIONS, type MuscleRegion } from './muscles';
import { addDays } from './progress';

export type Focus = 'full' | 'lower' | 'legs' | 'upper' | 'push' | 'pull' | 'core' | 'mobility';

export const FOCUS_LABELS: Record<Focus, string> = {
  full: 'Ganzkörper', lower: 'Unterkörper', legs: 'Beine', upper: 'Oberkörper', push: 'Drücken (Brust, Schultern, Trizeps)',
  pull: 'Ziehen (Rücken, Bizeps)', core: 'Bauch & Core', mobility: 'Mobilität',
};

export const FOCUS_SHORT: Record<Focus, string> = {
  full: 'Ganzkörper', lower: 'Unterkörper', legs: 'Beine', upper: 'Oberkörper', push: 'Drücken', pull: 'Ziehen', core: 'Bauch & Core', mobility: 'Mobilität',
};

/** Slot order per focus: patterns that should be covered first, then repeated as needed. */
const SLOTS: Record<Focus, Pattern[][]> = {
  full: [['squat', 'lunge'], ['push-h', 'push-v'], ['hinge', 'bridge'], ['pull-h', 'pull-v'], ['core-stab', 'core-rot', 'core-flex'], ['lunge', 'squat'], ['push-v', 'push-h'], ['pull-v', 'pull-h'], ['carry', 'calves', 'core-rot']],
  lower: [['squat'], ['hinge'], ['lunge'], ['bridge'], ['core-stab', 'core-rot'], ['calves'], ['squat', 'lunge'], ['hinge', 'bridge']],
  legs: [['squat'], ['lunge'], ['hinge'], ['calves'], ['bridge'], ['squat', 'lunge'], ['hinge']],
  upper: [['push-h'], ['pull-h'], ['push-v'], ['pull-v'], ['arms'], ['core-stab'], ['push-h', 'push-v'], ['pull-h', 'pull-v'], ['arms']],
  push: [['push-h'], ['push-v'], ['push-h'], ['arms'], ['push-v'], ['core-stab']],
  pull: [['pull-v'], ['pull-h'], ['pull-h', 'pull-v'], ['arms'], ['hinge'], ['core-stab']],
  core: [['core-stab'], ['core-flex'], ['core-rot'], ['core-stab'], ['bridge', 'hinge'], ['core-rot', 'core-flex']],
  mobility: [['mobility'], ['stretch'], ['mobility'], ['stretch'], ['mobility'], ['stretch']],
};

/** Typical minutes one exercise takes incl. rests, by goal (used to derive the exercise count). */
const MINUTES_PER_EXERCISE: Record<GoalId, number> = {
  health: 5, hypertrophy: 7, aesthetic: 6, strength: 9, muscular: 4.5, cardio: 6, core: 4, mobility: 3, athletic: 6,
};

export interface GeneratorSetup {
  focus: Focus;
  goal: GoalId;
  durationMin: number;
  equipment: EquipmentId[];
  maxLevel: 1 | 2 | 3;
  /** null = derive from duration */
  count: number | null;
  /** Prefer muscles not trained as main muscle in the last 48 hours. */
  respectRecovery: boolean;
}

export interface GeneratedItem {
  def: ExerciseDef;
  sets: number;
  why: string;
}

export function exerciseCount(setup: Pick<GeneratorSetup, 'goal' | 'durationMin' | 'count' | 'focus'>): number {
  if (setup.count) return Math.min(10, Math.max(2, setup.count));
  const per = setup.focus === 'mobility' ? MINUTES_PER_EXERCISE.mobility : MINUTES_PER_EXERCISE[setup.goal];
  return Math.min(10, Math.max(2, Math.round(setup.durationMin / per)));
}

/** Small deterministic PRNG so tests can pin results. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CARDIO_GOAL_EXTRA: Pattern[] = ['cardio'];

/** Main muscles trained in completed sessions of the last 48 hours. */
export function recentlyTrained(sessions: readonly WorkoutSession[], lookup: (id: string) => ExerciseDef | undefined, today: IsoDate): Set<MuscleRegion> {
  const from = addDays(today, -2);
  const out = new Set<MuscleRegion>();
  for (const s of sessions) {
    if (s.status !== 'completed' || s.date < from || s.date > today) continue;
    for (const x of s.exercises) {
      if (!x.sets.some((set) => set.value !== null)) continue;
      for (const r of lookup(x.exerciseId)?.primaryMuscles ?? []) out.add(r);
    }
  }
  return out;
}

function fitsGoal(x: ExerciseDef, goal: GoalId, focus: Focus): boolean {
  if (focus === 'mobility') return x.pattern === 'mobility' || x.pattern === 'stretch';
  if (x.pattern === 'mobility' || x.pattern === 'stretch') return goal === 'mobility';
  if (x.kind === 'cardio' || x.pattern === 'cardio') return goal === 'cardio' || goal === 'health' || goal === 'athletic';
  return true;
}

export interface GenerateResult {
  items: GeneratedItem[];
  /** Set when fewer exercises than requested could be found (e.g. very little equipment). */
  shortBy: number;
}

/**
 * Builds the workout. Candidates: available equipment, level ≤ max, suitable for goal and focus.
 * Within a slot, candidates are weighted: new main muscles score higher, the same movement
 * twice in a row scores lower, recently trained main muscles score lower (if enabled).
 */
export function generate(library: readonly ExerciseDef[], setup: GeneratorSetup, opts: { random?: () => number; recent?: Set<MuscleRegion>; exclude?: string[] } = {}): GenerateResult {
  const random = opts.random ?? Math.random;
  const want = exerciseCount(setup);
  const pool = library.filter((x) => !x.sameAs && x.equipment.every((e) => setup.equipment.includes(e)) && x.level <= setup.maxLevel && fitsGoal(x, setup.goal, setup.focus) && !opts.exclude?.includes(x.id));
  let slots = SLOTS[setup.focus];
  // Cardio as goal: alternate strength slots with cardio blocks.
  if (setup.goal === 'cardio' && setup.focus !== 'mobility') slots = slots.flatMap((s, i) => (i % 2 === 0 ? [CARDIO_GOAL_EXTRA, s] : [s]));
  const picked: GeneratedItem[] = [];
  const used = new Set<string>();
  const usedMuscles = new Map<MuscleRegion, number>();
  for (let i = 0; picked.length < want && i < want * 3; i++) {
    const patterns = slots[i % slots.length]!;
    let candidates = pool.filter((x) => !used.has(x.id) && patterns.includes(x.pattern));
    if (setup.respectRecovery && opts.recent?.size) {
      const fresh = candidates.filter((x) => !x.primaryMuscles.some((m) => opts.recent!.has(m)));
      // First round: skip slots that would only train recovering muscles; later rounds may fill up.
      if (fresh.length) candidates = fresh;
      else if (i < slots.length) continue;
    }
    if (!candidates.length) continue;
    const prev = picked.at(-1)?.def;
    const weights = candidates.map((x) => {
      let w = 1;
      for (const m of x.primaryMuscles) w *= usedMuscles.has(m) ? 0.45 : 1.25;
      if (prev && prev.pattern === x.pattern) w *= 0.3;
      if (prev && prev.primaryMuscles.some((m) => x.primaryMuscles.includes(m))) w *= 0.5;
      if (setup.respectRecovery && opts.recent && x.primaryMuscles.some((m) => opts.recent!.has(m))) w *= 0.15;
      if (x.media) w *= 1.15; // slightly prefer exercises with a verified photo
      return w;
    });
    let r = random() * weights.reduce((a, b) => a + b, 0);
    let choice = candidates[candidates.length - 1]!;
    for (let j = 0; j < candidates.length; j++) {
      r -= weights[j]!;
      if (r <= 0) { choice = candidates[j]!; break; }
    }
    used.add(choice.id);
    for (const m of choice.primaryMuscles) usedMuscles.set(m, (usedMuscles.get(m) ?? 0) + 1);
    const rec = recommend(choice, setup.goal);
    const short = setup.durationMin < 20;
    const sets = rec.sets[0] === rec.sets[1] ? rec.sets[0] : short ? rec.sets[0] : Math.round((rec.sets[0] + rec.sets[1]) / 2);
    const recovering = setup.respectRecovery && opts.recent && choice.primaryMuscles.some((m) => opts.recent!.has(m));
    picked.push({ def: choice, sets, why: `${choice.primaryMuscles.map((m) => REGIONS[m].label).join(', ')}${recovering ? ' · in den letzten 48 h trainiert' : ''}` });
  }
  return { items: picked, shortBy: Math.max(0, want - picked.length) };
}

/** Replaces one item with another fitting exercise of the same movement family. */
export function rerollOne(library: readonly ExerciseDef[], setup: GeneratorSetup, items: GeneratedItem[], index: number, random: () => number = Math.random): GeneratedItem[] {
  const current = items[index];
  if (!current) return items;
  const others = new Set(items.map((x) => x.def.id));
  const candidates = library.filter((x) => !x.sameAs && !others.has(x.id) && x.pattern === current.def.pattern
    && x.equipment.every((e) => setup.equipment.includes(e)) && x.level <= setup.maxLevel && fitsGoal(x, setup.goal, setup.focus));
  const pool = candidates.length ? candidates : library.filter((x) => !x.sameAs && !others.has(x.id) && x.primaryMuscles.some((m) => current.def.primaryMuscles.includes(m)) && x.equipment.every((e) => setup.equipment.includes(e)));
  if (!pool.length) return items;
  const def = pool[Math.floor(random() * pool.length)]!;
  const next = [...items];
  next[index] = { def, sets: current.sets, why: current.why };
  return next;
}
