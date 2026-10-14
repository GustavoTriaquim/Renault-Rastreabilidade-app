import type { DeadlineBand, DockId } from '@/types/domain';

/**
 * Cores do app. Fonte única: altere aqui para mudar a identidade visual.
 *
 * Referência visual: fundo claro, texto escuro e vermelho como cor de destaque
 * para ações principais. Nenhum logotipo ou cor oficial da Renault é reproduzido.
 */
export const colors = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceMuted: '#ECEEF1',
  border: '#DADDE2',

  text: '#14161A',
  textSecondary: '#5B616B',
  textInverse: '#FFFFFF',

  /** Ações principais. Não confundir com a cor da doca A nem com o prazo urgente. */
  accent: '#D6001C',
  accentPressed: '#A80016',
  accentSoft: '#FDECEE',

  /** Estados semânticos: cor forte (texto/ícone) + fundo suave. */
  success: '#1B7F3B',
  successSoft: '#E6F4EA',
  error: '#B3261E',
  errorSoft: '#FBE9E7',
  warning: '#8A5A00',
  warningSoft: '#FFF4D6',
  review: '#6B3FA0',
  reviewSoft: '#F0E9F8',
  pending: '#344054',
  pendingSoft: '#EAECF0',
} as const;

export type Tone = 'success' | 'error' | 'warning' | 'review' | 'pending' | 'neutral';

export const toneColors: Record<Tone, { foreground: string; background: string }> = {
  success: { foreground: colors.success, background: colors.successSoft },
  error: { foreground: colors.error, background: colors.errorSoft },
  warning: { foreground: colors.warning, background: colors.warningSoft },
  review: { foreground: colors.review, background: colors.reviewSoft },
  pending: { foreground: colors.pending, background: colors.pendingSoft },
  neutral: { foreground: colors.textSecondary, background: colors.surfaceMuted },
};

/**
 * Etiqueta da doca de chegada: A vermelho, B azul, C verde.
 * Tons escolhidos para manter contraste mínimo de 4,5:1 com texto branco.
 */
export const dockColors: Record<DockId, { background: string; foreground: string }> = {
  A: { background: '#D92D20', foreground: '#FFFFFF' },
  B: { background: '#1D4ED8', foreground: '#FFFFFF' },
  C: { background: '#15803D', foreground: '#FFFFFF' },
};

/**
 * Alerta de prazo: amarelo, laranja, vermelho e estado próprio de vencido.
 * Sempre acompanhado de texto e ícone, nunca só de cor.
 */
export const deadlineColors: Record<DeadlineBand, { background: string; foreground: string }> = {
  leve: { background: '#FACC15', foreground: '#14161A' },
  medio: { background: '#F97316', foreground: '#14161A' },
  urgente: { background: '#D92D20', foreground: '#FFFFFF' },
  vencido: { background: '#4A0D14', foreground: '#FFFFFF' },
};

/** Camadas sobre a câmera. */
export const overlay = {
  scrim: 'rgba(20, 22, 26, 0.72)',
  cameraBackground: '#000000',
} as const;
