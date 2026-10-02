import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorApi } from '@/api/cliente';
import { Boton } from '@/componentes/Boton';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { DetallePago } from '@/componentes/pagos/DetallePago';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { usePago } from '@/consultas/pagos';

// Detalle de un pago del arrendador. El nombre es propio: dos grupos de rutas no pueden compartir URL.
export default function PagoDetalle() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = usePago(id);
  const { data: pago, isPending, error, refetch } = consulta;
  useRefrescarAlEnfocar(consulta);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/pagos-arrendador');
  }

  if (error instanceof ErrorApi && error.status === 404) {
    return (
      <PantallaPila>
        <EstadoMensaje
          titulo="Pago no encontrado"
          mensaje="Este pago no existe o no tienes acceso a él."
        >
          <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
        </EstadoMensaje>
      </PantallaPila>
    );
  }
  if (pago === undefined) {
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
  return (
    <PantallaPila>
      <DetallePago pago={pago} refrescar={async () => (await refetch()).data} alVolver={volver} />
    </PantallaPila>
  );
}
