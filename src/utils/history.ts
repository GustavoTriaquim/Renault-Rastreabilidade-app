import type { PartEvent, PartEventType, Stage } from '@/types/domain';

import { diffInDays, toLocalDateOnly } from './dates';

export type PeriodFilter = 'hoje' | '7d' | '30d' | 'tudo';
export type SortOrder = 'recentes' | 'antigos';

export interface HistoryFilters {
  period: PeriodFilter;
  stage: Stage | 'todas';
  type: PartEventType | 'todos';
  /** Trecho do número da peça (somente dígitos são considerados). */
  partQuery: string;
  order: SortOrder;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  period: 'tudo',
  stage: 'todas',
  type: 'todos',
  partQuery: '',
  order: 'recentes',
};

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  tudo: 'Tudo',
};

/** Último dia (inclusive) de cada período, em dias antes de hoje. */
const PERIOD_MAX_DAYS_AGO: Record<Exclude<PeriodFilter, 'tudo'>, number> = {
  hoje: 0,
  '7d': 6,
  '30d': 29,
};

/**
 * Filtra e ordena os eventos do histórico. Função pura: o histórico continua
 * derivado dos eventos, nunca do status atual da peça.
 */
export function filterHistory(
  events: readonly PartEvent[],
  filters: HistoryFilters,
  now: Date,
): PartEvent[] {
  const today = toLocalDateOnly(now);
  const query = filters.partQuery.replace(/\D/g, '');

  const filtered = events.filter((event) => {
    if (filters.stage !== 'todas' && event.stage !== filters.stage) return false;
    if (filters.type !== 'todos' && event.type !== filters.type) return false;
    if (query && !event.partNumber.includes(query)) return false;
    if (filters.period !== 'tudo') {
      const daysAgo = diffInDays(toLocalDateOnly(new Date(event.timestamp)), today);
      if (daysAgo < 0 || daysAgo > PERIOD_MAX_DAYS_AGO[filters.period]) return false;
    }
    return true;
  });

  const direction = filters.order === 'recentes' ? -1 : 1;
  return filtered.sort(
    (a, b) => direction * (a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)),
  );
}
