import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ReviewCard } from '@/components/review-card';
import { AppText, Card, DockTag, EmptyState, InfoRow, LoadingState, Screen, StatusBadge } from '@/components/ui';
import { EVENT_RESULT_LABELS, EVENT_RESULT_TONES, STAGE_LABELS } from '@/constants/labels';
import { useSession } from '@/context/session-context';
import { useServiceQuery } from '@/hooks/use-service-query';
import { services } from '@/services';
import { theme } from '@/theme';
import { formatDate, formatDateTime } from '@/utils/format';

export default function DossierScreen() {
  const { partId } = useLocalSearchParams<{ partId: string }>();
  const { operator } = useSession();
  const operatorId = operator?.id ?? '';
  const query = useServiceQuery(() => services.dossiers.getByPart(operatorId, partId), [operatorId, partId]);

  if (query.loading) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <LoadingState message="Carregando dossiê…" />
      </Screen>
    );
  }
  if (query.error || !query.data) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <EmptyState
          icon="file-document-remove-outline"
          title="Dossiê indisponível"
          description={query.error?.message ?? 'Não foi possível carregar o dossiê.'}
          actionLabel="Tentar de novo"
          onAction={query.reload}
        />
      </Screen>
    );
  }

  const dossier = query.data;

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="label" color={theme.colors.textSecondary}>
          DOSSIÊ
        </AppText>
        <AppText variant="title">Peça {dossier.partNumber}</AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          Gerado em {formatDateTime(dossier.generatedAt)}
        </AppText>
      </View>

      <Card>
        <AppText variant="heading">Identificação</AppText>
        <InfoRow label="Número da peça" value={dossier.partNumber} />
        <InfoRow label="Doca de chegada">
          <DockTag dock={dossier.dock} />
        </InfoRow>
        <InfoRow label="Chegada ao Brasil" value={formatDate(dossier.arrivalDate)} />
        <InfoRow label="Prazo de destruição" value={formatDate(dossier.destructionDeadline)} />
        <InfoRow label="Concluída em" value={formatDateTime(dossier.completedAt)} />
      </Card>

      <View style={{ gap: theme.spacing.md }}>
        <AppText variant="heading">Etapas percorridas</AppText>
        {dossier.stages.map((entry, index) => (
          <Card key={`${entry.stage}-${entry.timestamp}-${index}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
              <AppText variant="bodyStrong">{STAGE_LABELS[entry.stage]}</AppText>
              <StatusBadge label={EVENT_RESULT_LABELS[entry.result]} tone={EVENT_RESULT_TONES[entry.result]} />
            </View>
            <InfoRow label="Operador" value={`${entry.operatorName} · mat. ${entry.operatorRegistration}`} />
            <InfoRow label="Data e hora" value={formatDateTime(entry.timestamp)} />
          </Card>
        ))}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <AppText variant="heading">Histórico de revisões</AppText>
        {dossier.reviews.length === 0 ? (
          <AppText color={theme.colors.textSecondary}>Nenhuma revisão registrada para esta peça.</AppText>
        ) : (
          dossier.reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </View>
    </Screen>
  );
}
