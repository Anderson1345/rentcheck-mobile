import { Tabs } from 'expo-router';

import { PESTANAS_ARRENDADOR } from '@/componentes/navegacion/configuracion';
import { NavInferior } from '@/componentes/navegacion/NavInferior';
import { colores } from '@/tema';

// Barra inferior del arrendador. El nombre de cada pantalla es la clave de PESTANAS_ARRENDADOR:
// NavInferior navega por ese nombre. El acceso por rol lo protege el layout raíz (Stack.Protected).
export default function LayoutPestanas() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colores.fondo } }}
      tabBar={(props) => (
        <NavInferior
          pestanas={PESTANAS_ARRENDADOR}
          activa={props.state.routes[props.state.index].name}
          onSeleccionar={(clave) => props.navigation.navigate(clave)}
        />
      )}
    >
      <Tabs.Screen name="panel" />
      <Tabs.Screen name="inmuebles" />
      <Tabs.Screen name="contratos-arrendador" />
      <Tabs.Screen name="pagos-arrendador" />
      <Tabs.Screen name="mas-arrendador" />
    </Tabs>
  );
}
