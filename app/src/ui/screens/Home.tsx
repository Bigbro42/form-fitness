import { formatDate, today } from '../../domain/dates';
import { GOALS } from '../../domain/goals';
import { overview } from '../../domain/summary';
import { activeSession, dismissError, useAppState } from '../../state/store';
import { startWorkout } from '../../state/workout';
import { Notice, SessionRow } from '../components';
import { Icon } from '../icons';
import { href } from '../router';
import { ElapsedTime } from '../workout-parts';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Home() {
  const state = useAppState();
  const { data, migration, error, persist } = state;
  const o = overview(data.sessions);
  const recent = data.sessions.filter((s) => s.status === 'completed').slice(0, 3);
  const imported = migration?.status === 'imported' ? migration.state : null;
  const active = activeSession(state);

  return (
    <main class="screen">
      <header class="page-head">
        <div>
          <p class="eyebrow">{formatDate(today(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 class="title brand">FORM<i>.</i></h1>
        </div>
      </header>

      <div class="stack">
        {error && (
          <Notice tone="error" title="Fehler">
            <p>{error}</p>
            <button class="btn btn-ghost" onClick={dismissError}>Ausblenden</button>
          </Notice>
        )}
        {imported && (
          <Notice tone="info" title={migration?.status === 'imported' && migration.firstImport ? 'Deine Daten sind da' : 'Neue Einträge übernommen'} icon="check">
            <p>
              {count(imported.report.completedSessions, 'abgeschlossenes Training', 'abgeschlossene Trainings')}, {count(imported.report.draftSessions, 'nicht abgeschlossener Eintrag', 'nicht abgeschlossene Einträge')} und {count(imported.report.plannedWorkouts, 'Kalendertermin', 'Kalendertermine')} aus der bisherigen App gelesen.
              Die bisherige App und ihre Daten bleiben unverändert.
            </p>
          </Notice>
        )}
        {persist === 'not-persisted' && data.sessions.length > 0 && (
          <Notice tone="warn" title="Speicher nicht dauerhaft geschützt">
            <p>Der Browser kann lokale Daten bei Speichermangel löschen. Installiere FORM. auf dem Home-Bildschirm und sichere regelmäßig ein Backup unter „Daten“.</p>
          </Notice>
        )}

        {active ? (
          <a class="card-hero hero-link" href={href({ name: 'workout' })}>
            <p class="eyebrow"><span class="live-dot" aria-hidden="true" /> {active.reopened ? 'Korrektur offen' : 'Training läuft'}</p>
            <h2 class="h2">{active.title}</h2>
            <p class="muted">
              {active.exercises.length} {active.exercises.length === 1 ? 'Übung' : 'Übungen'}
              {!active.reopened && <> · <ElapsedTime since={active.startedAt} /></>}
              {active.goal && ` · ${GOALS[active.goal].short}`}
            </p>
            <span class="btn btn-primary btn-block" style={{ marginTop: 'var(--space-4)' }}>Fortsetzen<Icon name="chevron" size={18} /></span>
          </a>
        ) : (
          <section class="card-hero" aria-labelledby="start">
            <h2 class="h2" id="start">Heute trainieren?</h2>
            <p class="muted">Kein Plan vorgegeben – starte spontan und füge die Übungen hinzu, auf die du Lust hast.</p>
            <button class="btn btn-primary btn-block btn-lg" style={{ marginTop: 'var(--space-4)' }} onClick={() => startWorkout(state)}>
              <Icon name="play" size={18} />Training starten
            </button>
          </section>
        )}
      </div>

      <section class="section" aria-labelledby="overview">
        <div class="section-head"><h2 class="h2" id="overview">Überblick</h2></div>
        <div class="stats">
          <div class="stat"><b>{o.completed}</b><span>Trainings abgeschlossen</span></div>
          <div class="stat"><b>{o.sets}</b><span>Sätze erfasst</span></div>
          <div class="stat"><b>{o.drafts}</b><span>Nicht abgeschlossen</span></div>
        </div>
      </section>

      <section class="section" aria-labelledby="recent">
        <div class="section-head">
          <h2 class="h2" id="recent">Zuletzt trainiert</h2>
          {recent.length > 0 && <a class="btn btn-ghost" href={href({ name: 'history' })}>Alle</a>}
        </div>
        {recent.length ? (
          <div class="list">{recent.map((s) => <SessionRow key={s.id} session={s} />)}</div>
        ) : (
          <div class="empty">
            <h3 class="h3">Noch keine abgeschlossenen Trainings</h3>
            <p class="muted small">Sobald du ein Training abschließt, erscheint es hier. Geplante Termine zählen nicht als Training.</p>
          </div>
        )}
      </section>
    </main>
  );
}
