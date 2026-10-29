import { useRef, useState } from 'preact/hooks';
import { EQUIPMENT_LABELS, METRIC_LABELS, MUSCLE_LABELS } from '../../domain/catalog';
import { formatDate } from '../../domain/dates';
import { GOALS } from '../../domain/goals';
import { exerciseHistory, fmtNum, personalBests, setsSummary } from '../../domain/history';
import { range, recommend, restLabel } from '../../domain/recommendations';
import type { ExerciseDef, Metric, SessionExercise, SetEntry } from '../../domain/types';
import { activeSession, useAppState } from '../../state/store';
import {
  addWorkoutSet, applyPreviousSets, moveInWorkout, removeFromWorkout, removeWorkoutSet, replaceInWorkout,
  setWorkoutVariant, toggleSetDone, updateWorkoutSet, useLookup,
} from '../../state/workout';
import { Sheet } from '../components';
import { Icon } from '../icons';
import { href, navigate } from '../router';
import { ExercisePicker, NumberField } from '../workout-parts';

const BASE = import.meta.env.BASE_URL;

function Media({ def }: { def: ExerciseDef | undefined }) {
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  if (def?.media && !Object.keys(broken).length) {
    return (
      <figure class="media">
        <div class="media-frames">
          {def.media.frames.map((src, i) => (
            <div class="media-frame" key={src}>
              <img src={BASE + src} alt={`${def.name} – ${i === 0 ? 'Startposition' : 'Endposition'}`} loading="lazy" decoding="async" onError={() => setBroken((b) => ({ ...b, [i]: true }))} />
              <span>{i === 0 ? 'Start' : 'Ende'}</span>
            </div>
          ))}
        </div>
        <figcaption>Foto: <a href={def.media.sourceUrl} target="_blank" rel="noopener">{def.media.credit}</a> ({def.media.license})</figcaption>
      </figure>
    );
  }
  // No verified photo: show the muscles, clearly labelled, never a different exercise.
  const primary = def?.primaryMuscles ?? [];
  const secondary = def?.secondaryMuscles ?? [];
  return (
    <section class="muscle-card" aria-label="Muskelübersicht">
      <div>
        <p class="eyebrow">Muskelübersicht · keine Bewegungsdemonstration</p>
        <div class="facts" style={{ marginTop: 'var(--space-2)' }}>
          {primary.map((m) => <span key={m} class="chip chip-done">{MUSCLE_LABELS[m]}</span>)}
          {secondary.map((m) => <span key={m} class="chip chip-neutral">{MUSCLE_LABELS[m]}</span>)}
        </div>
      </div>
      {Object.keys(broken).length > 0 && <p class="muted small" style={{ margin: 'var(--space-2) 0 0' }}>Das Foto konnte nicht geladen werden.</p>}
    </section>
  );
}

/** Load guidance without invented kilograms: only relative to the person's own history. */
function loadHint(def: ExerciseDef | undefined, lastSets: readonly SetEntry[] | undefined): string {
  if (def?.metric !== 'reps') return '';
  if (def.equipment.every((e) => e === 'body')) return 'Steigern über Wiederholungen, Tempo oder die schwerere Variante.';
  if (lastSets?.some((s) => s.weightKg)) return 'Gewicht: Gelang letztes Mal alles sauber, steigere Wiederholungen oder Gewicht leicht.';
  return 'Gewicht: so wählen, dass jede Wiederholung sauber gelingt – es gibt keine pauschal richtigen Kilos.';
}

function SetRow({ ex, set, index, suggestion, showWeight, metric, onToggle }: {
  ex: SessionExercise; set: SetEntry; index: number; suggestion: SetEntry | undefined; showWeight: boolean; metric: Metric;
  onToggle: (set: SetEntry, suggestion: SetEntry | undefined, focus: () => void) => void;
}) {
  const valueId = `v-${set.id}`;
  const unit = METRIC_LABELS[metric];
  return (
    <tr class={set.done ? 'set-done' : ''}>
      <th scope="row" class="set-no">{index + 1}</th>
      {showWeight && (
        <td><NumberField decimal value={set.weightKg} label={`Gewicht Satz ${index + 1} in kg`} placeholder={suggestion?.weightKg != null ? fmtNum(suggestion.weightKg) : 'kg'} onCommit={(v) => updateWorkoutSet(ex.id, set.id, { weightKg: v })} /></td>
      )}
      <td><NumberField id={valueId} decimal={metric !== 'reps'} value={set.value} label={`${unit.long} Satz ${index + 1}`} placeholder={suggestion?.value != null ? fmtNum(suggestion.value) : unit.short} onCommit={(v) => updateWorkoutSet(ex.id, set.id, { value: v, ...(v === null ? { done: false } : {}) })} /></td>
      <td class="set-check-cell">
        <button class={`set-check${set.done ? ' checked' : ''}`} aria-pressed={set.done} aria-label={`Satz ${index + 1} ${set.done ? 'nicht mehr abhaken' : 'abhaken'}`}
          onClick={() => onToggle(set, suggestion, () => document.getElementById(valueId)?.focus())}>
          <Icon name="check" size={20} />
        </button>
      </td>
    </tr>
  );
}

export function ExerciseScreen({ id }: { id: string }) {
  const state = useAppState();
  const lookup = useLookup();
  const session = activeSession(state);
  const [replacing, setReplacing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [hint, setHint] = useState('');
  const hintTimer = useRef<number | undefined>(undefined);
  const index = session?.exercises.findIndex((x) => x.id === id) ?? -1;
  const ex = session && index >= 0 ? session.exercises[index]! : null;

  if (!session || !ex) {
    return (
      <main class="screen">
        <div class="empty"><h1 class="h3">Übung nicht im laufenden Training</h1>
          <p class="muted small">Vielleicht wurde das Training bereits abgeschlossen oder die Übung entfernt.</p>
          <a class="btn btn-primary" href={href({ name: 'workout' })} style={{ marginTop: 'var(--space-3)' }}>Zum Training</a></div>
      </main>
    );
  }

  const def = lookup(ex.exerciseId);
  const rec = recommend(def ?? { kind: ex.metric === 'minutes' ? 'cardio' : ex.metric === 'seconds' ? 'hold' : 'strength', metric: ex.metric }, session.goal);
  const history = exerciseHistory(state.data.sessions, ex.exerciseId, session.id);
  const last = history[0];
  const pb = personalBests(history, ex.metric);
  const showWeight = ex.metric === 'reps' && (!def || def.equipment.some((e) => e !== 'body') || ex.sets.some((s) => s.weightKg !== null) || Boolean(last?.sets.some((s) => s.weightKg)));
  const canCopy = Boolean(last) && ex.sets.some((s) => s.value === null && s.weightKg === null && !s.done);
  const next = session.exercises[index + 1];
  const prev = session.exercises[index - 1];
  const unit = METRIC_LABELS[ex.metric];
  const restSeconds = rec.restSeconds[0] || 0;

  const onToggle = (set: SetEntry, suggestion: SetEntry | undefined, focus: () => void) => {
    if (!toggleSetDone(ex.id, set, suggestion, restSeconds, state.data.settings.restAuto)) {
      setHint(`Trage zuerst ${unit.long} ein.`);
      window.clearTimeout(hintTimer.current);
      hintTimer.current = window.setTimeout(() => setHint(''), 3000);
      focus();
    }
  };

  return (
    <main class="screen screen-exercise">
      <div class="topbar">
        <a class="btn btn-ghost" href={href({ name: 'workout' })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Training</a>
        <span class="muted small tabular">{index + 1} / {session.exercises.length}</span>
      </div>

      {/* 1. Name, muscles, goal */}
      <header style={{ marginBottom: 'var(--space-3)' }}>
        <h1 class="title title-m">{ex.name}</h1>
        <p class="muted small" style={{ margin: 'var(--space-1) 0 0' }}>
          {def ? [...def.primaryMuscles, ...def.secondaryMuscles].map((m) => MUSCLE_LABELS[m]).join(' · ') : 'Eigene / unbekannte Übung'}
          {def && ` · ${def.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')}`}
          {session.goal && ` · Ziel: ${GOALS[session.goal].short}`}
        </p>
      </header>

      {/* 2. Recommendation */}
      <section class="rec" aria-label="Richtwert">
        <div class="rec-main">
          <div><b class="tabular">{range(rec.sets)}</b><span>Sätze</span></div>
          <div><b class="tabular">{range(rec.target)}</b><span>{unit.long}</span></div>
          <div><b class="tabular">{rec.restSeconds[1] ? restLabel(rec.restSeconds).replace(' Pause', '').replace(' Sek.', ' s') : '–'}</b><span>Pause</span></div>
        </div>
        <p class="rec-note"><b>Richtwert:</b> {rec.effort}. {loadHint(def, last?.sets)}</p>
      </section>

      {/* 3. Photo or labelled muscle overview */}
      <Media def={def} />

      {/* 4. Set entry */}
      <section class="card sets-card" aria-label="Sätze erfassen">
        <table class="set-table">
          <colgroup><col class="col-no" />{showWeight && <col />}<col /><col class="col-check" /></colgroup>
          <thead>
            <tr>
              <th scope="col">Satz</th>
              {showWeight && <th scope="col">kg</th>}
              <th scope="col">{unit.long}</th>
              <th scope="col"><span class="visually-hidden">Abgehakt</span></th>
            </tr>
          </thead>
          <tbody>
            {ex.sets.map((set, i) => (
              <SetRow key={set.id} ex={ex} set={set} index={i} suggestion={last?.sets[i] ?? last?.sets.at(-1)} showWeight={showWeight} metric={ex.metric} onToggle={onToggle} />
            ))}
          </tbody>
        </table>
        {hint && <p class="hint" role="status">{hint}</p>}
        <div class="btn-row set-actions">
          <button class="btn btn-secondary btn-sm" onClick={() => addWorkoutSet(ex.id)}><Icon name="plus" size={16} />Satz</button>
          {ex.sets.length > 1 && <button class="btn btn-secondary btn-sm" onClick={() => removeWorkoutSet(ex.id, ex.sets.at(-1)!.id)}><Icon name="minus" size={16} />Satz</button>}
          {/* 6. Take over previous values */}
          {canCopy && <button class="btn btn-secondary btn-sm" onClick={() => applyPreviousSets(ex.id, last!.sets)}><Icon name="copy" size={16} />Vorherige Werte</button>}
        </div>
      </section>

      {/* 5. Last time and personal best */}
      <section class="card perf" aria-label="Letztes Training und Bestleistung">
        {last ? (
          <dl class="kv">
            <dt>Letztes Mal · {formatDate(last.session.date, { day: 'numeric', month: 'short' })}</dt>
            <dd>{setsSummary(last.sets, ex.metric)}</dd>
            {pb.heaviest && <><dt>Schwerster Satz</dt><dd>{fmtNum(pb.heaviest.weightKg)} kg × {fmtNum(pb.heaviest.value)}</dd></>}
            {pb.bestValue && <><dt>{ex.metric === 'reps' ? 'Meiste Wiederholungen' : 'Längste Zeit'}</dt><dd>{fmtNum(pb.bestValue.value)} {unit.short}{pb.bestValue.weightKg ? ` (${fmtNum(pb.bestValue.weightKg)} kg)` : ''}</dd></>}
          </dl>
        ) : (
          <p class="muted small" style={{ margin: 0 }}>Erstes Mal mit dieser Übung – heute legst du deinen Startwert fest.</p>
        )}
      </section>

      {/* 8. Technique, variants and exercise actions */}
      <details class="card details">
        <summary>Technik & Varianten</summary>
        {def ? (
          <div class="stack" style={{ marginTop: 'var(--space-3)' }}>
            <p style={{ margin: 0 }}>{def.cue}</p>
            <dl class="kv kv-text">
              <dt>Leichter</dt><dd>{def.easier}</dd>
              <dt>Schwerer</dt><dd>{def.harder}</dd>
            </dl>
            <p class="muted small" style={{ margin: 0 }}>Bei Schmerzen abbrechen. Die Beschreibung ersetzt keine persönliche Anleitung.</p>
          </div>
        ) : <p class="muted small">Für diese Übung ist keine Anleitung hinterlegt.</p>}
        <label class="goal-line" style={{ marginTop: 'var(--space-3)' }}>
          <span class="muted small">Ausgeführte Variante</span>
          <select class="select" value={ex.variant} onChange={(e) => setWorkoutVariant(ex.id, (e.currentTarget as HTMLSelectElement).value as SessionExercise['variant'])}>
            <option value="standard">Standard</option>
            <option value="easy">Leichter{def?.easier ? ` · ${def.easier}` : ''}</option>
            <option value="hard">Schwerer{def?.harder ? ` · ${def.harder}` : ''}</option>
          </select>
        </label>
      </details>

      <div class="btn-row" style={{ marginTop: 'var(--space-3)' }}>
        <button class="btn btn-secondary btn-sm" disabled={!prev} onClick={() => moveInWorkout(ex.id, -1)} aria-label="Nach oben verschieben"><Icon name="up" size={16} />Früher</button>
        <button class="btn btn-secondary btn-sm" disabled={!next} onClick={() => moveInWorkout(ex.id, 1)} aria-label="Nach unten verschieben"><Icon name="down" size={16} />Später</button>
        <button class="btn btn-secondary btn-sm" onClick={() => setReplacing(true)}><Icon name="swap" size={16} />Ersetzen</button>
        <button class="btn btn-secondary btn-sm" onClick={() => setConfirmRemove(true)}><Icon name="trash" size={16} />Entfernen</button>
      </div>

      {/* 9. Next exercise / back */}
      <nav class="exercise-nav" aria-label="Übungen wechseln">
        <a class="btn btn-secondary" href={href({ name: 'workout' })}>Übersicht</a>
        {next
          ? <a class="btn btn-primary" href={href({ name: 'exercise', id: next.id })}>Nächste: {next.name}<Icon name="chevron" size={18} /></a>
          : <a class="btn btn-primary" href={href({ name: 'workout' })}>Zum Abschluss<Icon name="chevron" size={18} /></a>}
      </nav>

      {replacing && (
        <ExercisePicker title={`${ex.name} ersetzen`} recent={[]} custom={state.data.customExercises} onClose={() => setReplacing(false)}
          onPick={(d) => { replaceInWorkout(ex.id, d); setReplacing(false); }} />
      )}
      {confirmRemove && (
        <Sheet title="Übung entfernen?" onClose={() => setConfirmRemove(false)}>
          <p>{ex.name} und {ex.sets.filter((s) => s.value !== null).length} erfasste Sätze werden aus diesem Training entfernt.</p>
          <div class="stack">
            <button class="btn btn-danger btn-block" onClick={() => { removeFromWorkout(ex.id); navigate({ name: 'workout' }, true); }}>Entfernen</button>
            <button class="btn btn-secondary btn-block" onClick={() => setConfirmRemove(false)}>Behalten</button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
