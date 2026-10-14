import type { PartEvent } from '@/types/domain';
import { formatDate, formatDateTime } from '@/utils/format';
import { DEFAULT_HISTORY_FILTERS, filterHistory } from '@/utils/history';

function event(id: string, partNumber: string, minutesAgo: number, overrides: Partial<PartEvent> = {}): PartEvent {
  const now = new Date(2026, 9, 14, 12, 0, 0);
  return {
    id,
    partId: `part-${partNumber}`,
    partNumber,
    operatorId: 'op-001',
    operatorName: 'Carlos Almeida',
    operatorRegistration: '483917',
    stage: 'doca',
    type: 'validacao',
    result: 'aprovada',
    timestamp: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    note: null,
    ...overrides,
  };
}

const NOW = new Date(2026, 9, 14, 12, 0, 0);
const EVENTS: PartEvent[] = [
  event('evt-1', '58316072', 30), // hoje
  event('evt-2', '91826374', 60 * 24 * 3), // 3 dias
  event('evt-3', '47203518', 60 * 24 * 20, { stage: 'meio', type: 'revisao_solicitada', result: 'enviada_para_revisao' }),
  event('evt-4', '31759204', 60 * 24 * 60, { stage: 'destruicao', type: 'conclusao', result: 'concluida' }),
];

describe('formatação', () => {
  it('formata datas e horas no padrão brasileiro', () => {
    expect(formatDate('2026-10-14')).toBe('14/10/2026');
    expect(formatDateTime(new Date(2026, 9, 4, 8, 5).toISOString())).toBe('04/10/2026 08:05');
  });
});

describe('filtros do histórico', () => {
  const ids = (list: PartEvent[]) => list.map((e) => e.id);

  it('sem filtros devolve tudo, do mais recente ao mais antigo', () => {
    expect(ids(filterHistory(EVENTS, DEFAULT_HISTORY_FILTERS, NOW))).toEqual(['evt-1', 'evt-2', 'evt-3', 'evt-4']);
  });

  it('ordena do mais antigo ao mais recente', () => {
    const filters = { ...DEFAULT_HISTORY_FILTERS, order: 'antigos' as const };
    expect(ids(filterHistory(EVENTS, filters, NOW))).toEqual(['evt-4', 'evt-3', 'evt-2', 'evt-1']);
  });

  it('filtra por período', () => {
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, period: 'hoje' }, NOW))).toEqual(['evt-1']);
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, period: '7d' }, NOW))).toEqual(['evt-1', 'evt-2']);
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, period: '30d' }, NOW))).toEqual([
      'evt-1',
      'evt-2',
      'evt-3',
    ]);
  });

  it('filtra por etapa, tipo e trecho do número da peça', () => {
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, stage: 'meio' }, NOW))).toEqual(['evt-3']);
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, type: 'conclusao' }, NOW))).toEqual(['evt-4']);
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, partQuery: ' 8263 ' }, NOW))).toEqual(['evt-2']);
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, partQuery: '99999' }, NOW))).toEqual([]);
    expect(ids(filterHistory(EVENTS, { ...DEFAULT_HISTORY_FILTERS, partQuery: '9182' }, NOW))).toEqual(['evt-2']);
  });

  it('combina filtros', () => {
    const filters = { ...DEFAULT_HISTORY_FILTERS, period: '30d' as const, stage: 'doca' as const };
    expect(ids(filterHistory(EVENTS, filters, NOW))).toEqual(['evt-1', 'evt-2']);
  });
});
