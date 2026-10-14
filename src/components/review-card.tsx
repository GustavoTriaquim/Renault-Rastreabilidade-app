import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, InfoRow, StatusBadge } from '@/components/ui';
import {
  REVIEW_REASON_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_TONES,
  STAGE_LABELS,
} from '@/constants/labels';
import { theme } from '@/theme';
import type { Review } from '@/types/domain';
import { formatDateTime } from '@/utils/format';

interface ReviewCardProps {
  review: Review;
  /** Mostra o botão que dispara a decisão simulada (revisões em análise do próprio operador). */
  canDecide?: boolean;
  deciding?: boolean;
  onDecide?: () => void;
}

/** Revisão completa: pedido original, decisão, responsável e destino da peça. */
export function ReviewCard({ review, canDecide = false, deciding = false, onDecide }: ReviewCardProps) {
  const { decision } = review;

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading">Revisão</AppText>
        <StatusBadge label={REVIEW_STATUS_LABELS[review.status]} tone={REVIEW_STATUS_TONES[review.status]} />
      </View>

      <InfoRow label="Etapa do problema" value={STAGE_LABELS[review.stage]} />
      <InfoRow label="Motivo" value={REVIEW_REASON_LABELS[review.reason]} />
      <InfoRow label="Solicitada por" value={review.requestedByOperatorName} />
      <InfoRow label="Data e hora da solicitação" value={formatDateTime(review.requestedAt)} />
      <InfoRow label="Justificativa original" value={review.justification} />

      {decision ? (
        <>
          <View style={styles.divider} />
          <InfoRow label="Analisada por" value={decision.decidedByOperatorName} />
          <InfoRow label="Data e hora da decisão" value={formatDateTime(decision.decidedAt)} />
          <InfoRow label="Justificativa da decisão" value={decision.justification} />
          <InfoRow
            label="Destino da peça"
            value={
              decision.destinationStage
                ? `Retorna para ${STAGE_LABELS[decision.destinationStage]}`
                : 'Reprovada: fora do fluxo normal'
            }
          />
        </>
      ) : (
        <>
          <View style={styles.divider} />
          <AppText color={theme.colors.textSecondary}>
            Aguardando a decisão da análise. A peça fica bloqueada até lá.
          </AppText>
          {canDecide && onDecide ? (
            <Button
              label="Simular decisão da análise"
              variant="secondary"
              icon="gavel"
              loading={deciding}
              onPress={onDecide}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.border },
});
