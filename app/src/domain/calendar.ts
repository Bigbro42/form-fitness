/**
 * Calendar operations and the agenda. Planned entries never count as training: an occurrence
 * is "done" only when a completed session points to it.
 */
import { parseDate, toIsoDate } from './dates';
import { newId } from './ids';
import { occurrencesBetween, ruleMatches } from './recurrence';
import type { GoalId, IsoDate, PlannedExercise, PlannedWorkout, Recurrence, WorkoutSession, WorkoutTemplate } from './types';

export type RepeatChoice = 'once' | 'weekly' | 'biweekly' | 'monthly';

export function recurrenceFor(choice: RepeatChoice, until: IsoDate | null): Recurrence {
  switch (choice) {
    case 'once': return { freq: 'once' };
    case 'weekly': return { freq: 'weekly', interval: 1, until };
    case 'biweekly': return { freq: 'weekly', interval: 2, until };
    case 'monthly': return { freq: 'monthly', interval: 1, until };
  }
}

export function repeatChoice(r: Recurrence): RepeatChoice | 'other' {
  if (r.freq === 'once') return 'once';
  if (r.freq === 'weekly' && r.interval === 1) return 'weekly';
  if (r.freq === 'weekly' && r.interval === 2) return 'biweekly';
  if (r.freq === 'monthly' && r.interval === 1) return 'monthly';
  return 'other';
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function describeRecurrence(p: Pick<PlannedWorkout, 'startsOn' | 'recurrence'>): string {
  const r = p.recurrence;
  if (r.freq === 'once') return 'Einmalig';
  const d = parseDate(p.startsOn);
  const until = r.until ? ` bis ${parseDate(r.until).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
  if (r.freq === 'daily') return `${r.interval === 1 ? 'Täglich' : `Alle ${r.interval} Tage`}${until}`;
  if (r.freq === 'weekly') return `${r.interval === 1 ? 'Jeden' : r.interval === 2 ? 'Jeden zweiten' : `Alle ${r.interval} Wochen am`} ${WEEKDAYS[d.getDay()]}${until}`;
  return `${r.interval === 1 ? 'Monatlich' : `Alle ${r.interval} Monate`} am ${d.getDate()}.${until}`;
}

export interface PlanInput {
  title: string;
  activity: 'strength' | 'sport';
  startsOn: IsoDate;
  time: string | null;
  recurrence: Recurrence;
  exercises: PlannedExercise[];
  goal: GoalId | null;
}

export function createPlan(input: PlanInput, now = new Date()): PlannedWorkout {
  return { id: newId('plan'), ...input, title: input.title.trim() || 'Training', exceptions: {}, rev: 1, updatedAt: now.toISOString() };
}

function touch(p: PlannedWorkout, patch: Partial<PlannedWorkout>, now: Date): PlannedWorkout {
  return { ...p, ...patch, rev: p.rev + 1, updatedAt: now.toISOString() };
}

/** Edits the whole series. Exceptions that no longer match the rule are dropped. */
export function updateSeries(p: PlannedWorkout, input: PlanInput, now = new Date()): PlannedWorkout {
  const next = { ...p, ...input, title: input.title.trim() || 'Training' };
  const exceptions = Object.fromEntries(Object.entries(p.exceptions).filter(([d]) => ruleMatches(next, d)));
  return touch(p, { ...next, exceptions }, now);
}

export function skipOccurrence(p: PlannedWorkout, original: IsoDate, now = new Date()): PlannedWorkout {
  return touch(p, { exceptions: { ...p.exceptions, [original]: { type: 'skip' } } }, now);
}

export function restoreOccurrence(p: PlannedWorkout, original: IsoDate, now = new Date()): PlannedWorkout {
  const { [original]: _, ...rest } = p.exceptions;
  return touch(p, { exceptions: rest }, now);
}

export function moveOccurrence(p: PlannedWorkout, original: IsoDate, to: IsoDate, now = new Date()): PlannedWorkout {
  if (p.recurrence.freq === 'once') return touch(p, { startsOn: to }, now);
  if (to === original) return restoreOccurrence(p, original, now);
  return touch(p, { exceptions: { ...p.exceptions, [original]: { type: 'move', to } } }, now);
}

/**
 * Changes a single occurrence of a series: the series skips it and a one-off with the new
 * details takes its place. Returns [series, oneOff].
 */
export function detachOccurrence(p: PlannedWorkout, original: IsoDate, input: PlanInput, now = new Date()): [PlannedWorkout, PlannedWorkout] {
  const series = skipOccurrence(p, original, now);
  const single = { ...createPlan({ ...input, recurrence: { freq: 'once' } }, now), detachedFrom: { planId: p.id, original } };
  return [series, single];
}

/** "This and all following": the series ends the day before. */
export function endSeriesBefore(p: PlannedWorkout, date: IsoDate, now = new Date()): PlannedWorkout | null {
  if (p.recurrence.freq === 'once' || date <= p.startsOn) return null; // nothing would remain
  const d = parseDate(date);
  d.setDate(d.getDate() - 1);
  const until = toIsoDate(d);
  const exceptions = Object.fromEntries(Object.entries(p.exceptions).filter(([k]) => k <= until));
  return touch(p, { recurrence: { ...p.recurrence, until }, exceptions }, now);
}

export function planFromTemplate(t: WorkoutTemplate): Pick<PlanInput, 'title' | 'activity' | 'exercises' | 'goal'> {
  return { title: t.name, activity: t.activity, exercises: t.exercises.map((x) => ({ ...x })), goal: t.goal };
}

export function templateFromSession(s: WorkoutSession, name: string, now = new Date()): WorkoutTemplate {
  return {
    id: newId('tpl'),
    name: name.trim() || s.title,
    activity: s.activity,
    goal: s.goal,
    exercises: s.exercises.map((x) => ({ exerciseId: x.exerciseId, sets: Math.max(1, x.sets.length) })),
    rev: 1,
    updatedAt: now.toISOString(),
  };
}

export type AgendaStatus = 'planned' | 'done' | 'started' | 'missed' | 'skipped';

export interface AgendaEntry {
  kind: 'occurrence';
  plan: PlannedWorkout;
  original: IsoDate;
  date: IsoDate;
  status: AgendaStatus;
  session: WorkoutSession | null;
}

export interface SessionEntry {
  kind: 'session';
  date: IsoDate;
  session: WorkoutSession;
}

export type DayEntry = AgendaEntry | SessionEntry;

function linkedSessions(sessions: readonly WorkoutSession[]) {
  const map = new Map<string, WorkoutSession>();
  for (const s of sessions) {
    if (!s.plannedRef) continue;
    const key = `${s.plannedRef.planId}|${s.plannedRef.occurrence}`;
    const prev = map.get(key);
    // A completed session wins over an unfinished one for the same occurrence.
    if (!prev || (s.status === 'completed' && prev.status !== 'completed')) map.set(key, s);
  }
  return map;
}

/**
 * Everything that happens between `from` and `to`, by day: planned occurrences (with their
 * status) and sessions that do not belong to an occurrence in that range.
 */
export function agenda(plans: readonly PlannedWorkout[], sessions: readonly WorkoutSession[], from: IsoDate, to: IsoDate, today: IsoDate, includeSkipped = false): Map<IsoDate, DayEntry[]> {
  const days = new Map<IsoDate, DayEntry[]>();
  const push = (d: IsoDate, e: DayEntry) => days.set(d, [...(days.get(d) ?? []), e]);
  const linked = linkedSessions(sessions);
  const shown = new Set<string>();
  for (const plan of plans) {
    for (const o of occurrencesBetween(plan, from, to)) {
      const session = linked.get(`${plan.id}|${o.original}`) ?? null;
      if (session) shown.add(session.id);
      const status: AgendaStatus = session?.status === 'completed' ? 'done' : session ? 'started' : o.date < today ? 'missed' : 'planned';
      push(o.date, { kind: 'occurrence', plan, original: o.original, date: o.date, status, session });
    }
    if (includeSkipped) {
      for (const [original, ex] of Object.entries(plan.exceptions)) {
        if (ex.type === 'skip' && original >= from && original <= to && ruleMatches(plan, original) && !plans.some((p) => p.detachedFrom?.planId === plan.id && p.detachedFrom.original === original)) {
          push(original, { kind: 'occurrence', plan, original, date: original, status: 'skipped', session: null });
        }
      }
    }
  }
  for (const s of sessions) {
    if (s.date < from || s.date > to || shown.has(s.id) || s.status === 'active') continue;
    push(s.date, { kind: 'session', date: s.date, session: s });
  }
  for (const list of days.values()) {
    list.sort((a, b) => {
      const ta = a.kind === 'occurrence' ? a.plan.time ?? '99' : a.session.completedAt ?? '';
      const tb = b.kind === 'occurrence' ? b.plan.time ?? '99' : b.session.completedAt ?? '';
      return ta.localeCompare(tb);
    });
  }
  return days;
}

/** Next planned occurrences from today on (not yet done). */
export function upcoming(plans: readonly PlannedWorkout[], sessions: readonly WorkoutSession[], today: IsoDate, limit = 3, horizonDays = 120): AgendaEntry[] {
  const end = parseDate(today);
  end.setDate(end.getDate() + horizonDays);
  const days = agenda(plans, sessions, today, toIsoDate(end), today);
  const out: AgendaEntry[] = [];
  for (const d of [...days.keys()].sort()) {
    for (const e of days.get(d)!) if (e.kind === 'occurrence' && (e.status === 'planned' || e.status === 'started')) out.push(e);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

/** 6 × 7 grid of dates (Monday first) covering the month of `month` ("YYYY-MM"). */
export function monthGrid(month: string): IsoDate[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y!, m! - 1, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toIsoDate(d);
  });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y!, m! - 1 + delta, 1, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
