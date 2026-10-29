import { useState } from 'preact/hooks';
import { breathingFor, EQUIPMENT_LABELS, goalsFor, KIND_LABELS, METRIC_LABELS } from '../../domain/catalog';
import type { Pattern } from '../../data/exercise-content';
import { newId } from '../../domain/ids';
import { REGION_IDS, REGIONS, type MuscleRegion } from '../../domain/muscles';
import type { EquipmentId, ExerciseDef, ExerciseKind, Metric } from '../../domain/types';
import { deleteCustomExercise, saveCustomExercise, useAppState } from '../../state/store';
import { BodyMap } from '../BodyMap';
import { Notice, Sheet } from '../components';
import { Icon } from '../icons';
import { href, navigate } from '../router';

const KIND_METRIC: Record<ExerciseKind, Metric> = { strength: 'reps', hold: 'seconds', mobility: 'reps', cardio: 'minutes' };
const KIND_PATTERN: Record<ExerciseKind, Pattern> = { strength: 'core-stab', hold: 'core-stab', mobility: 'mobility', cardio: 'cardio' };

export function CustomExercise({ id }: { id?: string }) {
  const state = useAppState();
  const existing = id ? state.data.customExercises.find((x) => x.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<ExerciseKind>(existing?.kind ?? 'strength');
  const [metric, setMetric] = useState<Metric>(existing?.metric ?? 'reps');
  const [equipment, setEquipment] = useState<EquipmentId>(existing?.equipment[0] ?? 'body');
  const [primary, setPrimary] = useState<MuscleRegion[]>(existing?.primaryMuscles ?? []);
  const [secondary, setSecondary] = useState<MuscleRegion[]>(existing?.secondaryMuscles ?? []);
  const [cue, setCue] = useState(existing?.cue ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const used = existing ? state.data.sessions.filter((s) => s.exercises.some((x) => x.exerciseId === existing.id)).length : 0;

  if (id && !existing) return <main class="screen"><div class="empty"><h1 class="h3">Übung nicht gefunden</h1></div></main>;

  const toggle = (r: MuscleRegion | null) => {
    if (!r) return;
    // Tap cycles: not selected → main muscle → supporting → not selected.
    if (primary.includes(r)) { setPrimary(primary.filter((x) => x !== r)); setSecondary([...secondary, r]); }
    else if (secondary.includes(r)) setSecondary(secondary.filter((x) => x !== r));
    else setPrimary([...primary, r]);
  };
  const duplicate = !existing && state.data.customExercises.some((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length >= 2 && !duplicate;

  const save = () => {
    if (!valid) return;
    const pattern = existing?.pattern ?? KIND_PATTERN[kind];
    const def: ExerciseDef = {
      id: existing?.id ?? newId('custom'),
      name: name.trim(),
      nameEn: '',
      aliases: [],
      primaryMuscles: primary,
      secondaryMuscles: secondary,
      equipment: [equipment],
      kind,
      metric,
      baseTarget: '',
      cue: cue.trim(),
      easier: '',
      harder: '',
      pattern,
      level: existing?.level ?? 1,
      goals: goalsFor(pattern),
      steps: cue.trim() ? [cue.trim()] : [],
      mistakes: [],
      breathing: breathingFor(kind, pattern),
      media: null,
      source: 'custom',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    void saveCustomExercise(def);
    navigate({ name: 'exerciseInfo', id: def.id }, true);
  };

  return (
    <main class="screen">
      <a class="btn btn-ghost" href={href(existing ? { name: 'exerciseInfo', id: existing.id } : { name: 'library' })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Zurück</a>
      <header class="page-head" style={{ marginTop: 'var(--space-3)' }}>
        <div><p class="eyebrow">Eigene Übung</p><h1 class="title">{existing ? 'Bearbeiten' : 'Neue Übung'}</h1></div>
      </header>
      <form class="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label class="field" style={{ marginTop: 0 }}>
          <span>Name</span>
          <input class="input" required minLength={2} maxLength={60} value={name} placeholder="z. B. Kettlebell Swing" onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
          {duplicate && <span class="hint">Eine eigene Übung mit diesem Namen gibt es schon.</span>}
        </label>
        <fieldset class="field">
          <legend>Art</legend>
          <div class="chips chips-wrap">
            {(Object.keys(KIND_LABELS) as ExerciseKind[]).map((k) => <button type="button" key={k} class="chip-btn" aria-pressed={kind === k} onClick={() => { setKind(k); if (!existing) setMetric(KIND_METRIC[k]); }}>{KIND_LABELS[k]}</button>)}
          </div>
        </fieldset>
        <fieldset class="field">
          <legend>Gemessen in</legend>
          <div class="chips chips-wrap">
            {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => <button type="button" key={m} class="chip-btn" aria-pressed={metric === m} disabled={Boolean(existing && used)} onClick={() => setMetric(m)}>{METRIC_LABELS[m].long}</button>)}
          </div>
          {existing && used > 0 && <span class="muted small">Die Messgröße bleibt fest, weil die Übung schon in {used} {used === 1 ? 'Training' : 'Trainings'} vorkommt.</span>}
        </fieldset>
        <fieldset class="field">
          <legend>Equipment</legend>
          <div class="chips chips-wrap">
            {(Object.keys(EQUIPMENT_LABELS) as EquipmentId[]).map((e) => <button type="button" key={e} class="chip-btn" aria-pressed={equipment === e} onClick={() => setEquipment(e)}>{EQUIPMENT_LABELS[e]}</button>)}
          </div>
        </fieldset>
        <section class="field" aria-labelledby="mus">
          <span id="mus">Muskeln <span class="muted">(antippen: Haupt → unterstützend → aus)</span></span>
          <BodyMap label="Muskeln wählen" primary={primary} secondary={secondary} onSelect={toggle} />
          <div class="chips chips-wrap" aria-label="Gewählte Muskeln">
            {[...primary, ...secondary].length === 0 && <span class="muted small">Noch keine Muskeln gewählt.</span>}
            {primary.map((r) => <button type="button" key={r} class="chip-btn" aria-pressed onClick={() => toggle(r)}>{REGIONS[r].label} · Haupt</button>)}
            {secondary.map((r) => <button type="button" key={r} class="chip-btn" onClick={() => toggle(r)}>{REGIONS[r].label} · unterstützend</button>)}
          </div>
          <select class="select" aria-label="Muskel aus Liste hinzufügen" value="" onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value as MuscleRegion; if (v && !primary.includes(v) && !secondary.includes(v)) setPrimary([...primary, v]); }}>
            <option value="">Muskel aus Liste wählen …</option>
            {REGION_IDS.map((r) => <option key={r} value={r}>{REGIONS[r].label}</option>)}
          </select>
        </section>
        <label class="field">
          <span>Ausführung <span class="muted">(optional)</span></span>
          <textarea class="textarea" rows={3} maxLength={500} value={cue} onInput={(e) => setCue((e.currentTarget as HTMLTextAreaElement).value)} placeholder="Worauf achtest du bei der Ausführung?" />
        </label>
        <button type="submit" class="btn btn-primary btn-block btn-lg" disabled={!valid}><Icon name="check" size={18} />Speichern</button>
        {existing && <button type="button" class="btn btn-ghost" onClick={() => setConfirmDelete(true)}>Übung löschen</button>}
      </form>
      {confirmDelete && existing && (
        <Sheet title="Übung löschen?" onClose={() => setConfirmDelete(false)}>
          {used > 0 && <Notice tone="info"><p>Sie kommt in {used} {used === 1 ? 'Training' : 'Trainings'} vor. Diese bleiben unverändert im Verlauf.</p></Notice>}
          <p>„{existing.name}“ wird aus der Bibliothek entfernt.</p>
          <div class="stack">
            <button class="btn btn-danger btn-block" onClick={() => { void deleteCustomExercise(existing.id); navigate({ name: 'library' }, true); }}>Löschen</button>
            <button class="btn btn-secondary btn-block" onClick={() => setConfirmDelete(false)}>Behalten</button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
