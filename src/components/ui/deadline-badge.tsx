import { StyleSheet, View } from 'react-native';

import { DEADLINE_LABELS } from '@/constants/labels';
import { theme } from '@/theme';
import type { DeadlineBand } from '@/types/domain';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

interface DeadlineBadgeProps {
  band: DeadlineBand;
  /** Dias restantes, quando conhecidos (negativo = dias de atraso). */
  daysRemaining?: number;
}

const ICONS: Record<DeadlineBand, IconName> = {
  leve: 'clock-outline',
  medio: 'clock-alert-outline',
  urgente: 'alert-circle-outline',
  vencido: 'calendar-remove-outline',
};

function describe(band: DeadlineBand, days?: number): string {
  const label = DEADLINE_LABELS[band];
  if (days === undefined) return label;
  if (days < 0) return `${label} · ${Math.abs(days)} d de atraso`;
  return `${label} · ${days} d`;
}

/** Alerta de prazo de destruição. Texto e ícone acompanham a cor. */
export function DeadlineBadge({ band, daysRemaining }: DeadlineBadgeProps) {
  const { background, foreground } = theme.deadlineColors[band];
  const text = describe(band, daysRemaining);

  return (
    <View
      accessible
      accessibilityLabel={`Prazo: ${text}`}
      style={[styles.badge, { backgroundColor: background }]}>
      <Icon name={ICONS[band]} size={14} color={foreground} />
      <AppText variant="label" color={foreground}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
});
