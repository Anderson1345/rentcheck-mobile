import { useLocalSearchParams, useRouter } from 'expo-router';

import { ConInmueble } from '@/componentes/inmuebles/ConInmueble';
import { FormularioUnidad } from '@/componentes/inmuebles/FormularioUnidad';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import { useCrearUnidad } from '@/consultas/inmuebles';
import { colores } from '@/tema';

export default function NuevaUnidad() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const crear = useCrearUnidad(id);

  return (
    <ConInmueble id={id}>
      {(inmueble) => (
        <PantallaPila>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Podrás agregar la foto después de crearla.
          </Texto>
          <FormularioUnidad
            modo="crear"
            inmueble={inmueble}
            onEditarInmueble={() =>
              router.push({ pathname: '/inmueble/[id]/editar', params: { id } })
            }
            onCrear={async (cuerpo) => {
              await crear.mutateAsync(cuerpo);
              if (router.canGoBack()) router.back();
              else router.replace({ pathname: '/inmueble/[id]', params: { id } });
            }}
          />
        </PantallaPila>
      )}
    </ConInmueble>
  );
}
