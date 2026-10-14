import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';
import { Icon, type IconName } from './icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado vazio ou de erro, com ação opcional. */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={44} color={theme.colors.textSecondary} />
      <AppText variant="heading" style={styles.centered}>
        {title}
      </AppText>
      {description ? (
        <AppText color={theme.colors.textSecondary} style={styles.centered}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  centered: { textAlign: 'center' },
});
