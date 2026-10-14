import type { Stage } from '@/types/domain';

/**
 * Analista simulado das revisões. No sistema real a decisão virá do site
 * administrativo; aqui ela é produzida pela simulação (ver `review-service`).
 */
export const REVIEW_ANALYST = {
  id: 'analise-simulada',
  name: 'Análise de Qualidade (simulada)',
  registration: '000000',
} as const;

/** Toda peça aprovada na revisão volta para esta etapa. */
export const REVIEW_RETURN_STAGE: Stage = 'meio';

/** Justificativas geradas pela simulação conforme o resultado alternado. */
export const REVIEW_DECISION_JUSTIFICATIONS = {
  aprovada: 'Revisão aprovada na análise simulada: a peça está apta e retorna ao fluxo.',
  reprovada: 'Revisão reprovada na análise simulada: a peça não pode seguir o fluxo normal.',
} as const;
