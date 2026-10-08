// R4-E (rediseño): estado de cuenta del arrendador y pantallas de acción del contrato. Cada pantalla de
// acción: resumen arriba de lo que va a pasar, campos con la etiqueta afuera, acción principal en la
// barra fija y solo se ofrece cuando el servidor lo permite (los mismos booleanos del detalle). La vista
// del estado de cuenta compartida con el inquilino no cambia sin las opciones nuevas.
import type { ReactElement } from 'react';
import { Alert, Text } from 'react-native';
import { act } from 'react-test-renderer';

import AvisoPantalla from '../../app/(arrendador)/contrato/[id]/aviso';
import Corregir from '../../app/(arrendador)/contrato/[id]/corregir';
import CorregirInquilino from '../../app/(arrendador)/contrato/[id]/corregir-inquilino';
import EstadoCuentaPantalla from '../../app/(arrendador)/contrato/[id]/estado-cuenta';
import Incremento from '../../app/(arrendador)/contrato/[id]/incremento';
import Prorroga from '../../app/(arrendador)/contrato/[id]/prorroga';
import Terminacion from '../../app/(arrendador)/contrato/[id]/terminacion';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type {
  ContratoDetalle,
  EstadoCuenta,
  PeriodoCuenta,
  ResumenTerminacionContrato,
} from '../api/contratos';
import { VistaEstadoCuenta } from '../componentes/contratos/LecturaContrato';
import { FilaLista } from '../componentes/FilaLista';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';
import { fijarReloj, HOY_PRUEBAS, restaurarReloj } from '../pruebas/reloj';
import { formatearFechaLarga } from '../utilidades/fechas';

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
  return { __esModule: true, default: () => <View /> };
});
jest.mock('expo-clipboard', () => ({ setStringAsync: async () => true }));
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View testID="selector-fecha" {...props} />,
  };
});
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
  },
}));

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

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

// Fechas fijas del contrato (no relativas a hoy); el reloj se fija en cada prueba.
const BASE: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2025-10-01T00:00:00.000Z',
  fecha_fin: '2027-09-30T00:00:00.000Z',
  canon_centavos: 100_000_000,
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  dia_pago: 5,
  forma_pago: 'Transferencia',
  datos_recaudo: 'Bancolombia 123',
  deposito_centavos: null,
  datos_fiador_o_poliza: null,
  condicionesParticularesTexto: null,
  vinculado: false,
  inquilino: { id: 'q1', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
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
  terminacion_anticipada: TERMINACION_NINGUNA,
};

const periodo = (mes: string, estado: PeriodoCuenta['estado']): PeriodoCuenta => ({
  periodo: `2026-${mes}-01T00:00:00.000Z`,
  fechaLimite: `2026-${mes}-05T00:00:00.000Z`,
  canonVigenteCentavos: 100_000_000,
  estado,
  montoAprobadoCentavos: estado === 'PAGADO' ? 100_000_000 : 0,
});

const datos: { detalle: ContratoDetalle | Error; cuenta: EstadoCuenta | Error } = {
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
const tocar = (raiz: Raiz, etiqueta: string) =>
  act(async () => {
    porEtiqueta(raiz, etiqueta).props.onPress();
  });
const elegirFecha = async (raiz: Raiz, etiqueta: string, fecha: Date) => {
  await tocar(raiz, etiqueta);
  const selector = raiz.root.findAll((n) => n.props.testID === 'selector-fecha')[0];
  await act(async () => selector.props.onChange({ type: 'set' }, fecha));
};
const alertaFalsa = () => jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
const noEncontrado = () =>
  new ErrorApi({ status: 404, codigo: 'CONTRATO_NO_ENCONTRADO', mensaje: 'x' });

/** El botón vive en la barra fija, no en el contenido que se desplaza (R1-B). */
const enBarraFija = (raiz: Raiz, titulo: string) => {
  const barras = raiz.root.findAll((n) => n.props.testID === 'accion-fija');
  if (barras.length === 0) return false;
  const desplazable = raiz.root.findAll((n) => n.props.keyboardShouldPersistTaps === 'handled')[0];
  const tiene = (n: (typeof barras)[number]) =>
    n.findAll((h) => h.props.children === titulo).length > 0;
  return tiene(barras[0]) && !tiene(desplazable);
};

/** Nodos nativos con ese testID (sin el componente que lo envuelve, que repite las props). */
const porTestID = (raiz: Raiz, id: string) =>
  raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === id);

/** Filas del resumen de lo que va a pasar, como las lee el lector: "Etiqueta: valor". */
const filasResumen = (raiz: Raiz) =>
  porTestID(raiz, 'fila-cambio').map((n) => n.props.accessibilityLabel as string);

const montar = async (pantalla: ReactElement) => {
  const r = await renderizarPantalla(pantalla);
  await esperar();
  return r;
};

afterEach(restaurarReloj);
beforeEach(() => {
  fijarReloj();
  jest.restoreAllMocks();
  for (const m of [mockGet, mockPost, mockPatch, mockPush, mockBack, mockReplace]) m.mockReset();
  mockParams = { id: 'c1' };
  datos.detalle = BASE;
  datos.cuenta = { estadoPago: 'al_dia', periodos: [] };
  mockGet.mockImplementation(async (ruta: string) => {
    const responder = <T,>(v: T | Error): T => {
      if (v instanceof Error) throw v;
      return v;
    };
    if (ruta === '/contratos/c1') return responder(datos.detalle);
    if (ruta === '/contratos/c1/estado-cuenta') return responder(datos.cuenta);
    if (ruta === '/contratos/c1/documentos') return [];
    if (ruta === '/contratos') return [];
    throw new Error(`GET inesperado ${ruta}`);
  });
});

// ---------------------------------------------------------------------------------------------------
describe('Estado de cuenta del arrendador (R4-E)', () => {
  it('resumen arriba solo con datos del servidor y los períodos en filas de un mismo contenedor', async () => {
    datos.cuenta = {
      estadoPago: 'en_mora',
      periodos: [
        periodo('07', 'PAGADO'),
        periodo('08', 'PAGADO'),
        periodo('09', 'VENCIDO'),
        periodo('10', 'EN_REVISION'),
        periodo('11', 'PENDIENTE'),
      ],
    };
    const { raiz } = await montar(<EstadoCuentaPantalla />);

    const resumen = porTestID(raiz, 'resumen-cuenta')[0];
    const textosResumen = resumen
      .findAllByType(Text)
      .map((n) =>
        (Array.isArray(n.props.children) ? n.props.children : [n.props.children]).join(''),
      );
    expect(textosResumen).toContain('En mora');
    // Conteos por el estado que dio el servidor (no se calcula ninguna mora ni ningún saldo).
    expect(textosResumen).toContain('5 períodos');
    expect(textosResumen).toContain('2 pagados · 1 vencido · 1 en revisión · 1 por vencer');

    const contenedor = porTestID(raiz, 'periodos-cuenta')[0];
    const filas = contenedor.findAllByType(FilaLista);
    expect(filas).toHaveLength(5);
    const textos = textosDe(raiz);
    expect(textos).toContain('Septiembre de 2026');
    expect(textos).toContain('Fecha límite 05/09/2026');
    expect(textos).toContain('$ 1.000.000');
    expect(textos).toContain('Vencido');
  });

  it('sin períodos: estado vacío que explica qué verá aquí', async () => {
    const { raiz } = await montar(<EstadoCuentaPantalla />);
    const textos = textosDe(raiz);
    expect(textos).toContain('Este contrato aún no tiene períodos');
    expect(textos).toContain(
      'Cuando el contrato tenga períodos de pago, verás aquí cada mes con su monto, su fecha límite y su estado.',
    );
    expect(porTestID(raiz, 'periodos-cuenta')).toHaveLength(0);
  });

  it('404: "No encontrado" y Volver', async () => {
    datos.cuenta = noEncontrado();
    const { raiz } = await montar(<EstadoCuentaPantalla />);
    expect(textosDe(raiz)).toContain('No encontrado');
    expect(textosDe(raiz)).toContain('Este contrato no existe o no tienes acceso a él.');
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalled();
  });

  it('error con Reintentar', async () => {
    datos.cuenta = new ErrorSinConexion();
    const { raiz } = await montar(<EstadoCuentaPantalla />);
    expect(hayBoton(raiz, 'Reintentar')).toBe(true);
    datos.cuenta = { estadoPago: 'al_dia', periodos: [periodo('10', 'PENDIENTE')] };
    await pulsar(raiz, 'Reintentar');
    expect(porTestID(raiz, 'periodos-cuenta')).toHaveLength(1);
  });

  it('la vista sin las opciones nuevas (la del inquilino, R4-B) no cambia', async () => {
    const cuenta: EstadoCuenta = { estadoPago: 'al_dia', periodos: [periodo('10', 'PENDIENTE')] };
    const { raiz } = await renderizarPantalla(<VistaEstadoCuenta data={cuenta} />);
    expect(textosDe(raiz)).toEqual([
      'Estado de pago',
      'Al día',
      'Octubre de 2026',
      'Fecha límite 05/10/2026',
      'Por vencer',
      '$ 1.000.000',
    ]);
    expect(porTestID(raiz, 'resumen-cuenta')).toHaveLength(0);

    const vacia = await renderizarPantalla(
      <VistaEstadoCuenta data={{ estadoPago: 'al_dia', periodos: [] }} />,
    );
    expect(textosDe(vacia.raiz)).toEqual([
      'Estado de pago',
      'Al día',
      'Este contrato aún no tiene períodos',
    ]);
  });
});

// ---------------------------------------------------------------------------------------------------
// Estados comunes de cada pantalla de acción: 404, error con Reintentar, permitida y no permitida.
const PANTALLAS: {
  nombre: string;
  elemento: () => ReactElement;
  accion: string;
  /** Un contrato con el que el servidor NO permite la acción (los mismos booleanos del detalle). */
  noPermitido: ContratoDetalle;
}[] = [
  {
    nombre: 'Incremento',
    elemento: () => <Incremento />,
    accion: 'Aplicar incremento',
    noPermitido: { ...BASE, estado: 'PROGRAMADO' },
  },
  {
    nombre: 'Prórroga',
    elemento: () => <Prorroga />,
    accion: 'Prorrogar',
    noPermitido: { ...BASE, estado: 'VENCIDO' },
  },
  {
    nombre: 'Aviso de no renovación',
    elemento: () => <AvisoPantalla />,
    accion: 'Dar aviso',
    noPermitido: {
      ...BASE,
      aviso_no_renovacion: { ...BASE.aviso_no_renovacion!, puede_dar: false },
    },
  },
  {
    nombre: 'Terminación anticipada',
    elemento: () => <Terminacion />,
    accion: 'Solicitar terminación',
    noPermitido: {
      ...BASE,
      terminacion_anticipada: { ...TERMINACION_NINGUNA, estado: 'SOLICITADA' },
    },
  },
  {
    nombre: 'Corregir contrato',
    elemento: () => <Corregir />,
    accion: 'Guardar correcciones',
    noPermitido: { ...BASE, vinculado: true },
  },
  {
    nombre: 'Corregir inquilino',
    elemento: () => <CorregirInquilino />,
    accion: 'Guardar correcciones',
    noPermitido: { ...BASE, estado: 'TERMINADO_ANTICIPADAMENTE' },
  },
];

describe.each(PANTALLAS)('$nombre: estados de la pantalla (R4-E)', (p) => {
  it('permitida: la acción principal va en la barra fija', async () => {
    const { raiz } = await montar(p.elemento());
    expect(enBarraFija(raiz, p.accion)).toBe(true);
  });

  it('no permitida por el servidor: lo explica, no ofrece la acción y no llama', async () => {
    datos.detalle = p.noPermitido;
    const alerta = alertaFalsa();
    const { raiz } = await montar(p.elemento());
    expect(textosDe(raiz)).toContain('Esta acción no está disponible');
    expect(hayBoton(raiz, p.accion)).toBe(false);
    await pulsar(raiz, 'Volver al contrato');
    expect(mockBack).toHaveBeenCalled();
    expect(alerta).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('404: "No encontrado" y Volver', async () => {
    datos.detalle = noEncontrado();
    const { raiz } = await montar(p.elemento());
    expect(textosDe(raiz)).toContain('No encontrado');
    expect(textosDe(raiz)).toContain('Este contrato no existe o no tienes acceso a él.');
    expect(hayBoton(raiz, p.accion)).toBe(false);
  });

  it('error al cargar: Reintentar y luego la pantalla', async () => {
    datos.detalle = new ErrorSinConexion();
    const { raiz } = await montar(p.elemento());
    expect(hayBoton(raiz, p.accion)).toBe(false);
    datos.detalle = BASE;
    await pulsar(raiz, 'Reintentar');
    expect(enBarraFija(raiz, p.accion)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------
describe('Incremento: resumen y avisos (R4-E)', () => {
  it('resumen correcto antes de confirmar: canon actual → nuevo (lo calcula el servidor)', async () => {
    const { raiz } = await montar(<Incremento />);
    expect(filasResumen(raiz)).toEqual([
      'Canon actual: $ 1.000.000',
      'Incremento: IPC del año anterior',
      'Canon nuevo: lo calcula el servidor al aplicar',
    ]);

    await tocar(raiz, 'Otro porcentaje');
    expect(filasResumen(raiz)).toContain('Incremento: Escribe el porcentaje');
    await escribirEn(raiz, 'Porcentaje', '5,5');
    expect(filasResumen(raiz)).toContain('Incremento: 5,5 %');
  });

  it('conserva los avisos: períodos pagados con el canon anterior y el tope del IPC en vivienda', async () => {
    const { raiz } = await montar(<Incremento />);
    const textos = textosDe(raiz);
    expect(textos).toContain(
      'Los períodos futuros que ya estén pagados por adelantado con el canon anterior quedarán debiendo la diferencia.',
    );
    expect(textos).toContain('No puede superar el IPC del año anterior.');
  });

  it('éxito: "Listo" en la barra fija', async () => {
    mockPost.mockResolvedValue({
      incremento_ipc: {
        id: 'i1',
        canon_anterior_centavos: 100_000_000,
        canon_nuevo_centavos: 105_000_000,
        porcentaje_ipc_aplicado: '5.00',
      },
    });
    const alerta = alertaFalsa();
    const { raiz } = await montar(<Incremento />);
    await pulsar(raiz, 'Aplicar incremento');
    await act(async () => (alerta as jest.SpyInstance).mock.calls[0][2][1].onPress());
    await esperar();
    expect(textosDe(raiz)).toContain('Incremento aplicado');
    expect(enBarraFija(raiz, 'Listo')).toBe(true);
  });
});

describe('Prórroga: resumen (R4-E)', () => {
  it('fecha de fin actual → nueva (la calcula el servidor) y el canon no cambia', async () => {
    const { raiz } = await montar(<Prorroga />);
    expect(filasResumen(raiz)).toEqual([
      'Fecha de fin actual: 30 de septiembre de 2027',
      'Prórroga: Mismo término inicial',
      'Nueva fecha de fin: la calcula el servidor al prorrogar',
      'Canon: no cambia',
    ]);
    await tocar(raiz, '12 meses');
    expect(filasResumen(raiz)).toContain('Prórroga: 12 meses');
    await tocar(raiz, 'Otro');
    await escribirEn(raiz, 'Meses', '18');
    expect(filasResumen(raiz)).toContain('Prórroga: 18 meses');
  });
});

describe('Aviso de no renovación: resumen (R4-E)', () => {
  it('fecha de fin y lo que pasa al llegar; el motivo con la etiqueta afuera', async () => {
    const { raiz } = await montar(<AvisoPantalla />);
    expect(filasResumen(raiz)).toEqual([
      'Fecha de fin: 30 de septiembre de 2027',
      'Al llegar esa fecha: el contrato vence y no se prorroga',
    ]);
    expect(campoDe(raiz, 'Motivo (opcional)')).toBeDefined();
    expect(textosDe(raiz)).toContain('Motivo (opcional)');
  });
});

describe('Terminación anticipada: advertencia y resumen (R4-E)', () => {
  it('la advertencia obligatoria sigue completa', async () => {
    const { raiz } = await montar(<Terminacion />);
    expect(textosDe(raiz)).toContain(
      'Esto es una terminación por mutuo acuerdo. No reemplaza el aviso escrito ni las causales de una terminación unilateral (Ley 820, arts. 22 a 24).',
    );
  });

  it('resumen: fecha de fin actual → fecha efectiva elegida, y la otra parte confirma', async () => {
    const { raiz } = await montar(<Terminacion />);
    expect(filasResumen(raiz)).toEqual([
      'Fecha de fin actual: 30 de septiembre de 2027',
      `Fecha efectiva: ${formatearFechaLarga(HOY_PRUEBAS)}`,
      'Después: la otra parte debe confirmarla',
    ]);
    await elegirFecha(raiz, 'Fecha efectiva', new Date(2026, 11, 15));
    expect(filasResumen(raiz)).toContain('Fecha efectiva: 15 de diciembre de 2026');
  });
});

describe('Corregir contrato (R4-E)', () => {
  it('sin cambios: no llama al servidor', async () => {
    const { raiz } = await montar(<Corregir />);
    await pulsar(raiz, 'Guardar correcciones');
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });

  it('secciones con encabezado; en vivienda no hay depósito y en comercial sí', async () => {
    const { raiz } = await montar(<Corregir />);
    const encabezados = raiz.root
      .findAll(
        (n) => n.props.accessibilityRole === 'header' && typeof n.props.children === 'string',
      )
      .map((n) => n.props.children);
    expect(encabezados).toEqual(
      expect.arrayContaining(['Pago', 'Fechas', 'Garantía y condiciones']),
    );
    expect(campoDe(raiz, 'Depósito (opcional)')).toBeUndefined();
    raiz.unmount();

    datos.detalle = { ...BASE, tipo_plantilla: 'LOCAL_COMERCIAL' };
    const otra = await montar(<Corregir />);
    expect(campoDe(otra.raiz, 'Depósito (opcional)')).toBeDefined();
  });

  it('envía solo lo que cambió', async () => {
    mockPatch.mockResolvedValue({ contrato: BASE, documento: { version: 2 } });
    const { raiz } = await montar(<Corregir />);
    await escribirEn(raiz, 'Forma de pago', 'Efectivo');
    await pulsar(raiz, 'Guardar correcciones');
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/contratos/c1', { forma_pago: 'Efectivo' });
  });
});

describe('Corregir inquilino (R4-E)', () => {
  it('avisa a la vista que cambiar la cédula invalida el código anterior', async () => {
    const { raiz } = await montar(<CorregirInquilino />);
    expect(textosDe(raiz)).toContain(
      'Si cambias el documento, el código de acceso anterior deja de servir y se genera uno nuevo.',
    );
  });

  it('sin cambios: no llama al servidor', async () => {
    const { raiz } = await montar(<CorregirInquilino />);
    await pulsar(raiz, 'Guardar correcciones');
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });
});
