import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BUILTIN_EXERCISES, EQUIPMENT_LABELS, MUSCLE_LABELS } from '../domain/catalog';
import type { EquipmentId, ExerciseDef, MuscleGroup } from '../domain/types';
import { adjustRest, stopRest, useAppState } from '../state/store';
import { Sheet } from './components';
import { Icon } from './icons';

/** Parses "12", "12,5" and "12.5"; empty means "no value". Negative or junk is rejected. */
export function parseNumber(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
}

function formatNumber(n: number | null): string {
  return n === null ? '' : n.toLocaleString('de-AT', { maximumFractionDigits: 2, useGrouping: false });
}

/**
 * Numeric input that keeps what the person types ("12," while typing 12,5) and commits valid
 * numbers immediately, so every keystroke is autosaved.
 */
export function NumberField({ value, onCommit, label, placeholder, decimal, id }: {
  value: number | null;
  onCommit: (v: number | null) => void;
  label: string;
  placeholder?: string;
  decimal?: boolean;
  id?: string;
}) {
  const [text, setText] = useState(formatNumber(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(formatNumber(value));
  }, [value]);
  const invalid = parseNumber(text) === undefined;
  return (
    <input
      id={id}
      class={`num-input${invalid ? ' invalid' : ''}`}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      aria-invalid={invalid}
      placeholder={placeholder ?? '–'}
      value={text}
      onFocus={(e) => { focused.current = true; (e.currentTarget as HTMLInputElement).select(); }}
      onBlur={() => { focused.current = false; setText(formatNumber(value)); }}
      onInput={(e) => {
        const t = (e.currentTarget as HTMLInputElement).value;
        setText(t);
        const n = parseNumber(t);
        if (n !== undefined && n !== value) onCommit(n);
      }}
    />
  );
}

function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Floating rest timer. Stays visible across workout screens while running. */
export function RestBar() {
  const { rest } = useAppState();
  const now = useNow(rest !== null);
  const left = rest ? (rest.endsAt - now) / 1000 : 0;
  const over = rest !== null && left <= 0;
  useEffect(() => {
    if (over) navigator.vibrate?.(200);
  }, [over]);
  if (!rest) return null;
  return (
    <div class={`rest-bar${over ? ' rest-over' : ''}`} role="timer" aria-live="off" aria-label="Pausentimer">
      <div class="rest-progress" style={{ transform: `scaleX(${over ? 1 : 1 - left / rest.total})` }} />
      <div class="rest-inner">
        <div>
          <small>{over ? 'Pause vorbei' : 'Pause'}</small>
          <b class="tabular">{over ? 'Weiter geht’s' : clock(left)}</b>
        </div>
        <div class="btn-row">
          {!over && <button class="btn btn-secondary btn-sm" onClick={() => adjustRest(-15)} aria-label="15 Sekunden weniger">−15</button>}
          {!over && <button class="btn btn-secondary btn-sm" onClick={() => adjustRest(15)} aria-label="15 Sekunden mehr">+15</button>}
          <button class="btn btn-secondary btn-sm" onClick={stopRest}>{over ? 'OK' : 'Stopp'}</button>
        </div>
      </div>
    </div>
  );
}

export function ElapsedTime({ since }: { since: string | null }) {
  const now = useNow(since !== null, 1000);
  if (!since) return null;
  return <span class="tabular">{clock((now - Date.parse(since)) / 1000)}</span>;
}

const norm = (s: string) => s.toLocaleLowerCase('de-AT').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

/** Lower is better: exact name, name starts with the query, a name word starts with it, anything else. */
function rank(x: ExerciseDef, query: string, words: string[]): number {
  const name = norm(x.name);
  if (!words.length) return 0;
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  const nameWords = name.split(/[\s-]+/);
  if (words.every((w) => nameWords.some((n) => n.startsWith(w)))) return 2;
  if (words.every((w) => name.includes(w))) return 3;
  return 4; // matched via muscle, equipment or id only
}

function matches(x: ExerciseDef, words: string[]): boolean {
  if (!words.length) return true;
  const hay = norm([x.name, x.id, ...x.aliases, ...[...x.primaryMuscles, ...x.secondaryMuscles].map((m) => MUSCLE_LABELS[m]), ...x.equipment.map((e) => EQUIPMENT_LABELS[e])].join(' '));
  return words.every((w) => hay.includes(w));
}

/** Search + filters over the library. Recently used exercises first when not searching. */
export function ExercisePicker({ title, onPick, onClose, recent, custom }: {
  title: string;
  onPick: (def: ExerciseDef) => void;
  onClose: () => void;
  recent: string[];
  custom: readonly ExerciseDef[];
}) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<EquipmentId | null>(null);
  const all = useMemo(() => [...custom, ...BUILTIN_EXERCISES], [custom]);
  const words = norm(query).split(/\s+/).filter(Boolean);
  const filtered = all.filter((x) => matches(x, words)
    && (!muscle || x.primaryMuscles.includes(muscle) || x.secondaryMuscles.includes(muscle))
    && (!equipment || x.equipment.includes(equipment)));
  const showRecent = !words.length && !muscle && !equipment && recent.length > 0;
  const recentDefs = showRecent ? recent.map((id) => all.find((x) => x.id === id)).filter((x): x is ExerciseDef => Boolean(x)) : [];
  const list = showRecent ? filtered.filter((x) => !recent.includes(x.id)) : filtered;
  const q = words.join(' ');
  const sortedList = [...list].sort((a, b) => rank(a, q, words) - rank(b, q, words) || a.name.localeCompare(b.name, 'de'));

  const row = (x: ExerciseDef) => (
    <button key={x.id} class="row pick-row" onClick={() => onPick(x)}>
      <div class="row-main">
        <b>{x.name}</b>
        <small>{[...x.primaryMuscles, ...x.secondaryMuscles].map((m) => MUSCLE_LABELS[m]).join(' · ')} · {x.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')}</small>
      </div>
      <Icon name="plus" size={20} class="chevron" />
    </button>
  );

  return (
    <Sheet title={title} onClose={onClose} tall>
      <label class="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Übung suchen, z. B. Kniebeuge" value={query} onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)} aria-label="Übung suchen" autoFocus={false} />
      </label>
      <div class="chips" role="group" aria-label="Muskelgruppe">
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
          <button key={m} class="chip-btn" aria-pressed={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>{MUSCLE_LABELS[m]}</button>
        ))}
      </div>
      <div class="chips" role="group" aria-label="Equipment">
        {(Object.keys(EQUIPMENT_LABELS) as EquipmentId[]).map((e) => (
          <button key={e} class="chip-btn" aria-pressed={equipment === e} onClick={() => setEquipment(equipment === e ? null : e)}>{EQUIPMENT_LABELS[e]}</button>
        ))}
      </div>
      {recentDefs.length > 0 && (
        <>
          <h3 class="eyebrow" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>Zuletzt verwendet</h3>
          <div class="list">{recentDefs.map(row)}</div>
          <h3 class="eyebrow" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>Alle Übungen</h3>
        </>
      )}
      <p class="muted small" aria-live="polite" style={{ margin: 'var(--space-3) 0 var(--space-2)' }}>{filtered.length} Übungen</p>
      {sortedList.length ? <div class="list">{sortedList.map(row)}</div> : (
        <div class="empty"><p class="muted small">Keine passende Übung. Versuche einen anderen Begriff oder entferne Filter.</p></div>
      )}
    </Sheet>
  );
}
