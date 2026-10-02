import { useLocalSearchParams } from 'expo-router';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { VistaEstadoCuenta } from '@/componentes/contratos/LecturaContrato';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useEstadoCuenta } from '@/consultas/contratos';

export default function EstadoCuenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useEstadoCuenta(id);

  if (data === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={4} />
        ) : (
          <>
            <Aviso mensaje={mensajeDeError(error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </>
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
