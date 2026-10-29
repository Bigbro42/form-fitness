/**
 * Muscle regions used by the library and the body map. Each region belongs to one of the seven
 * coarse groups of the legacy app (used for quick filters and for legacy data).
 */
import type { MuscleGroup } from './types';

export type MuscleRegion =
  | 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'hipflexors'
  | 'upperback' | 'lats' | 'lowerback'
  | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'calves';

export const REGIONS: Record<MuscleRegion, { label: string; group: MuscleGroup; atlas: RegExp }> = {
  chest: { label: 'Brust', group: 'chest', atlas: /^chest/ },
  shoulders: { label: 'Schultern', group: 'shoulders', atlas: /^(shoulder|deltoid)/ },
  biceps: { label: 'Bizeps', group: 'arms', atlas: /^biceps/ },
  triceps: { label: 'Trizeps', group: 'arms', atlas: /^triceps/ },
  forearms: { label: 'Unterarme', group: 'arms', atlas: /^forearm/ },
  abs: { label: 'Gerade Bauchmuskeln', group: 'abs', atlas: /^abs-/ },
  obliques: { label: 'Seitliche Bauchmuskeln', group: 'abs', atlas: /^(obliques|serratus)/ },
  hipflexors: { label: 'Hüftbeuger', group: 'legs', atlas: /^hip-flexor/ },
  upperback: { label: 'Oberer Rücken', group: 'back', atlas: /^(traps|nape)/ },
  lats: { label: 'Latissimus', group: 'back', atlas: /^lats/ },
  lowerback: { label: 'Unterer Rücken', group: 'back', atlas: /^(spine|lower-back)/ },
  glutes: { label: 'Gesäß', group: 'glutes', atlas: /^gluteus/ },
  quads: { label: 'Vordere Oberschenkel', group: 'legs', atlas: /^quads/ },
  hamstrings: { label: 'Hintere Oberschenkel', group: 'legs', atlas: /^hamstrings/ },
  adductors: { label: 'Innere Oberschenkel', group: 'legs', atlas: /^adductors/ },
  calves: { label: 'Waden & Schienbein', group: 'legs', atlas: /^(calves|tibialis)/ },
};

export const REGION_IDS = Object.keys(REGIONS) as MuscleRegion[];

export function regionOfAtlas(id: string): MuscleRegion | null {
  for (const r of REGION_IDS) if (REGIONS[r].atlas.test(id)) return r;
  return null;
}

/** Coarse legacy group → typical regions (only used when no curated data exists). */
export const GROUP_DEFAULT_REGIONS: Record<MuscleGroup, MuscleRegion[]> = {
  abs: ['abs'], legs: ['quads'], glutes: ['glutes'], back: ['upperback'], shoulders: ['shoulders'], chest: ['chest'], arms: ['biceps'],
};
