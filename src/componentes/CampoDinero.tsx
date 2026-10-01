import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

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

/** Ancho que se reserva al prefijo "$" a la izquierda del texto. */
const ANCHO_PREFIJO = 16;

/** Centavos → texto del campo sin el "$" ("1.850.000"). */
function aTextoCampo(centavos: number | null): string {
  if (centavos === null) return '';
  return centavosAPesosTexto(centavos).replace(/^\$ /, '');
}

/**
 * Campo de dinero: etiqueta flotante, prefijo "$" y teclado numérico. Solo admite pesos enteros
 * (el diseño no tiene centavos); el texto se convierte a centavos con utilidades/dinero.ts.
 *
 * Igual que CampoTexto, el TextInput ocupa siempre el mismo lugar y está visible: solo la
 * etiqueta y el "$" (textos que no reciben toques) cambian al enfocar o escribir.
 */
export function CampoDinero({ etiqueta, valorCentavos, onCambio, ayuda, error }: Props) {
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
      <View
        style={[
          estilos.caja,
          flotante ? estilos.cajaLlena : estilos.cajaVacia,
          enfocado && estilos.enfocado,
          error ? estilos.conError : null,
        ]}
      >
        <TextInput
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
        <View pointerEvents="none" style={estilos.zonaTextos}>
          <Texto
            variante={flotante ? 'etiqueta' : 'cuerpo'}
            color={enfocado ? colores.tintaCapa : colores.textoSecundario}
            style={flotante ? estilos.etiquetaArriba : estilos.etiquetaCentro}
          >
            {etiqueta}
          </Texto>
          {flotante ? (
            <Texto variante="cuerpo" color={colores.textoSecundario} style={estilos.prefijo}>
              $
            </Texto>
          ) : null}
        </View>
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
    left: espaciado.md + ANCHO_PREFIJO,
    right: espaciado.md,
    top: 24,
    height: 36,
    padding: 0,
    margin: 0,
    color: colores.texto,
  },
  zonaTextos: { ...StyleSheet.absoluteFill, paddingHorizontal: espaciado.md },
  etiquetaCentro: { position: 'absolute', top: 19 },
  etiquetaArriba: { position: 'absolute', top: 7 },
  prefijo: { position: 'absolute', top: 31 },
  ayuda: { paddingLeft: 4 },
});
