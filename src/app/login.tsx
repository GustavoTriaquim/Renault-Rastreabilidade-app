import { useRef, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';

import { BadgeScanner } from '@/components/badge-scanner';
import { AppText, Button, Card, Icon, Screen, TextField } from '@/components/ui';
import { REGISTRATION_DIGITS } from '@/constants/ocr';
import { useSession } from '@/context/session-context';
import { theme } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [registration, setRegistration] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const busy = useRef(false);

  const attempt = async (value: string) => {
    if (busy.current) return; // toque duplo não dispara duas tentativas
    busy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn(value);
      if (!result.ok) setError(result.error.message);
      // em caso de sucesso, a guarda de rotas leva o operador para a Home
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const handleScanned = (scanned: string) => {
    setScannerOpen(false);
    setRegistration(scanned);
    void attempt(scanned);
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, gap: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.xxxl }}>
          <AppText variant="display">Renault Tracer</AppText>
          <AppText color={theme.colors.textSecondary}>Rastreabilidade de peças de protótipo</AppText>
        </View>

        <Card>
          <AppText variant="heading">Entrar</AppText>
          <TextField
            label="Matrícula"
            identifier
            value={registration}
            onChangeText={(text) => {
              setRegistration(text.replace(/\D/g, '').slice(0, REGISTRATION_DIGITS.maxDigits));
              setError(null);
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={REGISTRATION_DIGITS.maxDigits}
            placeholder="Digite sua matrícula"
            returnKeyType="done"
            onSubmitEditing={() => registration && void attempt(registration)}
            error={error}
            hint={error ? undefined : 'Somente números.'}
          />
          <Button
            label="Entrar"
            icon="login"
            disabled={!registration}
            loading={submitting}
            onPress={() => void attempt(registration)}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
            <AppText variant="caption" color={theme.colors.textSecondary}>
              ou
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
          </View>
          <Button
            label="Ler matrícula do crachá"
            variant="secondary"
            icon="text-recognition"
            disabled={submitting}
            onPress={() => setScannerOpen(true)}
          />
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          <Icon name="information-outline" size={18} color={theme.colors.textSecondary} />
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1 }}>
            A leitura do crachá usa OCR de números impressos. Não há QR Code nem código de barras.
          </AppText>
        </View>
      </KeyboardAvoidingView>

      <BadgeScanner visible={scannerOpen} onClose={() => setScannerOpen(false)} onConfirm={handleScanned} />
    </Screen>
  );
}
