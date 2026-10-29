/**
 * Legacy data shaped exactly like the V26 app writes it (see src/legacy/convert.ts for the
 * format notes). Dates are in October/November 2026; "now" in tests is 2026-10-29.
 */
export const NOW = new Date('2026-10-29T10:00:00');

export const coachV5 = {
  version: 5,
  sex: 'female',
  records: {
    // Completed with a snapshot of the exercises (V19+ completion).
    '2026-10-05': {
      complete: true,
      completedAt: '2026-10-05T17:40:00.000Z',
      note: 'Gut gelaufen',
      duration: '22',
      energy: 'gut',
      completedExercises: [
        { id: 'squat', variant: 'standard', sets: [12, '10'], weights: [null, ''], done: [true, true] },
        { id: 'plank', variant: 'easy', sets: [30, 35], weights: [], done: [true] },
      ],
    },
    // Completed martial arts day of the old fixed plan (Tuesday, no exercises, no timestamp).
    '2026-10-06': { complete: true },
    // Reopened after completion: data stays in plans, not complete.
    '2026-10-12': { complete: false, completedExercises: null, completedAt: null },
    // Only a note, not completed.
    '2026-10-15': { note: 'Knie gezwickt, abgebrochen' },
    // Spontaneous workout ("Jetzt trainieren").
    '2026-10-22': { complete: true, completedAt: '2026-10-22T15:00:00.000Z', completedExercises: [{ id: 'calf', variant: 'standard', sets: [15], weights: [], done: [true] }] },
    __form_v26_settings: { goal: 'strength', equipment: ['body', 'dumbbell', 'nonsense'], seriesGoals: { s1: 'core' } },
    // Broken key from an old version.
    'irgendwas': { complete: true },
  },
  plans: {
    '2026-10-12': [
      { id: 'hexbpress', variant: 'standard', sets: [8, null], weights: [12.5, null], done: [true] },
      { id: 'mystery_move', variant: 'hard', sets: [5], weights: [], done: [] },
    ],
    // Past plan that was only reordered, never trained: no data -> skipped.
    '2026-10-08': [{ id: 'pushup', variant: 'standard', sets: [null, null], weights: [], done: [] }],
    // Future plan prepared in advance -> kept as draft.
    '2026-11-02': [{ id: 'bridge', variant: 'standard', sets: [null, null], weights: [], done: [] }],
  },
};

export const randomV1 = [
  {
    id: 'r-1', date: '2026-10-20', createdAt: '2026-10-20T16:00:00.000Z', focus: 'legs', duration: 20, goalV26: 'health', completed: true, completedAt: '2026-10-20T16:25:00.000Z',
    exercises: [{ id: 'lunge', variant: 'standard', sets: [10, 10], weights: [null, null], done: [true, true] }],
  },
  // Generated but never started.
  { id: 'r-2', date: '2026-10-21', createdAt: '2026-10-21T16:00:00.000Z', focus: 'all', duration: 15, completed: false, exercises: [{ id: 'squat', variant: 'standard', sets: [null], weights: [null], done: [] }] },
  // Started, not finished.
  { id: 'r-3', date: '2026-10-22', createdAt: '2026-10-22T16:00:00.000Z', focus: 'abs', duration: 10, completed: false, exercises: [{ id: 'deadbug', variant: 'standard', sets: [8], weights: [], done: [true] }] },
  // Duplicate id (old bug) must not create a second session.
  { id: 'r-1', date: '2026-10-20', completed: true, exercises: [] },
];

export const calendarV20 = {
  version: 1,
  oneOff: {
    '2026-10-30': { id: 'o1', name: 'Probetraining', type: 'strength', time: '18:30', preset: 'A', date: '2026-10-30' },
    // Created by "Jetzt trainieren" for the workout on that day.
    '2026-10-22': { id: 'quick-1761141600000', name: 'Spontanes Training', type: 'strength', preset: '', time: '', date: '2026-10-22' },
  },
  series: [
    { id: 's1', name: 'Beine & Core', type: 'strength', time: '', preset: '', freq: 'weekly', interval: 1, startsOn: '2026-10-05', endsOn: '' },
    { id: 's2', name: 'Kampfsport', type: 'sport', time: '19:00', preset: '', freq: 'weekly', interval: 2, startsOn: '2026-10-07', endsOn: '2026-12-31' },
    { id: 's3', name: 'Monatscheck', type: 'strength', freq: 'monthly', interval: 1, startsOn: '2026-10-31' },
    { id: 'bad', name: 'Kaputt', type: 'strength', freq: 'weekly', startsOn: 'gestern' },
  ],
  skips: { 's1|2026-10-19': true },
};

export function legacyStorage(extra: Record<string, unknown> = {}): Record<string, string> {
  const values: Record<string, unknown> = {
    'form-coach-v5': coachV5,
    'form-random-workouts-v1': randomV1,
    'form-calendar-v20': calendarV20,
    'form-pwa-reminders': [{ day: 1, name: 'Krafttraining A', time: '18:00', enabled: true, duration: 20 }],
    'form-rest-length': 75,
    'form-rest-auto': false,
    ...extra,
  };
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
}

/** Minimal Storage stand-in that records writes, so tests can prove nothing was written. */
export class MemoryStorage {
  writes = 0;
  constructor(private values: Record<string, string>) {}
  getItem(key: string): string | null {
    return key in this.values ? this.values[key]! : null;
  }
  setItem(key: string, value: string) {
    this.writes++;
    this.values[key] = value;
  }
  snapshot() {
    return { ...this.values };
  }
}
