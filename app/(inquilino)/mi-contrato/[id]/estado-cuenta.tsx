import { useLocalSearchParams, useRouter } from 'expo-router';

import { VistaEstadoCuenta } from '@/componentes/contratos/LecturaContrato';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { ContratoNoEncontrado, ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useEstadoCuentaInquilino, useRefrescarSiNoEncontrado } from '@/consultas/inquilino';

export default function EstadoCuentaInquilino() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useEstadoCuentaInquilino(id);
  const noEncontrado = useRefrescarSiNoEncontrado(error);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/mi-panel');
  }

  // Un 404 manda sobre cualquier dato en caché: el contrato ya no es del inquilino.
  if (noEncontrado) {
    return (
      <PantallaPila>
        <ContratoNoEncontrado textoBoton="Volver" onPress={volver} />
      </PantallaPila>
    );
  }
  if (data === undefined) {
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
      <VistaEstadoCuenta data={data} />
    </PantallaPila>
  );
}
