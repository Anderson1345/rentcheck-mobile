import { Stack } from 'expo-router';

import { OPCIONES_STACK } from '@/componentes/navegacion/opcionesStack';

// El acceso por rol lo protege el layout raíz (Stack.Protected). E3/E4 agregan aquí la barra inferior.
export default function LayoutArrendador() {
  return <Stack screenOptions={{ ...OPCIONES_STACK, headerShown: false }} />;
}
