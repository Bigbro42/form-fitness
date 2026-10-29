import { useState } from 'preact/hooks';
import { METRIC_LABELS } from '../../domain/catalog';
import { formatDate, parseDate } from '../../domain/dates';
import { GOAL_IDS, GOALS } from '../../domain/goals';
import { exerciseHistory } from '../../domain/history';
import { elapsedMinutes, hasLoggedWork } from '../../domain/session';
import type { GoalId, WorkoutSession } from '../../domain/types';
import { activeSession, useAppState } from '../../state/store';
import { addToWorkout, finishWorkout, leaveWorkout, setWorkoutGoal, setWorkoutTitle, startWorkout } from '../../state/workout';
import { Notice, Sheet } from '../components';
import { Icon } from '../icons';
import { href, navigate } from '../router';
import { ElapsedTime, ExercisePicker, NumberField } from '../workout-parts';

function recentExerciseIds(sessions: readonly WorkoutSession[], limit = 8): string[] {
  const ids: string[] = [];
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    for (const x of s.exercises) if (!ids.includes(x.exerciseId)) ids.push(x.exerciseId);
    if (ids.length >= limit) break;
  }
  return ids.slice(0, limit);
}

export function GoalSelect({ value, onChange, id }: { value: GoalId | null; onChange: (g: GoalId | null) => void; id: string }) {
  return (
    <select id={id} class="select" value={value ?? ''} onChange={(e) => onChange(((e.currentTarget as HTMLSelectElement).value || null) as GoalId | null)}>
      <option value="">Ohne festes Ziel</option>
      {GOAL_IDS.map((g) => <option key={g} value={g}>{GOALS[g].label}</option>)}
    </select>
  );
}

function FinishSheet({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const original = session.reopened?.original;
  const [rpe, setRpe] = useState<number | null>(session.rpe);
  const [note, setNote] = useState(session.note);
  const [duration, setDuration] = useState<number | null>(original?.durationMin ?? elapsedMinutes(session, new Date()));
  const empty = !hasLoggedWork(session);
  return (
    <Sheet title={original ? 'Korrektur speichern' : 'Training abschließen'} onClose={onClose}>
      {empty && <Notice tone="warn" title="Noch keine Sätze erfasst"><p>Du kannst trotzdem abschließen, z. B. für ein Training ohne Zahlen.</p></Notice>}
      <label class="field">
        <span>Dauer (Minuten)</span>
        <NumberField value={duration} onCommit={setDuration} label="Dauer in Minuten" />
      </label>
      <fieldset class="field">
        <legend>Wie anstrengend war es? <span class="muted small">(optional, 1 = sehr leicht, 10 = maximal)</span></legend>
        <div class="rpe" role="radiogroup" aria-label="Belastung">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} role="radio" aria-checked={rpe === n} class="rpe-btn" onClick={() => setRpe(rpe === n ? null : n)}>{n}</button>
          ))}
        </div>
      </fieldset>
      <label class="field">
        <span>Notiz</span>
        <textarea class="textarea" rows={3} placeholder="Wie lief es? Schmerzen, Schlaf, Energie …" value={note} onInput={(e) => setNote((e.currentTarget as HTMLTextAreaElement).value)} />
      </label>
      <div class="stack" style={{ marginTop: 'var(--space-4)' }}>
        <button class="btn btn-primary btn-block" onClick={() => finishWorkout({ rpe, note: note.trim(), durationMin: duration })}>
          <Icon name="check" size={18} />{original ? 'Korrektur speichern' : 'Abschließen'}
        </button>
        <button class="btn btn-secondary btn-block" onClick={onClose}>Weiter trainieren</button>
      </div>
    </Sheet>
  );
}

function NoWorkout() {
  const state = useAppState();
  return (
    <main class="screen">
      <header class="page-head"><div><p class="eyebrow">Training</p><h1 class="title">Bereit?</h1></div></header>
      <section class="card-hero">
        <h2 class="h2">Spontan trainieren</h2>
        <p class="muted">Kein Plan nötig: Starte, füge Übungen hinzu und erfasse deine Sätze. Alles wird sofort gespeichert.</p>
        <button class="btn btn-primary btn-block" style={{ marginTop: 'var(--space-4)' }} onClick={() => startWorkout(state)}>
          <Icon name="play" size={18} />Training starten
        </button>
      </section>
      <a class="card card-link" href={href({ name: 'generator' })} style={{ marginTop: 'var(--space-3)' }}>
        <span class="icon-btn icon-btn-accent" aria-hidden="true"><Icon name="shuffle" size={20} /></span>
        <span class="row-main"><b>Workout-Generator</b><small>Fokus, Ziel, Dauer und Equipment wählen – FORM. stellt ein ausgewogenes Training zusammen.</small></span>
        <Icon name="chevron" size={18} class="chevron" />
      </a>
      <a class="card card-link" href={href({ name: 'calendar' })} style={{ marginTop: 'var(--space-2)' }}>
        <span class="icon-btn" aria-hidden="true"><Icon name="calendar" size={20} /></span>
        <span class="row-main"><b>Training planen</b><small>Einmalig oder als Wiederholung im Kalender.</small></span>
        <Icon name="chevron" size={18} class="chevron" />
      </a>
    </main>
  );
}

export function Workout() {
  const state = useAppState();
  const session = activeSession(state);
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  if (!session) return <NoWorkout />;

  const correcting = Boolean(session.reopened);
  const totalSets = session.exercises.reduce((n, x) => n + x.sets.length, 0);
  const doneSets = session.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0);

  return (
    <main class="screen">
      <header class="workout-head">
        <div class="workout-meta">
          <span class="live-dot" aria-hidden="true" />
          <span>{correcting ? `Korrektur · ${formatDate(session.date)}` : <>Läuft · <ElapsedTime since={session.startedAt} /></>}</span>
        </div>
        {editingTitle ? (
          <input class="title-input" aria-label="Name des Trainings" defaultValue={session.title} autoFocus
            onBlur={(e) => { setWorkoutTitle((e.currentTarget as HTMLInputElement).value); setEditingTitle(false); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
        ) : (
          <button class="title-btn" onClick={() => setEditingTitle(true)} aria-label={`${session.title} – umbenennen`}>
            <h1 class="title">{session.title}</h1><Icon name="edit" size={18} />
          </button>
        )}
        <label class="goal-line">
          <span class="muted small">Ziel dieser Einheit</span>
          <GoalSelect id="session-goal" value={session.goal} onChange={setWorkoutGoal} />
        </label>
        {session.goal && <p class="muted small" style={{ margin: 0 }}>{GOALS[session.goal].description}</p>}
      </header>

      {totalSets > 0 && (
        <div class="progress" aria-label={`${doneSets} von ${totalSets} Sätzen abgehakt`}>
          <div class="progress-fill" style={{ width: `${(doneSets / totalSets) * 100}%` }} />
        </div>
      )}

      <section class="section" style={{ marginTop: 'var(--space-4)' }} aria-label="Übungen">
        {session.exercises.length ? (
          <ol class="list exercise-list">
            {session.exercises.map((x, i) => {
              const done = x.sets.filter((s) => s.done).length;
              const last = exerciseHistory(state.data.sessions, x.exerciseId, session.id)[0];
              return (
                <li key={x.id}>
                  <a class="row" href={href({ name: 'exercise', id: x.id })}>
                    <span class={`step${done === x.sets.length && done > 0 ? ' step-done' : ''}`} aria-hidden="true">{done === x.sets.length && done > 0 ? <Icon name="check" size={16} /> : i + 1}</span>
                    <div class="row-main">
                      <b>{x.name}</b>
                      <small>{done}/{x.sets.length} Sätze · {METRIC_LABELS[x.metric].long}{last ? ` · zuletzt ${parseDate(last.session.date).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}` : ''}</small>
                    </div>
                    <Icon name="chevron" size={18} class="chevron" />
                  </a>
                </li>
              );
            })}
          </ol>
        ) : (
          <div class="empty">
            <h2 class="h3">Noch keine Übungen</h2>
            <p class="muted small">Füge deine erste Übung hinzu – über Suche, Muskelgruppe oder Equipment.</p>
          </div>
        )}
        <button class="btn btn-secondary btn-block" style={{ marginTop: 'var(--space-3)' }} onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} />Übung hinzufügen
        </button>
      </section>

      <div class="stack" style={{ marginTop: 'var(--space-6)' }}>
        <button class="btn btn-primary btn-block btn-lg" onClick={() => setFinishing(true)}>
          <Icon name="flag" size={18} />{correcting ? 'Korrektur speichern' : 'Training abschließen'}
        </button>
        <button class="btn btn-ghost btn-block" onClick={() => setLeaving(true)}>{correcting ? 'Korrektur verwerfen' : 'Training beenden ohne Abschluss'}</button>
      </div>

      {picking && (
        <ExercisePicker title="Übung hinzufügen" recent={recentExerciseIds(state.data.sessions)} custom={state.data.customExercises}
          onClose={() => setPicking(false)}
          onPick={(def) => { const id = addToWorkout(def); setPicking(false); if (id) navigate({ name: 'exercise', id }); }} />
      )}
      {finishing && <FinishSheet session={session} onClose={() => setFinishing(false)} />}
      {leaving && (
        <Sheet title={correcting ? 'Korrektur verwerfen?' : 'Ohne Abschluss beenden?'} onClose={() => setLeaving(false)}>
          <p>
            {correcting
              ? 'Alle Änderungen dieser Korrektur werden verworfen. Das Training bleibt so, wie es vorher war.'
              : hasLoggedWork(session)
                ? 'Deine erfassten Sätze bleiben als „Nicht abgeschlossen“ im Verlauf und zählen nicht als Training. Du kannst sie später fortsetzen.'
                : 'Es wurden keine Sätze erfasst. Das leere Training wird verworfen.'}
          </p>
          <div class="stack">
            <button class="btn btn-danger btn-block" onClick={leaveWorkout}>{correcting ? 'Verwerfen' : 'Beenden'}</button>
            <button class="btn btn-secondary btn-block" onClick={() => setLeaving(false)}>Zurück</button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
