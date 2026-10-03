import { useLocalSearchParams, useRouter } from 'expo-router';

import { Aviso } from '@/componentes/Aviso';
import { ConInmueble } from '@/componentes/inmuebles/ConInmueble';
import { FormularioUnidad } from '@/componentes/inmuebles/FormularioUnidad';
import { Texto } from '@/componentes/Texto';
import { useCrearUnidad } from '@/consultas/inmuebles';
import { colores } from '@/tema';
import { valoresDeUnidad } from '@/unidades/esquemas';

/**
 * Nueva unidad. Con `?desde=<unidadId>` (Duplicar unidad, R2-A) llega con los campos de esa unidad del
 * mismo inmueble, salvo el nombre (vacío y enfocado) y la foto (no se copia). Guardar es una creación
 * normal: misma validación y mismo endpoint. La unidad de origen sale del inmueble ya cargado (caché) o
 * se carga con él.
 */
export default function NuevaUnidad() {
  const router = useRouter();
  const { id, desde } = useLocalSearchParams<{ id: string; desde?: string }>();
  const crear = useCrearUnidad(id);

  return (
    <ConInmueble id={id}>
      {(inmueble) => {
        const origen =
          typeof desde === 'string' ? inmueble.unidades.find((u) => u.id === desde) : undefined;
        const duplicando = typeof desde === 'string' && desde !== '';
        return (
          <FormularioUnidad
            modo="crear"
            inmueble={inmueble}
            valoresIniciales={origen ? { ...valoresDeUnidad(origen), nombre: '' } : undefined}
            enfocarNombre={origen !== undefined}
            encabezado={
              <>
                {duplicando && origen ? (
                  <Aviso
                    tono="informacion"
                    mensaje={`Duplicando «${origen.nombre}». Revisa los datos y escribe el nombre de la nueva unidad.`}
                  />
                ) : null}
                {duplicando && !origen ? (
                  <Aviso
                    tono="advertencia"
                    mensaje="No encontramos la unidad para duplicar. Completa los datos de la nueva unidad."
                  />
                ) : null}
                <Texto variante="secundario" color={colores.textoSecundario}>
                  Podrás agregar la foto después de crearla.
                </Texto>
              </>
            }
            onEditarInmueble={() =>
              router.push({ pathname: '/inmueble/[id]/editar', params: { id } })
            }
            onCrear={async (cuerpo) => {
              await crear.mutateAsync(cuerpo);
              if (router.canGoBack()) router.back();
              else router.replace({ pathname: '/inmueble/[id]', params: { id } });
            }}
          />
        );
      }}
    </ConInmueble>
  );
}
