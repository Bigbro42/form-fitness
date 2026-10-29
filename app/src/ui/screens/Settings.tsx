import { EQUIPMENT_LABELS, LEVEL_LABELS } from '../../domain/catalog';
import { GOAL_IDS, GOALS, MAX_SECONDARY_GOALS } from '../../domain/goals';
import { SESSION_MINUTES } from '../../domain/settings';
import type { EquipmentId, GoalId } from '../../domain/types';
import { saveSettings, useAppState } from '../../state/store';
import { Icon } from '../icons';
import { href } from '../router';

/** Long-term goals and defaults. Every change is saved immediately. */
export function SettingsScreen() {
  const { data } = useAppState();
  const s = data.settings;

  const setPrimary = (g: GoalId | null) => void saveSettings({ primaryGoal: g, secondaryGoals: s.secondaryGoals.filter((x) => x !== g) });
  const toggleSecondary = (g: GoalId) => {
    const has = s.secondaryGoals.includes(g);
    if (!has && s.secondaryGoals.length >= MAX_SECONDARY_GOALS) return;
    void saveSettings({ secondaryGoals: has ? s.secondaryGoals.filter((x) => x !== g) : [...s.secondaryGoals, g] });
  };
  const toggleEquipment = (e: EquipmentId) => {
    const next = s.equipment.includes(e) ? s.equipment.filter((x) => x !== e) : [...s.equipment, e];
    void saveSettings({ equipment: next.length ? next : ['body'] });
  };
  const full = s.secondaryGoals.length >= MAX_SECONDARY_GOALS;

  return (
    <main class="screen">
      <a class="btn btn-ghost" href={href({ name: 'home' })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Start</a>
      <header class="page-head" style={{ marginTop: 'var(--space-3)' }}>
        <div><p class="eyebrow">Einstellungen</p><h1 class="title">Ziele & Vorgaben</h1></div>
      </header>
      <p class="muted small" style={{ marginTop: 0 }}>
        Dein langfristiges Ziel ist nur die Vorgabe. Für jedes Training, jeden Termin und im Generator kannst du ein anderes Ziel wählen, z. B. heute eine Cardio-Einheit, obwohl dein Ziel Muskelaufbau ist. Es werden keine Termine angelegt. Änderungen werden sofort gespeichert.
      </p>

      <section class="section" aria-labelledby="primary">
        <h2 class="h2" id="primary">Hauptziel</h2>
        <div class="stack" role="radiogroup" aria-labelledby="primary" style={{ marginTop: 'var(--space-3)' }}>
          <label class="toggle">
            <input type="radio" name="primary" checked={s.primaryGoal === null} onChange={() => setPrimary(null)} />
            <span><b>Noch kein festes Ziel</b><small>Empfehlungen zeigen allgemeine Richtwerte.</small></span>
          </label>
          {GOAL_IDS.map((g) => (
            <label class="toggle" key={g}>
              <input type="radio" name="primary" checked={s.primaryGoal === g} onChange={() => setPrimary(g)} />
              <span><b>{GOALS[g].label}</b><small>{GOALS[g].description}</small></span>
            </label>
          ))}
        </div>
      </section>

      <section class="section" aria-labelledby="secondary">
        <h2 class="h2" id="secondary">Nebenziele</h2>
        {s.primaryGoal ? (
          <>
            <p class="muted small">Bis zu {MAX_SECONDARY_GOALS}, z. B. Core und Mobilität neben Muskelaufbau. {full && 'Um ein anderes zu wählen, entferne zuerst eines.'}</p>
            <div class="chips chips-wrap" role="group" aria-labelledby="secondary">
              {GOAL_IDS.filter((g) => g !== s.primaryGoal).map((g) => {
                const on = s.secondaryGoals.includes(g);
                return <button key={g} type="button" class="chip-btn" aria-pressed={on} disabled={!on && full} onClick={() => toggleSecondary(g)}>{GOALS[g].short}</button>;
              })}
            </div>
          </>
        ) : (
          <p class="muted small">Wähle zuerst ein Hauptziel.</p>
        )}
      </section>

      <section class="section" aria-labelledby="effects">
        <h2 class="h2" id="effects">Was deine Ziele beeinflussen</h2>
        <ul class="muted small plain-list">
          <li>Vorauswahl des Ziels bei neuen Trainings, Terminen und im Generator</li>
          <li>Richtwerte für Sätze, Wiederholungen bzw. Dauer, Anstrengung und Pausen</li>
          <li>Deine Ziele stehen in jeder Zielauswahl und im Übungsfilter ganz oben</li>
        </ul>
      </section>

      <section class="section" aria-labelledby="level">
        <h2 class="h2" id="level">Trainingsniveau</h2>
        <p class="muted small">Der Generator wählt Übungen bis zu diesem Niveau.</p>
        <div class="chips chips-wrap" role="group" aria-labelledby="level">
          {([1, 2, 3] as const).map((l) => (
            <button key={l} type="button" class="chip-btn" aria-pressed={s.level === l} onClick={() => void saveSettings({ level: s.level === l ? null : l })}>{LEVEL_LABELS[l]}</button>
          ))}
        </div>
      </section>

      <section class="section" aria-labelledby="duration">
        <h2 class="h2" id="duration">Übliche Trainingsdauer</h2>
        <label class="field" style={{ marginTop: 'var(--space-2)' }}>
          <span>{s.sessionMinutes ? <b class="tabular">{s.sessionMinutes} Minuten</b> : 'Nicht festgelegt (Generator: 30 Minuten)'}</span>
          <input type="range" class="range" min={SESSION_MINUTES.min} max={SESSION_MINUTES.max} step={SESSION_MINUTES.step} value={s.sessionMinutes ?? 30}
            aria-label="Übliche Trainingsdauer" aria-valuetext={`${s.sessionMinutes ?? 30} Minuten`}
            onChange={(e) => void saveSettings({ sessionMinutes: Number((e.currentTarget as HTMLInputElement).value) })} />
        </label>
      </section>

      <section class="section" aria-labelledby="equipment">
        <h2 class="h2" id="equipment">Verfügbares Equipment</h2>
        <p class="muted small">Vorauswahl für den Generator.</p>
        <div class="chips chips-wrap" role="group" aria-labelledby="equipment">
          {(Object.keys(EQUIPMENT_LABELS) as EquipmentId[]).map((e) => (
            <button key={e} type="button" class="chip-btn" aria-pressed={s.equipment.includes(e)} onClick={() => toggleEquipment(e)}>{EQUIPMENT_LABELS[e]}</button>
          ))}
        </div>
      </section>

      <section class="section" aria-labelledby="rest">
        <h2 class="h2" id="rest">Satzpause</h2>
        <label class="toggle" style={{ marginTop: 'var(--space-3)' }}>
          <input type="checkbox" checked={s.restAuto} onChange={(e) => void saveSettings({ restAuto: (e.currentTarget as HTMLInputElement).checked })} />
          <span><b>Pause automatisch starten</b><small>Nach dem Abhaken eines Satzes läuft die empfohlene Pause.</small></span>
        </label>
      </section>

      <section class="section">
        <a class="row" href={href({ name: 'data' })}>
          <div class="row-main"><b>Daten & Backup</b><small>Sichern, wiederherstellen, Übernahme aus der bisherigen App</small></div>
          <Icon name="chevron" size={18} class="chevron" />
        </a>
      </section>
    </main>
  );
}
