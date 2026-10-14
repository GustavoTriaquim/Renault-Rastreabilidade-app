import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, StatusBadge } from '@/components/ui';
import {
  EVENT_RESULT_LABELS,
  EVENT_RESULT_TONES,
  EVENT_TYPE_LABELS,
  STAGE_LABELS,
} from '@/constants/labels';
import { theme } from '@/theme';
import type { PartEvent } from '@/types/domain';
import { formatDateTime } from '@/utils/format';

interface EventCardProps {
  event: PartEvent;
  /** Quando informado, o card inteiro abre os detalhes da peça. */
  onPress?: () => void;
}

/** Evento de auditoria: peça, etapa, resultado, operador, matrícula, data e hora. */
export function EventCard({ event, onPress }: EventCardProps) {
  const content = (
    <Card>
      <View style={styles.header}>
        <AppText variant="identifier">{event.partNumber}</AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          {formatDateTime(event.timestamp)}
        </AppText>
      </View>
      <View style={styles.badges}>
        <StatusBadge label={EVENT_TYPE_LABELS[event.type]} tone="neutral" />
        <StatusBadge label={EVENT_RESULT_LABELS[event.result]} tone={EVENT_RESULT_TONES[event.result]} />
      </View>
      <AppText variant="caption" color={theme.colors.textSecondary}>
        Etapa: {STAGE_LABELS[event.stage]} · {event.operatorName} · mat. {event.operatorRegistration}
      </AppText>
      {event.note ? <AppText variant="caption">{event.note}</AppText> : null}
    </Card>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${EVENT_TYPE_LABELS[event.type]} da peça ${event.partNumber}. Abrir detalhes`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  pressed: { opacity: 0.85 },
});
