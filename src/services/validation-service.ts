import { STAGE_ORDER } from '@/constants/labels';
import type { AppNotification, Part, PartEvent, Stage } from '@/types/domain';
import { nextId } from '@/utils/ids';

import { ensureDossier } from './dossier-service';
import { checkEligibility, findActiveOperator } from './guards';
import { appendNotification, partAvailableContent } from './notification-factory';
import { fail, ok, type Result } from './result';
import type { Repository } from './repository';

export interface ValidationOutcome {
  part: Part;
  event: PartEvent;
  /** Etapa para a qual a peça avançou; `null` quando foi concluída. */
  nextStage: Stage | null;
  completed: boolean;
  dossierId: string | null;
  notifications: AppNotification[];
}

export function createValidationService(repo: Repository) {
  return {
    /**
     * Aprova a peça na etapa do operador autenticado.
     *
     * Tudo acontece numa única transação: checagens, evento de auditoria,
     * avanço de etapa, notificações e (na última etapa) conclusão + dossiê.
     * Se qualquer regra falhar, nada é gravado.
     */
    validate(operatorId: string, partId: string): Promise<Result<ValidationOutcome>> {
      return repo.transact((draft) => {
        const operatorResult = findActiveOperator(draft, operatorId);
        if (!operatorResult.ok) return operatorResult;
        const operator = operatorResult.value;

        const part = draft.parts.find((p) => p.id === partId);
        if (!part) return fail('PECA_NAO_ENCONTRADA', 'Peça não encontrada.');

        const eligible = checkEligibility(operator, part);
        if (!eligible.ok) return eligible;

        const timestamp = repo.clock.now().toISOString();
        const stage = part.currentStage;
        const stageIndex = STAGE_ORDER.indexOf(stage);
        const nextStage = STAGE_ORDER[stageIndex + 1] ?? null;
        const isFinal = nextStage === null;

        const event: PartEvent = {
          id: nextId('evt', draft.events),
          partId: part.id,
          partNumber: part.number,
          operatorId: operator.id,
          operatorName: operator.name,
          operatorRegistration: operator.registration,
          stage,
          type: isFinal ? 'conclusao' : 'validacao',
          result: isFinal ? 'concluida' : 'aprovada',
          timestamp,
          note: null,
        };
        draft.events.push(event);

        const notifications: AppNotification[] = [];
        let dossierId: string | null = null;

        if (nextStage) {
          part.currentStage = nextStage;
          part.stageEnteredAt = timestamp;
          part.stageStatus = 'aguardando_validacao';

          for (const recipient of draft.operators) {
            if (!recipient.active || recipient.stage !== nextStage) continue;
            notifications.push(
              appendNotification(draft, {
                recipientOperatorId: recipient.id,
                content: partAvailableContent({
                  partNumber: part.number,
                  fromStage: stage,
                  toStage: nextStage,
                  approvedByName: operator.name,
                }),
                partId: part.id,
                partNumber: part.number,
                reviewId: null,
                createdAt: timestamp,
              }),
            );
          }
        } else {
          part.status = 'concluida';
          part.stageStatus = 'aprovada_na_etapa';
          part.completedAt = timestamp;
          dossierId = ensureDossier(draft, part, timestamp).dossier.id;
        }

        return ok<ValidationOutcome>({
          part,
          event,
          nextStage,
          completed: isFinal,
          dossierId,
          notifications,
        });
      });
    },
  };
}
