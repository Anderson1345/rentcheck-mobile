import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { cifras, colores, fuentes } from '../tema';
import { centavosAPesosTexto, pesosTextoACentavos } from '../utilidades/dinero';
import { estilosCampo } from './CampoTexto';
import { Texto } from './Texto';

interface Props {
  etiqueta: string;
  /** Valor en centavos (entero) o null si está vacío. */
  valorCentavos: number | null;
  onCambio: (centavos: number | null) => void;
  /** Texto de ayuda debajo de la caja ("Saldo del período: $ 1.850.000"). */
  ayuda?: string;
  error?: string;
}

/** Centavos → texto del campo sin el "$" ("1.850.000"). */
function aTextoCampo(centavos: number | null): string {
  if (centavos === null) return '';
  return centavosAPesosTexto(centavos).replace(/^\$ /, '');
}

/**
 * Campo de dinero (R1): misma estructura que CampoTexto (etiqueta fuera, ayuda y error debajo), con el
 * prefijo "$" dentro de la caja, en la misma fila y centrado con el valor (20 sp extranegrita, cifras de
 * ancho fijo) y teclado numérico. Solo admite pesos enteros; el texto se convierte a centavos con
 * utilidades/dinero.ts. El TextInput no cambia de lugar ni se vuelve a montar al enfocar.
 */
export function CampoDinero({ etiqueta, valorCentavos, onCambio, ayuda, error }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const texto = aTextoCampo(valorCentavos);

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
    <View style={estilosCampo.contenedor}>
      <View style={estilosCampo.filaEtiqueta}>
        <Texto variante="etiqueta" color={colores.textoFuerte}>
          {etiqueta}
        </Texto>
      </View>
      <View
        testID="campo-caja"
        style={[
          estilosCampo.caja,
          enfocado && estilosCampo.enfocado,
          error ? estilosCampo.conError : null,
        ]}
      >
        <Texto variante="valorGrande" color={colores.textoSecundario} style={estilos.prefijo}>
          $
        </Texto>
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
          style={[estilos.entrada, cifras]}
        />
      </View>
      {error ? (
        <Texto
          variante="secundario"
          color={colores.peligroTexto}
          accessibilityLiveRegion="polite"
          style={estilosCampo.ayuda}
        >
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="secundario" color={colores.textoSecundario} style={estilosCampo.ayuda}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  prefijo: { fontSize: 20 },
  entrada: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    padding: 0,
    margin: 0,
    height: 52,
    fontFamily: fuentes.extranegrita,
    fontSize: 20,
    color: colores.texto,
  },
});
