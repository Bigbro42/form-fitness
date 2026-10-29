import { useMemo, useState } from 'preact/hooks';
import { EQUIPMENT_LABELS, KIND_LABELS, LEVEL_LABELS, LIBRARY_EXERCISES, MUSCLE_LABELS, muscleText } from '../../domain/catalog';
import { GOALS, orderGoals } from '../../domain/goals';
import { activeFilterCount, EMPTY_FILTER, filterLibrary, type LibraryFilter } from '../../domain/library';
import { REGIONS } from '../../domain/muscles';
import type { EquipmentId, ExerciseDef, ExerciseKind, GoalId, MuscleGroup } from '../../domain/types';
import { useAppState } from '../../state/store';
import { BodyMap } from '../BodyMap';
import { Sheet } from '../components';
import { Icon } from '../icons';
import { href } from '../router';

const BASE = import.meta.env.BASE_URL;

/** Remembered while the app is open, so going back from an exercise keeps the search. */
let remembered: LibraryFilter = EMPTY_FILTER;
let rememberedMap = true;

/** Opens the library pre-filtered to a muscle (e.g. from the progress body map). */
export function presetLibraryRegion(region: LibraryFilter['region']) {
  remembered = { ...EMPTY_FILTER, region };
  rememberedMap = true;
}

function Thumb({ x }: { x: ExerciseDef }) {
  if (x.media) return <img class="thumb" src={BASE + x.media.frames[0]} alt="" loading="lazy" decoding="async" />;
  return <span class="thumb thumb-none" aria-hidden="true"><Icon name="dumbbell" size={20} /></span>;
}

function ChipGroup<T extends string | number>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T | null; onChange: (v: T | null) => void }) {
  return (
    <fieldset class="field" style={{ marginTop: 'var(--space-3)' }}>
      <legend>{label}</legend>
      <div class="chips chips-wrap">
        {options.map(([v, l]) => <button key={String(v)} type="button" class="chip-btn" aria-pressed={value === v} onClick={() => onChange(value === v ? null : v)}>{l}</button>)}
      </div>
    </fieldset>
  );
}

export function Library() {
  const state = useAppState();
  const [f, setF] = useState<LibraryFilter>(remembered);
  const [showMap, setShowMap] = useState(rememberedMap);
  const [filters, setFilters] = useState(false);
  const update = (patch: Partial<LibraryFilter>) => setF((cur) => (remembered = { ...cur, ...patch }));
  const all = useMemo(() => [...state.data.customExercises, ...LIBRARY_EXERCISES], [state.data.customExercises]);
  const list = filterLibrary(all, f);
  const extra = activeFilterCount({ ...f, group: null, region: null });
  const { primaryGoal, secondaryGoals } = state.data.settings;
  const { mine, others } = orderGoals(primaryGoal, secondaryGoals);
  const goalOptions: [GoalId, string][] = [...mine, ...others].map((g) => [g, GOALS[g].short]);

  return (
    <main class="screen">
      <header class="page-head">
        <div>
          <p class="eyebrow">Bibliothek</p>
          <h1 class="title">Übungen</h1>
        </div>
        <a class="icon-btn" href={href({ name: 'customExercise' })} aria-label="Eigene Übung anlegen"><Icon name="plus" size={22} /></a>
      </header>

      <label class="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Name, Muskel oder Gerät" value={f.query} onInput={(e) => update({ query: (e.currentTarget as HTMLInputElement).value })} aria-label="Übungen durchsuchen" />
      </label>

      <div class="chips" role="group" aria-label="Muskelgruppe">
        <button class="chip-btn" aria-pressed={showMap} onClick={() => { rememberedMap = !showMap; setShowMap(!showMap); }}>
          <Icon name="body" size={14} /> Körperkarte
        </button>
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((g) => (
          <button key={g} class="chip-btn" aria-pressed={f.group === g} onClick={() => update({ group: f.group === g ? null : g, region: null })}>{MUSCLE_LABELS[g]}</button>
        ))}
      </div>

      {showMap && (
        <section class="card map-card" aria-label="Körperkarte">
          <p class="muted small" style={{ margin: '0 0 var(--space-2)' }}>Tippe auf einen Muskel, um passende Übungen zu sehen.</p>
          <BodyMap label="Muskel auswählen" selected={f.region} onSelect={(r) => update({ region: r, group: null })} />
        </section>
      )}

      <div class="results-head">
        <p class="muted small" aria-live="polite" style={{ margin: 0 }}>
          {list.length} {list.length === 1 ? 'Übung' : 'Übungen'}
          {f.region && <> für <b>{REGIONS[f.region].label}</b></>}
        </p>
        <div class="btn-row">
          {(f.region || activeFilterCount(f) > 0 || f.query) && <button class="btn btn-ghost btn-sm" onClick={() => update({ ...EMPTY_FILTER })}>Zurücksetzen</button>}
          <button class="btn btn-secondary btn-sm" onClick={() => setFilters(true)}>Filter{extra ? ` (${extra})` : ''}</button>
        </div>
      </div>

      {list.length ? (
        <div class="list">
          {list.map((x) => (
            <a key={x.id} class="row lib-row" href={href({ name: 'exerciseInfo', id: x.id })}>
              <Thumb x={x} />
              <div class="row-main">
                <b>{x.name}</b>
                <small>{muscleText(x) || 'Keine Muskelangabe'}</small>
                <small>{x.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')} · {KIND_LABELS[x.kind]}{x.source === 'custom' ? ' · Eigene' : ''}</small>
              </div>
              <Icon name="chevron" size={18} class="chevron" />
            </a>
          ))}
        </div>
      ) : (
        <div class="empty">
          <h2 class="h3">Nichts gefunden</h2>
          <p class="muted small">Versuche einen anderen Begriff, entferne Filter – oder lege eine eigene Übung an.</p>
          <a class="btn btn-secondary btn-sm" href={href({ name: 'customExercise' })} style={{ marginTop: 'var(--space-3)' }}>Eigene Übung anlegen</a>
        </div>
      )}

      {filters && (
        <Sheet title="Filter" onClose={() => setFilters(false)}>
          <ChipGroup label="Equipment" options={(Object.keys(EQUIPMENT_LABELS) as EquipmentId[]).map((e) => [e, EQUIPMENT_LABELS[e]])} value={f.equipment} onChange={(v) => update({ equipment: v })} />
          <ChipGroup label="Ziel" options={goalOptions} value={f.goal} onChange={(v) => update({ goal: v })} />
          <ChipGroup label="Trainingsart" options={(Object.keys(KIND_LABELS) as ExerciseKind[]).map((k) => [k, KIND_LABELS[k]])} value={f.kind} onChange={(v) => update({ kind: v })} />
          <ChipGroup label="Schwierigkeit" options={([1, 2, 3] as const).map((l) => [l, LEVEL_LABELS[l]])} value={f.level} onChange={(v) => update({ level: v })} />
          <button class="btn btn-primary btn-block" style={{ marginTop: 'var(--space-4)' }} onClick={() => setFilters(false)}>{list.length} Übungen anzeigen</button>
        </Sheet>
      )}
    </main>
  );
}
