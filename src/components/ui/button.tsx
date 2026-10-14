import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
}

const { colors } = theme;

function resolveColors(variant: ButtonVariant, pressed: boolean) {
  switch (variant) {
    case 'primary':
      return {
        background: pressed ? colors.accentPressed : colors.accent,
        foreground: colors.textInverse,
        border: 'transparent',
      };
    case 'secondary':
      return {
        background: pressed ? colors.surfaceMuted : colors.surface,
        foreground: colors.text,
        border: colors.border,
      };
    case 'ghost':
      return {
        background: pressed ? colors.accentSoft : 'transparent',
        foreground: colors.accent,
        border: 'transparent',
      };
  }
}

/** Botão com área de toque confortável. Ação principal em vermelho. */
export function Button({
  label,
  variant = 'primary',
  icon,
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      {...rest}>
      {({ pressed }) => {
        const c = resolveColors(variant, pressed);
        return (
          <View
            style={[
              styles.base,
              { backgroundColor: c.background, borderColor: c.border },
              inactive && styles.inactive,
            ]}>
            {loading ? (
              <ActivityIndicator color={c.foreground} />
            ) : (
              <>
                {icon ? <Icon name={icon} size={22} color={c.foreground} /> : null}
                <AppText variant="bodyStrong" color={c.foreground}>
                  {label}
                </AppText>
              </>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touch.buttonHeight,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  inactive: { opacity: 0.45 },
});
