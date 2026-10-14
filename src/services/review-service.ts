import { REVIEW_REASON_LABELS } from '@/constants/labels';
import {
  REVIEW_ANALYST,
  REVIEW_DECISION_JUSTIFICATIONS,
  REVIEW_RETURN_STAGE,
} from '@/constants/review';
import type { Part, PartEvent, Review, ReviewReason } from '@/types/domain';
import { nextId } from '@/utils/ids';

import { checkEligibility, findActiveOperator } from './guards';
import type { Database } from './database';
import {
  appendNotification,
  reviewDecidedContent,
  reviewRegisteredContent,
  reviewReturnedContent,
} from './notification-factory';
import { fail, ok, type Result } from './result';
import type { Repository } from './repository';

export interface ReviewRequest {
  reason: ReviewReason;
  /** Obrigatória, em qualquer motivo. */
  justification: string;
}

export interface ReviewOutcome {
  review: Review;
  event: PartEvent;
  part: Part;
}

export interface ReviewDecisionOutcome {
  review: Review;
  event: PartEvent;
  part: Part;
}

const VALID_REASONS = Object.keys(REVIEW_REASON_LABELS);

/**
 * Resultado da próxima decisão simulada: alterna a cada revisão decidida.
 * A primeira é aprovada, a seguinte reprovada, e assim por diante.
 */
export function nextSimulatedOutcome(db: Readonly<Database>): 'aprovada' | 'reprovada' {
  const decided = db.reviews
    .filter((review) => review.decision !== null)
    .sort((a, b) => (a.decision?.decidedAt ?? '').localeCompare(b.decision?.decidedAt ?? ''));
  const last = decided[decided.length - 1]?.decision?.outcome;
  return last === 'aprovada' ? 'reprovada' : 'aprovada';
}

export function createReviewService(repo: Repository) {
  return {
    /**
     * Envia a peça para revisão. A peça fica bloqueada (não avança e sai da fila)
     * até uma decisão (ver `decide`).
     */
    requestReview(
      operatorId: string,
      partId: string,
      request: ReviewRequest,
    ): Promise<Result<ReviewOutcome>> {
      return repo.transact((draft) => {
        const operatorResult = findActiveOperator(draft, operatorId);
        if (!operatorResult.ok) return operatorResult;
        const operator = operatorResult.value;

        if (!VALID_REASONS.includes(request.reason)) {
          return fail('MOTIVO_INVALIDO', 'Selecione o motivo da revisão.');
        }
        const justification = request.justification.trim();
        if (!justification) {
          return fail('JUSTIFICATIVA_OBRIGATORIA', 'Informe a justificativa da revisão.');
        }

        const part = draft.parts.find((p) => p.id === partId);
        if (!part) return fail('PECA_NAO_ENCONTRADA', 'Peça não encontrada.');

        const eligible = checkEligibility(operator, part);
        if (!eligible.ok) return eligible;

        const timestamp = repo.clock.now().toISOString();
        const stage = part.currentStage;

        const review: Review = {
          id: nextId('rev', draft.reviews),
          partId: part.id,
          partNumber: part.number,
          requestedByOperatorId: operator.id,
          requestedByOperatorName: operator.name,
          stage,
          reason: request.reason,
          justification,
          requestedAt: timestamp,
          status: 'em_analise',
          decision: null,
        };
        draft.reviews.push(review);

        const event: PartEvent = {
          id: nextId('evt', draft.events),
          partId: part.id,
          partNumber: part.number,
          operatorId: operator.id,
          operatorName: operator.name,
          operatorRegistration: operator.registration,
          stage,
          type: 'revisao_solicitada',
          result: 'enviada_para_revisao',
          timestamp,
          note: justification,
        };
        draft.events.push(event);

        part.status = 'em_revisao';
        part.stageStatus = 'em_revisao';

        appendNotification(draft, {
          recipientOperatorId: operator.id,
          content: reviewRegisteredContent({ partNumber: part.number, stage }),
          partId: part.id,
          partNumber: part.number,
          reviewId: review.id,
          createdAt: timestamp,
        });

        return ok<ReviewOutcome>({ review, event, part });
      });
    },

    /**
     * Registra a decisão simulada de uma revisão em análise.
     *
     * - O resultado alterna: aprovada, reprovada, aprovada...
     * - Aprovada: a peça volta para o Meio (aguardando validação) e preserva todo o histórico.
     * - Reprovada: a peça fica bloqueada, fora do fluxo normal, e não é concluída.
     * - Só o operador que solicitou a revisão dispara a simulação.
     * Tudo numa única transação: eventos, revisão, peça e notificações.
     */
    decide(operatorId: string, reviewId: string): Promise<Result<ReviewDecisionOutcome>> {
      return repo.transact((draft) => {
        const operatorResult = findActiveOperator(draft, operatorId);
        if (!operatorResult.ok) return operatorResult;
        const operator = operatorResult.value;

        const review = draft.reviews.find((r) => r.id === reviewId);
        if (!review || review.requestedByOperatorId !== operator.id) {
          return fail('REVISAO_NAO_ENCONTRADA', 'Revisão não encontrada.');
        }
        if (review.status !== 'em_analise' || review.decision !== null) {
          return fail('REVISAO_JA_DECIDIDA', 'Esta revisão já foi decidida.');
        }
        const part = draft.parts.find((p) => p.id === review.partId);
        if (!part) return fail('PECA_NAO_ENCONTRADA', 'Peça não encontrada.');

        const timestamp = repo.clock.now().toISOString();
        const outcome = nextSimulatedOutcome(draft);
        const approved = outcome === 'aprovada';
        const justification = REVIEW_DECISION_JUSTIFICATIONS[outcome];
        const destinationStage = approved ? REVIEW_RETURN_STAGE : null;

        review.status = approved ? 'aprovada_apos_revisao' : 'reprovada_apos_revisao';
        review.decision = {
          decidedByOperatorId: REVIEW_ANALYST.id,
          decidedByOperatorName: REVIEW_ANALYST.name,
          decidedAt: timestamp,
          outcome,
          justification,
          destinationStage,
        };

        if (destinationStage) {
          part.status = 'em_andamento';
          part.stageStatus = 'aguardando_validacao';
          part.currentStage = destinationStage;
          part.stageEnteredAt = timestamp;
        } else {
          part.status = 'reprovada';
          part.stageStatus = 'reprovada';
        }

        const event: PartEvent = {
          id: nextId('evt', draft.events),
          partId: part.id,
          partNumber: part.number,
          operatorId: REVIEW_ANALYST.id,
          operatorName: REVIEW_ANALYST.name,
          operatorRegistration: REVIEW_ANALYST.registration,
          stage: review.stage,
          type: 'revisao_decidida',
          result: approved ? 'aprovada_apos_revisao' : 'reprovada_apos_revisao',
          timestamp,
          note: justification,
        };
        draft.events.push(event);

        const requester = draft.operators.find((o) => o.id === review.requestedByOperatorId);
        const requesterReturns = approved && requester?.stage === destinationStage;

        if (destinationStage) {
          for (const recipient of draft.operators) {
            if (!recipient.active || recipient.stage !== destinationStage) continue;
            appendNotification(draft, {
              recipientOperatorId: recipient.id,
              content: reviewReturnedContent({
                partNumber: part.number,
                toStage: destinationStage,
                analystName: REVIEW_ANALYST.name,
              }),
              partId: part.id,
              partNumber: part.number,
              reviewId: review.id,
              createdAt: timestamp,
            });
          }
        }
        if (!requesterReturns) {
          appendNotification(draft, {
            recipientOperatorId: review.requestedByOperatorId,
            content: reviewDecidedContent({
              partNumber: part.number,
              outcome,
              analystName: REVIEW_ANALYST.name,
              toStage: destinationStage,
            }),
            partId: part.id,
            partNumber: part.number,
            reviewId: review.id,
            createdAt: timestamp,
          });
        }

        return ok<ReviewDecisionOutcome>({ review, event, part });
      });
    },
  };
}
