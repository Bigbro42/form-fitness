import { useState } from 'preact/hooks';
import { createPlan, detachOccurrence, planFromTemplate, recurrenceFor, repeatChoice, updateSeries, type PlanInput, type RepeatChoice } from '../../domain/calendar';
import { formatDate, isIsoDate, today } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { recommend } from '../../domain/recommendations';
import type { PlannedExercise } from '../../domain/types';
import { deleteTemplate, savePlans, saveTemplate, useAppState } from '../../state/store';
import { useLookup } from '../../state/workout';
import { Notice } from '../components';
import { Icon } from '../icons';
import { href, navigate } from '../router';
import { ExercisePicker } from '../workout-parts';
import { GoalSelect } from './Workout';

const REPEATS: { id: RepeatChoice; label: string }[] = [
  { id: 'once', label: 'Einmalig' },
  { id: 'weekly', label: 'Jede Woche' },
  { id: 'biweekly', label: 'Alle 2 Wochen' },
  { id: 'monthly', label: 'Jeden Monat' },
];

export function PlanEditor({ planId, original, date }: { planId?: string; original?: string; date?: string }) {
  const state = useAppState();
  const lookup = useLookup();
  const existing = planId ? state.data.plans.find((p) => p.id === planId) : undefined;
  const single = Boolean(existing && original); // change only one occurrence of a series
  const [title, setTitle] = useState(existing?.title ?? '');
  const [activity, setActivity] = useState(existing?.activity ?? 'strength');
  const [startsOn, setStartsOn] = useState(single ? original! : existing?.startsOn ?? (date && isIsoDate(date) ? date : today()));
  const [time, setTime] = useState(existing?.time ?? '');
  const initialRepeat = existing && !single ? repeatChoice(existing.recurrence) : 'once';
  const [repeat, setRepeat] = useState<RepeatChoice>(initialRepeat === 'other' ? 'weekly' : initialRepeat);
  const [until, setUntil] = useState(existing && existing.recurrence.freq !== 'once' ? existing.recurrence.until ?? '' : '');
  const [goal, setGoal] = useState(existing?.goal ?? state.data.settings.primaryGoal);
  const [exercises, setExercises] = useState<PlannedExercise[]>(existing?.exercises ?? []);
  const [picking, setPicking] = useState(false);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [savedTemplate, setSavedTemplate] = useState('');

  if (planId && !existing) {
    return <main class="screen"><div class="empty"><h1 class="h3">Termin nicht gefunden</h1><a class="btn btn-primary" href={href({ name: 'calendar' })} style={{ marginTop: 'var(--space-3)' }}>Zum Kalender</a></div></main>;
  }

  const validUntil = !until || (isIsoDate(until) && until >= startsOn);
  const valid = isIsoDate(startsOn) && validUntil && (!time || /^\d{2}:\d{2}$/.test(time));
  const input = (): PlanInput => ({
    title: title.trim() || (activity === 'sport' ? 'Sport' : 'Training'),
    activity,
    startsOn,
    time: time || null,
    recurrence: recurrenceFor(single ? 'once' : repeat, until || null),
    exercises: activity === 'sport' ? [] : exercises,
    goal,
  });

  const save = () => {
    if (!valid) return;
    if (existing && single) void savePlans(...detachOccurrence(existing, original!, input()));
    else if (existing) void savePlans(updateSeries(existing, input()));
    else void savePlans(createPlan(input()));
    navigate({ name: 'calendar', month: startsOn.slice(0, 7) }, true);
  };

  const setSets = (i: number, delta: number) => setExercises((list) => list.map((x, j) => (j === i ? { ...x, sets: Math.min(10, Math.max(1, x.sets + delta)) } : x)));
  const move = (i: number, delta: number) => setExercises((list) => {
    const next = [...list];
    const j = i + delta;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  });

  return (
    <main class="screen">
      <a class="btn btn-ghost" href={href({ name: 'calendar', month: startsOn.slice(0, 7) })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Kalender</a>
      <header class="page-head" style={{ marginTop: 'var(--space-3)' }}>
        <div>
          <p class="eyebrow">{single ? `Nur Termin am ${formatDate(original!, { day: 'numeric', month: 'long' })}` : existing ? 'Serie bearbeiten' : 'Training planen'}</p>
          <h1 class="title">{existing ? existing.title : 'Neuer Termin'}</h1>
        </div>
      </header>
      {single && <Notice tone="info"><p>Die Änderung gilt nur für diesen einen Termin. Die übrige Serie bleibt unverändert.</p></Notice>}
      {existing && !single && existing.recurrence.freq !== 'once' && <Notice tone="info"><p>Änderungen gelten für alle Termine der Serie. Bereits absolvierte Trainings bleiben unverändert.</p></Notice>}

      <form class="stack" style={{ marginTop: 'var(--space-3)' }} onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label class="field">
          <span>Bezeichnung</span>
          <input class="input" type="text" maxLength={60} placeholder={activity === 'sport' ? 'z. B. Kampfsport' : 'z. B. Beine & Core'} value={title} onInput={(e) => setTitle((e.currentTarget as HTMLInputElement).value)} />
        </label>

        <div class="segmented" role="group" aria-label="Art" style={{ margin: 0 }}>
          <button type="button" aria-pressed={activity === 'strength'} onClick={() => setActivity('strength')}>Mit Übungen</button>
          <button type="button" aria-pressed={activity === 'sport'} onClick={() => setActivity('sport')}>Sport / Kurs</button>
        </div>

        <div class="two-col">
          <label class="field">
            <span>Datum</span>
            <input class="input" type="date" required value={startsOn} onInput={(e) => setStartsOn((e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="field">
            <span>Uhrzeit <span class="muted">(optional)</span></span>
            <input class="input" type="time" value={time} onInput={(e) => setTime((e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>

        {!single && (
          <fieldset class="field">
            <legend>Wiederholen</legend>
            <div class="chips chips-wrap" role="radiogroup" aria-label="Wiederholen">
              {REPEATS.map((r) => <button type="button" key={r.id} role="radio" aria-checked={repeat === r.id} class="chip-btn" aria-pressed={repeat === r.id} onClick={() => setRepeat(r.id)}>{r.label}</button>)}
            </div>
            {repeat !== 'once' && (
              <label class="field">
                <span>Endet am <span class="muted">(optional, sonst ohne Ende)</span></span>
                <input class="input" type="date" min={startsOn} value={until} onInput={(e) => setUntil((e.currentTarget as HTMLInputElement).value)} aria-invalid={!validUntil} />
                {!validUntil && <span class="hint">Das Ende muss nach dem Start liegen.</span>}
              </label>
            )}
            {repeat === 'monthly' && Number(startsOn.slice(8)) > 28 && <p class="muted small" style={{ margin: 0 }}>In Monaten ohne den {Number(startsOn.slice(8))}. entfällt der Termin.</p>}
          </fieldset>
        )}

        <label class="field">
          <span>Ziel dieser Einheit</span>
          <GoalSelect id="plan-goal" value={goal} onChange={setGoal} />
        </label>

        {activity === 'strength' && (
          <section class="field" aria-labelledby="plan-ex">
            <div class="section-head" style={{ marginBottom: 0 }}>
              <span id="plan-ex">Übungen <span class="muted">(optional)</span></span>
              {state.data.templates.length > 0 && (
                <select class="select select-inline" aria-label="Aus Vorlage übernehmen" value="" onChange={(e) => {
                  const t = state.data.templates.find((x) => x.id === (e.currentTarget as HTMLSelectElement).value);
                  if (!t) return;
                  const p = planFromTemplate(t);
                  setExercises(p.exercises);
                  if (!title.trim()) setTitle(p.title);
                  if (p.goal) setGoal(p.goal);
                }}>
                  <option value="">Aus Vorlage …</option>
                  {state.data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
            {exercises.length ? (
              <ol class="list plan-list">
                {exercises.map((x, i) => (
                  <li class="row plan-ex" key={`${x.exerciseId}-${i}`}>
                    <div class="row-main"><b>{lookup(x.exerciseId)?.name ?? x.exerciseId}</b><small>{x.sets} {x.sets === 1 ? 'Satz' : 'Sätze'}</small></div>
                    <div class="stepper">
                      <button type="button" class="icon-btn icon-btn-sm" onClick={() => setSets(i, -1)} aria-label="Ein Satz weniger"><Icon name="minus" size={16} /></button>
                      <button type="button" class="icon-btn icon-btn-sm" onClick={() => setSets(i, 1)} aria-label="Ein Satz mehr"><Icon name="plus" size={16} /></button>
                      <button type="button" class="icon-btn icon-btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben"><Icon name="up" size={16} /></button>
                      <button type="button" class="icon-btn icon-btn-sm" onClick={() => setExercises((l) => l.filter((_, j) => j !== i))} aria-label="Entfernen"><Icon name="trash" size={16} /></button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p class="muted small" style={{ margin: 0 }}>Ohne Übungen startest du leer und wählst beim Training aus.</p>}
            <button type="button" class="btn btn-secondary btn-block" onClick={() => setPicking(true)}><Icon name="plus" size={18} />Übung hinzufügen</button>
            {exercises.length > 0 && templateName === null && <button type="button" class="btn btn-ghost" onClick={() => setTemplateName(title.trim() || 'Meine Vorlage')}>Als Vorlage speichern</button>}
            {templateName !== null && (
              <div class="template-save">
                <input class="input" aria-label="Name der Vorlage" value={templateName} onInput={(e) => setTemplateName((e.currentTarget as HTMLInputElement).value)} />
                <button type="button" class="btn btn-secondary btn-sm" onClick={() => {
                  const name = templateName.trim() || 'Vorlage';
                  void saveTemplate({ id: newId('tpl'), name, activity, goal, exercises, rev: 1, updatedAt: new Date().toISOString() });
                  setSavedTemplate(name);
                  setTemplateName(null);
                }}>Speichern</button>
              </div>
            )}
            {savedTemplate && <p class="small" role="status" style={{ color: 'var(--accent)', margin: 0 }}>Vorlage „{savedTemplate}“ gespeichert.</p>}
          </section>
        )}

        <button type="submit" class="btn btn-primary btn-block btn-lg" disabled={!valid} style={{ marginTop: 'var(--space-3)' }}>
          <Icon name="check" size={18} />{single ? 'Diesen Termin speichern' : existing ? 'Änderungen speichern' : 'Termin speichern'}
        </button>
      </form>

      {state.data.templates.length > 0 && !existing && (
        <details class="card details" style={{ marginTop: 'var(--space-5)' }}>
          <summary>Vorlagen verwalten ({state.data.templates.length})</summary>
          <div class="list" style={{ marginTop: 'var(--space-3)' }}>
            {state.data.templates.map((t) => (
              <div class="row" key={t.id}>
                <div class="row-main"><b>{t.name}</b><small>{t.exercises.length} Übungen</small></div>
                <button type="button" class="icon-btn icon-btn-sm" onClick={() => deleteTemplate(t.id)} aria-label={`Vorlage ${t.name} löschen`}><Icon name="trash" size={16} /></button>
              </div>
            ))}
          </div>
        </details>
      )}

      {picking && (
        <ExercisePicker title="Übung einplanen" recent={[]} custom={state.data.customExercises} onClose={() => setPicking(false)}
          onPick={(d) => { setExercises((l) => [...l, { exerciseId: d.id, sets: recommend(d, goal).sets[0] }]); setPicking(false); }} />
      )}
    </main>
  );
}
