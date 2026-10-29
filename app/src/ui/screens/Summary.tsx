import { formatDate } from '../../domain/dates';
import { fmtNum, recordsIn, volumeKg } from '../../domain/history';
import { loggedSets } from '../../domain/summary';
import { useAppState } from '../../state/store';
import { Icon } from '../icons';
import { href } from '../router';

export function Summary({ id }: { id: string }) {
  const { data } = useAppState();
  const s = data.sessions.find((x) => x.id === id);
  if (!s || s.status !== 'completed') {
    return (
      <main class="screen"><div class="empty"><h1 class="h3">Keine Zusammenfassung verfügbar</h1>
        <a class="btn btn-primary" href={href({ name: 'history' })} style={{ marginTop: 'var(--space-3)' }}>Zum Verlauf</a></div></main>
    );
  }
  const sets = loggedSets(s);
  const volume = volumeKg(s);
  const records = recordsIn(s, data.sessions);
  const count = data.sessions.filter((x) => x.status === 'completed').length;
  return (
    <main class="screen">
      <section class="done-hero" aria-labelledby="done-title">
        <span class="done-badge" aria-hidden="true"><Icon name="check" size={34} /></span>
        <p class="eyebrow">{formatDate(s.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 class="title" id="done-title">Training gespeichert</h1>
        <p class="muted">{s.title} · dein {count}. abgeschlossenes Training</p>
      </section>

      <div class="stats" style={{ marginTop: 'var(--space-5)' }}>
        <div class="stat"><b>{s.durationMin ?? '–'}</b><span>Minuten</span></div>
        <div class="stat"><b>{s.exercises.length}</b><span>Übungen</span></div>
        <div class="stat"><b>{sets}</b><span>Sätze</span></div>
      </div>
      {(volume > 0 || s.rpe !== null) && (
        <dl class="kv card" style={{ marginTop: 'var(--space-3)' }}>
          {volume > 0 && <><dt>Bewegtes Gewicht (kg × Wdh.)</dt><dd>{fmtNum(volume)} kg</dd></>}
          {s.rpe !== null && <><dt>Belastung</dt><dd>{s.rpe} / 10</dd></>}
        </dl>
      )}

      <section class="section" aria-labelledby="records">
        <h2 class="h2" id="records" style={{ marginBottom: 'var(--space-3)' }}>Persönliche Bestleistungen</h2>
        {records.length ? (
          <div class="list">
            {records.map((r) => (
              <div class="row" key={r.exerciseId}>
                <Icon name="trophy" size={22} style={{ color: 'var(--accent)' }} />
                <div class="row-main"><b>{r.name}</b><small>{r.kind === 'heaviest' ? 'Neues Höchstgewicht' : 'Neuer Bestwert'}: {r.label}</small></div>
              </div>
            ))}
          </div>
        ) : (
          <p class="muted small">Heute keine neuen Bestwerte – Regelmäßigkeit zählt mehr als jeder Rekord. Beim ersten Mal einer Übung legst du deinen Startwert fest.</p>
        )}
      </section>

      <div class="stack" style={{ marginTop: 'var(--space-6)' }}>
        <a class="btn btn-primary btn-block" href={href({ name: 'home' })}>Fertig</a>
        <a class="btn btn-secondary btn-block" href={href({ name: 'session', id: s.id })}>Details ansehen</a>
      </div>
    </main>
  );
}
