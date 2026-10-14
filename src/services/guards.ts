import { STAGE_LABELS } from '@/constants/labels';
import type { Operator, Part } from '@/types/domain';

import type { Database } from './database';
import { fail, ok, type Result } from './result';

export function findActiveOperator(db: Readonly<Database>, operatorId: string): Result<Operator> {
  const operator = db.operators.find((o) => o.id === operatorId);
  if (!operator) {
    return fail('OPERADOR_NAO_ENCONTRADO', 'Operador não encontrado. Entre novamente.');
  }
  if (!operator.active) {
    return fail('OPERADOR_INATIVO', 'Este operador está inativo e não pode registrar operações.');
  }
  return ok(operator);
}

/**
 * Regra de visibilidade: o operador só enxerga peças da fila da sua etapa ou
 * peças que ele próprio já tratou (histórico). Nunca peças de outras etapas.
 */
export function canAccessPart(db: Readonly<Database>, operator: Operator, part: Part): boolean {
  return (
    part.currentStage === operator.stage ||
    db.events.some((event) => event.partId === part.id && event.operatorId === operator.id)
  );
}

/**
 * A peça pode receber uma validação ou um pedido de revisão deste operador agora?
 * A mensagem de etapa incompatível não revela onde a peça está.
 */
export function checkEligibility(operator: Operator, part: Part): Result<Part> {
  if (part.currentStage !== operator.stage) {
    return fail(
      'ETAPA_INCOMPATIVEL',
      `A peça ${part.number} não está disponível para a etapa ${STAGE_LABELS[operator.stage]}.`,
    );
  }
  if (part.status === 'concluida') {
    return fail('PECA_CONCLUIDA', `A peça ${part.number} já foi concluída.`);
  }
  if (part.status === 'reprovada') {
    return fail('PECA_REPROVADA', `A peça ${part.number} foi reprovada e não segue o fluxo normal.`);
  }
  if (part.status === 'em_revisao') {
    return fail('PECA_EM_REVISAO', `A peça ${part.number} está em revisão e não pode avançar.`);
  }
  if (part.stageStatus !== 'aguardando_validacao') {
    return fail('JA_VALIDADA', `A peça ${part.number} já foi validada nesta etapa.`);
  }
  return ok(part);
}
