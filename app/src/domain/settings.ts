import { EQUIPMENT_LABELS } from './catalog';
import { normalizeGoals } from './goals';
import { DEFAULT_SETTINGS, type EquipmentId, type Settings } from './types';

export const SESSION_MINUTES = { min: 10, max: 60, step: 5 } as const;

const clampMinutes = (v: unknown): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const rounded = Math.round(v / SESSION_MINUTES.step) * SESSION_MINUTES.step;
  return Math.min(SESSION_MINUTES.max, Math.max(SESSION_MINUTES.min, rounded));
};

/**
 * Turns whatever is stored (older app versions, backup files, the legacy app) into valid
 * settings. Unknown or broken values fall back to the defaults instead of breaking the app.
 */
export function normalizeSettings(raw: Partial<Record<keyof Settings, unknown>> | undefined | null): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw ?? {}) } as Record<keyof Settings, unknown>;
  const equipment = Array.isArray(s.equipment) ? [...new Set(s.equipment.filter((e): e is EquipmentId => typeof e === 'string' && e in EQUIPMENT_LABELS))] : [];
  return {
    ...normalizeGoals(s.primaryGoal, s.secondaryGoals),
    equipment: equipment.length ? equipment : DEFAULT_SETTINGS.equipment,
    restSeconds: typeof s.restSeconds === 'number' && s.restSeconds >= 0 ? s.restSeconds : DEFAULT_SETTINGS.restSeconds,
    restAuto: typeof s.restAuto === 'boolean' ? s.restAuto : DEFAULT_SETTINGS.restAuto,
    level: s.level === 1 || s.level === 2 || s.level === 3 ? s.level : null,
    sessionMinutes: clampMinutes(s.sessionMinutes),
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : DEFAULT_SETTINGS.updatedAt,
  };
}
