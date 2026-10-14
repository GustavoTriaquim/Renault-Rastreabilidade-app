import { StatusBadge } from '@/components/ui';
import { PART_STATUS_LABELS, PART_STATUS_TONES, STAGE_STATUS_LABELS, STAGE_STATUS_TONES } from '@/constants/labels';
import type { Part } from '@/types/domain';

/**
 * Selo de status da peça: enquanto a peça está em andamento mostra o status da
 * etapa atual; nos demais casos (revisão, reprovada, concluída) o status geral.
 */
export function PartStatusBadge({ part }: { part: Part }) {
  if (part.status === 'em_andamento') {
    return (
      <StatusBadge
        label={STAGE_STATUS_LABELS[part.stageStatus]}
        tone={STAGE_STATUS_TONES[part.stageStatus]}
        icon="timer-sand"
      />
    );
  }
  const icon =
    part.status === 'concluida'
      ? 'check-circle-outline'
      : part.status === 'em_revisao'
        ? 'clipboard-text-search-outline'
        : 'close-circle-outline';
  return <StatusBadge label={PART_STATUS_LABELS[part.status]} tone={PART_STATUS_TONES[part.status]} icon={icon} />;
}
