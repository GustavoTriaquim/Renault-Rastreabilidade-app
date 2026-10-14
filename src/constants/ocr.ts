/** Quantidade de dígitos aceita na matrícula do crachá (igual à validação do login). */
export const REGISTRATION_DIGITS = { minDigits: 4, maxDigits: 12 } as const;

/** Quantidade de dígitos aceita no número impresso das peças. */
export const PART_NUMBER_DIGITS = { minDigits: 6, maxDigits: 12 } as const;
