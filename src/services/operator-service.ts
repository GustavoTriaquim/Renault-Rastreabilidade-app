import type { Operator } from '@/types/domain';

import { fail, ok, type Result } from './result';
import type { Repository } from './repository';

export function createOperatorService(repo: Repository) {
  return {
    /** Login por matrícula (digitada ou lida por OCR). Sem senha nesta simulação. */
    async authenticate(registration: string): Promise<Result<Operator>> {
      const normalized = registration.trim();
      if (!/^\d{4,12}$/.test(normalized)) {
        return fail('MATRICULA_INVALIDA', 'A matrícula deve conter apenas números (4 a 12 dígitos).');
      }
      const operator = await repo.read((db) => db.operators.find((o) => o.registration === normalized));
      if (!operator) {
        return fail('MATRICULA_INEXISTENTE', 'Matrícula não encontrada.');
      }
      if (!operator.active) {
        return fail('OPERADOR_INATIVO', 'Este operador está inativo.');
      }
      return ok(operator);
    },

    /** Reidrata a sessão a partir do ID salvo, revalidando que o operador segue ativo. */
    async getActiveById(operatorId: string): Promise<Result<Operator>> {
      const operator = await repo.read((db) => db.operators.find((o) => o.id === operatorId));
      if (!operator) {
        return fail('OPERADOR_NAO_ENCONTRADO', 'Operador não encontrado. Entre novamente.');
      }
      if (!operator.active) {
        return fail('OPERADOR_INATIVO', 'Este operador está inativo.');
      }
      return ok(operator);
    },
  };
}
