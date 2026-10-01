import { centavosAPesosTexto } from '../../utilidades/dinero';
import type { UnidadInmueble } from '../../api/inmuebles';
import { ETIQUETA_TIPO_UNIDAD, ETIQUETA_USO, unidadPorCompletar } from '../../inmuebles/etiquetas';
import { colores } from '../../tema';
import { ChipEstado } from '../ChipEstado';
import { FilaLista } from '../FilaLista';
import { Texto } from '../Texto';

interface Props {
  unidad: UnidadInmueble;
  separador?: boolean;
}

/** Unidad en solo lectura: nombre, tipo y uso, canon base y "Por completar" si faltan datos. */
export function FilaUnidad({ unidad, separador = false }: Props) {
  return (
    <FilaLista
      icono="inmuebles"
      titulo={unidad.nombre}
      separador={separador}
      detalle={
        <>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`${ETIQUETA_TIPO_UNIDAD[unidad.tipo]} · ${ETIQUETA_USO[unidad.uso_permitido]}`}
          </Texto>
          {unidadPorCompletar(unidad) ? <ChipEstado tipo="datos" estado="POR_COMPLETAR" /> : null}
        </>
      }
      valor={centavosAPesosTexto(unidad.canon_base_centavos)}
    />
  );
}
