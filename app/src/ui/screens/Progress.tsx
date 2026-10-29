import { useState } from 'preact/hooks';
import { formatDate, today } from '../../domain/dates';
import { addDays, loadLevel, muscleLoad, recentRecords, topExercises, totals, weekly } from '../../domain/progress';
import { REGION_IDS, REGIONS, type MuscleRegion } from '../../domain/muscles';
import { useAppState } from '../../state/store';
import { useLookup } from '../../state/workout';
import { BodyMap } from '../BodyMap';
import { BarChart } from '../charts';
import { Icon } from '../icons';
import { href } from '../router';
import { presetLibraryRegion } from './Library';

const RANGES = [{ days: 7, label: '7 Tage' }, { days: 30, label: '30 Tage' }, { days: 90, label: '90 Tage' }] as const;

function fmtMinutes(min: number): string {
  if (min < 60) return `${min}`;
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

export function Progress() {
  const state = useAppState();
  const lookup = useLookup();
  const now = today();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [region, setRegion] = useState<MuscleRegion | null>(null);
  const from = addDays(now, -(days - 1));
  const sessions = state.data.sessions;
  const t = totals(sessions, from, now);
  const weeks = weekly(sessions, now, 12);
  const load = muscleLoad(sessions, lookup, from, now);
  const levels = Object.fromEntries(REGION_IDS.map((r) => [r, loadLevel(load.get(r)?.primarySets ?? 0)]));
  const trained = REGION_IDS.filter((r) => (load.get(r)?.primarySets ?? 0) > 0).sort((a, b) => load.get(b)!.primarySets - load.get(a)!.primarySets);
  const untrained = REGION_IDS.filter((r) => !load.get(r)?.primarySets);
  const records = recentRecords(sessions, 5);
  const top = topExercises(sessions, from, 6);
  const sel = region ? load.get(region) : undefined;
  const weeksWithTraining = weeks.slice(-4).filter((w) => w.sessions > 0).length;
  const hasAny = sessions.some((s) => s.status === 'completed');

  return (
    <main class="screen">
      <header class="page-head">
        <div>
          <p class="eyebrow">Fortschritt</p>
          <h1 class="title">Deine Entwicklung</h1>
        </div>
        <a class="btn btn-secondary btn-sm" href={href({ name: 'history' })}>Alle Trainings</a>
      </header>

      {!hasAny && (
        <div class="empty" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 class="h3">Noch keine abgeschlossenen Trainings</h2>
          <p class="muted small">Sobald du Trainings abschließt, siehst du hier Häufigkeit, trainierte Muskeln und Bestleistungen – nur aus deinen echten Einträgen.</p>
        </div>
      )}

      <div class="segmented" role="group" aria-label="Zeitraum">
        {RANGES.map((r) => <button key={r.days} aria-pressed={days === r.days} onClick={() => setDays(r.days)}>{r.label}</button>)}
      </div>

      <div class="stats">
        <div class="stat"><b>{t.sessions}</b><span>Trainings</span></div>
        <div class="stat"><b>{t.sets}</b><span>Sätze</span></div>
        <div class="stat"><b>{fmtMinutes(t.minutes)}</b><span>{t.minutes < 60 ? 'Minuten' : 'Stunden'}{t.withoutDuration ? '*' : ''}</span></div>
      </div>
      {t.withoutDuration > 0 && <p class="muted small" style={{ margin: 'var(--space-2) 0 0' }}>* {t.withoutDuration} {t.withoutDuration === 1 ? 'Training' : 'Trainings'} ohne erfasste Dauer nicht mitgezählt.</p>}

      <section class="section card" aria-labelledby="freq">
        <h2 class="h3" id="freq">Trainings pro Woche</h2>
        <p class="muted small" style={{ margin: '2px 0 var(--space-3)' }}>Letzte 12 Wochen · in den letzten 4 Wochen {weeksWithTraining} von 4 Wochen mit Training</p>
        <BarChart
          title="Abgeschlossene Trainings pro Woche, letzte 12 Wochen"
          valueLabel="Trainings"
          summary={`Diese Woche: ${weeks.at(-1)!.sessions} ${weeks.at(-1)!.sessions === 1 ? 'Training' : 'Trainings'}`}
          data={weeks.map((w) => ({
            key: w.start,
            label: formatDate(w.start, { day: 'numeric', month: 'numeric' }),
            value: w.sessions,
            detail: `Woche ab ${formatDate(w.start, { day: 'numeric', month: 'short' })}: ${w.sessions} ${w.sessions === 1 ? 'Training' : 'Trainings'}, ${w.sets} Sätze`,
          }))}
        />
      </section>

      <section class="section card" aria-labelledby="body">
        <h2 class="h3" id="body">Trainierte Muskeln</h2>
        <p class="muted small" style={{ margin: '2px 0 var(--space-3)' }}>Erfasste Sätze als Hauptmuskel in den letzten {days} Tagen. Tippe auf einen Muskel.</p>
        <BodyMap label="Trainierte Muskeln" levels={levels} selected={region} onSelect={setRegion} />
        <div class="bm-legend" aria-hidden="true">
          <span><i style={{ background: '#2b3533' }} />0</span>
          <span><i style={{ background: 'rgba(46,229,157,.28)' }} />1–5</span>
          <span><i style={{ background: 'rgba(46,229,157,.58)' }} />6–11</span>
          <span><i style={{ background: 'var(--accent)' }} />12+ Sätze</span>
        </div>
        <p class="chart-readout" aria-live="polite" style={{ marginTop: 'var(--space-3)' }}>
          {region
            ? `${REGIONS[region].label}: ${sel?.primarySets ?? 0} Sätze als Hauptmuskel${sel?.secondarySets ? `, ${sel.secondarySets} unterstützend` : ''}${sel?.exercises.length ? ` (${sel.exercises.slice(0, 3).join(', ')}${sel.exercises.length > 3 ? ' …' : ''})` : ''}`
            : trained.length ? `Am meisten: ${trained.slice(0, 3).map((r) => `${REGIONS[r].label} (${load.get(r)!.primarySets})`).join(', ')}` : 'Im Zeitraum noch keine Sätze erfasst.'}
        </p>
        {region && <a class="btn btn-ghost btn-sm" href={href({ name: 'library' })} onClick={() => presetLibraryRegion(region)}>Übungen für {REGIONS[region].label}</a>}
        {trained.length > 0 && untrained.length > 0 && (
          <p class="muted small" style={{ margin: 'var(--space-2) 0 0' }}>Ohne Satz als Hauptmuskel: {untrained.map((r) => REGIONS[r].label).join(', ')}. Das ist nur eine Übersicht – nicht jede Region muss in jedem Zeitraum trainiert werden.</p>
        )}
      </section>

      <section class="section" aria-labelledby="prs">
        <h2 class="h2" id="prs" style={{ marginBottom: 'var(--space-3)' }}>Persönliche Rekorde</h2>
        {records.length ? (
          <div class="list">
            {records.map((r) => (
              <a key={`${r.sessionId}-${r.exerciseId}`} class="row" href={href({ name: 'exerciseInfo', id: r.exerciseId })}>
                <Icon name="trophy" size={22} style={{ color: 'var(--accent)' }} />
                <div class="row-main"><b>{r.name}</b><small>{r.kind === 'heaviest' ? 'Höchstgewicht' : 'Bestwert'} {r.label} · {formatDate(r.date, { day: 'numeric', month: 'short' })}</small></div>
                <Icon name="chevron" size={18} class="chevron" />
              </a>
            ))}
          </div>
        ) : <p class="muted small">Rekorde entstehen, wenn du eine Übung mindestens zum zweiten Mal besser machst als zuvor.</p>}
      </section>

      <section class="section" aria-labelledby="ex">
        <h2 class="h2" id="ex" style={{ marginBottom: 'var(--space-3)' }}>Deine Übungen</h2>
        {top.length ? (
          <div class="list">
            {top.map((x) => (
              <a key={x.exerciseId} class="row" href={href({ name: 'exerciseInfo', id: x.exerciseId })}>
                <div class="row-main"><b>{x.name}</b><small>{x.sessions} {x.sessions === 1 ? 'Training' : 'Trainings'} in {days} Tagen · Verlauf ansehen</small></div>
                <Icon name="chevron" size={18} class="chevron" />
              </a>
            ))}
          </div>
        ) : <p class="muted small">Im Zeitraum noch keine Übungen mit erfassten Sätzen.</p>}
      </section>
    </main>
  );
}
