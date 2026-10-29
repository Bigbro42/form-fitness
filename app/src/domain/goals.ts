import type { GoalId } from './types';

export interface GoalInfo {
  label: string;
  short: string;
  description: string;
}

/** Order = order shown in pickers. Ids are stable (legacy ids kept). */
export const GOALS: Record<GoalId, GoalInfo> = {
  health: { label: 'Gesundheit & Fitness', short: 'Allround', description: 'Ausgewogene Mischung aus Kraft, Ausdauer und Beweglichkeit.' },
  hypertrophy: { label: 'Muskelaufbau', short: 'Muskelaufbau', description: 'Muskeln wachsen in einem breiten Wiederholungsbereich, wenn die Sätze fordernd sind.' },
  aesthetic: { label: 'Körperformung', short: 'Formung', description: '„Look good naked“: Muskelaufbau für den ganzen Körper, ausgewogen statt einseitig.' },
  strength: { label: 'Maximalkraft', short: 'Kraft', description: 'Hohe Widerstände, wenige Wiederholungen und ausreichend lange Pausen.' },
  muscular: { label: 'Kraftausdauer', short: 'Kraftausdauer', description: 'Mehr Wiederholungen oder längere Belastung mit kurzen Pausen.' },
  cardio: { label: 'Ausdauer', short: 'Ausdauer', description: 'Herz-Kreislauf-Training über Zeit, Intensität oder Intervalle.' },
  core: { label: 'Core & Rumpfstabilität', short: 'Core', description: 'Rumpfspannung, Anti-Rotation und saubere Kontrolle.' },
  mobility: { label: 'Mobilität', short: 'Mobilität', description: 'Kontrollierte Bewegung durch den vollen, schmerzfreien Bewegungsumfang.' },
  athletic: { label: 'Athletik & Funktion', short: 'Athletik', description: 'Kraft, Schnelligkeit und Koordination für Alltag und Sport.' },
};

export const GOAL_IDS = Object.keys(GOALS) as GoalId[];

export function goalLabel(goal: GoalId | null): string {
  return goal ? GOALS[goal].label : 'Ohne festes Ziel';
}

export const MAX_SECONDARY_GOALS = 2;

const isGoal = (g: unknown): g is GoalId => typeof g === 'string' && g in GOALS;

/**
 * Long-term goals: one main goal plus up to two secondary goals. Secondary goals never repeat
 * the main goal, without a main goal there are no secondary goals.
 */
export function normalizeGoals(primary: unknown, secondary: unknown): { primaryGoal: GoalId | null; secondaryGoals: GoalId[] } {
  const primaryGoal = isGoal(primary) ? primary : null;
  if (!primaryGoal || !Array.isArray(secondary)) return { primaryGoal, secondaryGoals: [] };
  const secondaryGoals = [...new Set(secondary.filter(isGoal))].filter((g) => g !== primaryGoal).slice(0, MAX_SECONDARY_GOALS);
  return { primaryGoal, secondaryGoals };
}

/** The user's own goals first (main, then secondary), then all others in the usual order. */
export function orderGoals(primary: GoalId | null, secondary: readonly GoalId[]): { mine: GoalId[]; others: GoalId[] } {
  const mine = primary ? [primary, ...secondary.filter((g) => g !== primary)] : [];
  return { mine, others: GOAL_IDS.filter((g) => !mine.includes(g)) };
}

export function goalRole(goal: GoalId, primary: GoalId | null, secondary: readonly GoalId[]): 'Hauptziel' | 'Nebenziel' | null {
  if (goal === primary) return 'Hauptziel';
  return primary && secondary.includes(goal) ? 'Nebenziel' : null;
}
