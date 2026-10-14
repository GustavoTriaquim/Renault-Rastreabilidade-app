import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { PartImage } from '@/components/part-image';
import { PartStatusBadge } from '@/components/part-status';
import { ReviewCard } from '@/components/review-card';
import { AppText, Button, Card, DeadlineBadge, DockTag, EmptyState, InfoRow, LoadingState, Screen } from '@/components/ui';
import { STAGE_LABELS } from '@/constants/labels';
import { useData } from '@/context/data-context';
import { useSession } from '@/context/session-context';
import { useDecideReview } from '@/hooks/use-decide-review';
import { services, type ServiceError } from '@/services';
import type { NotificationDetails } from '@/services/notification-service';
import { theme } from '@/theme';
import { formatDate, formatDateTime } from '@/utils/format';
import { partHref } from '@/utils/routes';

type LoadState =
  | { name: 'loading' }
  | { name: 'error'; error: ServiceError }
  | { name: 'ready'; details: NotificationDetails };

export default function NotificationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { operator } = useSession();
  const { invalidate } = useData();
  const operatorId = operator?.id ?? '';

  const [state, setState] = useState<LoadState>({ name: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const decision = useDecideReview(() => setReloadKey((key) => key + 1));

  // Abrir a notificação a marca como lida (uma vez por abertura).
  useEffect(() => {
    let cancelled = false;
    services.notifications.open(operatorId, id).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ name: 'ready', details: result.value });
        invalidate();
      } else {
        setState({ name: 'error', error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [operatorId, id, reloadKey, invalidate]);

  if (state.name === 'loading') {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <LoadingState />
      </Screen>
    );
  }

  if (state.name === 'error') {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <EmptyState icon="bell-off-outline" title="Notificação indisponível" description={state.error.message} />
      </Screen>
    );
  }

  const { notification, part, review, partAccessible } = state.details;

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="title">{notification.title}</AppText>
        <AppText color={theme.colors.textSecondary}>{notification.summary}</AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          {formatDateTime(notification.createdAt)}
        </AppText>
      </View>

      {part ? (
        <Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' }}>
            <PartImage imageKey={part.part.imageKey} size={72} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <AppText variant="identifier">{part.part.number}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                <DockTag dock={part.part.dock} />
                <DeadlineBadge band={part.band} daysRemaining={part.daysRemaining} />
              </View>
            </View>
          </View>
          <InfoRow label="Etapa atual" value={STAGE_LABELS[part.part.currentStage]} />
          <InfoRow label="Prazo de destruição" value={formatDate(part.part.destructionDeadline)} />
          <InfoRow label="Status">
            <PartStatusBadge part={part.part} />
          </InfoRow>
        </Card>
      ) : null}

      {review ? (
        <ReviewCard
          review={review}
          canDecide={review.requestedByOperatorId === operatorId}
          deciding={decision.deciding}
          onDecide={() => void decision.decide(review.id)}
        />
      ) : null}
      {decision.error ? (
        <AppText color={theme.colors.error} accessibilityLiveRegion="polite">
          {decision.error}
        </AppText>
      ) : null}

      {part && partAccessible ? (
        <Button label="Ver detalhes completos da peça" icon="cube-outline" onPress={() => router.push(partHref(part.part.id))} />
      ) : null}
    </Screen>
  );
}
