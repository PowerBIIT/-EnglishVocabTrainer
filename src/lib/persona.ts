import type { LearningPairId } from '@/types';

export type Persona = 'pl_student' | 'ua_student' | 'general';

export const getPersonaForPair = (pairId: LearningPairId): Persona => {
  if (pairId === 'pl-en') return 'pl_student';
  if (pairId === 'uk-pl') return 'ua_student';
  return 'general';
};
