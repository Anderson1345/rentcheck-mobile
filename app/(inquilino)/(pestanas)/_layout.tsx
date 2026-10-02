import { Tabs } from 'expo-router';

import { PESTANAS_INQUILINO } from '@/componentes/navegacion/configuracion';
import { NavInferior } from '@/componentes/navegacion/NavInferior';
import { colores } from '@/tema';

// Barra inferior del inquilino. El nombre de cada pantalla es la clave de PESTANAS_INQUILINO:
// NavInferior navega por ese nombre. El acceso por rol lo protege el layout raíz (Stack.Protected).
export default function LayoutPestanas() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colores.fondo } }}
      tabBar={(props) => (
        <NavInferior
          pestanas={PESTANAS_INQUILINO}
          activa={props.state.routes[props.state.index].name}
          onSeleccionar={(clave) => props.navigation.navigate(clave)}
        />
      )}
    >
      <Tabs.Screen name="mi-panel" />
      <Tabs.Screen name="pagos" />
      <Tabs.Screen name="solicitudes" />
      <Tabs.Screen name="mas" />
    </Tabs>
  );
}
