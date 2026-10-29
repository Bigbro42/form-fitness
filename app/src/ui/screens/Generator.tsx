import { useMemo, useState } from 'preact/hooks';
import { EQUIPMENT_LABELS, LEVEL_LABELS, LIBRARY_EXERCISES, METRIC_LABELS } from '../../domain/catalog';
import { today } from '../../domain/dates';
import { exerciseCount, FOCUS_LABELS, FOCUS_SHORT, generate, recentlyTrained, rerollOne, type Focus, type GeneratedItem, type GeneratorSetup } from '../../domain/generator';
import { GOALS } from '../../domain/goals';
import { range, recommend } from '../../domain/recommendations';
import { createSession, newExercise } from '../../domain/session';
import type { EquipmentId, GoalId } from '../../domain/types';
import { activeSession, saveSession, saveSettings, useAppState } from '../../state/store';
import { useLookup } from '../../state/workout';
import { Notice } from '../components';
import { Icon } from '../icons';
import { href, navigate } from '../router';
import { ExercisePicker } from '../workout-parts';
import { GoalSelect } from './Workout';

/** Kept while the app is open, so leaving and coming back keeps the suggestion. */
let memory: { setup: GeneratorSetup | null; items: GeneratedItem[] } = { setup: null, items: [] };

export function Generator() {
  const state = useAppState();
  const lookup = useLookup();
  const settings = state.data.settings;
  const [setup, setSetup] = useState<GeneratorSetup>(memory.setup ?? {
    focus: 'full', goal: settings.primaryGoal ?? 'health', durationMin: settings.sessionMinutes ?? 30, equipment: settings.equipment.length ? settings.equipment : ['body'],
    maxLevel: settings.level ?? 2, count: null, respectRecovery: true,
  });
  const [items, setItems] = useState<GeneratedItem[]>(memory.items);
  const [shortBy, setShortBy] = useState(0);
  const [adding, setAdding] = useState(false);
  const library = useMemo(() => [...state.data.customExercises, ...LIBRARY_EXERCISES], [state.data.customExercises]);
  const recent = useMemo(() => recentlyTrained(state.data.sessions, lookup, today()), [state.data.sessions]);
  const running = activeSession(state);

  const update = (patch: Partial<GeneratorSetup>) => {
    const next = { ...setup, ...patch };
    setSetup(next);
    memory = { ...memory, setup: next };
    if (patch.equipment) void saveSettings({ equipment: patch.equipment });
  };
  const keep = (next: GeneratedItem[]) => { setItems(next); memory = { setup, items: next }; };
  const build = () => {
    const r = generate(library, setup, { recent });
    setShortBy(r.shortBy);
    keep(r.items);
  };
  const toggleEquipment = (e: EquipmentId) => {
    const has = setup.equipment.includes(e);
    const next = has ? setup.equipment.filter((x) => x !== e) : [...setup.equipment, e];
    update({ equipment: next.length ? next : ['body'] });
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    keep(next);
  };
  const start = () => {
    if (running || !items.length) return;
    let s = createSession({ date: today(), goal: setup.goal, title: `Zufallstraining · ${FOCUS_SHORT[setup.focus]}`, source: 'randomizer' });
    s = { ...s, generator: { focus: setup.focus, durationMin: setup.durationMin }, exercises: items.map((x) => newExercise(x.def, setup.goal, x.sets)) };
    void saveSession(s);
    memory = { setup, items: [] };
    navigate({ name: 'workout' });
  };

  return (
    <main class="screen">
      <a class="btn btn-ghost" href={href({ name: 'workout' })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Training</a>
      <header class="page-head" style={{ marginTop: 'var(--space-3)' }}>
        <div><p class="eyebrow">Zufallstraining</p><h1 class="title">Workout-Generator</h1></div>
      </header>

      <div class="stack">
        <fieldset class="field" style={{ marginTop: 0 }}>
          <legend>Fokus</legend>
          <div class="chips chips-wrap">
            {(Object.keys(FOCUS_LABELS) as Focus[]).map((f) => (
              <button key={f} type="button" class="chip-btn" aria-pressed={setup.focus === f} onClick={() => update({ focus: f, ...(f === 'mobility' ? { goal: 'mobility' } : {}) })}>{FOCUS_SHORT[f]}</button>
            ))}
          </div>
        </fieldset>

        <label class="field" for="gen-goal">
          <span>Ziel</span>
          <GoalSelect id="gen-goal" allowNone={false} value={setup.goal} onChange={(g) => g && update({ goal: g })} />
        </label>

        <label class="field">
          <span>Dauer: <b class="tabular">{setup.durationMin} Minuten</b></span>
          <input type="range" class="range" min={10} max={60} step={5} value={setup.durationMin} onInput={(e) => update({ durationMin: Number((e.currentTarget as HTMLInputElement).value) })} aria-valuetext={`${setup.durationMin} Minuten`} />
        </label>

        <fieldset class="field">
          <legend>Verfügbares Equipment</legend>
          <div class="chips chips-wrap">
            {(Object.keys(EQUIPMENT_LABELS) as EquipmentId[]).map((e) => (
              <button key={e} type="button" class="chip-btn" aria-pressed={setup.equipment.includes(e)} onClick={() => toggleEquipment(e)}>{EQUIPMENT_LABELS[e]}</button>
            ))}
          </div>
        </fieldset>

        <fieldset class="field">
          <legend>Schwierigkeit bis</legend>
          <div class="chips chips-wrap">
            {([1, 2, 3] as const).map((l) => <button key={l} type="button" class="chip-btn" aria-pressed={setup.maxLevel === l} onClick={() => update({ maxLevel: l })}>{LEVEL_LABELS[l]}</button>)}
          </div>
        </fieldset>

        <fieldset class="field">
          <legend>Anzahl Übungen</legend>
          <div class="count-row">
            <button type="button" class="chip-btn" aria-pressed={setup.count === null} onClick={() => update({ count: null })}>Automatisch ({exerciseCount({ ...setup, count: null })})</button>
            <div class="stepper">
              <button type="button" class="icon-btn icon-btn-sm" aria-label="Eine Übung weniger" onClick={() => update({ count: Math.max(2, (setup.count ?? exerciseCount(setup)) - 1) })}><Icon name="minus" size={16} /></button>
              <span class="tabular count-value" aria-live="polite">{setup.count ?? exerciseCount(setup)}</span>
              <button type="button" class="icon-btn icon-btn-sm" aria-label="Eine Übung mehr" onClick={() => update({ count: Math.min(10, (setup.count ?? exerciseCount(setup)) + 1) })}><Icon name="plus" size={16} /></button>
            </div>
          </div>
        </fieldset>

        <label class="toggle">
          <input type="checkbox" checked={setup.respectRecovery} onChange={(e) => update({ respectRecovery: (e.currentTarget as HTMLInputElement).checked })} />
          <span><b>Zuletzt trainierte Muskeln schonen</b><small>Übungen für Muskeln, die du in den letzten 48 Stunden als Hauptmuskel trainiert hast, kommen seltener vor.</small></span>
        </label>

        <button class="btn btn-primary btn-block btn-lg" onClick={build}><Icon name="repeat" size={18} />{items.length ? 'Neu mischen' : 'Workout erstellen'}</button>
      </div>

      {items.length > 0 && (
        <section class="section" aria-labelledby="sugg">
          <div class="section-head">
            <h2 class="h2" id="sugg">Dein Vorschlag</h2>
            <span class="muted small">{GOALS[setup.goal].short} · ca. {setup.durationMin} Min.</span>
          </div>
          {shortBy > 0 && <Notice tone="warn"><p>Mit dem gewählten Equipment gibt es nur {items.length} passende Übungen. Wähle mehr Equipment oder einen anderen Fokus.</p></Notice>}
          <ol class="list gen-list">
            {items.map((x, i) => {
              const rec = recommend(x.def, setup.goal);
              return (
                <li class="card gen-item" key={x.def.id}>
                  <div class="gen-main">
                    <a href={href({ name: 'exerciseInfo', id: x.def.id })}><b>{x.def.name}</b></a>
                    <small>{x.sets} × {range(rec.target)} {METRIC_LABELS[x.def.metric].short} · {x.why}</small>
                  </div>
                  <div class="stepper">
                    <button class="icon-btn icon-btn-sm" onClick={() => keep(rerollOne(library, setup, items, i))} aria-label={`${x.def.name} ersetzen`}><Icon name="swap" size={16} /></button>
                    <button class="icon-btn icon-btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${x.def.name} nach oben`}><Icon name="up" size={16} /></button>
                    <button class="icon-btn icon-btn-sm" onClick={() => keep(items.filter((_, j) => j !== i))} aria-label={`${x.def.name} entfernen`}><Icon name="trash" size={16} /></button>
                  </div>
                </li>
              );
            })}
          </ol>
          <button class="btn btn-secondary btn-block" style={{ marginTop: 'var(--space-3)' }} onClick={() => setAdding(true)}><Icon name="plus" size={18} />Übung hinzufügen</button>
          {running && <Notice tone="info"><p>Es läuft bereits ein Training („{running.title}“). Beende es zuerst, um dieses zu starten.</p></Notice>}
          <button class="btn btn-primary btn-block btn-lg" style={{ marginTop: 'var(--space-4)' }} disabled={Boolean(running)} onClick={start}><Icon name="play" size={18} />Training starten</button>
          <p class="muted small" style={{ marginTop: 'var(--space-3)' }}>Sätze und Wiederholungen sind Richtwerte für dein Ziel. Im Training erfasst du wie gewohnt; alles landet im selben Verlauf.</p>
        </section>
      )}

      {adding && (
        <ExercisePicker title="Übung hinzufügen" recent={[]} custom={state.data.customExercises} onClose={() => setAdding(false)}
          onPick={(def) => { keep([...items, { def, sets: recommend(def, setup.goal).sets[0], why: 'Von dir hinzugefügt' }]); setAdding(false); }} />
      )}
    </main>
  );
}
