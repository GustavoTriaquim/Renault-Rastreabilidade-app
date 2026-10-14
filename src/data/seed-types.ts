import type {
  DockId,
  NotificationType,
  PartEventResult,
  PartEventType,
  PartStatus,
  ReviewReason,
  Stage,
  StageStatus,
} from '@/types/domain';

/**
 * Formato dos arquivos JSON iniciais. Datas e horas são relativas ao momento
 * do primeiro uso (`...DaysAgo`, `...MinutesAgo`), para que os alertas de prazo
 * da demonstração nunca "envelheçam". `buildSeedDatabase` as converte em datas
 * reais e a partir daí o estado passa a ser persistido.
 */

export interface SeedOperator {
  id: string;
  registration: string;
  name: string;
  stage: Stage;
  active: boolean;
}

export interface SeedPart {
  id: string;
  number: string;
  imageKey: string;
  dock: DockId;
  arrivalDaysAgo: number;
  currentStage: Stage;
  stageEnteredMinutesAgo: number;
  status: PartStatus;
  stageStatus: StageStatus;
  completedMinutesAgo: number | null;
  dossierId: string | null;
}

export interface SeedEvent {
  id: string;
  partId: string;
  operatorId: string;
  stage: Stage;
  type: PartEventType;
  result: PartEventResult;
  minutesAgo: number;
  note: string | null;
}

export interface SeedReview {
  id: string;
  partId: string;
  requestedByOperatorId: string;
  stage: Stage;
  reason: ReviewReason;
  justification: string;
  requestedMinutesAgo: number;
  status: 'em_analise';
  /** Decisões de revisão entram na Etapa 8; os dados iniciais só têm revisões em análise. */
  decision: null;
}

export interface SeedNotification {
  id: string;
  recipientOperatorId: string;
  type: NotificationType;
  partId: string;
  reviewId: string | null;
  /** Evento que originou a notificação; o texto é montado a partir dele. */
  sourceEventId: string;
  minutesAgo: number;
  read: boolean;
}

export interface SeedDossier {
  id: string;
  partId: string;
  generatedMinutesAgo: number;
}
