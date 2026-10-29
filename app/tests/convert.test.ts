import { describe, expect, it } from 'vitest';
import { convertLegacy, inputFromBackup, inputFromStorage } from '../src/legacy/convert';
import { calendarV20, coachV5, legacyStorage, NOW, randomV1 } from './fixtures';

const convert = (raw = legacyStorage()) => convertLegacy(inputFromStorage(raw), { now: NOW });
const byId = (r: ReturnType<typeof convert>, id: string) => r.sessions.find((s) => s.id === id);

describe('legacy conversion', () => {
  it('counts only sessions marked complete as completed', () => {
    const r = convert();
    const completed = r.sessions.filter((s) => s.status === 'completed').map((s) => s.id).sort();
    expect(completed).toEqual(['legacy-day-2026-10-05', 'legacy-day-2026-10-06', 'legacy-day-2026-10-22', 'legacy-random-r-1']);
    expect(r.report.completedSessions).toBe(4);
  });

  it('keeps sets, weights, done flags and the metric of every exercise', () => {
    const s = byId(convert(), 'legacy-day-2026-10-05')!;
    expect(s.title).toBe('Beine & Core'); // weekly series s1 starts that Monday
    expect(s.source).toBe('calendar');
    expect(s.goal).toBe('core'); // series goal from V26 settings
    expect(s.completedAt).toBe('2026-10-05T17:40:00.000Z');
    expect(s.durationMin).toBe(22);
    expect(s.note).toBe('Gut gelaufen');
    const [squat, plank] = s.exercises;
    expect(squat).toMatchObject({ exerciseId: 'squat', name: 'Kniebeugen', metric: 'reps' });
    expect(squat!.sets.map((x) => [x.value, x.weightKg, x.done])).toEqual([[12, null, true], [10, null, true]]);
    expect(plank).toMatchObject({ exerciseId: 'plank', metric: 'seconds', variant: 'easy' });
    expect(plank!.sets.map((x) => x.done)).toEqual([true, false]);
  });

  it('marks inferred fields on old fixed-plan days', () => {
    const s = byId(convert(), 'legacy-day-2026-10-06')!;
    expect(s).toMatchObject({ title: 'Kampfsport', activity: 'sport', status: 'completed', exercises: [] });
    expect(s.legacy?.inferred).toEqual(['title', 'completedAt']);
  });

  it('keeps started but unfinished workouts as drafts, never as training', () => {
    const r = convert();
    const reopened = byId(r, 'legacy-day-2026-10-12')!;
    expect(reopened.status).toBe('draft');
    expect(reopened.exercises[0]!.sets[0]).toMatchObject({ value: 8, weightKg: 12.5, done: true });
    expect(byId(r, 'legacy-day-2026-10-15')).toMatchObject({ status: 'draft', note: 'Knie gezwickt, abgebrochen' });
    expect(byId(r, 'legacy-random-r-3')!.status).toBe('draft');
    expect(byId(r, 'legacy-day-2026-11-02')!.status).toBe('draft'); // prepared for the future
  });

  it('skips entries without any user input but reports them', () => {
    const r = convert();
    expect(byId(r, 'legacy-day-2026-10-08')).toBeUndefined();
    expect(byId(r, 'legacy-random-r-2')).toBeUndefined();
    expect(r.report.skippedEmpty).toBe(2);
  });

  it('keeps unknown exercise ids instead of dropping them', () => {
    const r = convert();
    const x = byId(r, 'legacy-day-2026-10-12')!.exercises[1]!;
    expect(x).toMatchObject({ exerciseId: 'mystery_move', name: 'mystery_move', variant: 'hard' });
    expect(r.report.unknownExercises).toEqual(['mystery_move']);
  });

  it('reports invalid dates and ignores the settings record as a workout', () => {
    const r = convert();
    expect(r.sessions.some((s) => s.date === 'irgendwas' || s.id.includes('__form'))).toBe(false);
    expect(r.report.problems.join(' ')).toContain('irgendwas');
    expect(r.report.problems.join(' ')).toContain('Kaputt');
  });

  it('treats quick-start events as spontaneous workouts, not as calendar plans', () => {
    const r = convert();
    const s = byId(r, 'legacy-day-2026-10-22')!;
    expect(s).toMatchObject({ title: 'Spontanes Training', source: 'manual', status: 'completed' });
    expect(s.plannedRef).toBeUndefined();
    expect(r.plans.some((p) => p.id.includes('quick-'))).toBe(false);
  });

  it('deduplicates random sessions with the same id', () => {
    expect(convert().sessions.filter((s) => s.id === 'legacy-random-r-1')).toHaveLength(1);
  });

  it('converts calendar entries with recurrence, skips and presets', () => {
    const r = convert();
    expect(r.plans.map((p) => p.id).sort()).toEqual(['legacy-plan-o1', 'legacy-plan-s1', 'legacy-plan-s2', 'legacy-plan-s3']);
    const s1 = r.plans.find((p) => p.id === 'legacy-plan-s1')!;
    expect(s1).toMatchObject({ recurrence: { freq: 'weekly', interval: 1, until: null }, exceptions: { '2026-10-19': { type: 'skip' } }, goal: 'core', time: null });
    const s2 = r.plans.find((p) => p.id === 'legacy-plan-s2')!;
    expect(s2).toMatchObject({ activity: 'sport', time: '19:00', recurrence: { freq: 'weekly', interval: 2, until: '2026-12-31' } });
    const o1 = r.plans.find((p) => p.id === 'legacy-plan-o1')!;
    expect(o1.recurrence).toEqual({ freq: 'once' });
    expect(o1.exercises.map((x) => x.exerciseId)).toEqual(['squat', 'bridge', 'lunge', 'deadbug']);
  });

  it('takes over goal, equipment and rest timer settings', () => {
    expect(convert().settings).toEqual({ primaryGoal: 'strength', equipment: ['body', 'dumbbell'], restSeconds: 75, restAuto: false });
  });

  it('prefers v5 and falls back to the newest older key like the legacy app', () => {
    const older = { '2026-09-01': { complete: true } };
    const raw = { 'form-trainingscoach-v3': JSON.stringify(older), 'form-trainingscoach-v2': JSON.stringify({ records: { '2026-08-01': { complete: true } } }) };
    const r = convertLegacy(inputFromStorage(raw), { now: NOW });
    expect(r.sessions.map((s) => s.id)).toEqual(['legacy-day-2026-09-01']);
    expect(r.sessions[0]!.legacy?.key).toBe('form-trainingscoach-v3');
  });

  it('reports broken JSON instead of failing', () => {
    const problems: string[] = [];
    const input = inputFromStorage({ 'form-coach-v5': '{kaputt', 'form-random-workouts-v1': JSON.stringify(randomV1) }, problems);
    expect(problems[0]).toContain('form-coach-v5');
    expect(convertLegacy(input, { now: NOW }).sessions.length).toBeGreaterThan(0);
  });

  it('produces the same records from a legacy backup file as from localStorage', () => {
    const backup = { version: 20, createdAt: '2026-10-28T10:00:00Z', records: coachV5.records, plans: coachV5.plans, sex: 'female', randomSessions: randomV1, scheduleV20: calendarV20 };
    const fromFile = convertLegacy(inputFromBackup(backup, 'FORM_Backup.json'), { now: NOW });
    const fromStorage = convert();
    const strip = (r: typeof fromFile) => r.sessions.map(({ legacy, ...s }) => s);
    expect(strip(fromFile)).toEqual(strip(fromStorage));
    expect(fromFile.plans.length).toBe(fromStorage.plans.length);
  });
});
