import { Stack } from 'expo-router';

import { OPCIONES_STACK } from '@/componentes/navegacion/opcionesStack';

// E2 agrega aquí la guardia por rol y la barra inferior (NavInferior).
export default function LayoutArrendador() {
  return <Stack screenOptions={OPCIONES_STACK} />;
}
