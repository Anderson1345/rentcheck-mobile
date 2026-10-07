import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorApi } from '@/api/cliente';
import { Boton } from '@/componentes/Boton';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { DetalleSolicitudArrendador } from '@/componentes/mantenimiento/DetalleSolicitudArrendador';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { useSolicitud } from '@/consultas/mantenimiento';

// Detalle de una solicitud de mantenimiento del arrendador. Nombre propio: dos grupos de rutas no
// pueden compartir URL (el del inquilino es /solicitud/[id]). El adjunto vuelve a pedir la solicitud
// antes de mostrarse: su URL firmada caduca.
export default function MantenimientoDetalle() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useSolicitud(id);
  const { data: solicitud, isPending, error, refetch } = consulta;
  useRefrescarAlEnfocar(consulta);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/mantenimiento');
  }

  if (error instanceof ErrorApi && error.status === 404) {
    return (
      <PantallaPila>
        <EstadoMensaje
          titulo="Solicitud no encontrada"
          mensaje="Esta solicitud no existe o no tienes acceso a ella."
        >
          <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
        </EstadoMensaje>
      </PantallaPila>
    );
  }
  if (solicitud === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={4} />
        ) : (
          <ErrorConReintento error={error} onReintentar={() => void refetch()} />
        )}
      </PantallaPila>
    );
  }
  // El detalle pone su propia PantallaPila: con barra fija para el cambio de estado (R4-C).
  return (
    <DetalleSolicitudArrendador
      solicitud={solicitud}
      // Con throwOnError un fallo de red llega al adjunto como "No pudimos abrir el adjunto".
      refrescar={async () => (await refetch({ throwOnError: true })).data}
    />
  );
}
