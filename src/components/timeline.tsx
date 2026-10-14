import { StyleSheet, View } from 'react-native';

import { AppText, Icon, type IconName } from '@/components/ui';
import { STAGE_LABELS } from '@/constants/labels';
import type { TimelineState, TimelineStep } from '@/services/part-service';
import { theme } from '@/theme';
import { formatDateTime } from '@/utils/format';

const STATE_VISUALS: Record<TimelineState, { icon: IconName; color: string; label: string }> = {
  aprovada: { icon: 'check-circle', color: theme.colors.success, label: 'Aprovada' },
  pendente: { icon: 'timer-sand', color: theme.colors.pending, label: 'Pendente' },
  em_revisao: { icon: 'clipboard-text-search-outline', color: theme.colors.review, label: 'Em revisão' },
  reprovada: { icon: 'close-circle', color: theme.colors.error, label: 'Reprovada' },
  futura: { icon: 'circle-outline', color: theme.colors.textSecondary, label: 'Ainda não chegou' },
};

/** Linha do tempo das três etapas, distinguindo aprovadas, pendente, revisão e reprovação. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const visual = STATE_VISUALS[step.state];
        const isLast = index === steps.length - 1;
        return (
          <View
            key={step.stage}
            style={styles.row}
            accessible
            accessibilityLabel={`${STAGE_LABELS[step.stage]}: ${visual.label}`}>
            <View style={styles.rail}>
              <Icon name={visual.icon} size={26} color={visual.color} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.body}>
              <AppText variant="bodyStrong">{STAGE_LABELS[step.stage]}</AppText>
              <AppText variant="caption" color={visual.color}>
                {visual.label}
              </AppText>
              {step.event ? (
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {step.event.operatorName} · mat. {step.event.operatorRegistration} ·{' '}
                  {formatDateTime(step.event.timestamp)}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  row: { flexDirection: 'row', gap: theme.spacing.md },
  rail: { alignItems: 'center', width: 26 },
  line: { flex: 1, width: 2, minHeight: 20, backgroundColor: theme.colors.border, marginVertical: 2 },
  body: { flex: 1, gap: 2, paddingBottom: theme.spacing.lg },
});
