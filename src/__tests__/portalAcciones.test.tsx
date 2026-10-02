// Portal del inquilino, acciones y perfil (E6-B): terminación anticipada, aviso de no renovación,
// verificación tras "sin respuesta", 409, y Mi perfil (nombre, teléfono y foto de cédula).
import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Alert, Text } from 'react-native';
import { act } from 'react-test-renderer';

import MasInquilino from '../../app/(inquilino)/(pestanas)/mas';
import AvisoInquilino from '../../app/(inquilino)/mi-contrato/[id]/aviso';
import MiContrato from '../../app/(inquilino)/mi-contrato/[id]/index';
import TerminacionInquilino from '../../app/(inquilino)/mi-contrato/[id]/terminacion';
import MiPerfilInquilino from '../../app/(inquilino)/mi-perfil';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type { ContratoInquilinoDetalle, PerfilInquilino } from '../api/inquilino';
import { useAccionContrato } from '../contratos/useAccionContrato';
import {
  ContratoSeleccionadoProvider,
  useContratoSeleccionado,
} from '../inquilino/ContratoSeleccionado';
import { crearToken } from '../pruebas/crearToken';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';
import type { DatosSesion } from '../sesion/tipos';
import { hoyBogota } from '../utilidades/fechas';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockSubir = jest.fn();
const mockElegir = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: async () => true }));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    delete: jest.fn(),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegir(...a),
}));

const sesion: DatosSesion = {
  token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  rol: 'inquilino',
  usuario: { id: 'i1', nombre: 'Camilo Pardo', correo: 'camilo@ejemplo.com' },
};

// ---- Datos ----

const NINGUNA = {
  estado: 'NINGUNA',
  solicitada_por: null,
  solicitada_en: null,
  motivo: null,
  fecha_efectiva: null,
  confirmada_por: null,
  confirmada_en: null,
  puede_confirmar: false,
  puede_cancelar: false,
} as const;
const SOLICITADA_POR_ARRENDADOR = {
  ...NINGUNA,
  estado: 'SOLICITADA',
  solicitada_por: 'ARRENDADOR',
  solicitada_en: '2026-10-01T15:00:00.000Z',
  motivo: 'Venta del inmueble',
  fecha_efectiva: '2026-11-30T00:00:00.000Z',
  puede_confirmar: true,
} as const;
const SOLICITADA_POR_INQUILINO = {
  ...SOLICITADA_POR_ARRENDADOR,
  solicitada_por: 'INQUILINO',
  motivo: 'Me mudo de ciudad',
  puede_confirmar: false,
  puede_cancelar: true,
} as const;
const AVISO_NINGUNO = {
  estado: 'NINGUNO',
  dado_por: null,
  dado_en: null,
  motivo: null,
  puede_dar: true,
  puede_cancelar: false,
} as const;
const AVISO_PROPIO = {
  estado: 'DADO',
  dado_por: 'INQUILINO',
  dado_en: '2026-09-01T15:00:00.000Z',
  motivo: null,
  puede_dar: false,
  puede_cancelar: true,
} as const;

const detalle = (extra: Partial<ContratoInquilinoDetalle> = {}): ContratoInquilinoDetalle => ({
  contratoId: 'c1',
  estado: 'ACTIVO',
  programado: false,
  canon_centavos: 150_000_000,
  dia_pago: 5,
  forma_pago: 'Transferencia',
  deposito_centavos: null,
  datos_recaudo: 'Bancolombia ahorros 123-456',
  fecha_inicio: '2026-01-01T00:00:00.000Z',
  fecha_fin: '2026-12-31T00:00:00.000Z',
  pdf_contrato_url: null,
  documentos: [],
  incrementos_ipc: [],
  terminacion_anticipada: NINGUNA,
  aviso_no_renovacion: AVISO_NINGUNO,
  fotos_entrega: [],
  fotos_devolucion: [],
  ...extra,
});

const PERFIL: PerfilInquilino = {
  id: 'i1',
  nombre: 'Camilo Pardo',
  cedula: '1020304050',
  telefono: '3001234567',
  correo: 'camilo@ejemplo.com',
  foto_cedula_url: null,
};

const datos: { detalle: unknown; perfil: unknown; arrendador: unknown } = {
  detalle: detalle(),
  perfil: PERFIL,
  arrendador: { id: 'c1', estado: 'ACTIVO', canon_centavos: 1, fecha_fin: 'x' },
};

function responderGet(url: string): Promise<unknown> {
  const valor =
    url === '/inquilino/contratos'
      ? [
          {
            id: 'c1',
            estado: 'ACTIVO',
            fecha_inicio: '2026-01-01T00:00:00.000Z',
            fecha_fin: '2026-12-31T00:00:00.000Z',
            unidad: { nombre: 'Apto 302', tipo: 'APARTAMENTO' },
            inmueble: { direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
            estado_pago: 'al_dia',
          },
        ]
      : url === '/inquilino/contratos/c1'
        ? datos.detalle
        : url === '/inquilino/perfil'
          ? datos.perfil
          : url === '/contratos/c1'
            ? datos.arrendador
            : new Error(`Ruta inesperada: ${url}`);
  return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor);
}
const llamadasA = (ruta: string) => mockGet.mock.calls.filter(([u]) => u === ruta).length;

// ---- Ayudas ----

const montar = (pantalla: ReactNode) =>
  renderizarPantalla(
    <ContratoSeleccionadoProvider>{pantalla}</ContratoSeleccionadoProvider>,
    sesion,
  );
type Raiz = Awaited<ReturnType<typeof montar>>['raiz'];
const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const pulsar = async (raiz: Raiz, titulo: string) => {
  await act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
  await esperar();
};
const todo = (raiz: Raiz) => textosDe(raiz).join(' | ');
let alerta: jest.SpyInstance;
/** Confirma la última alerta pulsando su botón de confirmar (el segundo). */
const confirmarAlerta = async (n = 0) => {
  await act(async () => {
    alerta.mock.calls[n][2][1].onPress();
  });
  await esperar();
};
const FOTO = { uri: 'file:///cache/c.jpg', name: 'cedula.jpg', type: 'image/jpeg' as const };

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [
    mockGet,
    mockPost,
    mockPatch,
    mockSubir,
    mockElegir,
    mockPush,
    mockBack,
    mockReplace,
  ])
    m.mockReset();
  mockGet.mockImplementation(responderGet);
  mockPost.mockResolvedValue({});
  mockPatch.mockResolvedValue(PERFIL);
  mockParams = { id: 'c1' };
  datos.detalle = detalle();
  datos.perfil = PERFIL;
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------------------------

describe('Mi contrato: sección Acciones según los booleanos del servidor', () => {
  it('ACTIVO sin solicitud: "Solicitar terminación" y "Dar aviso de no renovación"', async () => {
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).toContain('Acciones');
    expect(hayBoton(raiz, 'Solicitar terminación')).toBe(true);
    expect(hayBoton(raiz, 'Dar aviso de no renovación')).toBe(true);
    for (const t of ['Confirmar terminación', 'Cancelar mi solicitud', 'Cancelar aviso']) {
      expect(hayBoton(raiz, t)).toBe(false);
    }
  });

  it('solicitud del ARRENDADOR: "Confirmar terminación"; no se ofrece cancelar ni solicitar otra', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    const { raiz } = await montar(<MiContrato />);
    expect(hayBoton(raiz, 'Confirmar terminación')).toBe(true);
    expect(hayBoton(raiz, 'Cancelar mi solicitud')).toBe(false);
    expect(hayBoton(raiz, 'Solicitar terminación')).toBe(false);
    // La información de la solicitud sigue visible.
    expect(todo(raiz)).toContain('Terminación anticipada solicitada por el arrendador');
  });

  it('solicitud PROPIA: "Cancelar mi solicitud"; nunca confirmar la propia', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_INQUILINO });
    const { raiz } = await montar(<MiContrato />);
    expect(hayBoton(raiz, 'Cancelar mi solicitud')).toBe(true);
    expect(hayBoton(raiz, 'Confirmar terminación')).toBe(false);
    expect(hayBoton(raiz, 'Solicitar terminación')).toBe(false);
  });

  it('aviso propio vigente: "Cancelar aviso" y no "Dar aviso"', async () => {
    datos.detalle = detalle({ aviso_no_renovacion: AVISO_PROPIO });
    const { raiz } = await montar(<MiContrato />);
    expect(hayBoton(raiz, 'Cancelar aviso')).toBe(true);
    expect(hayBoton(raiz, 'Dar aviso de no renovación')).toBe(false);
  });

  it('terminación CONFIRMADA: solo información, sin acciones de terminación', async () => {
    datos.detalle = detalle({
      terminacion_anticipada: {
        ...SOLICITADA_POR_ARRENDADOR,
        estado: 'CONFIRMADA',
        confirmada_por: 'INQUILINO',
        confirmada_en: '2026-10-02T15:00:00.000Z',
        puede_confirmar: false,
      },
    });
    const { raiz } = await montar(<MiContrato />);
    expect(todo(raiz)).toContain('Terminación anticipada confirmada por el inquilino');
    for (const t of ['Confirmar terminación', 'Cancelar mi solicitud', 'Solicitar terminación']) {
      expect(hayBoton(raiz, t)).toBe(false);
    }
    expect(todo(raiz)).not.toMatch(/acta|liquidaci/i);
  });

  it.each(['VENCIDO', 'TERMINADO_ANTICIPADAMENTE', 'PROGRAMADO'] as const)(
    '%s: no hay sección de acciones (aunque los booleanos vengan en true)',
    async (estado) => {
      datos.detalle = detalle({
        estado,
        terminacion_anticipada: SOLICITADA_POR_ARRENDADOR,
        aviso_no_renovacion: { ...AVISO_PROPIO, puede_dar: true },
      });
      const { raiz } = await montar(<MiContrato />);
      expect(textosDe(raiz)).not.toContain('Acciones');
      for (const t of [
        'Solicitar terminación',
        'Confirmar terminación',
        'Dar aviso de no renovación',
        'Cancelar aviso',
      ]) {
        expect(hayBoton(raiz, t)).toBe(false);
      }
      // La información de terminación sigue visible.
      expect(todo(raiz)).toContain('Terminación anticipada solicitada');
    },
  );

  it('"Solicitar terminación" y "Dar aviso" abren sus pantallas', async () => {
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Solicitar terminación');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]/terminacion',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Dar aviso de no renovación');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/mi-contrato/[id]/aviso',
      params: { id: 'c1' },
    });
  });
});

describe('Confirmar y cancelar la terminación (desde Mi contrato)', () => {
  it('confirmar: confirmación FUERTE, POST sin cuerpo, vuelve a pedir el detalle y avisa', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    const { raiz } = await montar(<MiContrato />);
    const antes = llamadasA('/inquilino/contratos/c1');

    await pulsar(raiz, 'Confirmar terminación');
    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, mensaje, botones] = alerta.mock.calls[0];
    expect(titulo).toBe('Confirmar terminación anticipada');
    expect(mensaje).toContain('irreversible');
    expect(mensaje).toContain('si la fecha efectiva es hoy, el contrato termina de inmediato');
    expect(mensaje).toContain('30 de noviembre de 2026');
    expect(botones[1].style).toBe('destructive');
    expect(mockPost).not.toHaveBeenCalled();

    // El servidor confirma: el contrato ya terminó (no ACTIVO) y la sección desaparece.
    datos.detalle = detalle({
      estado: 'TERMINADO_ANTICIPADAMENTE',
      terminacion_anticipada: {
        ...SOLICITADA_POR_ARRENDADOR,
        estado: 'CONFIRMADA',
        confirmada_por: 'INQUILINO',
        puede_confirmar: false,
      },
    });
    await confirmarAlerta();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/inquilino/contratos/c1/confirmar-terminacion-anticipada',
    );
    expect(llamadasA('/inquilino/contratos/c1')).toBeGreaterThan(antes);
    expect(todo(raiz)).toContain('Terminación confirmada.');
    expect(hayBoton(raiz, 'Confirmar terminación')).toBe(false);
  });

  it('cancelar mi solicitud: confirmación, POST y mensaje', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_INQUILINO });
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Cancelar mi solicitud');
    expect(alerta).toHaveBeenCalledTimes(1);
    datos.detalle = detalle();
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledWith(
      '/inquilino/contratos/c1/cancelar-terminacion-anticipada',
    );
    expect(todo(raiz)).toContain('Solicitud cancelada.');
  });

  it('doble toque en la confirmación: una sola llamada', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Confirmar terminación');
    await act(async () => {
      alerta.mock.calls[0][2][1].onPress();
      alerta.mock.calls[0][2][1].onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('sin respuesta: NO da el éxito por hecho; recarga el detalle y, si cambió, confirma sin reenviar', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    mockPost.mockRejectedValue(new ErrorSinConexion());
    const { raiz } = await montar(<MiContrato />);
    const antes = llamadasA('/inquilino/contratos/c1');
    await pulsar(raiz, 'Confirmar terminación');
    // El servidor sí la aplicó aunque la respuesta se perdió.
    datos.detalle = detalle({
      estado: 'TERMINADO_ANTICIPADAMENTE',
      terminacion_anticipada: { ...SOLICITADA_POR_ARRENDADOR, estado: 'CONFIRMADA' },
    });
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(llamadasA('/inquilino/contratos/c1')).toBeGreaterThan(antes);
    expect(todo(raiz)).toContain('Terminación confirmada.');
  });

  it('sin respuesta y sin cambio: avisa que no se aplicó y deja reintentar (no reintenta solo)', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    mockPost.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Confirmar terminación');
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(todo(raiz)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
    expect(hayBoton(raiz, 'Confirmar terminación')).toBe(true);
  });

  it('sin respuesta y sin poder comprobar: ofrece "Verificar"', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    mockPost.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Confirmar terminación');
    datos.detalle = new ErrorSinConexion();
    await confirmarAlerta();
    expect(hayBoton(raiz, 'Verificar')).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('409 por estado desactualizado: mensaje, refresca y ofrece "Recargar contrato"', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    mockPost.mockRejectedValueOnce(
      new ErrorApi({ status: 409, codigo: 'TERMINACION_NO_SOLICITADA', mensaje: 'x' }),
    );
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Confirmar terminación');
    await confirmarAlerta();
    expect(todo(raiz)).toContain('No hay una solicitud de terminación pendiente.');
    expect(hayBoton(raiz, 'Recargar contrato')).toBe(true);
    const antes = llamadasA('/inquilino/contratos/c1');
    await pulsar(raiz, 'Recargar contrato');
    expect(llamadasA('/inquilino/contratos/c1')).toBeGreaterThan(antes);
  });
});

describe('Cancelar el aviso (desde Mi contrato)', () => {
  it('confirmación, POST sin cuerpo y mensaje', async () => {
    datos.detalle = detalle({ aviso_no_renovacion: AVISO_PROPIO });
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Cancelar aviso');
    datos.detalle = detalle();
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledWith('/inquilino/contratos/c1/cancelar-aviso-no-renovacion');
    expect(todo(raiz)).toContain('Aviso cancelado.');
  });

  it('AVISO_FUERA_DE_PLAZO se explica con la fecha que manda el servidor', async () => {
    datos.detalle = detalle({ aviso_no_renovacion: AVISO_PROPIO });
    mockPost.mockRejectedValueOnce(
      new ErrorApi({
        status: 409,
        codigo: 'AVISO_FUERA_DE_PLAZO',
        mensaje: 'x',
        detalles: { fecha_fin: '2026-12-31' },
      }),
    );
    const { raiz } = await montar(<MiContrato />);
    await pulsar(raiz, 'Cancelar aviso');
    await confirmarAlerta();
    expect(todo(raiz)).toContain('el contrato termina el 31/12/2026');
  });
});

describe('Pantalla de terminación: solicitar', () => {
  it('muestra la advertencia obligatoria con el texto exacto', async () => {
    const { raiz } = await montar(<TerminacionInquilino />);
    expect(textosDe(raiz)).toContain(
      'Esto es una terminación por mutuo acuerdo. No reemplaza el aviso escrito ni las causales de una terminación unilateral (Ley 820, arts. 22 a 24).',
    );
  });

  it('sin motivo no se envía ni se pide confirmación', async () => {
    const { raiz } = await montar(<TerminacionInquilino />);
    await pulsar(raiz, 'Solicitar terminación');
    expect(alerta).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(todo(raiz)).toContain('Escribe el motivo de la terminación.');
  });

  it('el contador sube y el campo frena en 1000 caracteres', async () => {
    const { raiz } = await montar(<TerminacionInquilino />);
    expect(campoDe(raiz, 'Motivo')?.props.maxLength).toBe(1000);
    await escribirEn(raiz, 'Motivo', 'Me mudo');
    expect(todo(raiz)).toContain('7 / 1000');
  });

  it('confirmación con el resumen (fecha efectiva y motivo) y POST con motivo recortado y fecha de hoy', async () => {
    const { raiz } = await montar(<TerminacionInquilino />);
    await escribirEn(raiz, 'Motivo', '  Me mudo de ciudad  ');
    await pulsar(raiz, 'Solicitar terminación');
    expect(alerta).toHaveBeenCalledTimes(1);
    expect(alerta.mock.calls[0][1]).toContain('Me mudo de ciudad');
    expect(alerta.mock.calls[0][1]).toContain('Fecha efectiva:');
    expect(mockPost).not.toHaveBeenCalled();

    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_INQUILINO });
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/inquilino/contratos/c1/solicitar-terminacion-anticipada',
      { motivo: 'Me mudo de ciudad', fecha_efectiva: hoyBogota() },
    );
    expect(todo(raiz)).toContain('Solicitud enviada. La otra parte debe confirmarla.');
  });

  it('doble toque en la confirmación: una sola llamada', async () => {
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<TerminacionInquilino />);
    await escribirEn(raiz, 'Motivo', 'Me mudo');
    await pulsar(raiz, 'Solicitar terminación');
    await act(async () => {
      alerta.mock.calls[0][2][1].onPress();
      alerta.mock.calls[0][2][1].onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('fecha fuera de rango (400 FECHA_EFECTIVA_INVALIDA): mensaje con el rango del servidor', async () => {
    mockPost.mockRejectedValueOnce(
      new ErrorApi({
        status: 400,
        codigo: 'FECHA_EFECTIVA_INVALIDA',
        mensaje: 'x',
        detalles: { desde: '2026-10-01', hasta: '2026-12-31' },
      }),
    );
    const { raiz } = await montar(<TerminacionInquilino />);
    await escribirEn(raiz, 'Motivo', 'Me mudo');
    await pulsar(raiz, 'Solicitar terminación');
    await confirmarAlerta();
    expect(todo(raiz)).toContain('La fecha efectiva debe estar entre 01/10/2026 y 31/12/2026.');
  });

  it('409 TERMINACION_YA_SOLICITADA: mensaje y "Recargar contrato"', async () => {
    mockPost.mockRejectedValueOnce(
      new ErrorApi({ status: 409, codigo: 'TERMINACION_YA_SOLICITADA', mensaje: 'x' }),
    );
    const { raiz } = await montar(<TerminacionInquilino />);
    await escribirEn(raiz, 'Motivo', 'Me mudo');
    await pulsar(raiz, 'Solicitar terminación');
    await confirmarAlerta();
    expect(todo(raiz)).toContain('Ya hay una solicitud de terminación pendiente.');
    expect(hayBoton(raiz, 'Recargar contrato')).toBe(true);
  });

  it('sin respuesta: verifica recargando el detalle antes de dejar reintentar', async () => {
    mockPost.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<TerminacionInquilino />);
    await escribirEn(raiz, 'Motivo', 'Me mudo');
    await pulsar(raiz, 'Solicitar terminación');
    const antes = llamadasA('/inquilino/contratos/c1');
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_INQUILINO });
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(llamadasA('/inquilino/contratos/c1')).toBeGreaterThan(antes);
    expect(todo(raiz)).toContain('Solicitud enviada. La otra parte debe confirmarla.');
  });

  it('no se ofrece solicitar si el contrato no está ACTIVO o ya hay una solicitud', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_ARRENDADOR });
    const solicitada = await montar(<TerminacionInquilino />);
    expect(campoDe(solicitada.raiz, 'Motivo')).toBeUndefined();
    expect(todo(solicitada.raiz)).toContain('Venta del inmueble');
    expect(todo(solicitada.raiz)).toContain('30/11/2026');
    expect(hayBoton(solicitada.raiz, 'Confirmar terminación')).toBe(true);

    datos.detalle = detalle({ estado: 'VENCIDO' });
    const vencido = await montar(<TerminacionInquilino />);
    expect(campoDe(vencido.raiz, 'Motivo')).toBeUndefined();
  });

  it('solicitud propia: muestra el motivo y "Cancelar mi solicitud", sin confirmar', async () => {
    datos.detalle = detalle({ terminacion_anticipada: SOLICITADA_POR_INQUILINO });
    const { raiz } = await montar(<TerminacionInquilino />);
    expect(todo(raiz)).toContain('Me mudo de ciudad');
    expect(hayBoton(raiz, 'Cancelar mi solicitud')).toBe(true);
    expect(hayBoton(raiz, 'Confirmar terminación')).toBe(false);
  });

  it('CONFIRMADA: solo informativo (sin acta ni liquidación)', async () => {
    datos.detalle = detalle({
      estado: 'TERMINADO_ANTICIPADAMENTE',
      terminacion_anticipada: { ...SOLICITADA_POR_ARRENDADOR, estado: 'CONFIRMADA' },
    });
    const { raiz } = await montar(<TerminacionInquilino />);
    expect(todo(raiz)).toContain('confirmada');
    expect(todo(raiz)).not.toMatch(/acta|liquidaci/i);
    expect(hayBoton(raiz, 'Confirmar terminación')).toBe(false);
    expect(hayBoton(raiz, 'Cancelar mi solicitud')).toBe(false);
  });

  it('404: "No encontramos este contrato"', async () => {
    datos.detalle = new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
    const { raiz } = await montar(<TerminacionInquilino />);
    expect(todo(raiz)).toContain('No encontramos este contrato');
  });
});

describe('Pantalla de aviso de no renovación', () => {
  it('dar el aviso con motivo: confirmación, POST con el motivo recortado y mensaje', async () => {
    const { raiz } = await montar(<AvisoInquilino />);
    expect(campoDe(raiz, 'Motivo (opcional)')?.props.maxLength).toBe(1000);
    await escribirEn(raiz, 'Motivo (opcional)', '  Me mudo  ');
    await pulsar(raiz, 'Dar aviso');
    expect(alerta).toHaveBeenCalledTimes(1);
    expect(mockPost).not.toHaveBeenCalled();
    datos.detalle = detalle({ aviso_no_renovacion: AVISO_PROPIO });
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledWith('/inquilino/contratos/c1/aviso-no-renovacion', {
      motivo: 'Me mudo',
    });
    expect(todo(raiz)).toContain('Aviso de no renovación dado.');
  });

  it('sin motivo: el POST no lleva cuerpo', async () => {
    const { raiz } = await montar(<AvisoInquilino />);
    await pulsar(raiz, 'Dar aviso');
    datos.detalle = detalle({ aviso_no_renovacion: AVISO_PROPIO });
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledWith('/inquilino/contratos/c1/aviso-no-renovacion', undefined);
  });

  it('doble toque: una sola llamada', async () => {
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<AvisoInquilino />);
    await pulsar(raiz, 'Dar aviso');
    await act(async () => {
      alerta.mock.calls[0][2][1].onPress();
      alerta.mock.calls[0][2][1].onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['AVISO_YA_DADO', 'Ya hay un aviso de no renovación para este contrato.'],
    ['CONTRATO_NO_ACTIVO', 'El contrato no está activo.'],
  ])('409 %s: mensaje del diccionario y "Recargar contrato"', async (codigo, mensaje) => {
    mockPost.mockRejectedValueOnce(new ErrorApi({ status: 409, codigo, mensaje: 'x' }));
    const { raiz } = await montar(<AvisoInquilino />);
    await pulsar(raiz, 'Dar aviso');
    await confirmarAlerta();
    expect(todo(raiz)).toContain(mensaje);
    expect(hayBoton(raiz, 'Recargar contrato')).toBe(true);
  });

  it('AVISO_FUERA_DE_PLAZO: explica con la fecha del servidor', async () => {
    mockPost.mockRejectedValueOnce(
      new ErrorApi({
        status: 409,
        codigo: 'AVISO_FUERA_DE_PLAZO',
        mensaje: 'x',
        detalles: { fecha_fin: '2026-12-31' },
      }),
    );
    const { raiz } = await montar(<AvisoInquilino />);
    await pulsar(raiz, 'Dar aviso');
    await confirmarAlerta();
    expect(todo(raiz)).toContain('ya no se puede dar ni cancelar');
    expect(todo(raiz)).toContain('31/12/2026');
  });

  it('sin respuesta: recarga el detalle y compara antes de dejar reintentar', async () => {
    mockPost.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar(<AvisoInquilino />);
    await pulsar(raiz, 'Dar aviso');
    datos.detalle = detalle({ aviso_no_renovacion: AVISO_PROPIO });
    await confirmarAlerta();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(todo(raiz)).toContain('Aviso de no renovación dado.');
  });
});

describe('useAccionContrato conserva su comportamiento para el arrendador', () => {
  function Sonda({ alLeer }: { alLeer: (v: ReturnType<typeof useAccionContrato>) => void }) {
    alLeer(useAccionContrato('c1', 'darAviso'));
    return <Text>sonda</Text>;
  }

  it('por defecto verifica con GET /contratos/:id (no con el portal) tras "sin respuesta"', async () => {
    let accion!: ReturnType<typeof useAccionContrato>;
    await montar(<Sonda alLeer={(v) => (accion = v)} />);
    await act(async () => {
      await accion.iniciar(() => Promise.reject(new ErrorSinConexion()));
    });
    expect(mockGet).toHaveBeenCalledWith('/contratos/c1');
    expect(mockGet).not.toHaveBeenCalledWith('/inquilino/contratos/c1');
  });
});

describe('Más: Mi perfil', () => {
  it('"Mi perfil" va arriba de "Cerrar sesión" y abre /mi-perfil', async () => {
    const { raiz } = await montar(<MasInquilino />);
    const textos = textosDe(raiz);
    expect(textos.indexOf('Mi perfil')).toBeGreaterThan(-1);
    expect(textos.indexOf('Mi perfil')).toBeLessThan(textos.indexOf('Cerrar sesión'));
    await pulsar(raiz, 'Mi perfil');
    expect(mockPush).toHaveBeenCalledWith('/mi-perfil');
  });
});

describe('Mi perfil del inquilino', () => {
  const guardar = async (raiz: Raiz) => {
    await pulsar(raiz, 'Guardar cambios');
    await esperar();
  };

  it('muestra nombre y teléfono editables; cédula y correo solo lectura con su explicación', async () => {
    const { raiz } = await montar(<MiPerfilInquilino />);
    expect(mockGet).toHaveBeenCalledWith('/inquilino/perfil');
    expect(campoDe(raiz, 'Nombre completo')?.props.value).toBe('Camilo Pardo');
    expect(campoDe(raiz, 'Teléfono')?.props.value).toBe('3001234567');
    expect(campoDe(raiz, 'Cédula')).toBeUndefined();
    expect(campoDe(raiz, 'Correo')).toBeUndefined();
    const t = textosDe(raiz);
    expect(t).toContain('1020304050');
    expect(t).toContain('camilo@ejemplo.com');
    expect(t.join(' | ')).toContain('no se pueden cambiar aquí');
    expect(t).toContain(
      'Tus contratos conservan los datos que tu arrendador escribió; este cambio no los modifica.',
    );
  });

  it('sin cambios no llama al servidor', async () => {
    const { raiz } = await montar(<MiPerfilInquilino />);
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(todo(raiz)).toContain('No hiciste ningún cambio.');
  });

  it('envía solo lo que cambió (recortado)', async () => {
    const { raiz } = await montar(<MiPerfilInquilino />);
    await escribirEn(raiz, 'Teléfono', ' 3109998888 ');
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/inquilino/perfil', { telefono: '3109998888' });
    expect(todo(raiz)).toContain('Cambios guardados.');
  });

  it('nombre vacío o de solo espacios: se bloquea', async () => {
    const { raiz } = await montar(<MiPerfilInquilino />);
    await escribirEn(raiz, 'Nombre completo', '   ');
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(todo(raiz)).toContain('Escribe tu nombre.');
  });

  it('teléfono vacío: se bloquea', async () => {
    const { raiz } = await montar(<MiPerfilInquilino />);
    await escribirEn(raiz, 'Teléfono', '');
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(todo(raiz)).toContain('Escribe tu teléfono.');
  });

  it('sin respuesta: avisa y se puede reintentar directo (el PATCH es idempotente)', async () => {
    mockPatch.mockRejectedValueOnce(new ErrorSinConexion()).mockResolvedValueOnce(PERFIL);
    const { raiz } = await montar(<MiPerfilInquilino />);
    await escribirEn(raiz, 'Teléfono', '3109998888');
    await guardar(raiz);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(todo(raiz)).toContain('Cambios guardados.');
  });

  it.each([
    ['CAMPO_NO_EDITABLE', 'Alguno de los datos que intentas cambiar no se puede editar.'],
    ['SIN_CAMPOS', 'No enviaste ningún dato para cambiar.'],
  ])('400 %s: mensaje claro', async (codigo, mensaje) => {
    mockPatch.mockRejectedValueOnce(new ErrorApi({ status: 400, codigo, mensaje: 'x' }));
    const { raiz } = await montar(<MiPerfilInquilino />);
    await escribirEn(raiz, 'Teléfono', '3109998888');
    await guardar(raiz);
    expect(todo(raiz)).toContain(mensaje);
  });

  it('doble toque en "Guardar cambios": una sola llamada', async () => {
    mockPatch.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar(<MiPerfilInquilino />);
    await escribirEn(raiz, 'Teléfono', '3109998888');
    const boton = botonDe(raiz, 'Guardar cambios');
    await act(async () => {
      boton.props.onPress();
      boton.props.onPress();
    });
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });

  it('error al cargar: aviso y "Reintentar"', async () => {
    datos.perfil = new ErrorSinConexion();
    const { raiz } = await montar(<MiPerfilInquilino />);
    expect(todo(raiz)).toMatch(/No hay conexión/);
    datos.perfil = PERFIL;
    await pulsar(raiz, 'Reintentar');
    expect(campoDe(raiz, 'Nombre completo')?.props.value).toBe('Camilo Pardo');
  });
});

describe('Foto de la cédula del inquilino', () => {
  it('sube con el campo "foto" a /inquilino/perfil/foto-cedula, con vista previa, y refresca el perfil', async () => {
    let terminar!: (v: unknown) => void;
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubir.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar(<MiPerfilInquilino />);
    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');
    expect(mockSubir).toHaveBeenCalledWith('/inquilino/perfil/foto-cedula', 'foto', FOTO);
    expect(raiz.root.findAllByType(Image)[0].props.source).toMatchObject({ uri: FOTO.uri });
    const antes = llamadasA('/inquilino/perfil');
    await act(async () => terminar(PERFIL));
    await esperar();
    expect(llamadasA('/inquilino/perfil')).toBeGreaterThan(antes);
  });

  it('documento sensible: caché solo en memoria y sin clave de caché', async () => {
    datos.perfil = {
      ...PERFIL,
      foto_cedula_url: 'https://b.test/s/inquilinos/i1/cedula.jpg?token=SECRETO',
    };
    const { raiz } = await montar(<MiPerfilInquilino />);
    const imagen = raiz.root.findAllByType(Image)[0];
    expect(imagen.props.cachePolicy).toBe('memory');
    expect(imagen.props.source.cacheKey).toBeUndefined();
  });

  it('si falla: mensaje en español sin URL ni datos del documento, y se puede reintentar', async () => {
    datos.perfil = {
      ...PERFIL,
      foto_cedula_url: 'https://b.test/s/inquilinos/i1/cedula.jpg?token=SECRETO',
    };
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubir
      .mockRejectedValueOnce(
        new ErrorApi({ status: 415, codigo: 'ARCHIVO_CONTENIDO_INVALIDO', mensaje: 'x' }),
      )
      .mockResolvedValue(PERFIL);
    const { raiz } = await montar(<MiPerfilInquilino />);
    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');
    const t = textosDe(raiz);
    expect(t).toContain('Esa foto no es válida. Usa una imagen JPG o PNG.');
    expect(t.join('|')).not.toMatch(/SECRETO|b\.test|cedula\.jpg/);
    await pulsar(raiz, 'Reintentar');
    expect(mockSubir).toHaveBeenCalledTimes(2);
  });
});

describe('contrato seleccionado al cerrar sesión (sigue limpiándose con Más)', () => {
  it('"Cerrar sesión" sigue disponible junto a "Mi perfil"', async () => {
    let valor!: ReturnType<typeof useContratoSeleccionado>;
    function Sonda() {
      valor = useContratoSeleccionado();
      return null;
    }
    const { raiz } = await montar(
      <>
        <Sonda />
        <MasInquilino />
      </>,
    );
    expect(hayBoton(raiz, 'Cerrar sesión')).toBe(true);
    expect(valor.contratoId).toBe('c1');
  });
});
