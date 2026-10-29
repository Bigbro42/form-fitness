import { useState } from 'preact/hooks';
import { EQUIPMENT_LABELS, KIND_LABELS, LEVEL_LABELS, LIBRARY_EXERCISES, METRIC_LABELS, PATTERN_LABELS } from '../../domain/catalog';
import { formatDate } from '../../domain/dates';
import { exerciseHistory, fmtNum, personalBests, setsSummary } from '../../domain/history';
import { range, recommend, restLabel } from '../../domain/recommendations';
import type { ExerciseDef, GoalId } from '../../domain/types';
import { activeSession, useAppState } from '../../state/store';
import { trainExercise, useLookup } from '../../state/workout';
import { BodyMap } from '../BodyMap';
import { Icon } from '../icons';
import { href } from '../router';
import { Technique } from '../workout-parts';
import { GoalSelect } from './Workout';

const BASE = import.meta.env.BASE_URL;

/** Up to four exercises with the same movement pattern that share a main muscle. */
function alternatives(x: ExerciseDef, all: readonly ExerciseDef[]): ExerciseDef[] {
  return all
    .filter((y) => y.id !== x.id && !y.sameAs && y.pattern === x.pattern && y.primaryMuscles.some((m) => x.primaryMuscles.includes(m)))
    .sort((a, b) => Math.abs(a.level - x.level) - Math.abs(b.level - x.level) || a.name.localeCompare(b.name, 'de'))
    .slice(0, 4);
}

export function ExerciseInfo({ id }: { id: string }) {
  const state = useAppState();
  const lookup = useLookup();
  const x = lookup(id);
  const [goal, setGoal] = useState<GoalId | null>(state.data.settings.primaryGoal);
  if (!x) {
    return <main class="screen"><div class="empty"><h1 class="h3">Übung nicht gefunden</h1><a class="btn btn-primary" href={href({ name: 'library' })} style={{ marginTop: 'var(--space-3)' }}>Zur Bibliothek</a></div></main>;
  }
  const rec = recommend(x, goal);
  const unit = METRIC_LABELS[x.metric];
  const history = exerciseHistory(state.data.sessions, x.id);
  const pb = personalBests(history, x.metric);
  const running = activeSession(state);
  const alts = alternatives(x, [...state.data.customExercises, ...LIBRARY_EXERCISES]);

  return (
    <main class="screen">
      <a class="btn btn-ghost" href={href({ name: 'library' })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Übungen</a>
      <header style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
        <h1 class="title title-m">{x.name}</h1>
        {x.nameEn && <p class="muted small" style={{ margin: '2px 0 0' }}>{x.nameEn}</p>}
        <div class="facts">
          <span class="chip chip-neutral">{KIND_LABELS[x.kind]}</span>
          <span class="chip chip-neutral">{LEVEL_LABELS[x.level]}</span>
          {x.equipment.map((e) => <span key={e} class="chip chip-neutral">{EQUIPMENT_LABELS[e]}</span>)}
          <span class="chip chip-neutral">{PATTERN_LABELS[x.pattern]}</span>
          {x.source === 'custom' && <span class="chip chip-draft">Eigene Übung</span>}
        </div>
      </header>

      <div class="stack">
        <button class="btn btn-primary btn-block btn-lg" onClick={() => trainExercise(x)}>
          <Icon name={running ? 'plus' : 'play'} size={18} />{running ? 'Zum laufenden Training hinzufügen' : 'Mit dieser Übung trainieren'}
        </button>

        {x.media && (
          <figure class="media" style={{ marginTop: 0 }}>
            <div class="media-frames">
              {x.media.frames.map((src, i) => (
                <div class="media-frame" key={src}>
                  <img src={BASE + src} alt={`${x.name} – ${i === 0 ? 'Startposition' : 'Endposition'}`} loading="lazy" decoding="async" />
                  <span>{i === 0 ? 'Start' : 'Ende'}</span>
                </div>
              ))}
            </div>
            <figcaption>Foto: <a href={x.media.sourceUrl} target="_blank" rel="noopener">{x.media.credit}</a> ({x.media.license})</figcaption>
          </figure>
        )}

        <section class="card" aria-labelledby="muscles">
          <h2 class="h3" id="muscles">{x.media ? 'Beanspruchte Muskeln' : 'Muskelübersicht'}</h2>
          {!x.media && <p class="muted small" style={{ margin: '2px 0 0' }}>Für diese Übung gibt es kein geprüftes Foto. Die Karte zeigt die Muskeln, nicht die Bewegung.</p>}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <BodyMap label={`Muskeln bei ${x.name}`} primary={x.primaryMuscles} secondary={x.secondaryMuscles} />
          </div>
          <div class="bm-legend" aria-hidden="true"><span><i style={{ background: 'var(--accent)' }} />Hauptmuskeln</span><span><i style={{ background: 'rgba(46,229,157,.38)' }} />Unterstützend</span></div>
        </section>

        <section class="card" aria-labelledby="rec">
          <div class="section-head" style={{ marginBottom: 'var(--space-2)' }}>
            <h2 class="h3" id="rec">Richtwert</h2>
          </div>
          <GoalSelect id="info-goal" value={goal} onChange={setGoal} />
          <div class="rec-main" style={{ marginTop: 'var(--space-3)' }}>
            <div><b class="tabular">{range(rec.sets)}</b><span>Sätze</span></div>
            <div><b class="tabular">{range(rec.target)}</b><span>{unit.short}</span></div>
            <div><b class="tabular">{rec.restSeconds[1] ? restLabel(rec.restSeconds).replace(' Pause', '').replace(' Sek.', ' s') : '–'}</b><span>Pause</span></div>
          </div>
          <p class="rec-note">{rec.effort}.{rec.note ? ` ${rec.note}` : ''}</p>
        </section>

        <section class="card" aria-labelledby="how">
          <h2 class="h3" id="how">So geht’s</h2>
          <Technique def={x} />
        </section>

        <section class="card" aria-labelledby="mine">
          <h2 class="h3" id="mine">Dein Verlauf</h2>
          {history.length ? (
            <>
              <dl class="kv" style={{ marginTop: 'var(--space-3)' }}>
                {pb.heaviest && <><dt>Schwerster Satz</dt><dd>{fmtNum(pb.heaviest.weightKg)} kg × {fmtNum(pb.heaviest.value)}</dd></>}
                {pb.bestValue && <><dt>{x.metric === 'reps' ? 'Meiste Wiederholungen' : 'Längste Zeit'}</dt><dd>{fmtNum(pb.bestValue.value)} {unit.short}</dd></>}
                <dt>Trainings</dt><dd>{history.length}</dd>
              </dl>
              <ul class="history-list">
                {history.slice(0, 5).map((h) => (
                  <li key={h.exercise.id}><a href={href({ name: 'session', id: h.session.id })}><span>{formatDate(h.session.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>{setsSummary(h.sets, x.metric)}</span></a></li>
                ))}
              </ul>
            </>
          ) : <p class="muted small" style={{ margin: 'var(--space-2) 0 0' }}>Noch nicht trainiert. Abgeschlossene Sätze erscheinen hier.</p>}
        </section>

        {alts.length > 0 && (
          <section aria-labelledby="alts">
            <h2 class="h3" id="alts" style={{ margin: 'var(--space-3) 0' }}>Alternativen</h2>
            <div class="list">
              {alts.map((a) => (
                <a key={a.id} class="row" href={href({ name: 'exerciseInfo', id: a.id })}>
                  <div class="row-main"><b>{a.name}</b><small>{a.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')} · {LEVEL_LABELS[a.level]}</small></div>
                  <Icon name="chevron" size={18} class="chevron" />
                </a>
              ))}
            </div>
          </section>
        )}

        {x.source === 'custom' && <a class="btn btn-secondary btn-block" href={href({ name: 'customExercise', id: x.id })}><Icon name="edit" size={18} />Eigene Übung bearbeiten</a>}
      </div>
    </main>
  );
}
