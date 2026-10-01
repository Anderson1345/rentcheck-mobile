import { Stack } from 'expo-router';

import { Proximamente } from '@/componentes/Proximamente';

export default function ContratosInquilino() {
  return (
    <>
      <Stack.Screen options={{ title: 'Inquilino' }} />
      <Proximamente titulo="Soy inquilino" entrega="E2" />
    </>
  );
}
