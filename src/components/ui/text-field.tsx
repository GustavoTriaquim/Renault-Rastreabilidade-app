import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  error?: string | null;
  hint?: string;
  /** Dígitos de largura fixa, para matrículas e números de peça. */
  identifier?: boolean;
}

/** Campo de texto com rótulo, dica e mensagem de erro. */
export function TextField({
  label,
  error,
  hint,
  identifier = false,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <AppText variant="label" color={theme.colors.textSecondary}>
        {label.toUpperCase()}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textSecondary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          identifier && theme.typography.identifier,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.error,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={theme.colors.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={theme.colors.textSecondary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.xs },
  input: {
    minHeight: 56,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: 18,
  },
  multiline: { minHeight: 112 },
  focused: { borderColor: theme.colors.text, borderWidth: 2 },
  error: { borderColor: theme.colors.error, borderWidth: 2 },
});
