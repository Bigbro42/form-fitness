import { useState } from 'preact/hooks';
import { BackupError, createBackup, importBackup, parseBackup, sessionsToCsv, type ParsedBackup } from '../../backup/backup';
import type { Snapshot } from '../../db/db';
import { today } from '../../domain/dates';
import { getDb, refresh, requestPersist, useAppState } from '../../state/store';
import { Notice, Sheet } from '../components';
import { Icon } from '../icons';
import { href } from '../router';

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function dateTime(iso: string) {
  return new Date(iso).toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' });
}

type Pending = { parsed: ParsedBackup; fileName: string };

export function Data() {
  const { data, legacy, snapshots, persist, photos } = useAppState();
  const photoCount = Object.keys(photos).length;
  const [pending, setPending] = useState<Pending | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const exportJson = async () => {
    const backup = await createBackup(getDb());
    download(`FORM_Backup_${today()}.json`, 'application/json', JSON.stringify(backup, null, 2));
  };

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setMessage(null);
    try {
      setPending({ parsed: parseBackup(await file.text(), file.name), fileName: file.name });
      setMode('merge');
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof BackupError ? err.message : `Die Datei konnte nicht gelesen werden: ${(err as Error).message}` });
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const outcome = await importBackup(getDb(), pending.parsed, mode, pending.fileName);
      await refresh();
      const kept = outcome.keptLocal ? ` ${outcome.keptLocal} vorhandene Einträge waren aktueller und wurden behalten.` : '';
      const photos = outcome.photos ? ` ${outcome.photos} ${outcome.photos === 1 ? 'Foto' : 'Fotos'} übernommen.` : '';
      setMessage({ tone: 'info', text: `Import abgeschlossen: ${outcome.added} neu, ${outcome.updated} aktualisiert.${kept}${photos} Der vorherige Stand ist als Sicherung gespeichert.` });
      setPending(null);
    } catch (err) {
      setMessage({ tone: 'error', text: `Import fehlgeschlagen, es wurde nichts verändert: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const downloadSnapshot = (s: Snapshot) => {
    const name = s.kind === 'legacy-storage' ? `FORM_Rohdaten_bisherige_App_${s.takenAt.slice(0, 10)}.json` : `FORM_Sicherung_${s.takenAt.slice(0, 10)}.json`;
    download(name, 'application/json', s.kind === 'legacy-storage' ? JSON.stringify({ legacyLocalStorage: JSON.parse(s.payload) }, null, 2) : s.payload);
  };

  const p = pending?.parsed;
  const incoming = p ? { sessions: p.sessions.length, completed: p.sessions.filter((s) => s.status === 'completed').length, plans: p.plans.length, photos: p.kind === 'form' ? p.photos.length : 0 } : null;

  return (
    <main class="screen">
      <a class="btn btn-ghost" href={href({ name: 'home' })} style={{ marginLeft: 'calc(-1 * var(--space-2))' }}><Icon name="back" size={18} />Start</a>
      <header class="page-head" style={{ marginTop: 'var(--space-3)' }}>
        <div>
          <p class="eyebrow">Daten</p>
          <h1 class="title">Sichern & Wiederherstellen</h1>
        </div>
      </header>

      <div class="stack">
        {message && <Notice tone={message.tone} title={message.tone === 'error' ? 'Nicht importiert' : 'Fertig'}><p>{message.text}</p></Notice>}

        <section class="card" aria-labelledby="where">
          <h2 class="h3" id="where">Wo deine Daten liegen</h2>
          <p class="muted small">
            Nur auf diesem Gerät, in der lokalen Datenbank dieses Browsers. Es gibt keine automatische Cloud-Synchronisierung und keinen Upload.
            Wenn du Safari-Daten löschst oder die App entfernst, sind die Daten weg – ein Backup schützt davor.
          </p>
          <dl class="kv" style={{ marginTop: 'var(--space-3)' }}>
            <dt>Trainings</dt><dd>{data.sessions.length}</dd>
            <dt>Kalendertermine</dt><dd>{data.plans.length}</dd>
            <dt>Eigene Fotos</dt><dd>{photoCount}</dd>
            <dt>Speicherschutz</dt>
            <dd>{persist === 'persisted' ? 'Aktiv' : persist === 'unsupported' ? 'Nicht verfügbar' : 'Nicht aktiv'}</dd>
          </dl>
          {persist === 'not-persisted' && (
            <button class="btn btn-secondary btn-block" style={{ marginTop: 'var(--space-3)' }} onClick={requestPersist}>
              <Icon name="shield" size={18} />Speicherschutz anfragen
            </button>
          )}
        </section>

        <section class="card" aria-labelledby="backup">
          <h2 class="h3" id="backup">Backup</h2>
          <p class="muted small">Die JSON-Datei enthält alle Trainings, Termine, Einstellungen und eigenen Fotos sowie die Rohdaten der bisherigen App. Speichere sie z. B. in „Dateien“ oder iCloud Drive.</p>
          <div class="stack" style={{ marginTop: 'var(--space-3)' }}>
            <button class="btn btn-primary btn-block" onClick={exportJson}><Icon name="download" size={18} />Backup herunterladen (JSON)</button>
            <button class="btn btn-secondary btn-block" onClick={() => download(`FORM_Trainings_${today()}.csv`, 'text/csv;charset=utf-8', sessionsToCsv(data.sessions))}>
              <Icon name="download" size={18} />Trainings als Tabelle (CSV)
            </button>
            <label class="btn btn-secondary btn-block file-btn">
              <Icon name="upload" size={18} />Backup importieren
              <input type="file" accept="application/json,.json" onChange={onFile} aria-label="Backup-Datei auswählen" />
            </label>
          </div>
          <p class="muted small" style={{ marginBottom: 0 }}>Auch Backups der bisherigen App (FORM_Backup_….json, FORM_trainingsdaten_v5.json) werden erkannt.</p>
        </section>

        {legacy && (
          <section class="card" aria-labelledby="legacy">
            <a class="btn btn-ghost" href="../" style={{ float: 'right', marginTop: 'calc(-1 * var(--space-2))' }}>Öffnen<Icon name="external" size={16} /></a>
            <h2 class="h3" id="legacy">Übernahme aus der bisherigen App</h2>
            <p class="muted small">Zuletzt am {dateTime(legacy.importedAt)}. Die bisherige App und ihre Daten wurden dabei nicht verändert.</p>
            <dl class="kv">
              <dt>Abgeschlossene Trainings</dt><dd>{legacy.report.completedSessions}</dd>
              <dt>Nicht abgeschlossene Einträge</dt><dd>{legacy.report.draftSessions}</dd>
              <dt>Kalendertermine</dt><dd>{legacy.report.plannedWorkouts}</dd>
              <dt>Leere Entwürfe (nur im Rohdaten-Archiv)</dt><dd>{legacy.report.skippedEmpty}</dd>
            </dl>
            {legacy.report.problems.length > 0 && (
              <details style={{ marginTop: 'var(--space-3)' }}>
                <summary class="small">{legacy.report.problems.length} Hinweise</summary>
                <ul class="muted small">{legacy.report.problems.map((x) => <li key={x}>{x}</li>)}</ul>
              </details>
            )}
          </section>
        )}

        {snapshots.length > 0 && (
          <section class="card" aria-labelledby="snaps">
            <h2 class="h3" id="snaps">Automatische Sicherungen</h2>
            <p class="muted small">Vor jeder Übernahme und jedem Import speichert FORM. den vorherigen Stand.</p>
            <div class="list">
              {snapshots.map((s) => (
                <button key={s.id} class="row" onClick={() => downloadSnapshot(s)}>
                  <div class="row-main"><b>{s.reason}</b><small>{dateTime(s.takenAt)}</small></div>
                  <Icon name="download" size={18} class="chevron" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {pending && p && incoming && (
        <Sheet title="Backup importieren" onClose={() => !busy && setPending(null)}>
          <p>
            „{pending.fileName}“ {p.kind === 'legacy' ? '(bisherige App)' : ''} enthält {incoming.sessions} Trainings ({incoming.completed} abgeschlossen) und {incoming.plans} Kalendertermine{incoming.photos ? ` sowie ${incoming.photos} eigene Fotos` : ''}.
          </p>
          {incoming.photos > 0 && <p class="muted small">Fotos werden ergänzt oder durch neuere ersetzt, aber nie gelöscht – auch nicht beim Ersetzen.</p>}
          {p.kind === 'form' && p.skipped.length > 0 && <Notice tone="warn"><p>{p.skipped.length} beschädigte Einträge werden übersprungen.</p></Notice>}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend class="visually-hidden">Importart</legend>
            <label class="choice">
              <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              <span><b>Zusammenführen (empfohlen)</b><small>Fehlende Einträge ergänzen. {p.kind === 'legacy' ? 'Vorhandene Einträge bleiben unverändert.' : 'Bei doppelten Einträgen gewinnt der neuere Stand.'}</small></span>
            </label>
            <label class="choice">
              <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              <span><b>Ersetzen</b><small>Alle Trainings und Termine auf diesem Gerät durch das Backup ersetzen.</small></span>
            </label>
          </fieldset>
          <p class="small">Vor dem Import wird der aktuelle Stand automatisch gesichert.</p>
          <div class="stack">
            <button class={`btn btn-block ${mode === 'replace' ? 'btn-danger' : 'btn-primary'}`} onClick={confirmImport} disabled={busy}>
              {busy ? 'Importiere …' : mode === 'replace' ? 'Daten ersetzen' : 'Zusammenführen'}
            </button>
            <button class="btn btn-secondary btn-block" onClick={() => setPending(null)} disabled={busy}>Abbrechen</button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
