import { addCalendarMonths, addDays, diffInDays, parseDateOnly, toLocalDateOnly } from '@/utils/dates';
import {
  calculateDestructionDeadline,
  getDaysRemaining,
  getDeadlineBand,
} from '@/utils/deadline';

describe('addCalendarMonths', () => {
  it.each([
    ['2026-03-15', 6, '2026-09-15'],
    ['2026-10-31', 6, '2027-04-30'], // abril tem 30 dias
    ['2026-08-31', 6, '2027-02-28'], // fevereiro de ano comum
    ['2027-08-31', 6, '2028-02-29'], // fevereiro de ano bissexto
    ['2026-07-31', 6, '2027-01-31'], // virada de ano mantendo o dia
    ['2026-01-31', 1, '2026-02-28'],
    ['2026-12-15', 6, '2027-06-15'],
    ['2026-06-30', -6, '2025-12-30'],
  ])('%s + %i meses = %s', (start, months, expected) => {
    expect(addCalendarMonths(start, months)).toBe(expected);
  });

  it('não equivale a somar 180 dias', () => {
    // 2026-08-31 + 180 dias = 2027-02-27, mas seis meses-calendário = 2027-02-28
    expect(addDays('2026-08-31', 180)).toBe('2027-02-27');
    expect(calculateDestructionDeadline('2026-08-31')).toBe('2027-02-28');
    // Em outros casos a diferença passa de um dia: 181 a 184 dias conforme o mês
    expect(diffInDays('2026-01-15', calculateDestructionDeadline('2026-01-15'))).toBe(181);
    expect(diffInDays('2026-03-15', calculateDestructionDeadline('2026-03-15'))).toBe(184);
  });
});

describe('datas sem hora', () => {
  it('rejeita formato inválido e datas inexistentes', () => {
    expect(() => parseDateOnly('14/10/2026')).toThrow();
    expect(() => parseDateOnly('2026-02-30')).toThrow();
    expect(() => parseDateOnly('2026-13-01')).toThrow();
  });

  it('diffInDays e addDays são inversos, inclusive na virada de ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffInDays('2026-12-31', '2027-01-01')).toBe(1);
    expect(diffInDays('2026-10-14', '2026-10-13')).toBe(-1);
  });

  it('toLocalDateOnly usa o calendário local', () => {
    expect(toLocalDateOnly(new Date(2026, 9, 14, 23, 59))).toBe('2026-10-14');
    expect(toLocalDateOnly(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('faixas de prazo', () => {
  it.each([
    [-1, 'vencido'],
    [0, 'urgente'],
    [30, 'urgente'],
    [31, 'medio'],
    [60, 'medio'],
    [61, 'leve'],
    [400, 'leve'],
  ])('%i dias restantes = %s', (days, band) => {
    expect(getDeadlineBand(days)).toBe(band);
  });

  it('calcula dias restantes a partir de hoje', () => {
    expect(getDaysRemaining('2026-10-31', '2026-10-14')).toBe(17);
    expect(getDaysRemaining('2026-10-10', '2026-10-14')).toBe(-4);
    expect(getDaysRemaining('2026-10-14', '2026-10-14')).toBe(0);
  });
});
