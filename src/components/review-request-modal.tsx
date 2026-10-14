import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Chip, TextField } from '@/components/ui';
import { REVIEW_REASON_LABELS } from '@/constants/labels';
import type { ReviewRequest } from '@/services/review-service';
import { theme } from '@/theme';
import type { ReviewReason } from '@/types/domain';

interface ReviewRequestModalProps {
  visible: boolean;
  partNumber: string;
  onClose: () => void;
  /** Devolve a mensagem de erro (para exibir no formulário) ou `null` se deu certo. */
  onSubmit: (request: ReviewRequest) => Promise<string | null>;
}

const REASONS = Object.keys(REVIEW_REASON_LABELS) as ReviewReason[];

function ReviewForm({ partNumber, onClose, onSubmit }: Omit<ReviewRequestModalProps, 'visible'>) {
  const [reason, setReason] = useState<ReviewReason | null>(null);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (!reason) {
      setError('Selecione o motivo da revisão.');
      return;
    }
    if (!justification.trim()) {
      setError('Informe a justificativa da revisão.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const message = await onSubmit({ reason, justification });
    setSubmitting(false);
    if (message) setError(message);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AppText variant="title">Enviar para revisão</AppText>
          <AppText color={theme.colors.textSecondary}>
            Peça {partNumber}. Ela ficará bloqueada, sem avançar, até a decisão da análise.
          </AppText>

          <View style={styles.reasons}>
            {REASONS.map((item) => (
              <Chip
                key={item}
                label={REVIEW_REASON_LABELS[item]}
                selected={reason === item}
                onPress={() => {
                  setReason(item);
                  setError(null);
                }}
              />
            ))}
          </View>

          <TextField
            label="Justificativa"
            placeholder="Descreva o problema identificado"
            value={justification}
            onChangeText={(text) => {
              setJustification(text);
              setError(null);
            }}
            multiline
            error={error}
          />

          <Button label="Enviar para revisão" icon="clipboard-text-search-outline" loading={submitting} onPress={submit} />
          <Button label="Cancelar" variant="secondary" disabled={submitting} onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/** Formulário de revisão: motivo e justificativa obrigatórios. Nada é enviado sem confirmação. */
export function ReviewRequestModal({ visible, ...rest }: ReviewRequestModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent={Platform.OS === 'android'}
      onRequestClose={rest.onClose}>
      {visible ? <ReviewForm {...rest} /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay.scrim },
  sheet: {
    maxHeight: '90%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
  },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
