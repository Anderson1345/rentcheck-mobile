import Svg, { Path } from 'react-native-svg';

import { colores } from '../../tema';
import { type NombreIcono, TRAZOS_ICONOS, type TrazoIcono } from './trazos';

export type { NombreIcono } from './trazos';
export type VarianteIcono = 'contorno' | 'duotono';

interface Props {
  nombre: NombreIcono;
  tamano?: number;
  /** Contorno en reposo; duotono (segunda capa lima) para el estado activo y momentos clave. */
  variante?: VarianteIcono;
  color?: string;
  colorRelleno?: string;
  /** Grosor del trazo; por defecto 1,65 (contorno) o 1,75 (duotono), como en el diseño. */
  grosor?: number;
}

/** Iconos propios de RentCheck. Sin relleno definido, el duotono se dibuja como contorno. */
export function Icono({
  nombre,
  tamano = 24,
  variante = 'contorno',
  color = colores.tinta,
  colorRelleno = colores.limaDuotono,
  grosor,
}: Props) {
  const icono: TrazoIcono = TRAZOS_ICONOS[nombre];
  const duotono = variante === 'duotono';
  const trazo = grosor ?? (duotono ? 1.75 : 1.65);

  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      {duotono
        ? icono.relleno?.map((d) => <Path key={`r${d}`} d={d} fill={colorRelleno} stroke="none" />)
        : null}
      {icono.trazos.map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={trazo}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export const NOMBRES_ICONOS = Object.keys(TRAZOS_ICONOS) as NombreIcono[];
