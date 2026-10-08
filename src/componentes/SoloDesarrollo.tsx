import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * Herramientas de prueba (Diagnóstico y Galería, R1 U11): solo existen en desarrollo. En un build que no
 * es de desarrollo (el APK de demostración) la ruta lleva a la entrada, así que tampoco se llega
 * escribiéndola ni con el esquema rentcheck://, que abre la misma ruta.
 */
export function SoloDesarrollo({ children }: { children: ReactNode }) {
  if (!__DEV__) return <Redirect href="/" />;
  return <>{children}</>;
}
