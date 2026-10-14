import { StyleSheet, View } from 'react-native';

import { theme, type Tone } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
}

/** Selo de estado (sucesso, erro, alerta, revisão, pendência). Sempre com texto. */
export function StatusBadge({ label, tone = 'neutral', icon }: StatusBadgeProps) {
  const { foreground, background } = theme.toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {icon ? <Icon name={icon} size={14} color={foreground} /> : null}
      <AppText variant="label" color={foreground}>
        {label}
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
