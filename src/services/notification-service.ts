import type { AppNotification, Review } from '@/types/domain';
import { toLocalDateOnly } from '@/utils/dates';

import { canAccessPart, findActiveOperator } from './guards';
import { summarize, type PartSummary } from './part-service';
import { fail, ok, type Result } from './result';
import type { Repository } from './repository';

/** Tudo que a tela de detalhes da notificação precisa, já lido na mesma transação. */
export interface NotificationDetails {
  notification: AppNotification;
  part: PartSummary | null;
  /** Revisão relacionada (solicitante, analista, justificativas e decisão), quando houver. */
  review: Review | null;
  /** Só é possível abrir os detalhes completos de peças que o operador pode acessar. */
  partAccessible: boolean;
}

export function createNotificationService(repo: Repository) {
  return {
    /** Notificações do operador, da mais recente para a mais antiga. */
    listForOperator(operatorId: string): Promise<Result<AppNotification[]>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        return ok(
          db.notifications
            .filter((n) => n.recipientOperatorId === operator.value.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
        );
      });
    },

    countUnread(operatorId: string): Promise<Result<number>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        return ok(
          db.notifications.filter((n) => n.recipientOperatorId === operator.value.id && !n.read).length,
        );
      });
    },

    getById(operatorId: string, notificationId: string): Promise<Result<AppNotification>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        const notification = db.notifications.find(
          (n) => n.id === notificationId && n.recipientOperatorId === operator.value.id,
        );
        if (!notification) return fail('NOTIFICACAO_NAO_ENCONTRADA', 'Notificação não encontrada.');
        return ok(notification);
      });
    },

    /** Marca como lida (idempotente). Só o destinatário pode marcar. */
    markAsRead(operatorId: string, notificationId: string): Promise<Result<AppNotification>> {
      return repo.transact((draft) => {
        const operator = findActiveOperator(draft, operatorId);
        if (!operator.ok) return operator;
        const notification = draft.notifications.find(
          (n) => n.id === notificationId && n.recipientOperatorId === operator.value.id,
        );
        if (!notification) return fail('NOTIFICACAO_NAO_ENCONTRADA', 'Notificação não encontrada.');
        notification.read = true;
        return ok(notification);
      });
    },

    /**
     * Abre a notificação: marca como lida (idempotente) e devolve peça e revisão
     * relacionadas. Só o destinatário consegue abrir.
     */
    open(operatorId: string, notificationId: string): Promise<Result<NotificationDetails>> {
      return repo.transact((draft) => {
        const operator = findActiveOperator(draft, operatorId);
        if (!operator.ok) return operator;
        const notification = draft.notifications.find(
          (n) => n.id === notificationId && n.recipientOperatorId === operator.value.id,
        );
        if (!notification) return fail('NOTIFICACAO_NAO_ENCONTRADA', 'Notificação não encontrada.');
        notification.read = true;

        const part = notification.partId
          ? (draft.parts.find((p) => p.id === notification.partId) ?? null)
          : null;
        const review = notification.reviewId
          ? (draft.reviews.find((r) => r.id === notification.reviewId) ?? null)
          : null;

        return ok<NotificationDetails>({
          notification,
          part: part ? summarize(part, toLocalDateOnly(repo.clock.now())) : null,
          review,
          partAccessible: part ? canAccessPart(draft, operator.value, part) : false,
        });
      });
    },

    /** Marca todas as notificações do operador como lidas; devolve quantas mudaram. */
    markAllAsRead(operatorId: string): Promise<Result<number>> {
      return repo.transact((draft) => {
        const operator = findActiveOperator(draft, operatorId);
        if (!operator.ok) return operator;
        let changed = 0;
        for (const n of draft.notifications) {
          if (n.recipientOperatorId === operator.value.id && !n.read) {
            n.read = true;
            changed += 1;
          }
        }
        return ok(changed);
      });
    },
  };
}
