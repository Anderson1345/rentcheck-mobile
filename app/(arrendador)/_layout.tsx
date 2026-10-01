import { Stack } from 'expo-router';

import { OPCIONES_STACK } from '@/componentes/navegacion/opcionesStack';

// El acceso por rol lo protege el layout raíz (Stack.Protected). Las pestañas viven en (pestanas);
// el detalle y los formularios van en la pila, con encabezado y botón atrás.
export default function LayoutArrendador() {
  return (
    <Stack screenOptions={OPCIONES_STACK}>
      <Stack.Screen name="(pestanas)" options={{ headerShown: false }} />
      <Stack.Screen name="inmueble/nuevo" options={{ title: 'Nuevo inmueble' }} />
      <Stack.Screen name="inmueble/[id]/index" options={{ title: 'Inmueble' }} />
      <Stack.Screen name="inmueble/[id]/editar" options={{ title: 'Editar inmueble' }} />
    </Stack>
  );
}
