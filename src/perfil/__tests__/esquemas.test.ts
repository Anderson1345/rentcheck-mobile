import { camposCambiadosPerfil, esquemaPerfil, normalizarCedula } from '../esquemas';

const ORIGINAL = { nombre: 'Marta Ríos', telefono: '3001234567', cedula: '' };
const validar = (v: typeof ORIGINAL, cedulaOriginal = '') =>
  esquemaPerfil(cedulaOriginal).safeParse(v);

describe('normalizarCedula', () => {
  it('quita espacios, puntos y guiones', () => {
    expect(normalizarCedula(' 1.234.567-8 ')).toBe('12345678');
  });
});

describe('esquemaPerfil', () => {
  it('cédula de 5 a 12 dígitos (con puntos o espacios se acepta y se normaliza)', () => {
    expect(validar({ ...ORIGINAL, cedula: '1.020.304.050' }).data?.cedula).toBe('1020304050');
    expect(validar({ ...ORIGINAL, cedula: '12345' }).success).toBe(true);
    expect(validar({ ...ORIGINAL, cedula: '123456789012' }).success).toBe(true);
  });

  it.each(['1234', '1234567890123', '12a45', 'abcdef'])('cédula "%s" no es válida', (cedula) => {
    const r = validar({ ...ORIGINAL, cedula });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(['cedula']);
  });

  it('la cédula puede quedar vacía si nunca la tuvo, pero no se puede borrar una guardada', () => {
    expect(validar(ORIGINAL).success).toBe(true);
    expect(validar({ ...ORIGINAL, cedula: '' }, '1020304050').success).toBe(false);
  });

  it('nombre y teléfono no pueden quedar vacíos', () => {
    expect(validar({ ...ORIGINAL, nombre: '  ' }).success).toBe(false);
    expect(validar({ ...ORIGINAL, telefono: '' }).success).toBe(false);
  });
});

describe('camposCambiadosPerfil', () => {
  it('solo envía lo que cambió, recortado y con la cédula normalizada', () => {
    const original = { nombre: 'Marta', telefono: '300', cedula: '111111' };
    expect(
      camposCambiadosPerfil(original, { nombre: ' Marta R ', telefono: '300', cedula: '222222' }),
    ).toEqual({ nombre: 'Marta R', cedula: '222222' });
    expect(camposCambiadosPerfil(original, { ...original })).toEqual({});
  });
});
