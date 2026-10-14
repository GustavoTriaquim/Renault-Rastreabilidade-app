import type { Tone } from '@/theme';
import type {
  DeadlineBand,
  PartEventResult,
  PartEventType,
  PartStatus,
  ReviewReason,
  ReviewStatus,
  Stage,
  StageStatus,
} from '@/types/domain';

/** Etapas do fluxo, em ordem. */
export const STAGE_ORDER: readonly Stage[] = ['doca', 'meio', 'destruicao'];

export const STAGE_LABELS: Record<Stage, string> = {
  doca: 'Doca',
  meio: 'Meio',
  destruicao: 'Destruição',
};

export const PART_STATUS_LABELS: Record<PartStatus, string> = {
  em_andamento: 'Em andamento',
  em_revisao: 'Em revisão',
  reprovada: 'Reprovada',
  concluida: 'Concluída',
};

export const PART_STATUS_TONES: Record<PartStatus, Tone> = {
  em_andamento: 'pending',
  em_revisao: 'review',
  reprovada: 'error',
  concluida: 'success',
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  aguardando_validacao: 'Aguardando validação',
  aprovada_na_etapa: 'Aprovada na etapa',
  em_revisao: 'Em revisão',
  reprovada: 'Reprovada',
};

export const STAGE_STATUS_TONES: Record<StageStatus, Tone> = {
  aguardando_validacao: 'pending',
  aprovada_na_etapa: 'success',
  em_revisao: 'review',
  reprovada: 'error',
};

export const DEADLINE_LABELS: Record<DeadlineBand, string> = {
  leve: 'Prazo leve',
  medio: 'Prazo médio',
  urgente: 'Urgente',
  vencido: 'Vencido',
};

export const REVIEW_REASON_LABELS: Record<ReviewReason, string> = {
  peca_descartada: 'Peça descartada',
  peca_quebrada: 'Peça chegou quebrada',
  outro: 'Outro motivo',
};

export const EVENT_TYPE_LABELS: Record<PartEventType, string> = {
  validacao: 'Validação',
  revisao_solicitada: 'Revisão solicitada',
  revisao_decidida: 'Decisão da revisão',
  conclusao: 'Conclusão (destruição)',
};

export const EVENT_RESULT_LABELS: Record<PartEventResult, string> = {
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  enviada_para_revisao: 'Enviada para revisão',
  aprovada_apos_revisao: 'Aprovada após revisão',
  reprovada_apos_revisao: 'Reprovada após revisão',
  concluida: 'Concluída',
};

export const EVENT_RESULT_TONES: Record<PartEventResult, Tone> = {
  aprovada: 'success',
  reprovada: 'error',
  enviada_para_revisao: 'review',
  aprovada_apos_revisao: 'success',
  reprovada_apos_revisao: 'error',
  concluida: 'success',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  em_analise: 'Em análise',
  aprovada_apos_revisao: 'Aprovada após revisão',
  reprovada_apos_revisao: 'Reprovada após revisão',
};

export const REVIEW_STATUS_TONES: Record<ReviewStatus, Tone> = {
  em_analise: 'review',
  aprovada_apos_revisao: 'success',
  reprovada_apos_revisao: 'error',
};
