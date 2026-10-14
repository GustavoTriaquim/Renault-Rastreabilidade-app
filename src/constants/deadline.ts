/**
 * Configuração central dos alertas de prazo.
 *
 * Cada peça tem seis meses-calendário (a partir da chegada) para ser destruída.
 * As faixas abaixo usam os dias restantes até o prazo:
 *  - vencido: menos de 0 dia (prazo ultrapassado);
 *  - urgente: de 0 a `urgentMaxDays`;
 *  - médio:   de `urgentMaxDays + 1` a `mediumMaxDays`;
 *  - leve:    mais de `mediumMaxDays`.
 *
 * Altere apenas estes valores para ajustar as faixas no futuro.
 */
export const DEADLINE_CONFIG = {
  /** Meses-calendário entre a chegada ao Brasil e o prazo de destruição. */
  deadlineMonths: 6,
  urgentMaxDays: 30,
  mediumMaxDays: 60,
} as const;
