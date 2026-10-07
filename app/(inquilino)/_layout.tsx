import { Stack } from 'expo-router';

import { OPCIONES_STACK } from '@/componentes/navegacion/opcionesStack';
import { ContratoSeleccionadoProvider } from '@/inquilino/ContratoSeleccionado';

// El acceso por rol lo protege el layout raíz (Stack.Protected). Las pestañas viven en (pestanas);
// el selector, "Agregar contrato" y el detalle van en la pila, con encabezado y botón atrás. El
// contrato seleccionado se comparte con todas las pantallas del grupo y se pierde al salir de él.
export default function LayoutInquilino() {
  return (
    <ContratoSeleccionadoProvider>
      <Stack screenOptions={OPCIONES_STACK}>
        <Stack.Screen name="(pestanas)" options={{ headerShown: false }} />
        <Stack.Screen name="mis-contratos" options={{ title: 'Mis contratos' }} />
        <Stack.Screen name="agregar-contrato" options={{ title: 'Agregar contrato' }} />
        <Stack.Screen name="mi-contrato/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="mi-contrato/[id]/estado-cuenta"
          options={{ title: 'Estado de cuenta' }}
        />
        <Stack.Screen
          name="mi-contrato/[id]/terminacion"
          options={{ title: 'Terminación anticipada' }}
        />
        <Stack.Screen name="mi-contrato/[id]/aviso" options={{ title: 'Aviso de no renovación' }} />
        <Stack.Screen name="mi-perfil" options={{ title: 'Mi perfil' }} />
        <Stack.Screen name="alertas" options={{ title: 'Alertas' }} />
        <Stack.Screen name="reportar-pago" options={{ title: 'Reportar pago' }} />
        <Stack.Screen name="nueva-solicitud" options={{ title: 'Nueva solicitud' }} />
        <Stack.Screen name="solicitud/[id]" options={{ title: 'Solicitud' }} />
      </Stack>
    </ContratoSeleccionadoProvider>
  );
}
