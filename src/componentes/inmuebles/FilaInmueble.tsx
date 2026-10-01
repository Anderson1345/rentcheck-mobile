import type { Inmueble } from '../../api/inmuebles';
import { textoUnidades } from '../../inmuebles/etiquetas';
import { FilaLista } from '../FilaLista';
import { PortadaInmueble } from './PortadaInmueble';

interface Props {
  inmueble: Inmueble;
  separador?: boolean;
  onPress: () => void;
  /** Se llama cuando la URL firmada de la portada ya no carga (expiró): refrescar la lista. */
  alFallarPortada?: () => void;
}

/**
 * Fila de la lista de inmuebles, como en el diseño: miniatura de 56 dp, dirección y
 * "Ciudad · N unidades". La lista no trae ocupación (Libre/Ocupada), así que no se muestra.
 */
export function FilaInmueble({ inmueble, separador, onPress, alFallarPortada }: Props) {
  return (
    <FilaLista
      miniatura={
        <PortadaInmueble
          url={inmueble.foto_portada_url}
          variante="miniatura"
          alFallarUrl={alFallarPortada}
        />
      }
      titulo={inmueble.direccion}
      subtitulo={`${inmueble.ciudad} · ${textoUnidades(inmueble.unidades.length)}`}
      conChevron
      separador={separador}
      onPress={onPress}
    />
  );
}
