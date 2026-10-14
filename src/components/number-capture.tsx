import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { AppText, Button, Card, Icon, LoadingState, TextField } from '@/components/ui';
import type { OcrCandidate, OcrReadResult } from '@/services/ocr';
import { theme } from '@/theme';

interface DigitRange {
  minDigits: number;
  maxDigits: number;
}

export interface NumberCaptureProps {
  title: string;
  /** Orientação sob a moldura (ex.: "Enquadre os números do crachá"). */
  frameHint: string;
  fieldLabel: string;
  digits: DigitRange;
  /** Lê os números da foto. É a única ligação com o OCR; trocar o motor não muda esta tela. */
  readNumber: (imageUri: string) => Promise<OcrReadResult>;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  /** Mostra o botão de fechar na câmera. */
  onCancel?: () => void;
  /** A câmera só fica ligada enquanto verdadeiro (ex.: aba em foco). */
  active?: boolean;
  /** O pai está processando a confirmação (consulta/registro). */
  busy?: boolean;
  edges?: Edge[];
}

type Phase =
  | { name: 'aiming' }
  | { name: 'reading' }
  | { name: 'result'; read: OcrReadResult }
  | { name: 'manual' }
  | { name: 'camera_error'; message: string };

const FAILURE_COPY: Record<'no_text' | 'no_numbers' | 'unavailable', { title: string; text: string }> = {
  no_text: {
    title: 'Nenhum texto detectado',
    text: 'Aproxime a câmera, melhore a iluminação e tente de novo. Você também pode digitar o número.',
  },
  no_numbers: {
    title: 'Não encontrei o número',
    text: 'Foi lido texto, mas nenhum número no formato esperado. Enquadre só a área numerada ou digite o número.',
  },
  unavailable: {
    title: 'Leitura por OCR indisponível',
    text: 'Este app foi aberto sem o módulo de reconhecimento de texto (ele exige o development build). Digite o número.',
  },
};

function sanitize(text: string, maxDigits: number): string {
  return text.replace(/\D/g, '').slice(0, maxDigits);
}

function candidateNote(candidate: OcrCandidate | undefined): string | null {
  if (!candidate) return null;
  if (candidate.kind === 'corrected') {
    return `Letras parecidas com números foram convertidas (lido: ${candidate.raw}). Confira com atenção.`;
  }
  if (candidate.kind === 'joined') {
    return `Blocos de números foram unidos (lido: ${candidate.raw}). Confira com atenção.`;
  }
  return null;
}

/**
 * Captura de número por câmera + OCR, com confirmação e correção manual.
 * Nada é consultado nem registrado aqui: o número só sai por `onConfirm`, depois
 * de o operador conferir (ou corrigir) o valor.
 */
export function NumberCapture({
  title,
  frameHint,
  fieldLabel,
  digits,
  readNumber,
  confirmLabel,
  onConfirm,
  onCancel,
  active = true,
  busy = false,
  edges = ['top', 'bottom', 'left', 'right'],
}: NumberCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const capturing = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: 'aiming' });
  const [value, setValue] = useState('');

  useEffect(() => {
    // a câmera desmontada (aba fora de foco) precisa avisar de novo quando estiver pronta
    if (!active) setCameraReady(false);
  }, [active]);

  const goToCamera = () => {
    setCameraReady(false);
    setValue('');
    setPhase({ name: 'aiming' });
  };

  const capture = async () => {
    if (!cameraReady || !cameraRef.current || capturing.current) return;
    capturing.current = true;
    setPhase({ name: 'reading' });
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Foto vazia.');
      const read = await readNumber(photo.uri);
      // com um único candidato o campo já vem preenchido; com vários, o operador escolhe
      setValue(
        read.status === 'ok' && read.candidates.length === 1 ? sanitize(read.candidates[0].value, digits.maxDigits) : '',
      );
      setPhase({ name: 'result', read });
    } catch {
      setPhase({ name: 'result', read: { status: 'error', message: 'Não foi possível capturar a foto. Tente novamente.' } });
    } finally {
      capturing.current = false;
    }
  };

  const valid = value.length >= digits.minDigits && value.length <= digits.maxDigits;

  // ---------- câmera ----------
  const showCamera = phase.name === 'aiming' || phase.name === 'reading';

  if (showCamera && permission === null) {
    return (
      <SafeAreaView edges={edges} style={styles.root}>
        <LoadingState message="Preparando a câmera…" />
      </SafeAreaView>
    );
  }

  if (showCamera && !permission?.granted) {
    return (
      <SafeAreaView edges={edges} style={styles.root}>
        <ScrollView contentContainerStyle={styles.panel} keyboardShouldPersistTaps="handled">
          <Icon name="camera-off-outline" size={44} color={theme.colors.textSecondary} />
          <AppText variant="title">Permissão da câmera</AppText>
          <AppText color={theme.colors.textSecondary}>
            A câmera é usada apenas para ler números impressos. Sem ela, você ainda pode digitar o número.
          </AppText>
          {permission?.canAskAgain === false ? (
            <Button label="Abrir configurações do aparelho" icon="cog-outline" onPress={() => Linking.openSettings()} />
          ) : (
            <Button label="Permitir câmera" icon="camera-outline" onPress={() => requestPermission()} />
          )}
          <Button label="Digitar manualmente" variant="secondary" icon="keyboard-outline" onPress={() => setPhase({ name: 'manual' })} />
          {onCancel ? <Button label="Cancelar" variant="ghost" onPress={onCancel} /> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.camera}>
        {active ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            onMountError={({ message }) => setPhase({ name: 'camera_error', message })}
          />
        ) : null}
        <SafeAreaView edges={edges} style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            {onCancel ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar câmera" onPress={onCancel} style={styles.iconButton}>
                <Icon name="close" size={26} color={theme.colors.textInverse} />
              </Pressable>
            ) : null}
            <AppText variant="heading" color={theme.colors.textInverse}>
              {title}
            </AppText>
          </View>

          <View style={styles.frameArea} pointerEvents="none">
            <View style={styles.frame} />
            <AppText color={theme.colors.textInverse} style={styles.hint}>
              {frameHint}
            </AppText>
          </View>

          <View style={styles.bottomBar}>
            {phase.name === 'reading' ? (
              <View style={styles.reading}>
                <LoadingState message="Lendo o número…" />
              </View>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Capturar foto"
                  accessibilityState={{ disabled: !cameraReady }}
                  disabled={!cameraReady}
                  onPress={capture}
                  style={[styles.shutter, !cameraReady && styles.shutterDisabled]}>
                  <View style={styles.shutterInner} />
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setPhase({ name: 'manual' })} style={styles.manualLink}>
                  <AppText variant="bodyStrong" color={theme.colors.textInverse}>
                    Digitar manualmente
                  </AppText>
                </Pressable>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ---------- erro de câmera ----------
  if (phase.name === 'camera_error') {
    return (
      <SafeAreaView edges={edges} style={styles.root}>
        <ScrollView contentContainerStyle={styles.panel} keyboardShouldPersistTaps="handled">
          <Icon name="camera-off-outline" size={44} color={theme.colors.error} />
          <AppText variant="title">Câmera indisponível</AppText>
          <AppText color={theme.colors.textSecondary}>
            Não foi possível abrir a câmera. Digite o número manualmente. ({phase.message})
          </AppText>
          <Button label="Digitar manualmente" icon="keyboard-outline" onPress={() => setPhase({ name: 'manual' })} />
          <Button label="Tentar a câmera de novo" variant="secondary" onPress={goToCamera} />
          {onCancel ? <Button label="Cancelar" variant="ghost" onPress={onCancel} /> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- resultado / digitação ----------
  const read = phase.name === 'result' ? phase.read : null;
  const candidates = read?.status === 'ok' ? read.candidates : [];
  const selected = candidates.find((candidate) => candidate.value === value);
  const failure =
    read && (read.status === 'no_text' || read.status === 'no_numbers' || read.status === 'unavailable')
      ? FAILURE_COPY[read.status]
      : null;

  return (
    <SafeAreaView edges={edges} style={styles.root}>
      <ScrollView contentContainerStyle={styles.panel} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppText variant="title">{read ? 'Confira o número' : title}</AppText>

        {read?.status === 'ok' ? (
          candidates.length > 1 ? (
            <AppText color={theme.colors.textSecondary}>
              Foram lidos vários números. Toque no que corresponde ao {fieldLabel.toLowerCase()}.
            </AppText>
          ) : (
            <AppText color={theme.colors.textSecondary}>
              Confira o número lido. Se estiver errado, corrija no campo abaixo.
            </AppText>
          )
        ) : null}

        {read?.status === 'partial' ? (
          <Card>
            <AppText variant="heading">Leitura parcial</AppText>
            <AppText color={theme.colors.textSecondary}>
              Só foi possível ler {read.fragments.join(', ')}. Tire outra foto mais de perto ou complete o número no campo.
            </AppText>
          </Card>
        ) : null}

        {read?.status === 'error' ? (
          <Card>
            <AppText variant="heading">Não foi possível ler</AppText>
            <AppText color={theme.colors.textSecondary}>{read.message}</AppText>
          </Card>
        ) : null}

        {failure ? (
          <Card>
            <AppText variant="heading">{failure.title}</AppText>
            <AppText color={theme.colors.textSecondary}>{failure.text}</AppText>
          </Card>
        ) : null}

        {candidates.length > 1 ? (
          <View style={styles.candidates}>
            {candidates.map((candidate) => {
              const isSelected = candidate.value === value;
              return (
                <Pressable
                  key={candidate.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Número ${candidate.value}`}
                  onPress={() => setValue(sanitize(candidate.value, digits.maxDigits))}
                  style={[styles.candidate, isSelected && styles.candidateSelected]}>
                  <Icon
                    name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={22}
                    color={isSelected ? theme.colors.accent : theme.colors.textSecondary}
                  />
                  <AppText variant="identifier">{candidate.value}</AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <TextField
          label={fieldLabel}
          identifier
          value={value}
          onChangeText={(text) => setValue(sanitize(text, digits.maxDigits))}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={digits.maxDigits}
          placeholder={`${digits.minDigits === digits.maxDigits ? digits.minDigits : `${digits.minDigits} a ${digits.maxDigits}`} dígitos`}
          hint="Você pode corrigir o número se a leitura estiver errada."
          returnKeyType="done"
          onSubmitEditing={() => valid && !busy && onConfirm(value)}
        />

        {candidateNote(selected) ? (
          <AppText variant="caption" color={theme.colors.warning}>
            {candidateNote(selected)}
          </AppText>
        ) : null}

        <Button label={confirmLabel} icon="check" disabled={!valid} loading={busy} onPress={() => onConfirm(value)} />
        <Button label="Ler com a câmera" variant="secondary" icon="camera-outline" disabled={busy} onPress={goToCamera} />
        {onCancel ? <Button label="Cancelar" variant="ghost" disabled={busy} onPress={onCancel} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  panel: { flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.lg, justifyContent: 'center' },
  camera: { flex: 1, backgroundColor: theme.overlay.cameraBackground },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.overlay.scrim,
  },
  iconButton: {
    width: theme.touch.minSize,
    height: theme.touch.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameArea: { alignItems: 'center', gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  frame: {
    width: '100%',
    aspectRatio: 3,
    borderRadius: theme.radii.md,
    borderWidth: 3,
    borderColor: theme.colors.textInverse,
  },
  hint: { textAlign: 'center' },
  bottomBar: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.overlay.scrim,
  },
  reading: { minHeight: 96, justifyContent: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: theme.colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.textInverse },
  manualLink: { minHeight: theme.touch.minSize, justifyContent: 'center', paddingHorizontal: theme.spacing.lg },
  candidates: { gap: theme.spacing.sm },
  candidate: {
    minHeight: theme.touch.minSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  candidateSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
});
