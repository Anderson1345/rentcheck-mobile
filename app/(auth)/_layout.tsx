import { Stack } from 'expo-router';

import { OPCIONES_STACK } from '@/componentes/navegacion/opcionesStack';

// Todas las pantallas de acceso dibujan su propia cabecera de tinta.
export default function LayoutAuth() {
  return <Stack screenOptions={{ ...OPCIONES_STACK, headerShown: false }} />;
}
