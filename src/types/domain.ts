/**
 * Tipos de domínio do app de rastreabilidade.
 *
 * Convenções:
 * - Nomes de campos em inglês (camelCase); valores de enums em português
 *   (termos do domínio) e textos de interface vêm de `src/constants`.
 * - Datas e horas são strings ISO 8601 (`2026-10-13T21:05:00-03:00`);
 *   datas sem hora usam `YYYY-MM-DD`.
 * - O prazo vencido NÃO é um status armazenado: é uma condição temporal
 *   derivada de `destructionDeadline` (ver `DeadlineBand`).
 *
 * Estes tipos serão refinados na Etapa 2, junto com os serviços.
 */

/** Etapas do fluxo, em ordem: doca → meio → destruição. */
export type Stage = 'doca' | 'meio' | 'destruicao';

/** Doca de chegada. A cor da etiqueta é derivada dela (ver `theme.colors.dock`). */
export type DockId = 'A' | 'B' | 'C';

/** Faixa de alerta de prazo, derivada dos dias restantes. */
export type DeadlineBand = 'leve' | 'medio' | 'urgente' | 'vencido';

/** Status geral da peça no fluxo. */
export type PartStatus = 'em_andamento' | 'em_revisao' | 'reprovada' | 'concluida';

/** Status da peça dentro da etapa atual. */
export type StageStatus =
  | 'aguardando_validacao'
  | 'aprovada_na_etapa'
  | 'em_revisao'
  | 'reprovada';

export interface Operator {
  id: string;
  /** Matrícula numérica única, usada no login. */
  registration: string;
  name: string;
  /** Etapa em que o operador atua. Cada operador só vê peças desta etapa. */
  stage: Stage;
  active: boolean;
}

export interface Part {
  id: string;
  /** Número identificador individual, somente dígitos (lido por OCR). */
  number: string;
  /** Chave da imagem ilustrativa local. */
  imageKey: string;
  dock: DockId;
  /** Data de chegada ao Brasil (`YYYY-MM-DD`). */
  arrivalDate: string;
  /** Chegada + 6 meses-calendário (`YYYY-MM-DD`). */
  destructionDeadline: string;
  currentStage: Stage;
  /** Quando a peça entrou na etapa atual; desempata a fila de validação. */
  stageEnteredAt: string;
  status: PartStatus;
  stageStatus: StageStatus;
  completedAt: string | null;
  dossierId: string | null;
}

export type PartEventType =
  | 'validacao'
  | 'revisao_solicitada'
  | 'revisao_decidida'
  | 'conclusao';

export type PartEventResult =
  | 'aprovada'
  | 'reprovada'
  | 'enviada_para_revisao'
  | 'aprovada_apos_revisao'
  | 'reprovada_apos_revisao'
  | 'concluida';

/** Evento de auditoria. Guarda cópia dos dados do operador no momento do evento. */
export interface PartEvent {
  id: string;
  partId: string;
  partNumber: string;
  operatorId: string;
  operatorName: string;
  operatorRegistration: string;
  stage: Stage;
  type: PartEventType;
  result: PartEventResult;
  timestamp: string;
  note: string | null;
}

export type ReviewStatus = 'em_analise' | 'aprovada_apos_revisao' | 'reprovada_apos_revisao';

export type ReviewReason = 'peca_descartada' | 'peca_quebrada' | 'outro';

export interface ReviewDecision {
  decidedByOperatorId: string;
  decidedByOperatorName: string;
  decidedAt: string;
  outcome: 'aprovada' | 'reprovada';
  justification: string;
  /** Revisão aprovada devolve a peça ao Meio; reprovada não tem destino. */
  destinationStage: Stage | null;
}

export interface Review {
  id: string;
  partId: string;
  partNumber: string;
  requestedByOperatorId: string;
  requestedByOperatorName: string;
  /** Etapa em que o problema foi identificado. */
  stage: Stage;
  reason: ReviewReason;
  justification: string;
  requestedAt: string;
  status: ReviewStatus;
  decision: ReviewDecision | null;
}

export type NotificationType =
  | 'peca_disponivel'
  | 'revisao_retornou'
  | 'peca_reprovada'
  | 'revisao_atualizada'
  | 'acao_necessaria';

export interface AppNotification {
  id: string;
  recipientOperatorId: string;
  type: NotificationType;
  title: string;
  summary: string;
  createdAt: string;
  partId: string | null;
  partNumber: string | null;
  reviewId: string | null;
  read: boolean;
}

export interface DossierStageEntry {
  stage: Stage;
  operatorId: string;
  operatorName: string;
  operatorRegistration: string;
  timestamp: string;
  result: PartEventResult;
}

export interface Dossier {
  id: string;
  partId: string;
  partNumber: string;
  dock: DockId;
  arrivalDate: string;
  destructionDeadline: string;
  stages: DossierStageEntry[];
  reviews: Review[];
  completedAt: string;
  generatedAt: string;
}
