import { colores, fuentes } from '../../tema';

/** Encabezado nativo de las pilas de Expo Router con la tipografía y los colores de Medianoche. */
export const OPCIONES_STACK = {
  headerTintColor: colores.tinta,
  headerStyle: { backgroundColor: colores.fondo },
  headerTitleStyle: { fontFamily: fuentes.extranegrita, fontSize: 18, color: colores.texto },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colores.fondo },
} as const;
