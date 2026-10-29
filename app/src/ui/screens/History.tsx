import { useState } from 'preact/hooks';
import type { WorkoutSession } from '../../domain/types';
import { useAppState } from '../../state/store';
import { monthLabel, SessionRow } from '../components';

type Filter = 'completed' | 'draft' | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'completed', label: 'Abgeschlossen' },
  { id: 'draft', label: 'Nicht abgeschlossen' },
  { id: 'all', label: 'Alle' },
];

function groupByMonth(sessions: WorkoutSession[]): [string, WorkoutSession[]][] {
  const groups = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const key = s.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()];
}

export function History() {
  const { data } = useAppState();
  const [filter, setFilter] = useState<Filter>('completed');
  const sessions = data.sessions.filter((s) => filter === 'all' || (filter === 'completed' ? s.status === 'completed' : s.status !== 'completed'));

  return (
    <main class="screen">
      <header class="page-head">
        <div>
          <p class="eyebrow">Verlauf</p>
          <h1 class="title">Deine Trainings</h1>
        </div>
      </header>
      <div class="segmented" role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      {filter === 'draft' && sessions.length > 0 && (
        <p class="muted small">Begonnene oder vorbereitete Einheiten, die nie abgeschlossen wurden. Sie zählen nicht als Training.</p>
      )}
      {sessions.length ? (
        groupByMonth(sessions).map(([month, items]) => (
          <section class="section" key={month} aria-label={monthLabel(`${month}-01`)} style={{ marginTop: 'var(--space-5)' }}>
            <div class="section-head">
              <h2 class="h3">{monthLabel(`${month}-01`)}</h2>
              <span class="muted small">{items.length}</span>
            </div>
            <div class="list">{items.map((s) => <SessionRow key={s.id} session={s} />)}</div>
          </section>
        ))
      ) : (
        <div class="empty">
          <h2 class="h3">{filter === 'draft' ? 'Keine offenen Einträge' : 'Noch keine Trainings'}</h2>
          <p class="muted small">{filter === 'draft' ? 'Alles, was du begonnen hast, ist abgeschlossen.' : 'Abgeschlossene Trainings erscheinen hier mit allen Sätzen.'}</p>
        </div>
      )}
    </main>
  );
}
