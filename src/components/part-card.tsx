import { Pressable, StyleSheet, View } from 'react-native';

import { PartImage } from '@/components/part-image';
import { PartStatusBadge } from '@/components/part-status';
import { AppText, Card, DeadlineBadge, DockTag } from '@/components/ui';
import { STAGE_LABELS } from '@/constants/labels';
import type { PartSummary } from '@/services/part-service';
import { theme } from '@/theme';
import { formatDateTime } from '@/utils/format';

interface PartCardProps {
  summary: PartSummary;
  onPress: () => void;
  /** Mostra desde quando a peça está na etapa (a fila é por ordem de chegada). */
  showStageEntry?: boolean;
}

/** Card reutilizável de peça: número, imagem, doca, prazo, etapa e status. */
export function PartCard({ summary, onPress, showStageEntry = false }: PartCardProps) {
  const { part, band, daysRemaining } = summary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Peça ${part.number}, doca ${part.dock}, etapa ${STAGE_LABELS[part.currentStage]}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <PartImage imageKey={part.imageKey} />
        <View style={styles.content}>
          <AppText variant="identifier">{part.number}</AppText>
          <View style={styles.badges}>
            <DockTag dock={part.dock} />
            <DeadlineBadge band={band} daysRemaining={daysRemaining} />
          </View>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            Etapa: {STAGE_LABELS[part.currentStage]}
            {showStageEntry ? ` · na etapa desde ${formatDateTime(part.stageEnteredAt)}` : ''}
          </AppText>
          <PartStatusBadge part={part} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'flex-start' },
  content: { flex: 1, gap: theme.spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
