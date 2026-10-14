import { DEADLINE_CONFIG } from '@/constants/deadline';
import type { DeadlineBand } from '@/types/domain';

import { addCalendarMonths, diffInDays } from './dates';

/** Prazo de destruição: chegada + seis meses-calendário (não 180 dias). */
export function calculateDestructionDeadline(arrivalDate: string): string {
  return addCalendarMonths(arrivalDate, DEADLINE_CONFIG.deadlineMonths);
}

/** Dias restantes até o prazo; negativo quando já venceu. */
export function getDaysRemaining(deadline: string, today: string): number {
  return diffInDays(today, deadline);
}

/** Faixa de alerta conforme `DEADLINE_CONFIG`. O vencimento é condição temporal, não etapa. */
export function getDeadlineBand(daysRemaining: number): DeadlineBand {
  if (daysRemaining < 0) return 'vencido';
  if (daysRemaining <= DEADLINE_CONFIG.urgentMaxDays) return 'urgente';
  if (daysRemaining <= DEADLINE_CONFIG.mediumMaxDays) return 'medio';
  return 'leve';
}

/** Menor número = atendido primeiro. */
export const DEADLINE_BAND_PRIORITY: Record<DeadlineBand, number> = {
  vencido: 0,
  urgente: 1,
  medio: 2,
  leve: 3,
};
