import { useState } from 'preact/hooks';
import { PhotoError, processPhoto } from '../photos/process';
import { removeExercisePhoto, saveExercisePhoto, useAppState } from '../state/store';
import { Sheet } from './components';
import { Icon } from './icons';

/** The user's own photo for an exercise, with taking, picking, replacing and removing. */
export function OwnPhoto({ exerciseId, name, hasLibraryPhoto }: { exerciseId: string; name: string; hasLibraryPhoto: boolean }) {
  const url = useAppState().photos[exerciseId];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const p = await processPhoto(file);
      await saveExercisePhoto({ exerciseId, ...p, updatedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : `Das Foto konnte nicht gespeichert werden: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const picker = (label: string, primary: boolean) => (
    <label class={`btn ${primary ? 'btn-secondary' : 'btn-ghost'} btn-sm${busy ? ' is-busy' : ''}`}>
      <Icon name={url ? 'swap' : 'plus'} size={16} />{busy ? 'Wird gespeichert …' : label}
      <input type="file" accept="image/*" class="visually-hidden" onChange={onFile} disabled={busy} aria-label={`${label}: ${name}`} />
    </label>
  );

  return (
    <section class="own-photo" aria-labelledby={`own-${exerciseId}`}>
      <h2 class="h3" id={`own-${exerciseId}`}>Eigenes Foto</h2>
      {url ? (
        <>
          <img class="own-photo-img" src={url} alt={`Eigenes Foto: ${name}`} />
          <div class="own-photo-actions">
            {picker('Ersetzen', false)}
            <button class="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}><Icon name="trash" size={16} />Entfernen</button>
          </div>
        </>
      ) : (
        <>
          <p class="muted small" style={{ margin: '2px 0 var(--space-3)' }}>
            {hasLibraryPhoto ? 'Zusätzlich zum Foto oben, z. B. vom Gerät in deinem Studio oder deiner Ausführung.' : 'Mach selbst ein Foto der Übung oder wähle eines aus deiner Mediathek.'}
          </p>
          {picker('Foto hinzufügen', true)}
        </>
      )}
      <p class="muted small" style={{ margin: 'var(--space-2) 0 0' }}>Bleibt nur auf diesem Gerät und ist im Backup enthalten. Ortsdaten werden entfernt. Es gibt keine automatische Erkennung.</p>
      {error && <p class="small" role="alert" style={{ color: 'var(--danger)', margin: 'var(--space-2) 0 0' }}>{error}</p>}
      {confirm && (
        <Sheet title="Foto entfernen?" onClose={() => setConfirm(false)}>
          <p class="muted">Das eigene Foto für „{name}“ wird von diesem Gerät gelöscht. In einem früheren Backup bleibt es erhalten.</p>
          <div class="stack" style={{ marginTop: 'var(--space-4)' }}>
            <button class="btn btn-danger btn-block" onClick={() => { setConfirm(false); void removeExercisePhoto(exerciseId); }}>Foto entfernen</button>
            <button class="btn btn-ghost btn-block" onClick={() => setConfirm(false)}>Abbrechen</button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
