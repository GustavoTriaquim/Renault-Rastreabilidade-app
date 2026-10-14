import { Text, type TextProps } from 'react-native';

import { theme, type TypographyVariant } from '@/theme';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

/** Texto com a escala tipográfica do design system. */
export function AppText({
  variant = 'body',
  color = theme.colors.text,
  style,
  ...rest
}: AppTextProps) {
  return <Text style={[theme.typography[variant], { color }, style]} {...rest} />;
}
