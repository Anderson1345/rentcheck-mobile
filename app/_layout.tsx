import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { crearClienteDeConsultas } from '@/consultas/cliente-consultas';
import { colores } from '@/tema';

// El splash se mantiene hasta que Manrope esté lista: así nunca se ve texto con la fuente del sistema.
void SplashScreen.preventAutoHideAsync();

const clienteDeConsultas = crearClienteDeConsultas();

export default function LayoutRaiz() {
  const [fuentesListas, errorFuentes] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // Si la carga falla (raro: las fuentes van dentro de la app), se sigue con la fuente del sistema.
  const listo = fuentesListas || errorFuentes !== null;

  useEffect(() => {
    if (listo) void SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}
      />
    </QueryClientProvider>
  );
}
