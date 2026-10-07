import { useLocalSearchParams, useRouter } from 'expo-router';

import { Boton } from '@/componentes/Boton';
import { VistaEstadoCuenta } from '@/componentes/contratos/LecturaContrato';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { ContratoNoEncontrado, ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useEstadoCuentaInquilino, useRefrescarSiNoEncontrado } from '@/consultas/inquilino';
import { accionDePeriodo } from '@/inquilino/miPanel';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { diaDePeriodo, periodosReportables } from '@/pagos/reglas';

// Estado de cuenta del inquilino: la vista compartida con el arrendador (estado de pago del servidor y
// períodos en filas) y, R4-B, "Reportar pago" bajo los períodos que hoy se pueden reportar (la misma regla
// de la pestaña Pagos; con un comprobante en revisión, "Reemplazar comprobante").
export default function EstadoCuentaInquilino() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useEstadoCuentaInquilino(id);
  const noEncontrado = useRefrescarSiNoEncontrado(error);
  const { lista } = useContratoSeleccionado();
  const estadoContrato = lista.data?.find((c) => c.id === id)?.estado;

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
  // Sin el estado del contrato (la lista no cargó) no se ofrece reportar: el servidor decide igual.
  const reportables = new Set(
    estadoContrato ? periodosReportables(data.periodos, estadoContrato).map((p) => p.periodo) : [],
  );
  return (
    <PantallaPila>
      <VistaEstadoCuenta
        data={data}
        accionDe={(p) => {
          if (!reportables.has(p.periodo)) return null;
          const boton = accionDePeriodo(p.estado).boton;
          return (
            <Boton
              titulo={boton.titulo}
              variante="secundario"
              onPress={() =>
                router.push({
                  pathname: '/reportar-pago',
                  params: { contratoId: id, periodo: diaDePeriodo(p.periodo) },
                })
              }
            />
          );
        }}
      />
    </PantallaPila>
  );
}
