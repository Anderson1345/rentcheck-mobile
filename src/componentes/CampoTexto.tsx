import { type ReactNode, type RefObject, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { alturas, cifras, colores, fuentes, radios, sombras, tintaAlfa } from '../tema';
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
  | 'autoFocus'
> {
  etiqueta: string;
  valor: string;
  onCambio: (texto: string) => void;
  onBlur?: () => void;
  /** Texto de ayuda debajo de la caja. */
  ayuda?: string;
  /** Mensaje de error debajo de la caja; reemplaza a la ayuda. */
  error?: string;
  /** Campo de contraseña: oculta el texto y muestra "Mostrar" / "Ocultar" dentro de la caja, a la derecha. */
  contrasena?: boolean;
  /** Texto fijo dentro de la caja, a la izquierda del valor ("+57"). */
  prefijo?: string;
  /** Acción a la derecha, dentro de la caja (un botón de texto). La entrada ocupa lo que sobra. */
  accion?: ReactNode;
  /** A la derecha de la etiqueta, en su misma fila ("¿La olvidaste?"). */
  etiquetaDerecha?: ReactNode;
  /** Referencia para pasar el foco al siguiente campo. */
  inputRef?: RefObject<TextInput | null>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Campo de texto del sistema Medianoche (R1, U1): la etiqueta va FUERA de la caja, arriba (14 sp negrita,
 * textoFuerte, 8 dp de separación); la caja mide 56 dp con borde fino y fondo superficie; la ayuda y el
 * error van debajo. El foco solo cambia el borde (2 dp de tintaCapa más el anillo lima). No corrige ni
 * recorta lo que escribe la persona (eso lo hace el esquema).
 *
 * El TextInput ocupa SIEMPRE el mismo lugar de la caja y nunca se vuelve a montar: cualquier toque
 * sobre el campo cae directamente en él. Cambiar su disposición al enfocarlo hacía que Android
 * perdiera el foco y lo diera al primer campo del formulario; por eso aquí solo cambia el borde.
 */
export function CampoTexto({
  etiqueta,
  valor,
  onCambio,
  onBlur,
  ayuda,
  error,
  contrasena = false,
  prefijo,
  accion,
  etiquetaDerecha,
  inputRef,
  style,
  ...entrada
}: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const oculto = contrasena && !visible;

  return (
    <View style={[estilos.contenedor, style]}>
      <View style={estilos.filaEtiqueta}>
        <Texto variante="etiqueta" color={colores.textoFuerte}>
          {etiqueta}
        </Texto>
        {etiquetaDerecha}
      </View>
      <View
        testID="campo-caja"
        style={[estilos.caja, enfocado && estilos.enfocado, error ? estilos.conError : null]}
      >
        {prefijo ? (
          <Texto variante="cuerpo" color={colores.textoSecundario} style={estilos.prefijo}>
            {prefijo}
          </Texto>
        ) : null}
        <TextInput
          {...entrada}
          ref={inputRef}
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
          style={[estilos.entrada, contrasena ? null : cifras]}
        />
        {contrasena ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setVisible((actual) => !actual)}
            hitSlop={8}
            style={estilos.accion}
          >
            <Texto variante="etiqueta" color={colores.tintaCapa}>
              {visible ? 'Ocultar' : 'Mostrar'}
            </Texto>
          </Pressable>
        ) : (
          accion
        )}
      </View>
      {error ? (
        <Texto
          variante="secundario"
          color={colores.peligroTexto}
          accessibilityLiveRegion="polite"
          style={estilos.ayuda}
        >
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

export const estilosCampo = StyleSheet.create({
  contenedor: { gap: 8 },
  filaEtiqueta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  caja: {
    minHeight: alturas.campo,
    height: alturas.campo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radios.medio,
    backgroundColor: colores.superficie,
    boxShadow: `0 0 0 1px ${tintaAlfa(0.14)}`,
  },
  enfocado: { boxShadow: sombras.campoEnfocado },
  conError: { boxShadow: `0 0 0 2px ${colores.peligroTexto}` },
  ayuda: { paddingLeft: 4 },
});

const estilos = StyleSheet.create({
  ...estilosCampo,
  prefijo: { fontFamily: fuentes.negrita },
  entrada: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    padding: 0,
    margin: 0,
    height: alturas.campo - 4,
    fontFamily: fuentes.regular,
    fontSize: 16,
    color: colores.texto,
  },
  // Dentro de la caja, a la derecha del texto: el margen negativo compensa el relleno de la caja para
  // que el área táctil (44 dp) quede pegada al borde sin encimarse con lo escrito.
  accion: {
    minWidth: 76,
    minHeight: 44,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
