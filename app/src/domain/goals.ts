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
