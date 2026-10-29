import { METRIC_LABELS } from '../../domain/catalog';
import { formatDate } from '../../domain/dates';
import type { SessionExercise, WorkoutSession } from '../../domain/types';
import { useAppState } from '../../state/store';
import { StatusChip } from '../components';
import { Icon } from '../icons';
import { href } from '../router';

const VARIANT_LABEL = { standard: null, easy: 'Leichtere Variante', hard: 'Schwerere Variante' } as const;
const SOURCE_LABEL: Record<WorkoutSession['source'], string> = { manual: 'Ohne Termin', calendar: 'Aus dem Kalender', randomizer: 'Zufallstraining' };
const INFERRED_LABEL: Record<string, string> = {
  title: 'die Bezeichnung (aus dem damaligen festen Wochenplan)',
  completedAt: 'die Uhrzeit des Abschlusses',
};

function fmt(n: number | null, unit = ''): string {
  return n === null ? '–' : `${n.toLocaleString('de-AT')}${unit}`;
}

function ExerciseCard({ x }: { x: SessionExercise }) {
  const unit = METRIC_LABELS[x.metric];
  const hasWeight = x.sets.some((s) => s.weightKg !== null);
  return (
    <article class="card exercise">
      <div class="exercise-head">
        <h3 class="h3">{x.name}</h3>
        {VARIANT_LABEL[x.variant] && <span class="chip chip-neutral">{VARIANT_LABEL[x.variant]}</span>}
      </div>
      {x.sets.length ? (
        <table class="sets">
          <thead>
            <tr><th scope="col">Satz</th><th scope="col">{unit.long}</th>{hasWeight && <th scope="col">Gewicht</th>}<th scope="col"><span class="visually-hidden">Abgehakt</span></th></tr>
          </thead>
          <tbody>
            {x.sets.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td>{fmt(s.value)}</td>
                {hasWeight && <td>{fmt(s.weightKg, ' kg')}</td>}
                <td>{s.done ? <Icon name="check" size={18} style={{ color: 'var(--accent)' }} aria-label="abgehakt" role="img" /> : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="muted small">Keine Sätze erfasst.</p>
      )}
    </article>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const { data } = useAppState();
  const s = data.sessions.find((x) => x.id === id);
  if (!s) {
    return (
      <main class="screen">
        <a class="btn btn-ghost" href={href({ name: 'history' })}><Icon name="back" size={18} />Verlauf</a>
        <div class="empty" style={{ marginTop: 'var(--space-5)' }}>
          <h1 class="h3">Training nicht gefunden</h1>
          <p class="muted small">Dieser Eintrag existiert nicht (mehr) auf diesem Gerät.</p>
        </div>
      </main>
    );
  }
  const inferred = s.legacy?.inferred?.map((k) => INFERRED_LABEL[k] ?? k) ?? [];
  return (
    <main class="screen">
      <a class="btn btn-ghost" href={href({ name: 'history' })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Verlauf</a>
      <header class="page-head" style={{ marginTop: 'var(--space-3)' }}>
        <div>
          <p class="eyebrow">{formatDate(s.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 class="title">{s.title}</h1>
          <div class="facts">
            <StatusChip status={s.status} />
            <span class="chip chip-neutral">{SOURCE_LABEL[s.source]}</span>
          </div>
        </div>
      </header>

      {(s.durationMin !== null || s.energy || s.steps !== null || s.note) && (
        <section class="card" aria-label="Notizen">
          <dl class="kv">
            {s.durationMin !== null && <><dt>Dauer</dt><dd>{fmt(s.durationMin, ' Min.')}</dd></>}
            {s.energy && <><dt>Energie</dt><dd>{s.energy}</dd></>}
            {s.steps !== null && <><dt>Schritte</dt><dd>{fmt(s.steps)}</dd></>}
          </dl>
          {s.note && <p style={{ margin: s.durationMin !== null || s.energy || s.steps !== null ? 'var(--space-3) 0 0' : 0 }}>{s.note}</p>}
        </section>
      )}

      <section class="section" aria-label="Übungen" style={{ marginTop: 'var(--space-4)' }}>
        {s.exercises.length ? (
          <div class="stack">{s.exercises.map((x) => <ExerciseCard key={x.id} x={x} />)}</div>
        ) : (
          <div class="empty"><p class="muted small">Für diese Einheit wurden keine Übungen erfasst.</p></div>
        )}
      </section>

      {s.legacy && (
        <p class="muted small" style={{ marginTop: 'var(--space-5)' }}>
          Aus der bisherigen App übernommen.
          {inferred.length > 0 && ` Damals nicht gespeichert und daher ergänzt: ${inferred.join(' und ')}.`}
        </p>
      )}
    </main>
  );
}
