import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorApi } from '@/api/cliente';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { FormularioInmueble } from '@/componentes/inmuebles/FormularioInmueble';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useActualizarInmueble, useInmueble } from '@/consultas/inmuebles';

export default function EditarInmueble() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: inmueble, isPending, isError, error, refetch } = useInmueble(id);
  const actualizar = useActualizarInmueble(id);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/inmuebles');
  }

  if (inmueble === undefined) {
    if (isPending) {
      return (
        <PantallaPila>
          <EsqueletoCarga filas={3} />
        </PantallaPila>
      );
    }
    if (isError && error instanceof ErrorApi && error.status === 404) {
      return (
        <PantallaPila>
          <EstadoMensaje
            titulo="No encontrado"
            mensaje="Este inmueble no existe o no tienes acceso a él."
          >
            <Boton titulo="Volver" variante="acento" ancho="completo" onPress={volver} />
          </EstadoMensaje>
        </PantallaPila>
      );
    }
    return (
      <PantallaPila>
        <Aviso mensaje={mensajeDeError(error)} />
        <Boton
          titulo="Reintentar"
          variante="secundario"
          ancho="completo"
          onPress={() => void refetch()}
        />
      </PantallaPila>
    );
  }

  // El formulario pone su propia pantalla, con "Guardar cambios" en la barra fija (R4-E).
  return (
    <FormularioInmueble
      key={inmueble.id}
      modo="editar"
      valoresIniciales={{
        direccion: inmueble.direccion,
        ciudad: inmueble.ciudad,
        matricula_inmobiliaria: inmueble.matricula_inmobiliaria,
        estrato: inmueble.estrato,
      }}
      onGuardar={async (cambios) => {
        await actualizar.mutateAsync(cambios);
        volver();
      }}
    />
  );
}
