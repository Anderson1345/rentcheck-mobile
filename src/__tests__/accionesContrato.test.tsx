// Estado de cuenta y acciones del contrato (E5-B): botones según estado, confirmación, errores por
// código, doble toque y verificación tras "sin respuesta". El cliente de API se simula.
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';

import Aviso from '../../app/(arrendador)/contrato/[id]/aviso';
import EstadoCuentaPantalla from '../../app/(arrendador)/contrato/[id]/estado-cuenta';
import Detalle from '../../app/(arrendador)/contrato/[id]/index';
import Incremento from '../../app/(arrendador)/contrato/[id]/incremento';
import Prorroga from '../../app/(arrendador)/contrato/[id]/prorroga';
import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../api/cliente';
import type { ContratoDetalle, EstadoCuenta } from '../api/contratos';
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
  return { __esModule: true, default: () => <View /> };
});
jest.mock('expo-clipboard', () => ({ setStringAsync: async () => true }));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const BASE: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2025-10-01T00:00:00.000Z',
  fecha_fin: '2026-09-30T00:00:00.000Z',
  canon_centavos: 100_000_000,
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  dia_pago: 5,
  deposito_centavos: null,
  vinculado: false,
  inquilino: { id: 'q1', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '300' },
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  codigo_acceso: null,
  incrementos_ipc: [],
  aviso_no_renovacion: {
    estado: 'NINGUNO',
    dado_por: null,
    dado_en: null,
    motivo: null,
    puede_dar: true,
    puede_cancelar: false,
  },
  terminacion_anticipada: {
    estado: 'NINGUNA',
    solicitada_por: null,
    solicitada_en: null,
    motivo: null,
    fecha_efectiva: null,
  },
};
const datos: { detalle: ContratoDetalle; cuenta: EstadoCuenta } = {
  detalle: BASE,
  cuenta: { estadoPago: 'al_dia', periodos: [] },
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
const porEtiqueta = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find((n) => n.props.accessibilityLabel === etiqueta && !!n.props.onPress);
const confirmar = async (alerta: jest.SpyInstance, indice = 0) => {
  await act(async () => alerta.mock.calls[indice][2][1].onPress());
  await esperar();
};
const api = (status: number, codigo: string, detalles?: unknown) =>
  new ErrorApi({ status, codigo, mensaje: 'texto técnico', detalles });

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [mockGet, mockPost, mockPush, mockBack, mockReplace]) m.mockReset();
  mockParams = { id: 'c1' };
  datos.detalle = BASE;
  datos.cuenta = { estadoPago: 'al_dia', periodos: [] };
  mockGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/contratos/c1') return datos.detalle;
    if (ruta === '/contratos/c1/estado-cuenta') return datos.cuenta;
    if (ruta === '/contratos/c1/documentos') return [];
    if (ruta === '/contratos') return [];
    throw new Error(`GET inesperado ${ruta}`);
  });
});

describe('Estado de cuenta', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<EstadoCuentaPantalla />);
    await esperar();
    return r;
  };

  it('encabezado con el estado de pago y los períodos con su estado', async () => {
    datos.cuenta = {
      estadoPago: 'en_mora',
      periodos: [
        {
          periodo: '2026-08-01T00:00:00.000Z',
          fechaLimite: '2026-08-05T00:00:00.000Z',
          canonVigenteCentavos: 100_000_000,
          estado: 'PAGADO',
          montoAprobadoCentavos: 100_000_000,
        },
        {
          periodo: '2026-09-01T00:00:00.000Z',
          fechaLimite: '2026-09-05T00:00:00.000Z',
          canonVigenteCentavos: 100_000_000,
          estado: 'PARCIAL',
          montoAprobadoCentavos: 50_000_000,
        },
        {
          periodo: '2026-10-01T00:00:00.000Z',
          fechaLimite: '2026-10-05T00:00:00.000Z',
          canonVigenteCentavos: 100_000_000,
          estado: 'VENCIDO',
          montoAprobadoCentavos: 0,
        },
        {
          periodo: '2026-11-01T00:00:00.000Z',
          fechaLimite: '2026-11-05T00:00:00.000Z',
          canonVigenteCentavos: 100_000_000,
          estado: 'EN_REVISION',
          montoAprobadoCentavos: 0,
        },
        {
          periodo: '2026-12-01T00:00:00.000Z',
          fechaLimite: '2026-12-05T00:00:00.000Z',
          canonVigenteCentavos: 100_000_000,
          estado: 'PENDIENTE',
          montoAprobadoCentavos: 0,
        },
      ],
    };
    const { raiz } = await montar();
    expect(mockGet).toHaveBeenCalledWith('/contratos/c1/estado-cuenta');
    const textos = textosDe(raiz);
    expect(textos).toContain('En mora');
    for (const t of ['Pagado', 'Parcial', 'Vencido', 'En revisión', 'Por vencer']) {
      expect(textos).toContain(t);
    }
    expect(textos).toContain('Agosto de 2026');
    expect(textos).toContain('Fecha límite 05/08/2026');
    expect(textos).toContain('Aprobado $ 500.000 de $ 1.000.000');
    expect(textos).toContain('$ 1.000.000');
  });

  it('sin períodos: texto vacío', async () => {
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Este contrato aún no tiene períodos');
    expect(textosDe(raiz)).toContain('Al día');
  });

  it('error con Reintentar', async () => {
    mockGet.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain(
      'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
    );
    await pulsar(raiz, 'Reintentar');
    expect(textosDe(raiz)).toContain('Este contrato aún no tiene períodos');
  });
});

describe('Detalle: sección Acciones según estado y booleanos del aviso', () => {
  const botones = async (detalle: ContratoDetalle) => {
    datos.detalle = detalle;
    const { raiz } = await renderizarPantalla(<Detalle />);
    await esperar();
    return raiz;
  };
  const TITULOS = [
    'Aplicar incremento',
    'Prorrogar contrato',
    'Dar aviso de no renovación',
    'Cancelar aviso',
    'Cancelar contrato programado',
    'Estado de cuenta',
  ];
  const visibles = (raiz: Raiz) => TITULOS.filter((t) => hayBoton(raiz, t));

  it('ACTIVO con puede_dar: incremento, prórroga, aviso y estado de cuenta', async () => {
    expect(visibles(await botones(BASE))).toEqual([
      'Aplicar incremento',
      'Prorrogar contrato',
      'Dar aviso de no renovación',
      'Estado de cuenta',
    ]);
  });

  it('ACTIVO con aviso propio vigente: "Cancelar aviso" en lugar de dar', async () => {
    const raiz = await botones({
      ...BASE,
      aviso_no_renovacion: {
        ...BASE.aviso_no_renovacion!,
        estado: 'DADO',
        puede_dar: false,
        puede_cancelar: true,
      },
    });
    expect(visibles(raiz)).toContain('Cancelar aviso');
    expect(visibles(raiz)).not.toContain('Dar aviso de no renovación');
  });

  it('aviso del inquilino (puede_cancelar=false): solo informativo', async () => {
    const raiz = await botones({
      ...BASE,
      aviso_no_renovacion: {
        estado: 'DADO',
        dado_por: 'INQUILINO',
        dado_en: '2026-05-01T10:00:00.000Z',
        motivo: null,
        puede_dar: false,
        puede_cancelar: false,
      },
    });
    expect(visibles(raiz)).not.toContain('Cancelar aviso');
    expect(visibles(raiz)).not.toContain('Dar aviso de no renovación');
    expect(textosDe(raiz).join('|')).toContain('Aviso de no renovación dado por el inquilino');
  });

  it('PROGRAMADO: solo cancelar programado y ver estado de cuenta', async () => {
    expect(visibles(await botones({ ...BASE, estado: 'PROGRAMADO' }))).toEqual([
      'Cancelar contrato programado',
      'Estado de cuenta',
    ]);
  });

  it.each(['VENCIDO', 'TERMINADO_ANTICIPADAMENTE', 'CANCELADO'] as const)(
    '%s: solo estado de cuenta',
    async (estado) => {
      expect(visibles(await botones({ ...BASE, estado }))).toEqual(['Estado de cuenta']);
    },
  );

  it('los botones llevan a su pantalla', async () => {
    const raiz = await botones(BASE);
    await pulsar(raiz, 'Estado de cuenta');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contrato/[id]/estado-cuenta',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Aplicar incremento');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contrato/[id]/incremento',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Prorrogar contrato');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contrato/[id]/prorroga',
      params: { id: 'c1' },
    });
    await pulsar(raiz, 'Dar aviso de no renovación');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/contrato/[id]/aviso',
      params: { id: 'c1' },
    });
  });

  describe('cancelar aviso (desde el detalle)', () => {
    const conAviso: ContratoDetalle = {
      ...BASE,
      aviso_no_renovacion: {
        ...BASE.aviso_no_renovacion!,
        estado: 'DADO',
        puede_dar: false,
        puede_cancelar: true,
      },
    };

    it('pide confirmación y, al confirmar, cancela y vuelve a pedir el detalle; doble toque = una llamada', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      let terminar!: (v: unknown) => void;
      mockPost.mockReturnValue(new Promise((r) => (terminar = r)));
      const raiz = await botones(conAviso);
      await pulsar(raiz, 'Cancelar aviso');
      expect(alerta.mock.calls[0][0]).toBe('Cancelar aviso');
      expect(mockPost).not.toHaveBeenCalled();

      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/contratos/c1/cancelar-aviso-no-renovacion');

      datos.detalle = BASE;
      const antes = mockGet.mock.calls.filter((c) => c[0] === '/contratos/c1').length;
      await act(async () => terminar({}));
      await esperar();
      expect(mockGet.mock.calls.filter((c) => c[0] === '/contratos/c1').length).toBeGreaterThan(
        antes,
      );
      expect(hayBoton(raiz, 'Cancelar aviso')).toBe(false);
    });

    it('error del servidor: mensaje en español', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockPost.mockRejectedValue(api(403, 'NO_PUEDE_CANCELAR_AVISO_AJENO'));
      const raiz = await botones(conAviso);
      await pulsar(raiz, 'Cancelar aviso');
      await confirmar(alerta);
      expect(textosDe(raiz)).toContain(
        'Solo quien dio el aviso de no renovación puede cancelarlo.',
      );
    });

    it('sin respuesta: verifica el estado del aviso antes de dejar reintentar', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockPost.mockRejectedValue(new ErrorTimeout());
      const raiz = await botones(conAviso);
      datos.detalle = BASE; // el servidor sí lo canceló
      await pulsar(raiz, 'Cancelar aviso');
      await confirmar(alerta);
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(hayBoton(raiz, 'Cancelar aviso')).toBe(false);
      expect(textosDe(raiz)).toContain('Aviso cancelado.');
    });
  });

  describe('cancelar contrato programado', () => {
    const programado: ContratoDetalle = { ...BASE, estado: 'PROGRAMADO' };
    const aviso =
      'El contrato quedará Cancelado, no se borra nada, el código de acceso dejará de servir y las fechas quedan libres para otro contrato.';

    it('confirma con el resumen y, al éxito, vuelve a la lista de contratos', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockPost.mockResolvedValue({ ...BASE, estado: 'CANCELADO' });
      const raiz = await botones(programado);
      await pulsar(raiz, 'Cancelar contrato programado');
      expect(alerta.mock.calls[0][1]).toBe(aviso);
      expect(mockPost).not.toHaveBeenCalled();
      await confirmar(alerta);
      expect(mockPost).toHaveBeenCalledWith('/contratos/c1/cancelar-programado');
      expect(mockReplace).toHaveBeenCalledWith('/contratos-arrendador');
    });

    it('doble toque en la confirmación: una sola llamada', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockPost.mockReturnValue(new Promise(() => undefined));
      const raiz = await botones(programado);
      await pulsar(raiz, 'Cancelar contrato programado');
      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('409 CONTRATO_NO_PROGRAMADO: mensaje claro', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockPost.mockRejectedValue(api(409, 'CONTRATO_NO_PROGRAMADO'));
      const raiz = await botones(programado);
      await pulsar(raiz, 'Cancelar contrato programado');
      await confirmar(alerta);
      expect(textosDe(raiz)).toContain('El contrato no está programado.');
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('sin respuesta: verifica; si ya está CANCELADO lo da por hecho, si no deja reintentar', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockPost.mockRejectedValue(new ErrorSinConexion());
      const raiz = await botones(programado);
      datos.detalle = { ...BASE, estado: 'CANCELADO' };
      await pulsar(raiz, 'Cancelar contrato programado');
      await confirmar(alerta);
      expect(mockReplace).toHaveBeenCalledWith('/contratos-arrendador');

      mockReplace.mockReset();
      datos.detalle = programado;
      const raiz2 = await botones(programado);
      await pulsar(raiz2, 'Cancelar contrato programado');
      await confirmar(alerta, 1);
      expect(mockReplace).not.toHaveBeenCalled();
      expect(textosDe(raiz2)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
    });
  });
});

describe('Incremento anual', () => {
  const montar = async (detalle: ContratoDetalle = BASE) => {
    datos.detalle = detalle;
    const r = await renderizarPantalla(<Incremento />);
    await esperar();
    return r;
  };
  const RESPUESTA = {
    contrato: { ...BASE, canon_centavos: 104_000_000 },
    incremento_ipc: {
      id: 'i1',
      fecha_aplicacion: '2026-10-01T00:00:00.000Z',
      canon_anterior_centavos: 100_000_000,
      canon_nuevo_centavos: 104_000_000,
      porcentaje_ipc_aplicado: '4.00',
    },
  };

  it('opción por defecto, avisos fijos y, en vivienda, el tope del IPC', async () => {
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toContain('IPC del año anterior (lo calcula el servidor)');
    expect(textos).toContain(
      'Los períodos futuros que ya estén pagados por adelantado con el canon anterior quedarán debiendo la diferencia.',
    );
    expect(textos).toContain('No puede superar el IPC del año anterior.');
    expect(campoDe(raiz, 'Porcentaje')).toBeUndefined();
  });

  it('en local comercial no aparece el tope del IPC', async () => {
    const { raiz } = await montar({ ...BASE, tipo_plantilla: 'LOCAL_COMERCIAL' });
    expect(textosDe(raiz)).not.toContain('No puede superar el IPC del año anterior.');
  });

  it('por defecto: confirmación con resumen, llamada sin cuerpo y resultado canon anterior → nuevo', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockResolvedValue(RESPUESTA);
    const { raiz, cliente } = await montar();
    for (const clave of [
      ['contratos'],
      ['contratos', 'documentos', 'c1'],
      ['contratos', 'estado-cuenta', 'c1'],
    ]) {
      cliente.setQueryData(clave, []);
    }

    await pulsar(raiz, 'Aplicar incremento');
    expect(alerta.mock.calls[0][0]).toBe('Aplicar incremento');
    expect(alerta.mock.calls[0][1]).toContain('IPC del año anterior');
    expect(alerta.mock.calls[0][1]).toContain('$ 1.000.000');
    expect(mockPost).not.toHaveBeenCalled();

    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/aplicar-incremento', undefined, {
      tiempo: 60_000,
    });
    const textos = textosDe(raiz);
    expect(textos).toContain('$ 1.000.000 → $ 1.040.000');
    expect(textos).toContain('Porcentaje aplicado: 4 %');
    // Lista, documentos y estado de cuenta quedan marcados para actualizarse; el detalle se vuelve a pedir.
    for (const clave of [
      ['contratos'],
      ['contratos', 'documentos', 'c1'],
      ['contratos', 'estado-cuenta', 'c1'],
    ]) {
      expect(cliente.getQueryState(clave)?.isInvalidated).toBe(true);
    }
    expect(mockGet.mock.calls.filter((c) => c[0] === '/contratos/c1').length).toBeGreaterThan(1);
  });

  it('"Otro porcentaje": admite coma, envía el número y el resumen lo dice', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await act(async () => porEtiqueta(raiz, 'Otro porcentaje').props.onPress());
    await escribirEn(raiz, 'Porcentaje', '5,5');
    expect(campoDe(raiz, 'Porcentaje')?.props.keyboardType).toBe('decimal-pad');
    await pulsar(raiz, 'Aplicar incremento');
    expect(alerta.mock.calls[0][1]).toContain('5,5 %');
    await confirmar(alerta);
    expect(mockPost.mock.calls[0][1]).toEqual({ porcentaje: 5.5 });
  });

  it.each(['', '0', '101', '5,555', 'abc'])(
    'porcentaje "%s" inválido: error local, sin confirmar ni enviar',
    async (valor) => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      const { raiz } = await montar();
      await act(async () => porEtiqueta(raiz, 'Otro porcentaje').props.onPress());
      await escribirEn(raiz, 'Porcentaje', valor);
      await pulsar(raiz, 'Aplicar incremento');
      expect(alerta).not.toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();
      expect(textosDe(raiz).join('|')).toMatch(/Escribe el porcentaje|mayor que 0/);
    },
  );

  it('doble toque: una sola llamada', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar();
    await pulsar(raiz, 'Aplicar incremento');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      api(409, 'INCREMENTO_ANTES_DE_12_MESES', { puede_aplicarse_desde: '2027-10-01' }),
      'Podrás aplicar el incremento desde el 01/10/2027.',
    ],
    [api(409, 'IPC_NO_CONFIGURADO', { anio: 2025 }), 'El IPC de 2025 aún no está cargado.'],
    [
      api(400, 'PORCENTAJE_SUPERIOR_AL_IPC', { ipc_referencia_porcentaje: 5.5 }),
      'El máximo permitido es 5,5 %.',
    ],
    [api(409, 'INCREMENTO_YA_APLICADO'), 'El incremento ya se aplicó.'],
    [api(409, 'CONTRATO_NO_ACTIVO'), 'El contrato no está activo.'],
    [api(404, 'NO_ENCONTRADO'), 'Contrato no encontrado.'],
  ])('error del servidor: mensaje con los detalles, sin texto técnico', async (error, mensaje) => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(error);
    const { raiz } = await montar();
    await pulsar(raiz, 'Aplicar incremento');
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain(mensaje);
    expect(textosDe(raiz).join('|')).not.toContain('texto técnico');
    expect(hayBoton(raiz, 'Aplicar incremento')).toBe(true);
  });

  it('sin respuesta: "No sabemos si se aplicó"; si el canon cambió, muestra el éxito sin reintentar', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(new ErrorTimeout());
    const { raiz } = await montar();
    datos.detalle = { ...BASE, canon_centavos: 104_000_000 };
    await pulsar(raiz, 'Aplicar incremento');
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(textosDe(raiz).join('|')).toContain('$ 1.000.000 → $ 1.040.000');
  });

  it('sin respuesta y nada cambió: se puede reintentar; sin respuesta de la verificación: "Verificar"', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(new ErrorSinConexion());
    const { raiz } = await montar();
    await pulsar(raiz, 'Aplicar incremento');
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
    expect(hayBoton(raiz, 'Aplicar incremento')).toBe(true);

    mockGet.mockImplementation(async () => {
      throw new ErrorSinConexion();
    });
    await pulsar(raiz, 'Aplicar incremento');
    await confirmar(alerta, 1);
    expect(textosDe(raiz).join('|')).toContain('No sabemos si se aplicó');
    expect(hayBoton(raiz, 'Verificar')).toBe(true);

    mockGet.mockImplementation(async (ruta: string) =>
      ruta === '/contratos/c1' ? { ...BASE, canon_centavos: 104_000_000 } : [],
    );
    await pulsar(raiz, 'Verificar');
    expect(textosDe(raiz).join('|')).toContain('$ 1.000.000 → $ 1.040.000');
  });

  it('nada de montos ni porcentajes en los logs', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    mockPost.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await pulsar(raiz, 'Aplicar incremento');
    await confirmar(alerta);
    expect(JSON.stringify(espias.flatMap((e) => e.mock.calls))).not.toMatch(/104000000|1040000/);
  });
});

describe('Prórroga', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Prorroga />);
    await esperar();
    return r;
  };
  const RESPUESTA = {
    contrato: { ...BASE, fecha_fin: '2027-09-30T00:00:00.000Z' },
    prorroga: {
      id: 'p1',
      fecha_aplicacion: '2026-08-01T00:00:00.000Z',
      fecha_fin_anterior: '2026-09-30T00:00:00.000Z',
      fecha_fin_nueva: '2027-09-30T00:00:00.000Z',
      meses: 12,
      tipo: 'MANUAL',
    },
  };

  it('por defecto "Mismo término inicial"; confirma, llama sin cuerpo y muestra la nueva fecha de fin', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Se genera un otrosí; el canon no cambia.');
    await pulsar(raiz, 'Prorrogar');
    expect(alerta.mock.calls[0][1]).toContain('mismo término inicial');
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/prorrogar', undefined, { tiempo: 60_000 });
    expect(textosDe(raiz)).toContain('Nueva fecha de fin: 30 de septiembre de 2027');
  });

  it.each([
    ['6 meses', 6],
    ['12 meses', 12],
    ['24 meses', 24],
  ])('%s envía { meses }', async (opcion, meses) => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await act(async () => porEtiqueta(raiz, opcion).props.onPress());
    await pulsar(raiz, 'Prorrogar');
    await confirmar(alerta);
    expect(mockPost.mock.calls[0][1]).toEqual({ meses });
  });

  it('"Otro": meses de 1 a 60; fuera de rango no envía', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockResolvedValue(RESPUESTA);
    const { raiz } = await montar();
    await act(async () => porEtiqueta(raiz, 'Otro').props.onPress());
    await escribirEn(raiz, 'Meses', '61');
    await pulsar(raiz, 'Prorrogar');
    expect(alerta).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Escribe un número de meses entre 1 y 60.');
    await escribirEn(raiz, 'Meses', '18');
    await pulsar(raiz, 'Prorrogar');
    await confirmar(alerta);
    expect(mockPost.mock.calls[0][1]).toEqual({ meses: 18 });
  });

  it('doble toque: una sola llamada', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar();
    await pulsar(raiz, 'Prorrogar');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      api(409, 'PRORROGA_FUERA_DE_VENTANA', {
        puede_prorrogarse_desde: '2026-07-02',
        puede_prorrogarse_hasta: '2026-09-29',
      }),
      'La prórroga solo se puede hacer entre el 02/07/2026 y el 29/09/2026.',
    ],
    [api(409, 'PRORROGA_YA_APLICADA'), 'La prórroga ya se aplicó.'],
    [api(409, 'CONTRATO_NO_ACTIVO'), 'El contrato no está activo.'],
  ])('error del servidor con sus fechas', async (error, mensaje) => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(error);
    const { raiz } = await montar();
    await pulsar(raiz, 'Prorrogar');
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain(mensaje);
  });

  it('sin respuesta: verifica la fecha de fin y, si cambió, muestra el éxito', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(new ErrorTimeout());
    const { raiz } = await montar();
    datos.detalle = { ...BASE, fecha_fin: '2027-09-30T00:00:00.000Z' };
    await pulsar(raiz, 'Prorrogar');
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(textosDe(raiz)).toContain('Nueva fecha de fin: 30 de septiembre de 2027');
  });

  it('sin respuesta y nada cambió: permite reintentar', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(new ErrorTimeout());
    const { raiz } = await montar();
    await pulsar(raiz, 'Prorrogar');
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain('No se aplicó. Puedes intentarlo de nuevo.');
    expect(hayBoton(raiz, 'Prorrogar')).toBe(true);
  });
});

describe('Aviso de no renovación (dar)', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Aviso />);
    await esperar();
    return r;
  };

  it('texto de la prórroga automática, motivo opcional con contador y confirmación', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockResolvedValue({ ...BASE });
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain(
      'Sin aviso, el contrato se prorroga automáticamente por el mismo término.',
    );
    expect(textosDe(raiz)).toContain('0 / 1000');
    await escribirEn(raiz, 'Motivo (opcional)', 'Me mudo');
    expect(campoDe(raiz, 'Motivo (opcional)')?.props.maxLength).toBe(1000);
    expect(textosDe(raiz)).toContain('7 / 1000');

    await pulsar(raiz, 'Dar aviso');
    expect(alerta.mock.calls[0][0]).toBe('Dar aviso de no renovación');
    expect(mockPost).not.toHaveBeenCalled();
    datos.detalle = {
      ...BASE,
      aviso_no_renovacion: { ...BASE.aviso_no_renovacion!, estado: 'DADO', puede_dar: false },
    };
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/aviso-no-renovacion', {
      motivo: 'Me mudo',
    });
    expect(textosDe(raiz)).toContain('Aviso de no renovación dado.');
  });

  it('sin motivo no envía cuerpo', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockResolvedValue({ ...BASE });
    const { raiz } = await montar();
    await pulsar(raiz, 'Dar aviso');
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/aviso-no-renovacion', undefined);
  });

  it('doble toque: una sola llamada', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await montar();
    await pulsar(raiz, 'Dar aviso');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      api(409, 'AVISO_FUERA_DE_PLAZO', { fecha_fin: '2026-09-30' }),
      'El aviso de no renovación ya no se puede dar ni cancelar: el contrato termina el 30/09/2026.',
    ],
    [api(409, 'AVISO_YA_DADO'), 'Ya hay un aviso de no renovación para este contrato.'],
    [api(409, 'CONTRATO_NO_ACTIVO'), 'El contrato no está activo.'],
  ])('error del servidor', async (error, mensaje) => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(error);
    const { raiz } = await montar();
    await pulsar(raiz, 'Dar aviso');
    await confirmar(alerta);
    expect(textosDe(raiz)).toContain(mensaje);
  });

  it('sin respuesta: verifica el estado del aviso', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(new ErrorSinConexion());
    const { raiz } = await montar();
    datos.detalle = {
      ...BASE,
      aviso_no_renovacion: { ...BASE.aviso_no_renovacion!, estado: 'DADO', puede_dar: false },
    };
    await pulsar(raiz, 'Dar aviso');
    await confirmar(alerta);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(textosDe(raiz)).toContain('Aviso de no renovación dado.');
  });

  it('el motivo no se escribe en los logs', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    mockPost.mockResolvedValue({ ...BASE });
    const { raiz } = await montar();
    await escribirEn(raiz, 'Motivo (opcional)', 'motivo-secreto');
    await pulsar(raiz, 'Dar aviso');
    await confirmar(alerta);
    expect(JSON.stringify(espias.flatMap((e) => e.mock.calls))).not.toContain('motivo-secreto');
  });
});
