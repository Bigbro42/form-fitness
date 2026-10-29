import { useState } from 'preact/hooks';
import {
  agenda, describeRecurrence, endSeriesBefore, monthGrid, moveOccurrence, restoreOccurrence, shiftMonth, skipOccurrence,
  type AgendaEntry, type DayEntry,
} from '../../domain/calendar';
import { formatDate, isIsoDate, parseDate, today } from '../../domain/dates';
import { activeSession, deletePlan, getState, savePlans, useAppState } from '../../state/store';
import { startFromOccurrence, startWorkout } from '../../state/workout';
import { Notice, SessionRow, Sheet } from '../components';
import { Icon } from '../icons';
import { href, navigate } from '../router';

const STATUS: Record<AgendaEntry['status'], { label: string; cls: string }> = {
  planned: { label: 'Geplant', cls: 'chip-neutral' },
  done: { label: 'Absolviert', cls: 'chip-done' },
  started: { label: 'Begonnen', cls: 'chip-draft' },
  missed: { label: 'Nicht erledigt', cls: 'chip-neutral' },
  skipped: { label: 'Ausgelassen', cls: 'chip-neutral' },
};

type Marker = 'done' | 'planned' | 'draft' | 'missed';

function markersOf(entries: DayEntry[] | undefined): Marker[] {
  const set = new Set<Marker>();
  for (const e of entries ?? []) {
    if (e.kind === 'session') set.add(e.session.status === 'completed' ? 'done' : 'draft');
    else if (e.status === 'done') set.add('done');
    else if (e.status === 'started') set.add('draft');
    else if (e.status === 'planned') set.add('planned');
    else if (e.status === 'missed') set.add('missed');
  }
  return (['done', 'draft', 'planned', 'missed'] as Marker[]).filter((m) => set.has(m));
}

function dayLabel(date: string, entries: DayEntry[] | undefined): string {
  const done = (entries ?? []).filter((e) => (e.kind === 'session' ? e.session.status === 'completed' : e.status === 'done')).length;
  const planned = (entries ?? []).filter((e) => e.kind === 'occurrence' && (e.status === 'planned' || e.status === 'missed')).length;
  const parts = [formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })];
  if (done) parts.push(`${done} absolviert`);
  if (planned) parts.push(`${planned} geplant`);
  return parts.join(', ');
}

function OccurrenceRow({ e, onOpen }: { e: AgendaEntry; onOpen: () => void }) {
  const st = STATUS[e.status];
  return (
    <button class={`row occ-row occ-${e.status}`} onClick={onOpen}>
      <span class="occ-time tabular" aria-hidden="true">{e.plan.time ?? '–'}</span>
      <div class="row-main">
        <b>{e.plan.title}</b>
        <small>{e.plan.detachedFrom ? 'Einzeln geändert' : describeRecurrence(e.plan)}{e.date !== e.original ? ` · verschoben vom ${formatDate(e.original, { day: 'numeric', month: 'short' })}` : ''}</small>
      </div>
      <span class={`chip ${st.cls}`}>{st.label}</span>
    </button>
  );
}

function OccurrenceSheet({ entry, onClose }: { entry: AgendaEntry; onClose: () => void }) {
  const state = useAppState();
  const [mode, setMode] = useState<'main' | 'move' | 'end' | 'delete'>('main');
  const [moveTo, setMoveTo] = useState(entry.date);
  const plan = state.data.plans.find((p) => p.id === entry.plan.id) ?? entry.plan;
  const series = plan.recurrence.freq !== 'once';
  const parent = plan.detachedFrom ? state.data.plans.find((p) => p.id === plan.detachedFrom!.planId) : undefined;
  const running = activeSession(state);
  const done = (fn: () => void) => () => { fn(); onClose(); };

  const undoDetach = () => {
    if (parent && plan.detachedFrom) void savePlans(restoreOccurrence(parent, plan.detachedFrom.original));
    void deletePlan(plan.id);
  };

  return (
    <Sheet title={plan.title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>
        {formatDate(entry.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{plan.time ? ` · ${plan.time} Uhr` : ''}<br />
        <span class="small">{plan.detachedFrom ? 'Einzeln geänderter Termin einer Serie' : describeRecurrence(plan)} · {plan.activity === 'sport' ? 'Sport / Kurs' : `${plan.exercises.length} ${plan.exercises.length === 1 ? 'Übung' : 'Übungen'}`}</span>
      </p>
      <span class={`chip ${STATUS[entry.status].cls}`}>{STATUS[entry.status].label}</span>

      {mode === 'main' && (
        <div class="stack" style={{ marginTop: 'var(--space-4)' }}>
          {entry.status === 'done' && entry.session && <a class="btn btn-primary btn-block" href={href({ name: 'session', id: entry.session.id })}>Training ansehen</a>}
          {entry.status === 'skipped' && <button class="btn btn-primary btn-block" onClick={done(() => savePlans(restoreOccurrence(plan, entry.original)))}>Termin wiederherstellen</button>}
          {(entry.status === 'planned' || entry.status === 'missed' || entry.status === 'started') && (
            <>
              {running && entry.session?.id !== running.id && <Notice tone="info"><p>Es läuft bereits ein Training. Beende es zuerst.</p></Notice>}
              <button class="btn btn-primary btn-block" disabled={Boolean(running)} onClick={done(() => startFromOccurrence(entry))}>
                <Icon name="play" size={18} />{entry.status === 'started' ? 'Fortsetzen' : 'Training starten'}
              </button>
            </>
          )}
          {entry.status !== 'done' && entry.status !== 'skipped' && (
            <div class="btn-row">
              <button class="btn btn-secondary btn-sm" onClick={() => setMode('move')}>Verschieben</button>
              <a class="btn btn-secondary btn-sm" href={href({ name: 'plan', planId: plan.id, ...(series ? { original: entry.original } : {}) })}>{series ? 'Nur diesen ändern' : 'Bearbeiten'}</a>
              {series && <button class="btn btn-secondary btn-sm" onClick={done(() => savePlans(skipOccurrence(plan, entry.original)))}>Auslassen</button>}
              {plan.detachedFrom && <button class="btn btn-secondary btn-sm" onClick={done(undoDetach)}>Änderung zurücknehmen</button>}
            </div>
          )}
          {series && (
            <div class="sheet-group">
              <p class="eyebrow">Ganze Serie</p>
              <div class="btn-row">
                <a class="btn btn-secondary btn-sm" href={href({ name: 'plan', planId: plan.id })}>Serie bearbeiten</a>
                {entry.original > plan.startsOn && <button class="btn btn-secondary btn-sm" onClick={() => setMode('end')}>Ab hier beenden</button>}
                <button class="btn btn-danger btn-sm" onClick={() => setMode('delete')}>Serie löschen</button>
              </div>
            </div>
          )}
          {!series && !plan.detachedFrom && entry.status !== 'done' && <button class="btn btn-ghost" onClick={() => setMode('delete')}>Termin löschen</button>}
          {entry.status === 'done' && !series && <p class="muted small">Dieser Termin wurde absolviert. Das Training findest du im Verlauf.</p>}
        </div>
      )}

      {mode === 'move' && (
        <div class="stack" style={{ marginTop: 'var(--space-4)' }}>
          <label class="field" style={{ marginTop: 0 }}>
            <span>Neues Datum{series ? ' (nur dieser Termin)' : ''}</span>
            <input class="input" type="date" value={moveTo} onInput={(e) => setMoveTo((e.currentTarget as HTMLInputElement).value)} />
          </label>
          <button class="btn btn-primary btn-block" disabled={!isIsoDate(moveTo)} onClick={done(() => savePlans(moveOccurrence(plan, entry.original, moveTo)))}>Verschieben</button>
          <button class="btn btn-secondary btn-block" onClick={() => setMode('main')}>Zurück</button>
        </div>
      )}

      {mode === 'end' && (
        <div class="stack" style={{ marginTop: 'var(--space-4)' }}>
          <p>Die Serie endet vor dem {formatDate(entry.original, { day: 'numeric', month: 'long' })}. Frühere Termine und alle absolvierten Trainings bleiben erhalten.</p>
          <button class="btn btn-danger btn-block" onClick={done(() => { const p = endSeriesBefore(plan, entry.original); if (p) void savePlans(p); })}>Ab hier beenden</button>
          <button class="btn btn-secondary btn-block" onClick={() => setMode('main')}>Zurück</button>
        </div>
      )}

      {mode === 'delete' && (
        <div class="stack" style={{ marginTop: 'var(--space-4)' }}>
          <p>{series ? 'Alle Termine dieser Serie werden aus dem Kalender entfernt.' : 'Der Termin wird aus dem Kalender entfernt.'} Bereits absolvierte Trainings bleiben im Verlauf.</p>
          <button class="btn btn-danger btn-block" onClick={done(() => deletePlan(plan.id))}>{series ? 'Serie löschen' : 'Termin löschen'}</button>
          <button class="btn btn-secondary btn-block" onClick={() => setMode('main')}>Zurück</button>
        </div>
      )}
    </Sheet>
  );
}

export function Calendar({ month: monthParam }: { month?: string }) {
  const state = useAppState();
  const now = today();
  const month = monthParam ?? now.slice(0, 7);
  const [selected, setSelected] = useState(monthParam && !now.startsWith(monthParam) ? `${monthParam}-01` : now);
  const [open, setOpen] = useState<AgendaEntry | null>(null);
  const grid = monthGrid(month);
  const days = agenda(state.data.plans, state.data.sessions, grid[0]!, grid.at(-1)!, now, true);
  const entries = days.get(selected) ?? [];
  const monthTitle = parseDate(`${month}-01`).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
  const goMonth = (delta: number) => {
    const m = shiftMonth(month, delta);
    setSelected(now.startsWith(m) ? now : `${m}-01`);
    navigate({ name: 'calendar', month: m }, true);
  };
  const hasAny = state.data.plans.length > 0;

  return (
    <main class="screen">
      <header class="page-head">
        <div>
          <p class="eyebrow">Kalender</p>
          <h1 class="title">{monthTitle}</h1>
        </div>
        <a class="icon-btn icon-btn-accent" href={href({ name: 'plan', date: selected })} aria-label="Training planen"><Icon name="plus" size={22} /></a>
      </header>

      <div class="month-nav">
        <button class="icon-btn" onClick={() => goMonth(-1)} aria-label="Vorheriger Monat"><Icon name="back" size={20} /></button>
        <button class="btn btn-secondary btn-sm" onClick={() => { setSelected(now); navigate({ name: 'calendar' }, true); }} disabled={selected === now && month === now.slice(0, 7)}>Heute</button>
        <button class="icon-btn" onClick={() => goMonth(1)} aria-label="Nächster Monat"><Icon name="chevron" size={20} /></button>
      </div>

      <div class="month" role="grid" aria-label={monthTitle}>
        <div class="month-row month-dow" role="row">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => <span key={d} role="columnheader">{d}</span>)}
        </div>
        {Array.from({ length: 6 }, (_, w) => (
          <div class="month-row" role="row" key={w}>
            {grid.slice(w * 7, w * 7 + 7).map((d) => {
              const marks = markersOf(days.get(d));
              return (
                <button key={d} role="gridcell" aria-selected={d === selected} aria-label={dayLabel(d, days.get(d))}
                  class={`day${d.startsWith(month) ? '' : ' day-out'}${d === now ? ' day-today' : ''}${d === selected ? ' day-selected' : ''}`}
                  onClick={() => setSelected(d)}>
                  <span class="tabular">{parseDate(d).getDate()}</span>
                  <span class="marks" aria-hidden="true">{marks.map((m) => <i key={m} class={`mark mark-${m}`} />)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div class="legend" aria-hidden="true">
        <span><i class="mark mark-done" />Absolviert</span>
        <span><i class="mark mark-planned" />Geplant</span>
        <span><i class="mark mark-draft" />Begonnen</span>
      </div>

      <section class="section" aria-labelledby="day-title" style={{ marginTop: 'var(--space-5)' }}>
        <div class="section-head">
          <h2 class="h3" id="day-title">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {entries.length > 0 && <a class="btn btn-ghost" href={href({ name: 'plan', date: selected })}><Icon name="plus" size={16} />Planen</a>}
        </div>
        {entries.length ? (
          <div class="list">
            {entries.map((e) => (e.kind === 'occurrence'
              ? <OccurrenceRow key={`${e.plan.id}|${e.original}`} e={e} onOpen={() => setOpen(e)} />
              : <SessionRow key={e.session.id} session={e.session} />))}
          </div>
        ) : (
          <div class="empty">
            <p class="muted small" style={{ marginTop: 0 }}>{hasAny || state.data.sessions.length ? 'An diesem Tag ist nichts eingetragen.' : 'Dein Kalender ist leer. Plane nur, was du wirklich machen möchtest – einmalig oder als Wiederholung.'}</p>
            <div class="btn-row" style={{ justifyContent: 'center', marginTop: 'var(--space-3)' }}>
              <a class="btn btn-secondary btn-sm" href={href({ name: 'plan', date: selected })}><Icon name="plus" size={16} />Training planen</a>
              {selected === now && !activeSession(state) && <button class="btn btn-primary btn-sm" onClick={() => startWorkout(getState())}><Icon name="play" size={16} />Jetzt trainieren</button>}
            </div>
          </div>
        )}
      </section>
      {open && <OccurrenceSheet entry={open} onClose={() => setOpen(null)} />}
    </main>
  );
}

