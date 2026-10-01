import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

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
import { centavosAPesosTexto, pesosTextoACentavos } from '../utilidades/dinero';
import { Texto } from './Texto';

interface Props {
  etiqueta: string;
  /** Valor en centavos (entero) o null si está vacío. */
  valorCentavos: number | null;
  onCambio: (centavos: number | null) => void;
  /** Texto de ayuda debajo ("Valor del período: $ 1.850.000"). */
  ayuda?: string;
  error?: string;
}

/** Centavos → texto del campo sin el "$" ("1.850.000"). */
function aTextoCampo(centavos: number | null): string {
  if (centavos === null) return '';
  return centavosAPesosTexto(centavos).replace(/^\$ /, '');
}

/**
 * Campo de dinero: etiqueta flotante, prefijo "$" y teclado numérico. Solo admite pesos enteros
 * (el diseño no tiene centavos); el texto se convierte a centavos con utilidades/dinero.ts.
 */
export function CampoDinero({ etiqueta, valorCentavos, onCambio, ayuda, error }: Props) {
  const entrada = useRef<TextInput>(null);
  const [enfocado, setEnfocado] = useState(false);
  const texto = aTextoCampo(valorCentavos);
  const flotante = enfocado || texto !== '';

  function alEscribir(nuevo: string) {
    const digitos = nuevo.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (digitos === '') {
      onCambio(null);
      return;
    }
    // Una cifra que no cabe como entero seguro se ignora (se conserva el valor anterior).
    const centavos = pesosTextoACentavos(digitos);
    if (centavos !== null) onCambio(centavos);
  }

  return (
    <View style={estilos.contenedor}>
      <Pressable
        onPress={() => entrada.current?.focus()}
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
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            $
          </Texto>
          <TextInput
            ref={entrada}
            value={texto}
            onChangeText={alEscribir}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            keyboardType="number-pad"
            inputMode="numeric"
            accessibilityLabel={etiqueta}
            cursorColor={colores.tintaCapa}
            selectionColor={colores.lima}
            style={[tipografia.valorGrande, cifras, estilos.entrada]}
          />
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
  fila: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  // Se mantiene montado (no se desmonta) para poder enfocarlo al tocar la caja.
  oculta: { position: 'absolute', opacity: 0, left: espaciado.md, right: espaciado.md },
  entrada: { flex: 1, color: colores.texto, padding: 0, margin: 0 },
  ayuda: { paddingLeft: 4 },
});
