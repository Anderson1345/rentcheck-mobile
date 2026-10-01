import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { detalleTecnico, mensajeDeErrorInmueble } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { DetalleTecnico } from '@/componentes/DetalleTecnico';
import { ConInmueble } from '@/componentes/inmuebles/ConInmueble';
import { FormularioUnidad } from '@/componentes/inmuebles/FormularioUnidad';
import { SeccionFoto } from '@/componentes/inmuebles/SeccionFoto';
import { useSubidaFoto } from '@/componentes/inmuebles/useSubidaFoto';
import { PantallaPila } from '@/componentes/PantallaPila';
import {
  claveFotoUnidad,
  useActualizarUnidad,
  useEliminarUnidad,
  useInmueble,
  useSubirFotoUnidad,
} from '@/consultas/inmuebles';
import { espaciado } from '@/tema';

export default function EditarUnidad() {
  const router = useRouter();
  const { id, unidadId } = useLocalSearchParams<{ id: string; unidadId: string }>();
  const actualizar = useActualizarUnidad(id, unidadId);
  const eliminar = useEliminarUnidad(id, unidadId);
  const subirFoto = useSubirFotoUnidad(id, unidadId);
  const subida = useSubidaFoto((foto) => subirFoto.mutateAsync(foto));
  const { refetch } = useInmueble(id);
  const [errorEliminar, setErrorEliminar] = useState<{
    mensaje: string;
    detalle: string | null;
  } | null>(null);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/inmueble/[id]', params: { id } });
  }

  function confirmarEliminar() {
    Alert.alert(
      'Eliminar unidad',
      'Se eliminará esta unidad y no se puede deshacer. Solo se puede si nunca tuvo contratos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setErrorEliminar(null);
            eliminar.mutateAsync().then(volver, (error: unknown) =>
              setErrorEliminar({
                mensaje: mensajeDeErrorInmueble(error),
                detalle: detalleTecnico(error),
              }),
            );
          },
        },
      ],
    );
  }

  return (
    <ConInmueble
      id={id}
      faltaAlgo={(inmueble) => !inmueble.unidades.some((u) => u.id === unidadId)}
    >
      {(inmueble) => {
        const unidad = inmueble.unidades.find((u) => u.id === unidadId);
        if (!unidad) return null;
        return (
          <PantallaPila>
            <FormularioUnidad
              key={unidad.id}
              modo="editar"
              inmueble={inmueble}
              unidad={unidad}
              onEditarInmueble={() =>
                router.push({ pathname: '/inmueble/[id]/editar', params: { id } })
              }
              onGuardar={async (cambios) => {
                await actualizar.mutateAsync(cambios);
                volver();
              }}
            />

            <SeccionFoto
              titulo="Foto de la unidad"
              url={unidad.foto_principal_url}
              claveCache={claveFotoUnidad(unidad.id)}
              descripcion={`Foto de ${unidad.nombre}`}
              subida={subida}
              onElegida={(foto) => void subida.elegir(foto)}
              alFallarUrl={() => void refetch({ cancelRefetch: false })}
            />

            <View style={estilos.eliminar}>
              {errorEliminar ? (
                <>
                  <Aviso mensaje={errorEliminar.mensaje} />
                  <DetalleTecnico detalle={errorEliminar.detalle} />
                </>
              ) : null}
              <Boton
                titulo="Eliminar unidad"
                variante="destructivo"
                ancho="completo"
                onPress={confirmarEliminar}
              />
            </View>
          </PantallaPila>
        );
      }}
    </ConInmueble>
  );
}

const estilos = StyleSheet.create({
  eliminar: { gap: espaciado.xs, marginTop: espaciado.md },
});
