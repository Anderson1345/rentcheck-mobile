import {
  armarCuerpoCrear,
  camposCambiados,
  esquemaCrearInmueble,
  esquemaEditarInmueble,
} from '../esquemas';

const BASE = {
  direccion: '  Calle 45 # 12-30  ',
  ciudad: ' Bogotá ',
  matricula_inmobiliaria: ' 50C-1234567 ',
};

describe('esquemaCrearInmueble', () => {
  it('residencial con estrato: válido y recorta los textos', () => {
    const r = esquemaCrearInmueble.safeParse({
      ...BASE,
      uso_unidad_principal: 'RESIDENCIAL',
      estrato: 4,
    });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      direccion: 'Calle 45 # 12-30',
      ciudad: 'Bogotá',
      matricula_inmobiliaria: '50C-1234567',
      estrato: 4,
    });
  });

  it('residencial SIN estrato: error en el campo estrato', () => {
    const r = esquemaCrearInmueble.safeParse({
      ...BASE,
      uso_unidad_principal: 'RESIDENCIAL',
      estrato: null,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues).toEqual([
      expect.objectContaining({ path: ['estrato'], message: 'Elige el estrato (1 a 6).' }),
    ]);
  });

  it('comercial sin estrato: válido', () => {
    const r = esquemaCrearInmueble.safeParse({
      ...BASE,
      uso_unidad_principal: 'COMERCIAL',
      estrato: null,
    });
    expect(r.success).toBe(true);
  });

  it.each(['direccion', 'ciudad', 'matricula_inmobiliaria'])(
    '%s vacía o solo espacios es obligatoria',
    (campo) => {
      const r = esquemaCrearInmueble.safeParse({
        ...BASE,
        [campo]: '   ',
        uso_unidad_principal: 'COMERCIAL',
        estrato: null,
      });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].path).toEqual([campo]);
    },
  );

  it.each([0, 7, 2.5])('estrato %s fuera de 1 a 6 no es válido', (estrato) => {
    const r = esquemaCrearInmueble.safeParse({
      ...BASE,
      uso_unidad_principal: 'COMERCIAL',
      estrato,
    });
    expect(r.success).toBe(false);
  });
});

describe('armarCuerpoCrear', () => {
  it('residencial: envía el estrato y el uso', () => {
    expect(
      armarCuerpoCrear({
        direccion: 'D',
        ciudad: 'C',
        matricula_inmobiliaria: 'M',
        uso_unidad_principal: 'RESIDENCIAL',
        estrato: 3,
      }),
    ).toEqual({
      direccion: 'D',
      ciudad: 'C',
      matricula_inmobiliaria: 'M',
      uso_unidad_principal: 'RESIDENCIAL',
      estrato: 3,
    });
  });

  it('comercial: no envía estrato (el campo está oculto, aunque haya quedado un valor viejo)', () => {
    const cuerpo = armarCuerpoCrear({
      direccion: 'D',
      ciudad: 'C',
      matricula_inmobiliaria: 'M',
      uso_unidad_principal: 'COMERCIAL',
      estrato: 3,
    });
    expect(cuerpo).toEqual({
      direccion: 'D',
      ciudad: 'C',
      matricula_inmobiliaria: 'M',
      uso_unidad_principal: 'COMERCIAL',
    });
    expect('estrato' in cuerpo).toBe(false);
  });
});

describe('esquemaEditarInmueble y camposCambiados', () => {
  const ORIGINAL = {
    direccion: 'Calle 1',
    ciudad: 'Bogotá',
    matricula_inmobiliaria: 'M-1',
    estrato: 3 as number | null,
  };

  it('el estrato puede quedar vacío en el formulario (el servidor decide)', () => {
    expect(esquemaEditarInmueble.safeParse({ ...ORIGINAL, estrato: null }).success).toBe(true);
  });

  it('exige los textos', () => {
    expect(esquemaEditarInmueble.safeParse({ ...ORIGINAL, ciudad: ' ' }).success).toBe(false);
  });

  it('sin cambios: objeto vacío', () => {
    expect(camposCambiados(ORIGINAL, { ...ORIGINAL })).toEqual({});
  });

  it('solo incluye lo que cambió (recortado)', () => {
    expect(camposCambiados(ORIGINAL, { ...ORIGINAL, ciudad: 'Cali' })).toEqual({ ciudad: 'Cali' });
  });

  it('quitar el estrato se envía como null', () => {
    expect(camposCambiados(ORIGINAL, { ...ORIGINAL, estrato: null })).toEqual({ estrato: null });
  });

  it('poner estrato donde no había', () => {
    expect(camposCambiados({ ...ORIGINAL, estrato: null }, { ...ORIGINAL, estrato: 5 })).toEqual({
      estrato: 5,
    });
  });
});
