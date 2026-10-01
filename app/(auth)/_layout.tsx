import { Stack } from 'expo-router';

import { OPCIONES_STACK } from '@/componentes/navegacion/opcionesStack';

export default function LayoutAuth() {
  return (
    <Stack screenOptions={OPCIONES_STACK}>
      {/* Estas pantallas dibujan su propia cabecera de tinta. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="diagnostico" options={{ headerShown: false, title: 'Diagnóstico' }} />
      <Stack.Screen name="galeria" options={{ headerShown: false, title: 'Galería' }} />
    </Stack>
  );
}
