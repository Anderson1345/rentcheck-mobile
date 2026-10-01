import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { crearClienteDeConsultas } from '@/consultas/cliente-consultas';

const clienteDeConsultas = crearClienteDeConsultas();

export default function LayoutRaiz() {
  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
