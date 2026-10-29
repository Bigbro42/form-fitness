import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { formatDate, parseDate } from '../domain/dates';
import type { WorkoutSession } from '../domain/types';
import { loggedSets } from '../domain/summary';
import { Icon, type IconName } from './icons';
import { href } from './router';

export function Notice({ tone, title, children, icon }: { tone: 'info' | 'warn' | 'error'; title?: string; children: ComponentChildren; icon?: IconName }) {
  return (
    <div class={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon ?? (tone === 'info' ? 'info' : 'alert')} size={20} />
      <div>
        {title && <b>{title}</b>}
        {children}
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: WorkoutSession['status'] }) {
  if (status === 'completed') return <span class="chip chip-done"><Icon name="check" size={14} />Abgeschlossen</span>;
  if (status === 'active') return <span class="chip chip-neutral">Läuft</span>;
  return <span class="chip chip-draft">Nicht abgeschlossen</span>;
}

export function SessionRow({ session }: { session: WorkoutSession }) {
  const d = parseDate(session.date);
  const sets = loggedSets(session);
  const detail = session.activity === 'sport' && !session.exercises.length
    ? 'Sport / Kurs'
    : `${session.exercises.length} ${session.exercises.length === 1 ? 'Übung' : 'Übungen'} · ${sets} ${sets === 1 ? 'Satz' : 'Sätze'} erfasst`;
  return (
    <a class="row" href={href({ name: 'session', id: session.id })} aria-label={`${session.title}, ${formatDate(session.date, { dateStyle: 'full' })}`}>
      <div class="row-date" aria-hidden="true">
        <b>{d.getDate()}</b>
        <small>{d.toLocaleDateString('de-AT', { weekday: 'short' }).replace('.', '')}</small>
      </div>
      <div class="row-main">
        <b>{session.title}</b>
        <small>{detail}</small>
      </div>
      {session.status !== 'completed' && <StatusChip status={session.status} />}
      <Icon name="chevron" size={18} class="chevron" />
    </a>
  );
}

/** Bottom sheet dialog with focus handling and Escape to close. */
export function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: ComponentChildren; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && close.current()}>
      <div class={`sheet${tall ? ' sheet-tall' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div class="sheet-head">
          <h2 class="h2">{title}</h2>
          <button class="icon-btn icon-btn-sm" onClick={() => close.current()} aria-label="Schließen"><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function monthLabel(iso: string): string {
  return parseDate(iso).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
}
