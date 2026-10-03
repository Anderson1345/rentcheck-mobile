import { Tabs } from 'expo-router';

import { PESTANAS_ARRENDADOR } from '@/componentes/navegacion/configuracion';
import { NavInferior } from '@/componentes/navegacion/NavInferior';
import { usePanelArrendador } from '@/consultas/panel';
import { conteoDePagos } from '@/panel/presentacion';
import { colores } from '@/tema';

// Barra inferior del arrendador. El nombre de cada pantalla es la clave de PESTANAS_ARRENDADOR:
// NavInferior navega por ese nombre. El acceso por rol lo protege el layout raíz (Stack.Protected).
// La insignia de Pagos es el conteo de comprobantes por validar del Panel (misma consulta, misma caché):
// sin número si es 0 o si el Panel aún no cargó.
export default function LayoutPestanas() {
  const { data: panel } = usePanelArrendador();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colores.fondo } }}
      tabBar={(props) => (
        <NavInferior
          pestanas={PESTANAS_ARRENDADOR}
          activa={props.state.routes[props.state.index].name}
          onSeleccionar={(clave) => props.navigation.navigate(clave)}
          insignias={{ 'pagos-arrendador': conteoDePagos(panel) }}
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
