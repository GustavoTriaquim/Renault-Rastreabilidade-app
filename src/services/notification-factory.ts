import { STAGE_LABELS } from '@/constants/labels';
import type { AppNotification, Stage } from '@/types/domain';
import { nextId } from '@/utils/ids';

import type { Database } from './database';

type NotificationContent = Pick<AppNotification, 'type' | 'title' | 'summary'>;

/** Texto das notificações, centralizado para o seed e os serviços gerarem o mesmo conteúdo. */
export function partAvailableContent(input: {
  partNumber: string;
  fromStage: Stage;
  toStage: Stage;
  approvedByName: string;
}): NotificationContent {
  return {
    type: 'peca_disponivel',
    title: `Peça ${input.partNumber} disponível`,
    summary: `Aprovada em ${STAGE_LABELS[input.fromStage]} por ${input.approvedByName}. Aguardando validação em ${STAGE_LABELS[input.toStage]}.`,
  };
}

export function reviewRegisteredContent(input: {
  partNumber: string;
  stage: Stage;
}): NotificationContent {
  return {
    type: 'revisao_atualizada',
    title: `Revisão da peça ${input.partNumber} em análise`,
    summary: `Sua solicitação na etapa ${STAGE_LABELS[input.stage]} foi registrada. A peça fica bloqueada até a decisão.`,
  };
}

/** Aviso para a etapa que recebe de volta uma peça cuja revisão foi aprovada. */
export function reviewReturnedContent(input: {
  partNumber: string;
  toStage: Stage;
  analystName: string;
}): NotificationContent {
  return {
    type: 'revisao_retornou',
    title: `Peça ${input.partNumber} voltou para ${STAGE_LABELS[input.toStage]}`,
    summary: `Revisão aprovada por ${input.analystName}. A peça aguarda nova validação em ${STAGE_LABELS[input.toStage]}.`,
  };
}

/** Aviso para quem solicitou a revisão: decisão final (aprovada ou reprovada). */
export function reviewDecidedContent(input: {
  partNumber: string;
  outcome: 'aprovada' | 'reprovada';
  analystName: string;
  toStage: Stage | null;
}): NotificationContent {
  if (input.outcome === 'aprovada') {
    const destination = input.toStage ? ` e volta para ${STAGE_LABELS[input.toStage]}` : '';
    return {
      type: 'revisao_atualizada',
      title: `Revisão da peça ${input.partNumber} aprovada`,
      summary: `Decisão de ${input.analystName}: a peça segue o fluxo${destination}.`,
    };
  }
  return {
    type: 'peca_reprovada',
    title: `Peça ${input.partNumber} reprovada na revisão`,
    summary: `Decisão de ${input.analystName}: a peça não retorna ao fluxo normal.`,
  };
}

/** Acrescenta uma notificação ao rascunho da transação. */
export function appendNotification(
  draft: Database,
  input: {
    recipientOperatorId: string;
    content: NotificationContent;
    partId: string;
    partNumber: string;
    reviewId: string | null;
    createdAt: string;
  },
): AppNotification {
  const notification: AppNotification = {
    id: nextId('ntf', draft.notifications),
    recipientOperatorId: input.recipientOperatorId,
    type: input.content.type,
    title: input.content.title,
    summary: input.content.summary,
    createdAt: input.createdAt,
    partId: input.partId,
    partNumber: input.partNumber,
    reviewId: input.reviewId,
    read: false,
  };
  draft.notifications.push(notification);
  return notification;
}
