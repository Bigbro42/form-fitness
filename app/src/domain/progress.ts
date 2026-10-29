/**
 * Progress statistics. Only completed sessions and only sets with an entered value count;
 * nothing is estimated or interpolated.
 */
import { parseDate, toIsoDate } from './dates';
import { exerciseHistory, recordsIn, type NewRecord } from './history';
import type { MuscleRegion } from './muscles';
import type { ExerciseDef, IsoDate, Metric, WorkoutSession } from './types';

type Lookup = (id: string) => ExerciseDef | undefined;

const completed = (sessions: readonly WorkoutSession[]) => sessions.filter((s) => s.status === 'completed');

export function addDays(iso: IsoDate, n: number): IsoDate {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: IsoDate): IsoDate {
  const d = parseDate(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIsoDate(d);
}

export interface WeekBucket {
  start: IsoDate;
  sessions: number;
  sets: number;
  minutes: number;
}

/** The last `weeks` calendar weeks (Monday–Sunday), oldest first, including the current one. */
export function weekly(sessions: readonly WorkoutSession[], today: IsoDate, weeks = 12): WeekBucket[] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => ({ start: addDays(first, 7 * i), sessions: 0, sets: 0, minutes: 0 }));
  for (const s of completed(sessions)) {
    if (s.date < first || s.date > today) continue;
    const b = buckets[Math.floor((parseDate(s.date).getTime() - parseDate(first).getTime()) / (7 * 86_400_000))];
    if (!b) continue;
    b.sessions++;
    b.sets += s.exercises.reduce((n, x) => n + x.sets.filter((set) => set.value !== null).length, 0);
    b.minutes += s.durationMin ?? 0;
  }
  return buckets;
}

export interface PeriodTotals {
  sessions: number;
  sets: number;
  minutes: number;
  /** Sessions without a recorded duration (minutes are a lower bound then). */
  withoutDuration: number;
  activeDays: number;
}

export function totals(sessions: readonly WorkoutSession[], from: IsoDate, to: IsoDate): PeriodTotals {
  const list = completed(sessions).filter((s) => s.date >= from && s.date <= to);
  return {
    sessions: list.length,
    sets: list.reduce((n, s) => n + s.exercises.reduce((m, x) => m + x.sets.filter((set) => set.value !== null).length, 0), 0),
    minutes: list.reduce((n, s) => n + (s.durationMin ?? 0), 0),
    withoutDuration: list.filter((s) => s.durationMin === null).length,
    activeDays: new Set(list.map((s) => s.date)).size,
  };
}

export interface RegionLoad {
  region: MuscleRegion;
  /** Logged sets where this region is a main muscle. */
  primarySets: number;
  /** Logged sets where it assists. */
  secondarySets: number;
  exercises: string[];
}

/**
 * Logged sets per muscle region in [from, to]. A set counts fully for its main muscles and
 * is listed separately for assisting muscles (no invented weighting).
 */
export function muscleLoad(sessions: readonly WorkoutSession[], lookup: Lookup, from: IsoDate, to: IsoDate): Map<MuscleRegion, RegionLoad> {
  const out = new Map<MuscleRegion, RegionLoad>();
  const get = (r: MuscleRegion) => out.get(r) ?? out.set(r, { region: r, primarySets: 0, secondarySets: 0, exercises: [] }).get(r)!;
  for (const s of completed(sessions)) {
    if (s.date < from || s.date > to) continue;
    for (const x of s.exercises) {
      const def = lookup(x.exerciseId);
      const n = x.sets.filter((set) => set.value !== null).length;
      if (!def || !n) continue;
      for (const r of def.primaryMuscles) {
        const l = get(r);
        l.primarySets += n;
        if (!l.exercises.includes(x.name)) l.exercises.push(x.name);
      }
      for (const r of def.secondaryMuscles) get(r).secondarySets += n;
    }
  }
  return out;
}

/** 0 = untrained, 1–3 = increasing logged main-muscle sets in the period. */
export function loadLevel(sets: number): 0 | 1 | 2 | 3 {
  if (sets <= 0) return 0;
  if (sets < 6) return 1;
  if (sets < 12) return 2;
  return 3;
}

export type SeriesKind = 'heaviest' | 'bestReps' | 'bestTime' | 'totalMinutes';

export interface SeriesPoint {
  date: IsoDate;
  sessionId: string;
  value: number;
  detail: string;
}

export const SERIES_LABEL: Record<SeriesKind, string> = {
  heaviest: 'Schwerster Satz (kg)',
  bestReps: 'Meiste Wiederholungen in einem Satz',
  bestTime: 'Längste Zeit in einem Satz (Sek.)',
  totalMinutes: 'Minuten pro Training',
};

/** Which measure describes progress for this exercise honestly. */
export function seriesKindFor(metric: Metric, hasLoad: boolean): SeriesKind {
  if (metric === 'minutes') return 'totalMinutes';
  if (metric === 'seconds') return 'bestTime';
  return hasLoad ? 'heaviest' : 'bestReps';
}

const fmt = (n: number) => n.toLocaleString('de-AT', { maximumFractionDigits: 2 });

/** One point per completed session, oldest first. */
export function exerciseSeries(sessions: readonly WorkoutSession[], exerciseId: string): { kind: SeriesKind; points: SeriesPoint[] } {
  const entries = exerciseHistory(sessions, exerciseId).reverse();
  const metric = entries[0]?.exercise.metric ?? 'reps';
  const hasLoad = metric === 'reps' && entries.some((e) => e.sets.some((s) => (s.weightKg ?? 0) > 0));
  const kind = seriesKindFor(metric, hasLoad);
  const bySession = new Map<string, SeriesPoint>();
  for (const e of entries) {
    let value: number;
    let detail: string;
    if (kind === 'heaviest') {
      const loaded = e.sets.filter((s) => (s.weightKg ?? 0) > 0);
      if (!loaded.length) continue;
      const top = loaded.reduce((a, b) => (b.weightKg! > a.weightKg! || (b.weightKg === a.weightKg && b.value! > a.value!) ? b : a));
      value = top.weightKg!;
      detail = `${fmt(top.weightKg!)} kg × ${fmt(top.value!)}`;
    } else if (kind === 'totalMinutes') {
      value = e.sets.reduce((n, s) => n + s.value!, 0);
      detail = `${fmt(value)} Min.`;
    } else {
      value = Math.max(...e.sets.map((s) => s.value!));
      detail = `${fmt(value)} ${kind === 'bestTime' ? 'Sek.' : 'Wdh.'}`;
    }
    // The same exercise twice in one session: keep the better value.
    const prev = bySession.get(e.session.id);
    if (!prev || value > prev.value) bySession.set(e.session.id, { date: e.session.date, sessionId: e.session.id, value, detail });
  }
  return { kind, points: [...bySession.values()] };
}

export interface DatedRecord extends NewRecord {
  date: IsoDate;
  sessionId: string;
}

/** Personal records set in completed sessions, newest first. */
export function recentRecords(sessions: readonly WorkoutSession[], limit = 5): DatedRecord[] {
  const out: DatedRecord[] = [];
  for (const s of completed(sessions)) {
    for (const r of recordsIn(s, sessions)) out.push({ ...r, date: s.date, sessionId: s.id });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** Most trained exercises (by number of completed sessions) in the period. */
export function topExercises(sessions: readonly WorkoutSession[], from: IsoDate, limit = 6): { exerciseId: string; name: string; sessions: number }[] {
  const counts = new Map<string, { name: string; sessions: Set<string> }>();
  for (const s of completed(sessions)) {
    if (s.date < from) continue;
    for (const x of s.exercises) {
      if (!x.sets.some((set) => set.value !== null)) continue;
      const c = counts.get(x.exerciseId) ?? { name: x.name, sessions: new Set() };
      c.sessions.add(s.id);
      counts.set(x.exerciseId, c);
    }
  }
  return [...counts.entries()].map(([exerciseId, c]) => ({ exerciseId, name: c.name, sessions: c.sessions.size }))
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, 'de')).slice(0, limit);
}
