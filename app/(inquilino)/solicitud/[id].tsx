import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { Boton } from '@/componentes/Boton';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { DetalleSolicitud } from '@/componentes/mantenimiento/DetalleSolicitud';
import { PantallaPila } from '@/componentes/PantallaPila';
import { esNoEncontrado } from '@/consultas/inquilino';
import { useMiSolicitud } from '@/consultas/mantenimiento';

// Detalle de una solicitud (nombre propio: dos grupos de rutas no pueden compartir URL). Solo lectura.
// El adjunto vuelve a pedir la solicitud antes de mostrarse o abrirse: su URL firmada caduca.
export default function DetalleSolicitudInquilino() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useMiSolicitud(id);
  const [refrescando, setRefrescando] = useState(false);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/solicitudes');
  }

  async function arrastrar() {
    setRefrescando(true);
    try {
      await consulta.refetch();
    } finally {
      setRefrescando(false);
    }
  }

  let cuerpo;
  if (consulta.data === undefined) {
    if (consulta.isPending) {
      cuerpo = <EsqueletoCarga filas={3} />;
    } else if (esNoEncontrado(consulta.error)) {
      cuerpo = (
        <EstadoMensaje
          titulo="Solicitud no encontrada"
          mensaje="Puede que ya no exista o que no tengas acceso."
        >
          <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
        </EstadoMensaje>
      );
    } else {
      cuerpo = (
        <ErrorConReintento error={consulta.error} onReintentar={() => void consulta.refetch()} />
      );
    }
  } else {
    cuerpo = (
      <DetalleSolicitud
        solicitud={consulta.data}
        // Con throwOnError un fallo de red llega al adjunto como "No pudimos abrir el adjunto".
        refrescar={async () => (await consulta.refetch({ throwOnError: true })).data}
      />
    );
  }

  return (
    <PantallaPila
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
    >
      {cuerpo}
    </PantallaPila>
  );
}
