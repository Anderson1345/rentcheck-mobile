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

import { establecerManejador401, establecerProveedorToken } from '@/api/cliente';
import { crearClienteDeConsultas } from '@/consultas/cliente-consultas';
import { almacenSeguro } from '@/sesion/almacen';
import { crearControladorSesion } from '@/sesion/controlador';
import { SesionProvider, useSesion } from '@/sesion/SesionProvider';
import { colores } from '@/tema';

// El splash se mantiene hasta que Manrope esté lista y la sesión termine de cargar: así nunca se
// ve la fuente del sistema ni un parpadeo de la pantalla de acceso con una sesión guardada.
void SplashScreen.preventAutoHideAsync();

const clienteDeConsultas = crearClienteDeConsultas();

const controladorSesion = crearControladorSesion({
  almacen: almacenSeguro,
  // Al cerrar sesión no debe quedar en memoria nada del usuario anterior.
  limpiarCache: () => clienteDeConsultas.clear(),
});
establecerProveedorToken(() => controladorSesion.obtenerToken());
establecerManejador401((tokenEnviado) => controladorSesion.alRecibir401(tokenEnviado));

function Navegacion({ fuentesListas }: { fuentesListas: boolean }) {
  const { estado } = useSesion();
  const listo = fuentesListas && estado !== 'cargando';

  useEffect(() => {
    if (listo) void SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
      {/* Cada grupo solo existe para su rol: al cambiar la sesión, Expo Router redirige solo. */}
      <Stack.Protected guard={estado === 'anonimo'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={estado === 'arrendador'}>
        <Stack.Screen name="(arrendador)" />
      </Stack.Protected>
      <Stack.Protected guard={estado === 'inquilino'}>
        <Stack.Screen name="(inquilino)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function LayoutRaiz() {
  const [fuentesCargadas, errorFuentes] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // Si la carga falla (raro: las fuentes van dentro de la app), se sigue con la fuente del sistema.
  const fuentesListas = fuentesCargadas || errorFuentes !== null;

  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <SesionProvider controlador={controladorSesion}>
        <StatusBar style="dark" />
        <Navegacion fuentesListas={fuentesListas} />
      </SesionProvider>
    </QueryClientProvider>
  );
}
