import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { PartImage } from '@/components/part-image';
import { PartStatusBadge } from '@/components/part-status';
import { ReviewCard } from '@/components/review-card';
import { ReviewRequestModal } from '@/components/review-request-modal';
import { Timeline } from '@/components/timeline';
import {
  AppText,
  Button,
  Card,
  DeadlineBadge,
  DockTag,
  EmptyState,
  InfoRow,
  LoadingState,
  Screen,
} from '@/components/ui';
import { STAGE_LABELS, STAGE_STATUS_LABELS } from '@/constants/labels';
import { useData } from '@/context/data-context';
import { useSession } from '@/context/session-context';
import { useDecideReview } from '@/hooks/use-decide-review';
import { useServiceQuery } from '@/hooks/use-service-query';
import { services } from '@/services';
import type { ReviewRequest } from '@/services/review-service';
import { theme } from '@/theme';
import { formatDate, formatDateTime } from '@/utils/format';
import { dossierHref, scannerHref } from '@/utils/routes';

export default function PartDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { operator } = useSession();
  const { invalidate } = useData();
  const operatorId = operator?.id ?? '';
  const [reviewOpen, setReviewOpen] = useState(false);

  const query = useServiceQuery(() => services.parts.getDetails(operatorId, id), [operatorId, id]);
  const decision = useDecideReview();

  if (query.loading) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <LoadingState message="Carregando peça…" />
      </Screen>
    );
  }
  if (query.error || !query.data) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <EmptyState
          icon="cube-off-outline"
          title="Peça indisponível"
          description={query.error?.message ?? 'Não foi possível carregar a peça.'}
          actionLabel="Tentar de novo"
          onAction={query.reload}
        />
      </Screen>
    );
  }

  const { part, band, daysRemaining, timeline, events, reviews, dossier, operators } = query.data;
  const canAct =
    operator?.stage === part.currentStage && part.status === 'em_andamento' && part.stageStatus === 'aguardando_validacao';

  const blockedNotice =
    part.status === 'em_revisao'
      ? 'Peça em revisão: ela não avança até a decisão da análise.'
      : part.status === 'reprovada'
        ? 'Peça reprovada: fora do fluxo normal, não pode ser concluída.'
        : part.status === 'concluida'
          ? 'Peça concluída: a destruição foi validada.'
          : null;

  const submitReview = async (request: ReviewRequest) => {
    const result = await services.reviews.requestReview(operatorId, part.id, request);
    if (!result.ok) return result.error.message;
    invalidate();
    setReviewOpen(false);
    return null;
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Card>
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' }}>
          <PartImage imageKey={part.imageKey} size={88} />
          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            <AppText variant="title">{part.number}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <DockTag dock={part.dock} />
              <DeadlineBadge band={band} daysRemaining={daysRemaining} />
            </View>
            <PartStatusBadge part={part} />
          </View>
        </View>
        <InfoRow label="Chegada ao Brasil" value={formatDate(part.arrivalDate)} />
        <InfoRow label="Prazo de destruição" value={formatDate(part.destructionDeadline)} />
        <InfoRow label="Etapa atual" value={STAGE_LABELS[part.currentStage]} />
        <InfoRow label="Status da etapa" value={STAGE_STATUS_LABELS[part.stageStatus]} />
        <InfoRow label="Na etapa desde" value={formatDateTime(part.stageEnteredAt)} />
        {part.completedAt ? <InfoRow label="Concluída em" value={formatDateTime(part.completedAt)} /> : null}
      </Card>

      {blockedNotice ? <AppText color={theme.colors.textSecondary}>{blockedNotice}</AppText> : null}

      {canAct ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label="Identificar para validar"
            icon="text-recognition"
            onPress={() => router.navigate(scannerHref())}
          />
          <AppText variant="caption" color={theme.colors.textSecondary}>
            A validação exige identificar a peça pelo número impresso (OCR ou digitação) no Scanner.
          </AppText>
          <Button
            label="Enviar para revisão"
            variant="secondary"
            icon="clipboard-text-search-outline"
            onPress={() => setReviewOpen(true)}
          />
        </View>
      ) : null}

      {dossier ? (
        <Button label="Ver dossiê" icon="file-document-outline" onPress={() => router.push(dossierHref(part.id))} />
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        <AppText variant="heading">Linha do tempo</AppText>
        <Card>
          <Timeline steps={timeline} />
        </Card>
      </View>

      {operators.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">Operadores envolvidos</AppText>
          <Card>
            {operators.map((item) => (
              <InfoRow key={item.id} label={`Matrícula ${item.registration}`} value={item.name} />
            ))}
          </Card>
        </View>
      ) : null}

      {reviews.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">Revisões</AppText>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              canDecide={review.requestedByOperatorId === operatorId}
              deciding={decision.deciding}
              onDecide={() => void decision.decide(review.id)}
            />
          ))}
          {decision.error ? (
            <AppText color={theme.colors.error} accessibilityLiveRegion="polite">
              {decision.error}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        <AppText variant="heading">Registros de auditoria</AppText>
        {events.length === 0 ? (
          <AppText color={theme.colors.textSecondary}>Nenhum evento registrado para esta peça ainda.</AppText>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </View>

      <ReviewRequestModal
        visible={reviewOpen}
        partNumber={part.number}
        onClose={() => setReviewOpen(false)}
        onSubmit={submitReview}
      />
    </Screen>
  );
}
