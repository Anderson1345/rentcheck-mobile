import { useRouter } from 'expo-router';

import { detalleTecnico } from '@/api/errores';
import { FormularioInmueble } from '@/componentes/inmuebles/FormularioInmueble';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useCrearInmueble } from '@/consultas/inmuebles';
import { armarCuerpoCrear } from '@/inmuebles/esquemas';

export default function NuevoInmueble() {
  const router = useRouter();
  const crear = useCrearInmueble();

  return (
    <PantallaPila>
      <FormularioInmueble
        modo="crear"
        onCrear={async (datos, foto) => {
          const resultado = await crear.mutateAsync({
            datos: armarCuerpoCrear(datos),
            foto: foto ?? undefined,
          });
          const { id } = resultado.inmueble;
          const detalle = resultado.fotoSubida ? null : detalleTecnico(resultado.errorFoto);
          // El inmueble ya existe aunque la foto haya fallado: se abre su detalle, que avisa cómo
          // reintentarla (Cambiar foto). replace: "atrás" vuelve a la lista, no al formulario.
          router.replace({
            pathname: '/inmueble/[id]',
            params: resultado.fotoSubida
              ? { id }
              : { id, foto: 'fallida', ...(detalle ? { detalle } : {}) },
          });
        }}
      />
    </PantallaPila>
  );
}
