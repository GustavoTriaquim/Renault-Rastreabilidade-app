/**
 * Aritmética de datas sem hora (`YYYY-MM-DD`).
 *
 * Todo o cálculo usa componentes UTC para ficar imune a fuso horário e a
 * horário de verão: somar dias ou meses a uma data nunca "pula" nem repete um dia.
 */

const DAY_MS = 86_400_000;

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

export function formatDateOnly({ year, month, day }: DateParts): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Lê `YYYY-MM-DD` e rejeita formatos ou datas inexistentes (ex.: 2026-02-30). */
export function parseDateOnly(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Data inválida (esperado YYYY-MM-DD): "${value}"`);
  }
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) {
    throw new Error(`Data inexistente: "${value}"`);
  }
  return parts;
}

function toUtcMs({ year, month, day }: DateParts): number {
  return Date.UTC(year, month - 1, day);
}

/**
 * Soma meses-calendário mantendo o dia do mês. Se o mês de destino for mais
 * curto, usa o último dia dele (31/08 + 6 meses = 28/02, ou 29/02 em ano bissexto).
 */
export function addCalendarMonths(value: string, months: number): string {
  const { year, month, day } = parseDateOnly(value);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (((index % 12) + 12) % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return formatDateOnly({ year: targetYear, month: targetMonth, day: targetDay });
}

export function addDays(value: string, days: number): string {
  const date = new Date(toUtcMs(parseDateOnly(value)) + days * DAY_MS);
  return formatDateOnly({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

/** Dias de calendário de `from` até `to` (negativo quando `to` é anterior). */
export function diffInDays(from: string, to: string): number {
  return Math.round((toUtcMs(parseDateOnly(to)) - toUtcMs(parseDateOnly(from))) / DAY_MS);
}

/** Data de calendário local (o dia que o operador vê no relógio). */
export function toLocalDateOnly(date: Date): string {
  return formatDateOnly({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}
