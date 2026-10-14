import { Modal } from 'react-native';

import { NumberCapture } from '@/components/number-capture';
import { REGISTRATION_DIGITS } from '@/constants/ocr';
import { readBadgeNumber } from '@/services/ocr';

interface BadgeScannerProps {
  visible: boolean;
  onClose: () => void;
  /** Recebe a matrícula conferida pelo operador; o login decide se ela é válida. */
  onConfirm: (registration: string) => void;
}

/** Leitura da matrícula do crachá por OCR, em tela cheia, a partir do login. */
export function BadgeScanner({ visible, onClose, onConfirm }: BadgeScannerProps) {
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {visible ? (
        <NumberCapture
          title="Ler crachá"
          frameHint="Enquadre os números da matrícula impressa no crachá"
          fieldLabel="Matrícula"
          digits={REGISTRATION_DIGITS}
          readNumber={readBadgeNumber}
          confirmLabel="Usar esta matrícula"
          onConfirm={onConfirm}
          onCancel={onClose}
        />
      ) : null}
    </Modal>
  );
}
