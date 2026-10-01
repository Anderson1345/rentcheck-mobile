import type { RefObject } from 'react';
import type { TextInput } from 'react-native';

import { CampoTexto } from './CampoTexto';

interface Props {
  valor: string;
  onCambio: (digitos: string) => void;
  onBlur?: () => void;
  error?: string;
  ayuda?: string;
  returnKeyType?: 'next' | 'go' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: RefObject<TextInput | null>;
}

/** Código de 6 dígitos (verificación o restablecimiento): teclado numérico y autofill del SMS/correo. */
export function CampoCodigoSeisDigitos({ valor, onCambio, ...resto }: Props) {
  return (
    <CampoTexto
      {...resto}
      etiqueta="Código de verificación"
      valor={valor}
      onCambio={(texto) => onCambio(texto.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      maxLength={6}
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
    />
  );
}
