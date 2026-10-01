import * as SecureStore from 'expo-secure-store';

import { formatearCodigoEscrito, normalizarCodigo, validarCodigo } from '../codigo';
import {
  consumirCodigoPendiente,
  guardarCodigoPendiente,
  hayCodigoPendiente,
  limpiarCodigoPendiente,
} from '../codigoPendiente';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('normalizarCodigo', () => {
  it('quita espacios y guiones y pasa a mayúsculas', () => {
    expect(normalizarCodigo(' rc-ab3d-9kpx ')).toBe('RCAB3D9KPX');
    expect(normalizarCodigo('rc ab3d 9kpx')).toBe('RCAB3D9KPX');
    expect(normalizarCodigo('R C - A B 3 D')).toBe('RCAB3D');
    expect(normalizarCodigo('')).toBe('');
  });
});

describe('validarCodigo', () => {
  it('acepta el formato RC-XXXX-XXXX, en minúsculas, con espacios o sin guiones', () => {
    for (const bueno of [
      'RC-AB3D-9KPX',
      'rc-ab3d-9kpx',
      ' rc ab3d 9kpx ',
      'RCAB3D9KPX',
      'rc ab3d9kpx',
    ]) {
      expect(validarCodigo(bueno)).toEqual({ valido: true, codigo: 'RC-AB3D-9KPX' });
    }
  });

  it('el prefijo RC es opcional: 8 caracteres del alfabeto bastan y se envía con RC', () => {
    expect(validarCodigo('AB3D-9KPX')).toEqual({ valido: true, codigo: 'RC-AB3D-9KPX' });
    expect(validarCodigo('ab3d9kpx')).toEqual({ valido: true, codigo: 'RC-AB3D-9KPX' });
  });

  it('rechaza caracteres fuera del alfabeto (sin I, O, 0 ni 1)', () => {
    for (const malo of [
      'RC-AB3D-9KP0',
      'RC-AB3D-9KPO',
      'RC-AB3D-9KP1',
      'RC-AB3D-9KPI',
      'RC-AB3D-9KP!',
    ]) {
      expect(validarCodigo(malo)).toEqual({ valido: false });
    }
  });

  it('rechaza largos incorrectos, vacío y texto cualquiera', () => {
    for (const malo of [
      '',
      '   ',
      'RC',
      'RC-AB3D',
      'RC-AB3D-9KP',
      'RC-AB3D-9KPXY',
      'hola',
      'ABC',
      '1234567890',
    ]) {
      expect(validarCodigo(malo)).toEqual({ valido: false });
    }
  });

  it('8 caracteres que empiezan por RC son ambiguos (¿falta el resto?): se rechazan', () => {
    expect(validarCodigo('RCAB3D9K')).toEqual({ valido: false });
    expect(validarCodigo('RC-RCAB-3D9K')).toEqual({ valido: true, codigo: 'RC-RCAB-3D9K' });
  });

  it('el resultado siempre es el formato canónico que entiende el backend', () => {
    const r = validarCodigo('rcab3d9kpx');
    expect(r.valido && /^RC-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(r.codigo)).toBe(true);
  });
});

describe('formatearCodigoEscrito (lo que se ve mientras se escribe)', () => {
  it('forma RC-XXXX-XXXX por tramos', () => {
    expect(formatearCodigoEscrito('')).toBe('');
    expect(formatearCodigoEscrito('r')).toBe('R');
    expect(formatearCodigoEscrito('rc')).toBe('RC');
    expect(formatearCodigoEscrito('rca')).toBe('RC-A');
    expect(formatearCodigoEscrito('rcab3d')).toBe('RC-AB3D');
    expect(formatearCodigoEscrito('rcab3d9')).toBe('RC-AB3D-9');
    expect(formatearCodigoEscrito('rcab3d9kpx')).toBe('RC-AB3D-9KPX');
  });

  it('es idempotente: formatear lo ya formateado no cambia nada (borrar y volver a escribir)', () => {
    for (const texto of ['RC-AB3D-9KPX', 'RC-AB3D-9', 'RC-A', 'RC']) {
      expect(formatearCodigoEscrito(texto)).toBe(texto);
    }
  });

  it('acepta pegado con espacios, minúsculas y símbolos', () => {
    expect(formatearCodigoEscrito(' rc ab3d 9kpx ')).toBe('RC-AB3D-9KPX');
    expect(formatearCodigoEscrito('rc.ab3d_9kpx')).toBe('RC-AB3D-9KPX');
  });

  it('lo que sobra NO se recorta en silencio: se ve y la validación lo rechaza (no gasta un intento)', () => {
    const pegado = formatearCodigoEscrito('rc-ab3d-9kpxz');
    expect(pegado).toBe('RC-AB3D-9KPXZ');
    expect(validarCodigo(pegado)).toEqual({ valido: false });
    expect(validarCodigo(formatearCodigoEscrito('rc-ab3d-9kpx-extra'))).toEqual({ valido: false });
  });

  it('sin prefijo RC muestra los tramos de 4 y la validación lo completa', () => {
    expect(formatearCodigoEscrito('ab3d9kpx')).toBe('AB3D-9KPX');
  });

  it('borrar hasta quedar con el prefijo vuelve a "RC" y luego a vacío', () => {
    expect(formatearCodigoEscrito('RC-')).toBe('RC');
    expect(formatearCodigoEscrito('R')).toBe('R');
    expect(formatearCodigoEscrito('')).toBe('');
  });
});

describe('almacén del código pendiente (solo en memoria)', () => {
  beforeEach(() => limpiarCodigoPendiente());

  it('se consume una sola vez', () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    expect(hayCodigoPendiente()).toBe(true);
    expect(consumirCodigoPendiente()).toBe('RC-AB3D-9KPX');
    expect(consumirCodigoPendiente()).toBeNull();
    expect(hayCodigoPendiente()).toBe(false);
  });

  it('sin código guardado devuelve null', () => {
    expect(hayCodigoPendiente()).toBe(false);
    expect(consumirCodigoPendiente()).toBeNull();
  });

  it('guardar uno nuevo reemplaza al anterior', () => {
    guardarCodigoPendiente('RC-AAAA-BBBB');
    guardarCodigoPendiente('RC-CCCC-DDDD');
    expect(consumirCodigoPendiente()).toBe('RC-CCCC-DDDD');
  });

  it('limpiar borra el código sin consumirlo', () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    limpiarCodigoPendiente();
    expect(consumirCodigoPendiente()).toBeNull();
  });

  it('no escribe en ningún almacenamiento persistente (ni siquiera en el llavero)', () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
