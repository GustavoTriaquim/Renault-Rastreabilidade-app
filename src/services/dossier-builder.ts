import type { Dossier, Part, PartEvent, Review } from '@/types/domain';

/**
 * Monta o dossiê de uma peça concluída a partir da trilha de auditoria.
 * Função pura: o seed e o serviço de conclusão usam exatamente a mesma regra.
 */
export function buildDossier(input: {
  part: Part;
  events: readonly PartEvent[];
  reviews: readonly Review[];
  completedAt: string;
  generatedAt: string;
}): Dossier {
  const { part } = input;

  const stages = input.events
    .filter(
      (event) =>
        event.partId === part.id &&
        ((event.type === 'validacao' && event.result === 'aprovada') || event.type === 'conclusao'),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((event) => ({
      stage: event.stage,
      operatorId: event.operatorId,
      operatorName: event.operatorName,
      operatorRegistration: event.operatorRegistration,
      timestamp: event.timestamp,
      result: event.result,
    }));

  return {
    id: `dossier-${part.id}`,
    partId: part.id,
    partNumber: part.number,
    dock: part.dock,
    arrivalDate: part.arrivalDate,
    destructionDeadline: part.destructionDeadline,
    stages,
    reviews: input.reviews.filter((review) => review.partId === part.id),
    completedAt: input.completedAt,
    generatedAt: input.generatedAt,
  };
}
