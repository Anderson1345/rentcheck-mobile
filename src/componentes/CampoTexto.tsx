import { type RefObject, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  alturas,
  cifras,
  colores,
  espaciado,
  radios,
  sombras,
  tintaAlfa,
  tipografia,
} from '../tema';
import { Texto } from './Texto';

interface Props extends Pick<
  TextInputProps,
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'editable'
  | 'maxLength'
> {
  etiqueta: string;
  valor: string;
  onCambio: (texto: string) => void;
  onBlur?: () => void;
  /** Texto de ayuda debajo. */
  ayuda?: string;
  /** Mensaje de error debajo; reemplaza a la ayuda. */
  error?: string;
  /** Campo de contraseña: oculta el texto y muestra el botón "Mostrar" / "Ocultar". */
  contrasena?: boolean;
  /** Referencia para pasar el foco al siguiente campo. */
  inputRef?: RefObject<TextInput | null>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Campo de texto del sistema Medianoche: etiqueta flotante, mismo alto, radio y foco que
 * CampoDinero. No corrige ni recorta lo que escribe la persona (eso lo hace el esquema).
 */
export function CampoTexto({
  etiqueta,
  valor,
  onCambio,
  onBlur,
  ayuda,
  error,
  contrasena = false,
  inputRef,
  style,
  ...entrada
}: Props) {
  const propia = useRef<TextInput>(null);
  const referencia = inputRef ?? propia;
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const flotante = enfocado || valor !== '';
  const oculto = contrasena && !visible;

  function enfocar() {
    referencia.current?.focus();
  }

  return (
    <View style={[estilos.contenedor, style]}>
      <Pressable
        onPress={enfocar}
        accessible={false}
        style={[
          estilos.caja,
          flotante ? estilos.cajaLlena : estilos.cajaVacia,
          enfocado && estilos.enfocado,
          error ? estilos.conError : null,
        ]}
      >
        <Texto
          variante={flotante ? 'etiqueta' : 'cuerpo'}
          color={enfocado ? colores.tintaCapa : colores.textoSecundario}
        >
          {etiqueta}
        </Texto>
        <View style={[estilos.fila, !flotante && estilos.oculta]}>
          <TextInput
            {...entrada}
            ref={referencia}
            value={valor}
            onChangeText={onCambio}
            onFocus={() => setEnfocado(true)}
            onBlur={() => {
              setEnfocado(false);
              onBlur?.();
            }}
            secureTextEntry={oculto}
            autoCorrect={false}
            spellCheck={false}
            accessibilityLabel={etiqueta}
            cursorColor={colores.tintaCapa}
            selectionColor={colores.lima}
            style={[tipografia.valorGrande, contrasena ? null : cifras, estilos.entrada]}
          />
          {contrasena ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onPress={() => setVisible((actual) => !actual)}
              hitSlop={8}
              style={estilos.alternar}
            >
              <Texto variante="etiqueta" color={colores.tintaCapa}>
                {visible ? 'Ocultar' : 'Mostrar'}
              </Texto>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      {error ? (
        <Texto variante="secundario" color={colores.peligroTexto} style={estilos.ayuda}>
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="secundario" color={colores.textoSecundario} style={estilos.ayuda}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  caja: {
    minHeight: alturas.campo,
    borderRadius: radios.medio,
    paddingHorizontal: espaciado.md,
    justifyContent: 'center',
  },
  cajaVacia: { backgroundColor: tintaAlfa(0.05) },
  cajaLlena: {
    backgroundColor: colores.superficie,
    gap: 2,
    paddingVertical: 8,
    boxShadow: `0 0 0 1px ${tintaAlfa(0.12)}`,
  },
  enfocado: { boxShadow: sombras.campoEnfocado },
  conError: { boxShadow: `0 0 0 2px ${colores.peligroTexto}` },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  // Se mantiene montado (no se desmonta) para poder enfocarlo al tocar la caja.
  oculta: { position: 'absolute', opacity: 0, left: espaciado.md, right: espaciado.md },
  entrada: { flex: 1, color: colores.texto, padding: 0, margin: 0 },
  alternar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  ayuda: { paddingLeft: 4 },
});
