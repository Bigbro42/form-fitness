/**
 * FORM. domain model.
 *
 * Key rules:
 * - A WorkoutSession is something the user actually did (or is doing). Only sessions
 *   with status "completed" count as training in history and statistics.
 * - A PlannedWorkout is a calendar entry (one-off or recurring). It never counts as training.
 * - Sessions keep a snapshot of every exercise's name and metric, so later edits to the
 *   library or to plans never rewrite history.
 */

import type { MuscleRegion } from './muscles';
import type { Pattern } from '../data/exercise-content';

/** Calendar day in local time, "YYYY-MM-DD". */
export type IsoDate = string;
/** Timestamp, ISO 8601 with time zone. */
export type IsoDateTime = string;

export type GoalId =
  | 'health'
  | 'hypertrophy'
  | 'aesthetic'
  | 'strength'
  | 'muscular'
  | 'cardio'
  | 'core'
  | 'mobility'
  | 'athletic';

export type MuscleGroup = 'abs' | 'legs' | 'glutes' | 'back' | 'shoulders' | 'chest' | 'arms';

export type EquipmentId = 'body' | 'band' | 'dumbbell' | 'barbell' | 'machine' | 'cardio';

/** What one set is measured in. */
export type Metric = 'reps' | 'seconds' | 'minutes';

export type ExerciseKind = 'strength' | 'hold' | 'mobility' | 'cardio';

export interface ExerciseMedia {
  /** Start and end position photos, relative to the app's media root. */
  frames: string[];
  credit: string;
  license: string;
  sourceUrl: string;
}

export interface ExerciseDef {
  /** Stable id. Built-in ids are the legacy app's ids and must never change. */
  id: string;
  name: string;
  nameEn: string;
  aliases: string[];
  primaryMuscles: MuscleRegion[];
  secondaryMuscles: MuscleRegion[];
  equipment: EquipmentId[];
  kind: ExerciseKind;
  metric: Metric;
  /** Rough legacy target such as "10–15" or "20–40 Sekunden"; shown only as orientation. */
  baseTarget: string;
  cue: string;
  easier: string;
  harder: string;
  pattern: Pattern;
  level: 1 | 2 | 3;
  /** Goals the exercise fits well (derived from movement pattern). */
  goals: GoalId[];
  steps: string[];
  mistakes: string[];
  breathing: string;
  media: ExerciseMedia | null;
  /** Duplicate kept only for history; hidden in the library. */
  sameAs?: string;
  source: 'builtin' | 'custom';
  createdAt?: IsoDateTime;
}

export interface SetEntry {
  id: string;
  /** Value in the exercise's metric (reps, seconds or minutes). */
  value: number | null;
  /** Load in kg (external load; empty for pure bodyweight). */
  weightKg: number | null;
  done: boolean;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  /** Snapshot at the time of the session, so history survives library changes. */
  name: string;
  metric: Metric;
  variant: 'standard' | 'easy' | 'hard';
  sets: SetEntry[];
  note?: string;
}

export type SessionStatus = 'active' | 'draft' | 'completed';

export type SessionSource = 'manual' | 'calendar' | 'randomizer';

export interface LegacyOrigin {
  /** localStorage key or backup the record came from. */
  key: string;
  /** Original id inside that source (date or random session id). */
  ref: string;
  /** Fields we had to infer because the old app didn't store them. */
  inferred?: string[];
}

export interface WorkoutSession {
  id: string;
  date: IsoDate;
  title: string;
  activity: 'strength' | 'sport';
  status: SessionStatus;
  source: SessionSource;
  goal: GoalId | null;
  exercises: SessionExercise[];
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  durationMin: number | null;
  /** Subjective effort of the whole session, 1–10. */
  rpe: number | null;
  energy: string | null;
  steps: number | null;
  note: string;
  /** Randomizer settings the session was generated with. */
  generator?: { focus: string; durationMin: number | null };
  plannedRef?: { planId: string; occurrence: IsoDate };
  /** Set while a completed workout is being corrected; holds the state before the correction. */
  reopened?: { original: Omit<WorkoutSession, 'reopened'> };
  legacy?: LegacyOrigin;
  /** Incremented on every change made in the new app; 0 = untouched import. */
  rev: number;
  updatedAt: IsoDateTime;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
}

export type Recurrence =
  | { freq: 'once' }
  | { freq: 'daily' | 'weekly' | 'monthly'; interval: number; until: IsoDate | null };

export type OccurrenceException =
  | { type: 'skip' }
  | { type: 'move'; to: IsoDate };

export interface PlannedWorkout {
  id: string;
  title: string;
  activity: 'strength' | 'sport';
  startsOn: IsoDate;
  time: string | null;
  recurrence: Recurrence;
  exercises: PlannedExercise[];
  goal: GoalId | null;
  /** Keyed by the original occurrence date. */
  exceptions: Record<IsoDate, OccurrenceException>;
  /** A single occurrence changed on its own: the series skips it and this one-off replaces it. */
  detachedFrom?: { planId: string; original: IsoDate };
  legacy?: LegacyOrigin;
  rev: number;
  updatedAt: IsoDateTime;
}

export interface Settings {
  primaryGoal: GoalId | null;
  secondaryGoals: GoalId[];
  equipment: EquipmentId[];
  restSeconds: number;
  restAuto: boolean;
  updatedAt: IsoDateTime;
}

export const DEFAULT_SETTINGS: Settings = {
  primaryGoal: null,
  secondaryGoals: [],
  equipment: ['body'],
  restSeconds: 90,
  restAuto: true,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

/** Reusable exercise list. Editing a template never changes past workouts. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  activity: 'strength' | 'sport';
  goal: GoalId | null;
  exercises: PlannedExercise[];
  rev: number;
  updatedAt: IsoDateTime;
}

/** Everything that belongs to the user. Backups contain exactly this. */
export interface UserData {
  sessions: WorkoutSession[];
  plans: PlannedWorkout[];
  templates: WorkoutTemplate[];
  customExercises: ExerciseDef[];
  settings: Settings;
}
