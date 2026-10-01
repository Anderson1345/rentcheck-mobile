import type { UnidadInmueble } from '../../api/inmuebles';
import {
  ETIQUETA_TIPO_UNIDAD,
  ETIQUETA_USO,
  textoCanon,
  unidadPorCompletar,
} from '../../inmuebles/etiquetas';
import { colores } from '../../tema';
import { ChipEstado } from '../ChipEstado';
import { FilaLista } from '../FilaLista';
import { Texto } from '../Texto';

interface Props {
  unidad: UnidadInmueble;
  separador?: boolean;
  /** Toca para editar la unidad. */
  onPress?: () => void;
}

/** Unidad de un inmueble: nombre, tipo y uso, canon base y "Por completar" si faltan datos. */
export function FilaUnidad({ unidad, separador = false, onPress }: Props) {
  return (
    <FilaLista
      icono="inmuebles"
      titulo={unidad.nombre}
      separador={separador}
      conChevron={onPress !== undefined}
      onPress={onPress}
      detalle={
        <>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {`${ETIQUETA_TIPO_UNIDAD[unidad.tipo]} · ${ETIQUETA_USO[unidad.uso_permitido]}`}
          </Texto>
          {unidadPorCompletar(unidad) ? <ChipEstado tipo="datos" estado="POR_COMPLETAR" /> : null}
        </>
      }
      valor={textoCanon(unidad.canon_base_centavos)}
    />
  );
}
