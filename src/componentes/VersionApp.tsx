import Constants from 'expo-constants';
import { StyleSheet } from 'react-native';

import { colores } from '../tema';
import { Texto } from './Texto';

/** "RentCheck · versión 1.0.0", con la versión de app.json (expo-constants); sin versión, nada. */
export function textoVersion(version: string | null | undefined): string | null {
  return version ? `RentCheck · versión ${version}` : null;
}

/** Línea pequeña al final de "Más" (A1): dice qué versión está instalada. */
export function VersionApp() {
  const texto = textoVersion(Constants.expoConfig?.version);
  if (!texto) return null;
  return (
    <Texto variante="secundario" color={colores.textoSecundario} style={estilos.texto}>
      {texto}
    </Texto>
  );
}

const estilos = StyleSheet.create({
  texto: { textAlign: 'center' },
});
