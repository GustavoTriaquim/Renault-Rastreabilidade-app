import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { NumberCapture } from '@/components/number-capture';
import { PartImage } from '@/components/part-image';
import { PartStatusBadge } from '@/components/part-status';
import { ReviewRequestModal } from '@/components/review-request-modal';
import {
  AppText,
  Button,
  Card,
  DeadlineBadge,
  DockTag,
  Icon,
  InfoRow,
  Screen,
  ScreenHeader,
} from '@/components/ui';
import { STAGE_LABELS } from '@/constants/labels';
import { PART_NUMBER_DIGITS } from '@/constants/ocr';
import { useData } from '@/context/data-context';
import { useSession } from '@/context/session-context';
import { readPartNumber } from '@/services/ocr';
import { services } from '@/services';
import type { PartSummary } from '@/services/part-service';
import type { ReviewRequest } from '@/services/review-service';
import type { ValidationOutcome } from '@/services/validation-service';
import { theme } from '@/theme';
import { formatDate, formatDateTime } from '@/utils/format';
import { dossierHref, partHref } from '@/utils/routes';

type ScanState =
  | { name: 'capture'; error: string | null }
  | { name: 'found'; summary: PartSummary }
  | { name: 'validated'; outcome: ValidationOutcome }
  | { name: 'review_sent'; partId: string; partNumber: string };

export default function ScannerScreen() {
  const router = useRouter();
  const { operator } = useSession();
  const { invalidate } = useData();
  const operatorId = operator?.id ?? '';

  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<ScanState>({ name: 'capture', error: null });
  const [looking, setLooking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // a câmera só fica ligada com a aba em foco
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const restart = () => {
    setActionError(null);
    setState({ name: 'capture', error: null });
  };

  const lookup = async (number: string) => {
    if (looking) return;
    setLooking(true);
    const result = await services.parts.lookupForValidation(operatorId, number);
    setLooking(false);
    setActionError(null);
    setState(
      result.ok
        ? { name: 'found', summary: result.value }
        : { name: 'capture', error: result.error.message },
    );
  };

  // Nada é gravado antes desta confirmação explícita.
  const confirmValidation = async (partId: string) => {
    if (confirming) return;
    setConfirming(true);
    setActionError(null);
    const result = await services.validation.validate(operatorId, partId);
    setConfirming(false);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    invalidate();
    setState({ name: 'validated', outcome: result.value });
  };

  const submitReview = async (partId: string, partNumber: string, request: ReviewRequest) => {
    const result = await services.reviews.requestReview(operatorId, partId, request);
    if (!result.ok) return result.error.message;
    invalidate();
    setReviewOpen(false);
    setState({ name: 'review_sent', partId, partNumber });
    return null;
  };

  if (state.name === 'capture') {
    return (
      <View style={{ flex: 1 }}>
        <NumberCapture
          title="Ler peça"
          frameHint="Enquadre o número impresso na peça ou na etiqueta"
          fieldLabel="Número da peça"
          digits={PART_NUMBER_DIGITS}
          readNumber={readPartNumber}
          confirmLabel="Consultar peça"
          onConfirm={lookup}
          active={focused}
          busy={looking}
          edges={['top', 'left', 'right']}
        />
        {state.error ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              position: 'absolute',
              left: theme.spacing.lg,
              right: theme.spacing.lg,
              top: theme.spacing.xxxl + theme.spacing.xl,
            }}>
            <Card style={{ borderColor: theme.colors.error }}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
                <Icon name="alert-circle-outline" size={22} color={theme.colors.error} />
                <AppText variant="bodyStrong" color={theme.colors.error} style={{ flex: 1 }}>
                  {state.error}
                </AppText>
              </View>
            </Card>
          </View>
        ) : null}
      </View>
    );
  }

  if (state.name === 'found') {
    const { part, band, daysRemaining } = state.summary;
    const isFinal = part.currentStage === 'destruicao';
    return (
      <Screen>
        <ScreenHeader title="Confirmar validação" subtitle="Confira a peça. Nada é registrado até você confirmar." />

        <Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' }}>
            <PartImage imageKey={part.imageKey} size={72} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <AppText variant="identifier">{part.number}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                <DockTag dock={part.dock} />
                <DeadlineBadge band={band} daysRemaining={daysRemaining} />
              </View>
            </View>
          </View>
          <InfoRow label="Etapa atual" value={STAGE_LABELS[part.currentStage]} />
          <InfoRow label="Prazo de destruição" value={formatDate(part.destructionDeadline)} />
          <InfoRow label="Na etapa desde" value={formatDateTime(part.stageEnteredAt)} />
          <InfoRow label="Status">
            <PartStatusBadge part={part} />
          </InfoRow>
          <AppText color={theme.colors.textSecondary}>
            {isFinal
              ? 'Ao confirmar, a destruição é validada, a peça é concluída e o dossiê é gerado.'
              : 'Ao confirmar, a peça é aprovada nesta etapa e fica disponível para a próxima.'}
          </AppText>
        </Card>

        {actionError ? (
          <AppText color={theme.colors.error} accessibilityLiveRegion="polite">
            {actionError}
          </AppText>
        ) : null}

        <Button
          label={isFinal ? 'Confirmar destruição' : 'Confirmar validação'}
          icon="check-circle-outline"
          loading={confirming}
          onPress={() => confirmValidation(part.id)}
        />
        <Button
          label="Enviar para revisão"
          variant="secondary"
          icon="clipboard-text-search-outline"
          disabled={confirming}
          onPress={() => setReviewOpen(true)}
        />
        <Button label="Cancelar" variant="ghost" disabled={confirming} onPress={restart} />

        <ReviewRequestModal
          visible={reviewOpen}
          partNumber={part.number}
          onClose={() => setReviewOpen(false)}
          onSubmit={(request) => submitReview(part.id, part.number, request)}
        />
      </Screen>
    );
  }

  if (state.name === 'validated') {
    const { outcome } = state;
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.xl }}>
          <Icon name="check-circle" size={64} color={theme.colors.success} />
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {outcome.completed ? 'Destruição concluída' : 'Peça validada'}
          </AppText>
          <AppText color={theme.colors.textSecondary} style={{ textAlign: 'center' }}>
            {outcome.completed
              ? `A peça ${outcome.part.number} foi concluída e o dossiê foi gerado.`
              : `A peça ${outcome.part.number} foi aprovada em ${STAGE_LABELS[outcome.event.stage]} e agora aguarda validação em ${STAGE_LABELS[outcome.nextStage ?? outcome.event.stage]}.`}
          </AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            Registrado em {formatDateTime(outcome.event.timestamp)} por {outcome.event.operatorName}
          </AppText>
        </View>
        {outcome.completed ? (
          <Button label="Ver dossiê" icon="file-document-outline" onPress={() => router.push(dossierHref(outcome.part.id))} />
        ) : null}
        <Button
          label="Ver detalhes da peça"
          variant={outcome.completed ? 'secondary' : 'primary'}
          icon="cube-outline"
          onPress={() => router.push(partHref(outcome.part.id))}
        />
        <Button label="Ler outra peça" variant="secondary" icon="text-recognition" onPress={restart} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.xl }}>
        <Icon name="clipboard-text-search-outline" size={64} color={theme.colors.review} />
        <AppText variant="title" style={{ textAlign: 'center' }}>
          Peça enviada para revisão
        </AppText>
        <AppText color={theme.colors.textSecondary} style={{ textAlign: 'center' }}>
          A peça {state.partNumber} ficou bloqueada até a decisão da análise. Você receberá um aviso.
        </AppText>
      </View>
      <Button label="Ver detalhes da peça" icon="cube-outline" onPress={() => router.push(partHref(state.partId))} />
      <Button label="Ler outra peça" variant="secondary" icon="text-recognition" onPress={restart} />
    </Screen>
  );
}
