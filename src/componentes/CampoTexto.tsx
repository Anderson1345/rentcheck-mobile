import { type RefObject, useState } from 'react';
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

/** Espacio a la derecha que reserva el botón "Mostrar" / "Ocultar". */
const ANCHO_ALTERNAR = 92;

/**
 * Campo de texto del sistema Medianoche: etiqueta flotante, mismo alto, radio y foco que
 * CampoDinero. No corrige ni recorta lo que escribe la persona (eso lo hace el esquema).
 *
 * El TextInput ocupa SIEMPRE el mismo lugar de la caja, visible: cualquier toque sobre el campo
 * cae directamente en él. Solo la etiqueta (un texto que no recibe toques) se mueve al enfocar o
 * escribir. Cambiar la disposición del TextInput al enfocarlo hacía que Android perdiera el foco
 * y lo diera al primer campo del formulario.
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
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const flotante = enfocado || valor !== '';
  const oculto = contrasena && !visible;

  return (
    <View style={[estilos.contenedor, style]}>
      <View
        style={[
          estilos.caja,
          flotante ? estilos.cajaLlena : estilos.cajaVacia,
          enfocado && estilos.enfocado,
          error ? estilos.conError : null,
        ]}
      >
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
          style={[
            tipografia.valorGrande,
            contrasena ? null : cifras,
            estilos.entrada,
            contrasena && estilos.entradaConAlternar,
          ]}
        />
        <View pointerEvents="none" style={estilos.zonaEtiqueta}>
          <Texto
            variante={flotante ? 'etiqueta' : 'cuerpo'}
            color={enfocado ? colores.tintaCapa : colores.textoSecundario}
            style={flotante ? estilos.etiquetaArriba : estilos.etiquetaCentro}
          >
            {etiqueta}
          </Texto>
        </View>
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
  caja: { height: alturas.campo, borderRadius: radios.medio },
  cajaVacia: { backgroundColor: tintaAlfa(0.05) },
  cajaLlena: { backgroundColor: colores.superficie, boxShadow: `0 0 0 1px ${tintaAlfa(0.12)}` },
  enfocado: { boxShadow: sombras.campoEnfocado },
  conError: { boxShadow: `0 0 0 2px ${colores.peligroTexto}` },
  entrada: {
    position: 'absolute',
    left: espaciado.md,
    right: espaciado.md,
    top: 24,
    height: 36,
    padding: 0,
    margin: 0,
    color: colores.texto,
  },
  entradaConAlternar: { right: ANCHO_ALTERNAR },
  zonaEtiqueta: { ...StyleSheet.absoluteFill, paddingHorizontal: espaciado.md },
  etiquetaCentro: { position: 'absolute', top: 19 },
  etiquetaArriba: { position: 'absolute', top: 7 },
  alternar: {
    position: 'absolute',
    right: 4,
    top: 10,
    minWidth: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayuda: { paddingLeft: 4 },
});
