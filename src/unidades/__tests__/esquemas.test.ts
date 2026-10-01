import { unidadEjemplo } from '../../pruebas/datosInmuebles';
import {
  armarCuerpoCrearUnidad,
  camposCambiadosUnidad,
  esquemaUnidad,
  tipoSugeridoUso,
  type ValoresUnidad,
  valoresDeUnidad,
  VALORES_UNIDAD_VACIOS,
} from '../esquemas';

const RESIDENCIAL: ValoresUnidad = {
  nombre: '  Apto 302 ',
  tipo: 'APARTAMENTO',
  uso: 'RESIDENCIAL',
  canonCentavos: 120_000_000,
  area: '58,5',
  habitaciones: '2',
  banos: '1',
  ocupantes: '4',
  mascotas: true,
};
const COMERCIAL: ValoresUnidad = {
  ...VALORES_UNIDAD_VACIOS,
  nombre: 'Local 1',
  tipo: 'LOCAL',
  uso: 'COMERCIAL',
  canonCentavos: 300_000_000,
};
const mensajes = (v: ValoresUnidad) => {
  const r = esquemaUnidad.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`);
};

describe('esquemaUnidad (condicional por uso)', () => {
  it('residencial completa es válida y recorta el nombre', () => {
    const r = esquemaUnidad.safeParse(RESIDENCIAL);
    expect(r.success).toBe(true);
    expect(r.data?.nombre).toBe('Apto 302');
  });

  it('comercial sin datos residenciales es válida', () => {
    expect(mensajes(COMERCIAL)).toEqual([]);
  });

  it('residencial exige área ≥ 1, habitaciones, baños y ocupantes ≥ 1', () => {
    const errores = mensajes({
      ...RESIDENCIAL,
      area: '',
      habitaciones: '',
      banos: '',
      ocupantes: '',
    });
    expect(errores.map((e) => e.split(':')[0]).sort()).toEqual(
      ['area', 'banos', 'habitaciones', 'ocupantes'].sort(),
    );
  });

  it.each([
    ['area', '0,5'],
    ['area', 'abc'],
    ['ocupantes', '0'],
    ['habitaciones', '-1'],
    ['banos', '1,5'],
  ])('residencial: %s = "%s" no es válido', (campo, valor) => {
    expect(mensajes({ ...RESIDENCIAL, [campo]: valor }).length).toBe(1);
  });

  it('habitaciones y baños pueden ser 0', () => {
    expect(mensajes({ ...RESIDENCIAL, habitaciones: '0', banos: '0' })).toEqual([]);
  });

  it('nombre vacío y canon sin escribir son errores; canon 0 es válido', () => {
    expect(mensajes({ ...COMERCIAL, nombre: '  ' })).toEqual([expect.stringContaining('nombre')]);
    expect(mensajes({ ...COMERCIAL, canonCentavos: null })).toEqual([
      expect.stringContaining('canonCentavos'),
    ]);
    expect(mensajes({ ...COMERCIAL, canonCentavos: 0 })).toEqual([]);
  });

  it('en comercial no se validan los campos residenciales aunque tengan basura', () => {
    expect(mensajes({ ...COMERCIAL, area: 'xx', ocupantes: '0' })).toEqual([]);
  });
});

describe('armarCuerpoCrearUnidad', () => {
  it('residencial: todo, con área decimal y canon en centavos enteros', () => {
    expect(armarCuerpoCrearUnidad(RESIDENCIAL)).toEqual({
      nombre: 'Apto 302',
      tipo: 'APARTAMENTO',
      uso_permitido: 'RESIDENCIAL',
      canon_base_centavos: 120_000_000,
      metros_cuadrados: 58.5,
      numero_habitaciones: 2,
      numero_banos: 1,
      ocupantes_maximos: 4,
      acepta_mascotas: true,
    });
    expect(Number.isInteger(armarCuerpoCrearUnidad(RESIDENCIAL).canon_base_centavos)).toBe(true);
  });

  it('comercial: no envía los campos residenciales y acepta_mascotas va false', () => {
    const cuerpo = armarCuerpoCrearUnidad({ ...COMERCIAL, mascotas: true, area: '40' });
    expect(cuerpo).toEqual({
      nombre: 'Local 1',
      tipo: 'LOCAL',
      uso_permitido: 'COMERCIAL',
      canon_base_centavos: 300_000_000,
      acepta_mascotas: false,
    });
    for (const k of [
      'metros_cuadrados',
      'numero_habitaciones',
      'numero_banos',
      'ocupantes_maximos',
    ]) {
      expect(k in cuerpo).toBe(false);
    }
  });
});

describe('tipoSugeridoUso', () => {
  it('Local y Parqueadero sugieren Comercial; los demás no sugieren nada', () => {
    expect(tipoSugeridoUso('LOCAL')).toBe('COMERCIAL');
    expect(tipoSugeridoUso('PARQUEADERO')).toBe('COMERCIAL');
    expect(tipoSugeridoUso('APARTAMENTO')).toBeNull();
    expect(tipoSugeridoUso('CASA')).toBeNull();
    expect(tipoSugeridoUso('HABITACION')).toBeNull();
  });
});

describe('valoresDeUnidad y camposCambiadosUnidad', () => {
  const original = unidadEjemplo({ metros_cuadrados: '58.50' });

  it('precarga: área decimal del servidor y números como texto', () => {
    expect(valoresDeUnidad(original)).toMatchObject({
      area: '58.5',
      habitaciones: '2',
      banos: '2',
      ocupantes: '4',
      mascotas: true,
      canonCentavos: 180_000_000,
    });
  });

  it('una unidad con nulos precarga campos vacíos', () => {
    const v = valoresDeUnidad(
      unidadEjemplo({ metros_cuadrados: null, numero_habitaciones: null, canon_base_centavos: 0 }),
    );
    expect(v.area).toBe('');
    expect(v.habitaciones).toBe('');
  });

  it('sin cambios: objeto vacío', () => {
    expect(camposCambiadosUnidad(original, valoresDeUnidad(original))).toEqual({});
  });

  it('solo lo que cambió (nombre recortado, canon en centavos)', () => {
    const v = { ...valoresDeUnidad(original), nombre: ' Apto 303 ', canonCentavos: 190_000_000 };
    expect(camposCambiadosUnidad(original, v)).toEqual({
      nombre: 'Apto 303',
      canon_base_centavos: 190_000_000,
    });
  });

  it('uso residencial sin cambio de uso: solo los residenciales que cambian', () => {
    const v = { ...valoresDeUnidad(original), ocupantes: '5' };
    expect(camposCambiadosUnidad(original, v)).toEqual({ ocupantes_maximos: 5 });
  });

  it('comercial → residencial: envía el uso y los CUATRO campos residenciales completos', () => {
    const comercial = unidadEjemplo({
      uso_permitido: 'COMERCIAL',
      tipo: 'LOCAL',
      metros_cuadrados: null,
      numero_habitaciones: null,
      numero_banos: null,
      ocupantes_maximos: null,
      acepta_mascotas: false,
    });
    const v: ValoresUnidad = {
      ...valoresDeUnidad(comercial),
      uso: 'RESIDENCIAL',
      area: '40',
      habitaciones: '1',
      banos: '1',
      ocupantes: '2',
    };
    expect(camposCambiadosUnidad(comercial, v)).toEqual({
      uso_permitido: 'RESIDENCIAL',
      metros_cuadrados: 40,
      numero_habitaciones: 1,
      numero_banos: 1,
      ocupantes_maximos: 2,
    });
  });

  it('residencial → comercial: envía el uso (y mascotas en false si las aceptaba)', () => {
    const v = { ...valoresDeUnidad(original), uso: 'COMERCIAL' as const };
    expect(camposCambiadosUnidad(original, v)).toEqual({
      uso_permitido: 'COMERCIAL',
      acepta_mascotas: false,
    });
  });

  it('comercial sin cambio de uso: ignora los residenciales ocultos', () => {
    const comercial = unidadEjemplo({
      uso_permitido: 'COMERCIAL',
      metros_cuadrados: null,
      numero_habitaciones: null,
      numero_banos: null,
      ocupantes_maximos: null,
      acepta_mascotas: false,
    });
    const v = { ...valoresDeUnidad(comercial), area: '99', mascotas: true };
    expect(camposCambiadosUnidad(comercial, v)).toEqual({});
  });

  it('cambiar el tipo se envía solo', () => {
    const v = { ...valoresDeUnidad(original), tipo: 'CASA' as const };
    expect(camposCambiadosUnidad(original, v)).toEqual({ tipo: 'CASA' });
  });
});
