import { useRouter } from 'expo-router';

import type { RolAlertas } from '../../api/alertas';
import { useConteoAlertas } from '../../consultas/alertas';
import { useRefrescarAlEnfocar } from '../../consultas/enfoque';
import { useRefrescarAlVolverAPrimerPlano } from '../../consultas/primerPlano';
import { BotonIcono } from '../BotonIcono';

/**
 * Campana de las cabeceras de tinta (Panel del arrendador y Mi panel del inquilino): punto lima si el
 * usuario tiene alertas sin leer (sin número, como en el diseño) y abre la lista de su rol. El conteo se
 * refresca al enfocar la pantalla y al volver la app a primer plano; no hay intervalo. Mientras carga,
 * o si el conteo falla, no hay punto: la campana sigue funcionando y no muestra errores.
 */
export function CampanaAlertas({ rol }: { rol: RolAlertas }) {
  const router = useRouter();
  const conteo = useConteoAlertas(rol);
  useRefrescarAlEnfocar(conteo);
  useRefrescarAlVolverAPrimerPlano(conteo);

  const hayNuevas = (conteo.data?.no_leidas ?? 0) > 0;
  return (
    <BotonIcono
      icono="alerta"
      etiqueta={hayNuevas ? 'Alertas, hay sin leer' : 'Alertas'}
      sobreTinta
      conPunto={hayNuevas}
      onPress={() => router.push(rol === 'arrendador' ? '/alertas-arrendador' : '/alertas')}
    />
  );
}
