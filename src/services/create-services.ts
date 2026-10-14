import { PERSIST_SESSION } from '@/constants/session';

import { createDossierService } from './dossier-service';
import { createEventService } from './event-service';
import { createNotificationService } from './notification-service';
import { createOperatorService } from './operator-service';
import { createPartService } from './part-service';
import type { Repository } from './repository';
import { createReviewService } from './review-service';
import { createSessionService } from './session-service';
import { createMemoryStorage, type KeyValueStorage } from './storage';
import { createValidationService } from './validation-service';

/**
 * Monta todos os serviços sobre um repositório (testes usam armazenamento em memória).
 * `sessionStorage` guarda só a sessão do operador, separada dos dados da simulação.
 */
export function createServices(
  repo: Repository,
  sessionStorage: KeyValueStorage = createMemoryStorage(),
) {
  const operators = createOperatorService(repo);
  return {
    operators,
    session: createSessionService(sessionStorage, operators, { persist: PERSIST_SESSION }),
    parts: createPartService(repo),
    validation: createValidationService(repo),
    reviews: createReviewService(repo),
    events: createEventService(repo),
    notifications: createNotificationService(repo),
    dossiers: createDossierService(repo),
    /** Volta aos dados iniciais (demonstração). */
    resetData: () => repo.reset(),
  };
}

export type Services = ReturnType<typeof createServices>;
