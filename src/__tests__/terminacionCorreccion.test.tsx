// Terminación anticipada, corrección de datos sin vincular y documentos faltantes (E5-C).
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';

import Corregir from '../../app/(arrendador)/contrato/[id]/corregir';
import CorregirInquilino from '../../app/(arrendador)/contrato/[id]/corregir-inquilino';
import Detalle from '../../app/(arrendador)/contrato/[id]/index';
import Terminacion from '../../app/(arrendador)/contrato/[id]/terminacion';
import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../api/cliente';
import type {
  ContratoDetalle,
  DocumentoContrato,
  ResumenTerminacionContrato,
} from '../api/contratos';
import { hoyBogota } from '../utilidades/fechas';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
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
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View testID="codigo-qr" {...props} />,
  };
});
jest.mock('expo-clipboard', () => ({ setStringAsync: async () => true }));
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View testID="selector-fecha" {...props} />,
  };
});
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: async () => ({ status: 200, uri: 'x' }),
  deleteAsync: async () => undefined,
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async () => undefined,
}));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
  },
}));

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];
const HOY = hoyBogota();

const TERMINACION_NINGUNA: ResumenTerminacionContrato = {
  estado: 'NINGUNA',
  solicitada_por: null,
  solicitada_en: null,
  motivo: null,
  fecha_efectiva: null,
  confirmada_por: null,
  confirmada_en: null,
  puede_confirmar: false,
  puede_cancelar: false,
};
const BASE: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-09-01T00:00:00.000Z',
  fecha_fin: '2027-08-31T00:00:00.000Z',
  canon_centavos: 250_000_000,
  tipo_plantilla: 'LOCAL_COMERCIAL',
  dia_pago: 5,
  forma_pago: 'Transferencia',
  datos_recaudo: 'Bancolombia 123',
  deposito_centavos: 500_000_000,
  datos_fiador_o_poliza: null,
  condicionesParticularesTexto: null,
  vinculado: false,
  inquilino: { id: 'q1', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
  unidad: { id: 'u1', nombre: 'Local 1', tipo: 'LOCAL' },
  codigo_acceso: null,
  incrementos_ipc: [],
  aviso_no_renovacion: {
    estado: 'NINGUNO',
    dado_por: null,
    dado_en: null,
    motivo: null,
    puede_dar: false,
    puede_cancelar: false,
  },
  terminacion_anticipada: TERMINACION_NINGUNA,
};
const conTerminacion = (extra: Partial<ResumenTerminacionContrato>): ContratoDetalle => ({
  ...BASE,
  terminacion_anticipada: { ...TERMINACION_NINGUNA, ...extra },
});
const DOC: DocumentoContrato = {
  id: 'd1',
  tipo: 'CONTRATO_ORIGINAL',
  version: 1,
  generado_en: '2026-09-01T15:00:00.000Z',
  hash_sha256: 'abc',
  url_firmada: null,
};

const datos: { detalle: ContratoDetalle; docs: DocumentoContrato[] } = {
  detalle: BASE,
  docs: [DOC],
};

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
const confirmar = async (alerta: jest.SpyInstance, indice = 0) => {
  await act(async () => alerta.mock.calls[indice][2][1].onPress());
  await esperar();
};
const porEtiqueta = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find((n) => n.props.accessibilityLabel === etiqueta && !!n.props.onPress);
const elegirFecha = async (raiz: Raiz, etiqueta: string, fecha: Date) => {
  await act(async () => porEtiqueta(raiz, etiqueta).props.onPress());
  const selector = raiz.root.findAll((n) => n.props.testID === 'selector-fecha')[0];
  await act(async () => selector.props.onChange({ type: 'set' }, fecha));
};
const api = (status: number, codigo: string, mensaje = 'texto técnico', detalles?: unknown) =>
  new ErrorApi({ status, codigo, mensaje, detalles });
const alertaFalsa = () => jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [mockGet, mockPost, mockPatch, mockPush, mockBack, mockReplace]) m.mockReset();
  mockParams = { id: 'c1' };
  Object.assign(datos, { detalle: BASE, docs: [DOC] });
  mockGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/contratos/c1') return datos.detalle;
    if (ruta === '/contratos/c1/documentos') return datos.docs;
    if (ruta === '/contratos') return [];
    throw new Error(`GET inesperado ${ruta}`);
  });
});

describe('Detalle: terminación anticipada (botones según los booleanos del servidor)', () => {
  const montar = async (detalle: ContratoDetalle) => {
    datos.detalle = detalle;
    const r = await renderizarPantalla(<Detalle />);
    await esperar();
    return r.raiz;
  };
  const TITULOS = [
    'Solicitar terminación anticipada',
    'Cancelar solicitud',
    'Confirmar terminación',
  ];
  const visibles = (raiz: Raiz) => TITULOS.filter((t) => hayBoton(raiz, t));

  it('ACTIVO sin solicitud: "Solicitar terminación anticipada" lleva a su pantalla', async () => {
    const raiz = await montar(BASE);
    expect(visibles(raiz)).toEqual(['Solicitar terminación anticipada']);
    await pulsar(raiz, 'Solicitar terminación anticipada');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/contrato/[id]/terminacion',
      params: { id: 'c1' },
    });
  });

  it('PROGRAMADO o finalizado: no se ofrece solicitar', async () => {
    expect(visibles(await montar({ ...BASE, estado: 'PROGRAMADO' }))).toEqual([]);
    expect(visibles(await montar({ ...BASE, estado: 'VENCIDO' }))).toEqual([]);
  });

  it('SOLICITADA con puede_confirmar: "Confirmar terminación" y NO cancelar', async () => {
    const raiz = await montar(
      conTerminacion({
        estado: 'SOLICITADA',
        solicitada_por: 'INQUILINO',
        solicitada_en: '2026-10-02T10:00:00.000Z',
        motivo: 'Me mudo',
        fecha_efectiva: '2026-11-30T00:00:00.000Z',
        puede_confirmar: true,
      }),
    );
    expect(visibles(raiz)).toEqual(['Confirmar terminación']);
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Terminación anticipada solicitada por el inquilino');
    expect(todo).toContain('Me mudo');
    expect(todo).toContain('30/11/2026');
  });

  it('SOLICITADA con puede_cancelar: "Cancelar solicitud" y NO confirmar', async () => {
    const raiz = await montar(
      conTerminacion({ estado: 'SOLICITADA', solicitada_por: 'ARRENDADOR', puede_cancelar: true }),
    );
    expect(visibles(raiz)).toEqual(['Cancelar solicitud']);
  });

  it('SOLICITADA sin ninguno de los dos booleanos: ningún botón (nunca se deduce)', async () => {
    const raiz = await montar(
      conTerminacion({ estado: 'SOLICITADA', solicitada_por: 'ARRENDADOR' }),
    );
    expect(visibles(raiz)).toEqual([]);
  });

  it('CONFIRMADA: información (quién confirmó y fecha efectiva), sin acciones, sin acta ni liquidación', async () => {
    const raiz = await montar(
      conTerminacion({
        estado: 'CONFIRMADA',
        solicitada_por: 'ARRENDADOR',
        confirmada_por: 'INQUILINO',
        confirmada_en: '2026-10-05T10:00:00.000Z',
        fecha_efectiva: '2026-11-30T00:00:00.000Z',
        puede_confirmar: true,
        puede_cancelar: true,
      }),
    );
    expect(visibles(raiz)).toEqual([]);
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Terminación anticipada confirmada por el inquilino el 05/10/2026');
    expect(todo).toContain('30/11/2026');
    expect(todo).not.toMatch(/acta|liquidaci/i);
  });

  describe('confirmar (irreversible)', () => {
    const solicitada = conTerminacion({
      estado: 'SOLICITADA',
      solicitada_por: 'INQUILINO',
      fecha_efectiva: '2026-11-30T00:00:00.000Z',
      puede_confirmar: true,
    });

    it('confirmación fuerte; llama una sola vez aunque se toque dos veces', async () => {
      const alerta = alertaFalsa();
      let terminar!: (v: unknown) => void;
      mockPost.mockReturnValue(new Promise((r) => (terminar = r)));
      const raiz = await montar(solicitada);
      await pulsar(raiz, 'Confirmar terminación');
      expect(alerta.mock.calls[0][0]).toBe('Confirmar terminación anticipada');
      const mensaje = alerta.mock.calls[0][1] as string;
      expect(mensaje).toContain('irreversible');
      expect(mensaje).toContain('si la fecha efectiva es hoy, el contrato termina de inmediato');
      expect(mensaje).toContain('si es futura, sigue activo hasta esa fecha');
      expect(mockPost).not.toHaveBeenCalled();

      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/contratos/c1/confirmar-terminacion-anticipada');

      datos.detalle = conTerminacion({ estado: 'CONFIRMADA', confirmada_por: 'ARRENDADOR' });
      await act(async () => terminar({}));
      await esperar();
      expect(hayBoton(raiz, 'Confirmar terminación')).toBe(false);
    });

    it('error del servidor y aviso de recargar si el estado cambió', async () => {
      const alerta = alertaFalsa();
      mockPost.mockRejectedValue(api(409, 'TERMINACION_YA_CONFIRMADA'));
      const raiz = await montar(solicitada);
      await pulsar(raiz, 'Confirmar terminación');
      await confirmar(alerta);
      expect(textosDe(raiz)).toContain('La terminación ya fue confirmada.');
      expect(textosDe(raiz).join('|')).toContain('recárgalo');
      expect(hayBoton(raiz, 'Recargar contrato')).toBe(true);
    });

    it('403 NO_PUEDE_CONFIRMAR_SU_PROPIA_SOLICITUD: mensaje claro', async () => {
      const alerta = alertaFalsa();
      mockPost.mockRejectedValue(api(403, 'NO_PUEDE_CONFIRMAR_SU_PROPIA_SOLICITUD'));
      const raiz = await montar(solicitada);
      await pulsar(raiz, 'Confirmar terminación');
      await confirmar(alerta);
      expect(textosDe(raiz)).toContain('La otra parte es quien debe confirmar la solicitud.');
    });

    it('sin respuesta: verifica; si ya está CONFIRMADA no la da por pendiente ni reintenta sola', async () => {
      const alerta = alertaFalsa();
      mockPost.mockRejectedValue(new ErrorTimeout());
      const raiz = await montar(solicitada);
      datos.detalle = conTerminacion({ estado: 'CONFIRMADA', confirmada_por: 'ARRENDADOR' });
      await pulsar(raiz, 'Confirmar terminación');
      await confirmar(alerta);
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(hayBoton(raiz, 'Confirmar terminación')).toBe(false);
      expect(textosDe(raiz)).toContain('Terminación confirmada.');
    });

    it('sin respuesta y nada cambió: permite reintentar', async () => {
      const alerta = alertaFalsa();
      mockPost.mockRejectedValue(new ErrorSinConexion());
      const raiz = await montar(solicitada);
      await pulsar(raiz, 'Confirmar terminación');
      await confirmar(alerta);
      expect(textosDe(raiz)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
      expect(hayBoton(raiz, 'Confirmar terminación')).toBe(true);
    });
  });

  describe('cancelar solicitud', () => {
    const propia = conTerminacion({
      estado: 'SOLICITADA',
      solicitada_por: 'ARRENDADOR',
      puede_cancelar: true,
    });

    it('confirma y llama; doble toque = una llamada', async () => {
      const alerta = alertaFalsa();
      mockPost.mockReturnValue(new Promise(() => undefined));
      const raiz = await montar(propia);
      await pulsar(raiz, 'Cancelar solicitud');
      expect(alerta.mock.calls[0][0]).toBe('Cancelar solicitud');
      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/contratos/c1/cancelar-terminacion-anticipada');
    });

    it('sin respuesta: verifica y, si volvió a NINGUNA, lo da por hecho', async () => {
      const alerta = alertaFalsa();
      mockPost.mockRejectedValue(new ErrorTimeout());
      const raiz = await montar(propia);
      datos.detalle = BASE;
      await pulsar(raiz, 'Cancelar solicitud');
      await confirmar(alerta);
      expect(hayBoton(raiz, 'Cancelar solicitud')).toBe(false);
      expect(hayBoton(raiz, 'Solicitar terminación anticipada')).toBe(true);
    });

    it('403 de solicitud ajena: mensaje', async () => {
      const alerta = alertaFalsa();
      mockPost.mockRejectedValue(api(403, 'NO_PUEDE_CANCELAR_SOLICITUD_AJENA'));
      const raiz = await montar(propia);
      await pulsar(raiz, 'Cancelar solicitud');
      await confirmar(alerta);
      expect(textosDe(raiz)).toContain('Solo quien hizo la solicitud puede cancelarla.');
    });
  });
});

describe('Solicitar terminación anticipada (pantalla)', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Terminacion />);
    await esperar();
    return r;
  };
  const ADVERTENCIA =
    'Esto es una terminación por mutuo acuerdo. No reemplaza el aviso escrito ni las causales de una terminación unilateral (Ley 820, arts. 22 a 24).';

  it('muestra la advertencia obligatoria del Contexto, motivo con contador y fecha de hoy', async () => {
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain(ADVERTENCIA);
    expect(textosDe(raiz)).toContain('0 / 1000');
    expect(campoDe(raiz, 'Motivo')?.props.maxLength).toBe(1000);
    await escribirEn(raiz, 'Motivo', 'Venta del inmueble');
    expect(textosDe(raiz)).toContain('18 / 1000');
  });

  it('el motivo es obligatorio: sin motivo no hay confirmación ni llamada', async () => {
    const alerta = alertaFalsa();
    const { raiz } = await montar();
    await pulsar(raiz, 'Solicitar terminación');
    expect(alerta).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Escribe el motivo de la terminación.');
  });

  it('confirmación con resumen (fecha y motivo) y llamada con motivo y fecha AAAA-MM-DD', async () => {
    const alerta = alertaFalsa();
    mockPost.mockResolvedValue({});
    const { raiz } = await montar();
    await escribirEn(raiz, 'Motivo', 'Venta del inmueble');
    await elegirFecha(raiz, 'Fecha efectiva', new Date(2027, 0, 15, 12));
    await pulsar(raiz, 'Solicitar terminación');
    expect(alerta.mock.calls[0][0]).toBe('Solicitar terminación anticipada');
    const resumen = alerta.mock.calls[0][1] as string;
    expect(resumen).toContain('15 de enero de 2027');
    expect(resumen).toContain('Venta del inmueble');
    expect(mockPost).not.toHaveBeenCalled();

    datos.detalle = conTerminacion({ estado: 'SOLICITADA', solicitada_por: 'ARRENDADOR' });
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/solicitar-terminacion-anticipada', {
      motivo: 'Venta del inmueble',
      fecha_efectiva: '2027-01-15',
    });
    expect(textosDe(raiz)).toContain('Solicitud enviada. La otra parte debe confirmarla.');
  });

  it('por defecto la fecha efectiva es hoy', async () => {
    const alerta = alertaFalsa();
    mockPost.mockResolvedValue({});
    const { raiz } = await montar();
    await escribirEn(raiz, 'Motivo', 'x');
    await pulsar(raiz, 'Solicitar terminación');
    await confirmar(alerta);
    expect(mockPost.mock.calls[0][1].fecha_efectiva).toBe(HOY);
  });

  it('doble toque: una sola llamada', async () => {
    const alerta = alertaFalsa();
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar();
    await escribirEn(raiz, 'Motivo', 'x');
    await pulsar(raiz, 'Solicitar terminación');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      api(400, 'FECHA_EFECTIVA_INVALIDA', 'x', { desde: '2026-10-01', hasta: '2027-08-31' }),
      'La fecha efectiva debe estar entre 01/10/2026 y 31/08/2027.',
    ],
    [api(409, 'TERMINACION_YA_SOLICITADA'), 'Ya hay una solicitud de terminación pendiente.'],
    [api(409, 'CONTRATO_NO_ACTIVO'), 'El contrato no está activo.'],
  ])('error del servidor con sus datos y sin texto técnico', async (error, mensaje) => {
    const alerta = alertaFalsa();
    mockPost.mockRejectedValue(error);
    const { raiz } = await montar();
    await escribirEn(raiz, 'Motivo', 'x');
    await pulsar(raiz, 'Solicitar terminación');
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain(mensaje);
    expect(textosDe(raiz).join('|')).not.toContain('texto técnico');
  });

  it('sin respuesta: verifica el estado y, si ya quedó SOLICITADA, muestra el éxito', async () => {
    const alerta = alertaFalsa();
    mockPost.mockRejectedValue(new ErrorTimeout());
    const { raiz } = await montar();
    datos.detalle = conTerminacion({ estado: 'SOLICITADA', solicitada_por: 'ARRENDADOR' });
    await escribirEn(raiz, 'Motivo', 'x');
    await pulsar(raiz, 'Solicitar terminación');
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(textosDe(raiz)).toContain('Solicitud enviada. La otra parte debe confirmarla.');
  });

  it('el motivo no se escribe en los logs', async () => {
    const alerta = alertaFalsa();
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    mockPost.mockResolvedValue({});
    const { raiz } = await montar();
    await escribirEn(raiz, 'Motivo', 'motivo-secreto');
    await pulsar(raiz, 'Solicitar terminación');
    await confirmar(alerta);
    expect(JSON.stringify(espias.flatMap((e) => e.mock.calls))).not.toContain('motivo-secreto');
  });
});

describe('Detalle: corregir (visibilidad)', () => {
  const montar = async (detalle: ContratoDetalle) => {
    datos.detalle = detalle;
    const r = await renderizarPantalla(<Detalle />);
    await esperar();
    return r.raiz;
  };

  it('sin vincular y ACTIVO o PROGRAMADO: "Corregir datos" y "Corregir datos del inquilino"', async () => {
    for (const estado of ['ACTIVO', 'PROGRAMADO'] as const) {
      const raiz = await montar({ ...BASE, estado });
      expect(hayBoton(raiz, 'Corregir datos')).toBe(true);
      expect(hayBoton(raiz, 'Corregir datos del inquilino')).toBe(true);
    }
  });

  it('vinculado o finalizado: no se ofrece corregir', async () => {
    for (const extra of [
      { vinculado: true },
      { estado: 'VENCIDO' as const },
      { estado: 'CANCELADO' as const },
    ]) {
      const raiz = await montar({ ...BASE, ...extra });
      expect(hayBoton(raiz, 'Corregir datos')).toBe(false);
      expect(hayBoton(raiz, 'Corregir datos del inquilino')).toBe(false);
    }
  });

  it('los botones llevan a sus pantallas', async () => {
    const raiz = await montar(BASE);
    await pulsar(raiz, 'Corregir datos');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contrato/[id]/corregir',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Corregir datos del inquilino');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contrato/[id]/corregir-inquilino',
      params: { id: 'c1' },
    });
  });
});

describe('Corregir datos del contrato', () => {
  const montar = async (detalle: ContratoDetalle = BASE) => {
    datos.detalle = detalle;
    const r = await renderizarPantalla(<Corregir />);
    await esperar();
    return r;
  };
  const guardar = async (raiz: Raiz) => pulsar(raiz, 'Guardar correcciones');
  const RESPUESTA = {
    ...BASE,
    canon_centavos: 260_000_000,
    documento: { id: 'd2', tipo: 'CONTRATO_ORIGINAL', version: 2, url_firmada: null },
  };

  it('precarga los valores actuales', async () => {
    const { raiz } = await montar();
    expect(campoDe(raiz, 'Canon mensual')?.props.value).toBe('2.500.000');
    expect(campoDe(raiz, 'Día de pago (1 a 31)')?.props.value).toBe('5');
    expect(campoDe(raiz, 'Forma de pago')?.props.value).toBe('Transferencia');
    expect(campoDe(raiz, 'Datos de recaudo')?.props.value).toBe('Bancolombia 123');
    expect(campoDe(raiz, 'Depósito (opcional)')?.props.value).toBe('5.000.000');
  });

  it('sin cambios: no llama al servidor y avisa', async () => {
    const { raiz } = await montar();
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });

  it('envía SOLO los campos que cambiaron', async () => {
    mockPatch.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await escribirEn(raiz, 'Día de pago (1 a 31)', '10');
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/contratos/c1', {
      canon_centavos: 260_000_000,
      dia_pago: 10,
    });
  });

  it('cambia una fecha: se envía AAAA-MM-DD', async () => {
    mockPatch.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await elegirFecha(raiz, 'Fecha de fin', new Date(2028, 1, 29, 12));
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledWith('/contratos/c1', { fecha_fin: '2028-02-29' });
  });

  it('en vivienda no hay campo de depósito', async () => {
    const { raiz } = await montar({
      ...BASE,
      tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
      deposito_centavos: null,
    });
    expect(campoDe(raiz, 'Depósito (opcional)')).toBeUndefined();
  });

  it('datos_recaudo null: campo vacío, no se envía si no se editó y no bloquea el guardado', async () => {
    mockPatch.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar({ ...BASE, datos_recaudo: null });
    expect(campoDe(raiz, 'Datos de recaudo')?.props.value).toBe('');
    await escribirEn(raiz, 'Día de pago (1 a 31)', '12');
    await guardar(raiz);
    expect(mockPatch.mock.calls[0][1]).toEqual({ dia_pago: 12 });
  });

  it('valores inválidos: errores locales y ninguna llamada', async () => {
    const { raiz } = await montar();
    await escribirEn(raiz, 'Día de pago (1 a 31)', '40');
    await escribirEn(raiz, 'Forma de pago', ' ');
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('El día de pago es un número del 1 al 31.');
    expect(todo).toContain('Escribe la forma de pago.');
  });

  it('éxito con documento: dice que se generó la versión nueva', async () => {
    mockPatch.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await guardar(raiz);
    expect(textosDe(raiz)).toContain('Se generó una versión nueva del contrato (versión 2).');
  });

  it('éxito con documento null: avisa que el PDF falló y ofrece "Generar documentos faltantes"', async () => {
    const alerta = alertaFalsa();
    mockPatch.mockResolvedValue({ ...RESPUESTA, documento: null });
    mockPost.mockResolvedValue({
      generados: [{ tipo: 'CONTRATO_ORIGINAL', version: 2 }],
      ya_existian: 1,
    });
    const { raiz } = await montar();
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await guardar(raiz);
    expect(textosDe(raiz)).toContain('La corrección se aplicó, pero el PDF no se pudo generar.');
    await pulsar(raiz, 'Generar documentos faltantes');
    expect(alerta).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/documentos/regenerar');
    expect(textosDe(raiz)).toContain('Se generó 1 documento.');
  });

  it.each([
    [
      api(409, 'CONTRATO_NO_EDITABLE', 'El contrato no se puede corregir: ya tiene pagos.'),
      'El contrato no se puede corregir: ya tiene pagos.',
    ],
    [
      api(409, 'CONTRATO_YA_VINCULADO'),
      'El inquilino ya vinculó este contrato, por lo que ya no se puede corregir.',
    ],
    [
      api(409, 'TRASLAPE_DE_CONTRATOS', 'x', {
        fecha_inicio: '2026-10-01T00:00:00.000Z',
        fecha_fin: '2027-09-30T00:00:00.000Z',
      }),
      'Choca con el contrato del 01/10/2026 al 30/09/2027.',
    ],
    [api(400, 'FECHA_FIN_PASADA'), 'La fecha de fin del contrato debe ser posterior a hoy.'],
    [
      api(400, 'DEPOSITO_NO_PERMITIDO_VIVIENDA'),
      'En vivienda urbana no se puede exigir depósito (Ley 820 de 2003).',
    ],
    [api(400, 'SIN_CAMPOS'), 'No enviaste ningún dato para cambiar.'],
    [api(400, 'CAMPO_NO_EDITABLE'), 'Alguno de los datos que intentas cambiar no se puede editar.'],
  ])('error del servidor con su mensaje', async (error, mensaje) => {
    mockPatch.mockRejectedValue(error);
    const { raiz } = await montar();
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await guardar(raiz);
    expect(textosDe(raiz)).toContain(mensaje);
    expect(textosDe(raiz).join('|')).not.toContain('texto técnico');
  });

  it('409 de estado: invita a recargar el detalle', async () => {
    mockPatch.mockRejectedValue(
      api(409, 'CONTRATO_NO_EDITABLE', 'El contrato no se puede corregir: ya tiene pagos.'),
    );
    const { raiz } = await montar();
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await guardar(raiz);
    expect(hayBoton(raiz, 'Recargar contrato')).toBe(true);
  });

  it('sin respuesta: permite reintentar directamente (el PATCH es seguro) y no da el éxito por hecho', async () => {
    mockPatch.mockRejectedValueOnce(new ErrorTimeout()).mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await guardar(raiz);
    expect(textosDe(raiz)).not.toContain('Datos corregidos');
    expect(textosDe(raiz).join('|')).toContain('Puedes reintentar');
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(textosDe(raiz)).toContain('Datos corregidos');
  });

  it('doble toque: una sola llamada', async () => {
    let terminar!: (v: unknown) => void;
    mockPatch.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar();
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await guardar(raiz);
    const ocupado = raiz.root.find(
      (n) => n.props.accessibilityRole === 'button' && n.props.accessibilityState?.busy === true,
    );
    await act(async () => ocupado.props.onPress());
    await act(async () => ocupado.props.onPress());
    expect(mockPatch).toHaveBeenCalledTimes(1);
    await act(async () => terminar(RESPUESTA));
    await esperar();
  });

  it('tras el éxito actualiza detalle, lista y documentos', async () => {
    mockPatch.mockResolvedValue(RESPUESTA);
    const { raiz, cliente } = await montar();
    cliente.setQueryData(['contratos'], []);
    cliente.setQueryData(['contratos', 'documentos', 'c1'], []);
    await escribirEn(raiz, 'Canon mensual', '2600000');
    await guardar(raiz);
    expect(cliente.getQueryState(['contratos'])?.isInvalidated).toBe(true);
    expect(cliente.getQueryState(['contratos', 'documentos', 'c1'])?.isInvalidated).toBe(true);
  });
});

describe('Corregir datos del inquilino', () => {
  const montar = async () => {
    datos.detalle = BASE;
    const r = await renderizarPantalla(<CorregirInquilino />);
    await esperar();
    return r;
  };
  const guardar = (raiz: Raiz) => pulsar(raiz, 'Guardar correcciones');
  const RESPUESTA = { ...BASE, documento: { id: 'd2', tipo: 'CONTRATO_ORIGINAL', version: 2 } };

  it('precarga y envía solo lo que cambió (nombre): sin advertencia del código', async () => {
    const alerta = alertaFalsa();
    mockPatch.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    expect(campoDe(raiz, 'Nombre completo')?.props.value).toBe('Camilo Pardo');
    expect(campoDe(raiz, 'Documento de identidad')?.props.value).toBe('1020304050');
    await escribirEn(raiz, 'Nombre completo', ' Camilo P. ');
    await guardar(raiz);
    expect(alerta).not.toHaveBeenCalled();
    expect(mockPatch).toHaveBeenCalledWith('/contratos/c1/inquilino', { nombre: 'Camilo P.' });
  });

  it('sin cambios: no llama al servidor', async () => {
    const { raiz } = await montar();
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });

  it('validación del asistente: nombre, teléfono y documento de 5 a 20', async () => {
    const { raiz } = await montar();
    await escribirEn(raiz, 'Nombre completo', ' ');
    await escribirEn(raiz, 'Teléfono', '');
    await escribirEn(raiz, 'Documento de identidad', '12');
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Escribe el nombre del inquilino.');
    expect(todo).toContain('Escribe el teléfono del inquilino.');
    expect(todo).toContain('El documento debe tener entre 5 y 20 caracteres.');
  });

  it('cambiar la cédula advierte ANTES, normaliza y, al éxito, muestra solo el código nuevo', async () => {
    const alerta = alertaFalsa();
    mockPatch.mockResolvedValue({
      ...RESPUESTA,
      codigo_acceso: { codigo: 'RC-NEW1-2222', expira_en: '2099-11-01T12:00:00.000Z' },
    });
    const { raiz } = await montar();
    await escribirEn(raiz, 'Documento de identidad', '9.999.999-1');
    await guardar(raiz);
    expect(alerta.mock.calls[0][1]).toContain(
      'El código de acceso anterior dejará de servir y se genera uno nuevo.',
    );
    expect(mockPatch).not.toHaveBeenCalled();

    await confirmar(alerta);
    expect(mockPatch).toHaveBeenCalledWith('/contratos/c1/inquilino', { cedula: '99999991' });
    const textos = textosDe(raiz);
    expect(textos).toContain('RC-NEW1-2222');
    expect(raiz.root.findAll((n) => n.props.testID === 'codigo-qr')[0].props.value).toBe(
      'RC-NEW1-2222',
    );
    expect(hayBoton(raiz, 'Copiar código')).toBe(true);
    expect(hayBoton(raiz, 'Compartir código')).toBe(true);
    expect(textos.join('|')).not.toContain('1020304050');
  });

  it('error de cédula inválida del servidor: se muestra su texto', async () => {
    const alerta = alertaFalsa();
    const texto = 'La cédula debe tener entre 5 y 20 caracteres alfanuméricos.';
    mockPatch.mockRejectedValue(api(400, 'SOLICITUD_INVALIDA', texto));
    const { raiz } = await montar();
    await escribirEn(raiz, 'Documento de identidad', '99999991');
    await guardar(raiz);
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain(texto);
  });

  it('INQUILINO_DATOS_INVALIDOS y CONTRATO_YA_VINCULADO', async () => {
    mockPatch.mockRejectedValueOnce(api(400, 'INQUILINO_DATOS_INVALIDOS'));
    const { raiz } = await montar();
    await escribirEn(raiz, 'Nombre completo', 'Otro');
    await guardar(raiz);
    expect(textosDe(raiz)).toContain('Los datos del inquilino no son válidos.');
  });

  it('documento null: aviso y "Generar documentos faltantes"', async () => {
    mockPatch.mockResolvedValue({ ...RESPUESTA, documento: null });
    const { raiz } = await montar();
    await escribirEn(raiz, 'Nombre completo', 'Otro');
    await guardar(raiz);
    expect(textosDe(raiz)).toContain('La corrección se aplicó, pero el PDF no se pudo generar.');
    expect(hayBoton(raiz, 'Generar documentos faltantes')).toBe(true);
  });

  it('sin respuesta: permite reintentar directamente', async () => {
    mockPatch.mockRejectedValueOnce(new ErrorSinConexion()).mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await escribirEn(raiz, 'Nombre completo', 'Otro');
    await guardar(raiz);
    expect(textosDe(raiz).join('|')).toContain('Puedes reintentar');
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledTimes(2);
  });

  it('la cédula y el código no se escriben en los logs', async () => {
    const alerta = alertaFalsa();
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    mockPatch.mockResolvedValue({
      ...RESPUESTA,
      codigo_acceso: { codigo: 'RC-NEW1-2222', expira_en: '2099-11-01T12:00:00.000Z' },
    });
    const { raiz } = await montar();
    await escribirEn(raiz, 'Documento de identidad', '99999991');
    await guardar(raiz);
    await confirmar(alerta);
    expect(JSON.stringify(espias.flatMap((e) => e.mock.calls))).not.toMatch(
      /99999991|RC-NEW1|1020304050/,
    );
  });
});

describe('Documentos: "¿Falta un documento? Generar"', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Detalle />);
    await esperar();
    return r.raiz;
  };
  const TITULO = '¿Falta un documento? Generar';

  it('confirmación simple y resultado según generados / ya_existian', async () => {
    const alerta = alertaFalsa();
    mockPost.mockResolvedValue({
      generados: [
        { tipo: 'OTROSI_INCREMENTO', version: 2 },
        { tipo: 'OTROSI_PRORROGA', version: 3 },
      ],
      ya_existian: 1,
    });
    const raiz = await montar();
    await pulsar(raiz, TITULO);
    expect(mockPost).not.toHaveBeenCalled();
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/documentos/regenerar');
    expect(textosDe(raiz)).toContain('Se generaron 2 documentos.');
  });

  it('un documento generado: singular; ninguno: "No faltaba ninguno."', async () => {
    const alerta = alertaFalsa();
    mockPost.mockResolvedValueOnce({
      generados: [{ tipo: 'CONTRATO_ORIGINAL', version: 1 }],
      ya_existian: 0,
    });
    const raiz = await montar();
    await pulsar(raiz, TITULO);
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain('Se generó 1 documento.');

    mockPost.mockResolvedValueOnce({ generados: [], ya_existian: 3 });
    await pulsar(raiz, TITULO);
    await confirmar(alerta, 1);
    expect(textosDe(raiz)).toContain('No faltaba ninguno.');
  });

  it('500 DOCUMENTO_NO_GENERADO: mensaje claro y se puede reintentar', async () => {
    const alerta = alertaFalsa();
    mockPost.mockRejectedValueOnce(api(500, 'DOCUMENTO_NO_GENERADO', 'x', { generados: [] }));
    const raiz = await montar();
    await pulsar(raiz, TITULO);
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain(
      'No se pudo generar uno de los documentos. Los ya generados se conservaron; inténtalo de nuevo.',
    );
    mockPost.mockResolvedValueOnce({ generados: [], ya_existian: 1 });
    await pulsar(raiz, TITULO);
    await confirmar(alerta, 1);
    expect(textosDe(raiz)).toContain('No faltaba ninguno.');
  });

  it('doble toque: una sola llamada', async () => {
    const alerta = alertaFalsa();
    mockPost.mockReturnValue(new Promise(() => undefined));
    const raiz = await montar();
    await pulsar(raiz, TITULO);
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('sin respuesta: recarga la lista de documentos y compara antes de dejar reintentar', async () => {
    const alerta = alertaFalsa();
    mockPost.mockRejectedValue(new ErrorTimeout());
    const raiz = await montar();
    datos.docs = [DOC, { ...DOC, id: 'd2', version: 2, tipo: 'OTROSI_INCREMENTO' }];
    await pulsar(raiz, TITULO);
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(textosDe(raiz).join('|')).toMatch(/Se generó|Se generaron/);
  });

  it('sin respuesta y la lista no cambió: "No se aplicó"', async () => {
    const alerta = alertaFalsa();
    mockPost.mockRejectedValue(new ErrorSinConexion());
    const raiz = await montar();
    await pulsar(raiz, TITULO);
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
  });
});
