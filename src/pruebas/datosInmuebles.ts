// Datos de ejemplo de /inmuebles para las pruebas de pantallas (forma real de la respuesta del backend).
import type { Inmueble, UnidadInmueble } from '../api/inmuebles';

export function unidadEjemplo(extra: Partial<UnidadInmueble> = {}): UnidadInmueble {
  return {
    id: 'u1',
    inmueble_id: 'i1',
    nombre: 'Apto 302',
    tipo: 'APARTAMENTO',
    metros_cuadrados: '58.5',
    numero_habitaciones: 2,
    numero_banos: 2,
    canon_base_centavos: 180_000_000,
    ocupantes_maximos: 4,
    acepta_mascotas: true,
    uso_permitido: 'RESIDENCIAL',
    foto_principal_url: null,
    creado_en: '2026-09-01T10:00:00.000Z',
    ...extra,
  };
}

/** La unidad principal que crea el servidor: área, habitaciones, baños y ocupantes en null, canon 0. */
export function unidadPrincipalNueva(extra: Partial<UnidadInmueble> = {}): UnidadInmueble {
  return unidadEjemplo({
    id: 'u0',
    nombre: 'Unidad principal',
    metros_cuadrados: null,
    numero_habitaciones: null,
    numero_banos: null,
    ocupantes_maximos: null,
    canon_base_centavos: 0,
    acepta_mascotas: false,
    ...extra,
  });
}

export function inmuebleEjemplo(extra: Partial<Inmueble> = {}): Inmueble {
  return {
    id: 'i1',
    arrendador_id: 'a1',
    direccion: 'Calle 45 # 12-30',
    ciudad: 'Bogotá',
    estrato: 4,
    matricula_inmobiliaria: '50C-1234567',
    foto_portada_url: null,
    creado_en: '2026-09-01T10:00:00.000Z',
    unidades: [unidadEjemplo()],
    ...extra,
  };
}
