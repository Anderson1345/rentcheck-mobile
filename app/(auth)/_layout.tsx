import { Stack } from 'expo-router';

import { colores } from '@/tema';

export default function LayoutAuth() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colores.primario,
        headerStyle: { backgroundColor: colores.fondo },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="diagnostico" options={{ title: 'Diagnóstico' }} />
    </Stack>
  );
}
