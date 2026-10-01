import { Stack } from 'expo-router';

import { Proximamente } from '@/componentes/Proximamente';

export default function PanelArrendador() {
  return (
    <>
      <Stack.Screen options={{ title: 'Arrendador' }} />
      <Proximamente titulo="Soy arrendador" entrega="E2" />
    </>
  );
}
