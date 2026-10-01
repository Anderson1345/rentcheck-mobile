import { Stack } from 'expo-router';

import { colores } from '@/tema';

// E2 agrega aquí la guardia por rol.
export default function LayoutInquilino() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colores.primario,
        headerStyle: { backgroundColor: colores.fondo },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    />
  );
}
