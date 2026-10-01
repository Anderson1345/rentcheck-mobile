// Asistente de nuevo contrato (pantalla real, cliente de API simulado) y pantalla "Contrato creado".
import { Alert, BackHandler, Share } from 'react-native';
import { act } from 'react-test-renderer';

import Creado from '../../app/(arrendador)/contrato/[id]/creado';
import Nuevo from '../../app/(arrendador)/contrato/nuevo';
import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../api/cliente';
import type { ContratoDetalle, ContratoResumen } from '../api/contratos';
import { hoyBogota } from '../utilidades/fechas';
import { inmuebleEjemplo, unidadEjemplo } from '../pruebas/datosInmuebles';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDispatch = jest.fn();
const mockListeners: ((e: unknown) => void)[] = [];
let mockParams: Record<string, string> = {};
const mockNavegacion = {
  addListener: (_: string, cb: (e: unknown) => void) => {
    mockListeners.push(cb);
    return () => {
      mockListeners.splice(mockListeners.indexOf(cb), 1);
    };
  },
  dispatch: (...a: unknown[]) => mockDispatch(...a),
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  useNavigation: () => mockNavegacion,
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
  },
}));

const HOY = hoyBogota();
type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const PERFIL = {
  id: 'a1',
  nombre: 'Marta',
  correo: 'm@x.co',
  telefono: '3',
  cedula: '1020304050',
  foto_cedula_nit_url: null,
  creado_en: 'x',
};
const INMUEBLE = inmuebleEjemplo({
  unidades: [
    unidadEjemplo({ id: 'u1', nombre: 'Apto 302', canon_base_centavos: 180_000_000 }),
    unidadEjemplo({
      id: 'u2',
      nombre: 'Local 1',
      tipo: 'LOCAL',
      uso_permitido: 'COMERCIAL',
      canon_base_centavos: 0,
    }),
    unidadEjemplo({
      id: 'u3',
      nombre: 'Parqueadero 5',
      tipo: 'PARQUEADERO',
      uso_permitido: 'COMERCIAL',
      canon_base_centavos: 0,
    }),
  ],
});
const INQUILINO_EXISTENTE = {
  id: 'q7',
  nombre: 'Laura Mejía',
  cedula: '52111222',
  telefono: '300',
  correo: null,
  vinculado: true,
  creado_en: 'x',
};

const datos: {
  perfil: unknown;
  inmuebles: unknown;
  contratos: ContratoResumen[];
  inquilinos: unknown[];
  detalle: ContratoDetalle | null;
} = { perfil: PERFIL, inmuebles: [INMUEBLE], contratos: [], inquilinos: [], detalle: null };

const resumenDesdeCuerpo = (cuerpo: {
  unidad_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  canon_centavos: number;
  inquilino_nuevo?: { nombre: string };
  inquilino_id?: string;
}): ContratoResumen => ({
  id: 'nuevo1',
  estado: 'ACTIVO',
  fecha_inicio: `${cuerpo.fecha_inicio}T00:00:00.000Z`,
  fecha_fin: `${cuerpo.fecha_fin}T00:00:00.000Z`,
  canon_centavos: cuerpo.canon_centavos,
  vinculado: false,
  unidad: { id: cuerpo.unidad_id, nombre: 'x', tipo: 'APARTAMENTO' },
  inquilino: {
    id: cuerpo.inquilino_id ?? 'q9',
    nombre: cuerpo.inquilino_nuevo?.nombre ?? 'x',
  },
  codigo_acceso: null,
});

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
const titulo = (raiz: Raiz) => textosDe(raiz).find((t) => t.startsWith('Paso '));
const botonesEditar = (raiz: Raiz) => {
  const vistos = new Set<unknown>();
  return raiz.root.findAll((n) => {
    if (n.props.accessibilityRole !== 'button' || typeof n.props.onPress !== 'function')
      return false;
    if (n.findAll((h) => h.props.children === 'Editar').length === 0) return false;
    if (vistos.has(n.props.onPress)) return false;
    vistos.add(n.props.onPress);
    return true;
  });
};
const porEtiqueta = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find((n) => n.props.accessibilityLabel === etiqueta && !!n.props.onPress);
const elegirFecha = async (raiz: Raiz, etiqueta: string, fecha: Date) => {
  await act(async () => porEtiqueta(raiz, etiqueta).props.onPress());
  const selector = raiz.root.findAll((n) => n.props.testID === 'selector-fecha')[0];
  await act(async () => selector.props.onChange({ type: 'set' }, fecha));
};

async function montar(extra: Record<string, string> = {}) {
  mockParams = extra;
  const r = await renderizarPantalla(<Nuevo />);
  await esperar();
  return r;
}

async function llenarInquilinoNuevo(raiz: Raiz) {
  await escribirEn(raiz, 'Nombre completo', ' Camilo Pardo ');
  await escribirEn(raiz, 'Documento de identidad', '1.020-304 050');
  await escribirEn(raiz, 'Teléfono', '3001234567');
}
async function llenarPago(raiz: Raiz, canon = '2500000') {
  await escribirEn(raiz, 'Canon mensual', canon);
  await escribirEn(raiz, 'Día de pago (1 a 31)', '5');
  await pulsar(raiz, 'Transferencia');
  await escribirEn(raiz, 'Datos de recaudo', 'Bancolombia ahorros 123');
}
/** Recorre los pasos hasta el resumen (unidad ya elegida por quien llama o por el parámetro). */
async function llegarAlResumen(raiz: Raiz, unidad = 'Apto 302') {
  if (hayBoton(raiz, 'Calle 45 # 12-30')) await pulsar(raiz, 'Calle 45 # 12-30');
  await pulsar(raiz, unidad);
  await pulsar(raiz, 'Siguiente');
  await llenarInquilinoNuevo(raiz);
  await pulsar(raiz, 'Siguiente');
  await llenarPago(raiz);
  await pulsar(raiz, 'Siguiente');
  await pulsar(raiz, 'Siguiente');
  await pulsar(raiz, 'Siguiente');
}

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [mockGet, mockPost, mockPush, mockReplace, mockDispatch]) m.mockReset();
  mockListeners.length = 0;
  mockParams = {};
  Object.assign(datos, {
    perfil: PERFIL,
    inmuebles: [INMUEBLE],
    contratos: [],
    inquilinos: [],
    detalle: null,
  });
  mockGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/arrendadores/perfil') return datos.perfil;
    if (ruta === '/inmuebles') return datos.inmuebles;
    if (ruta === '/contratos') return datos.contratos;
    if (ruta === '/inquilinos') return datos.inquilinos;
    if (ruta.startsWith('/contratos/') && datos.detalle) return datos.detalle;
    throw new Error(`GET inesperado ${ruta}`);
  });
  mockPost.mockResolvedValue({ id: 'nuevo1' });
});

describe('Asistente: cédula del arrendador (B-16)', () => {
  it('sin cédula no empieza el asistente: mensaje y botón a Mi perfil', async () => {
    datos.perfil = { ...PERFIL, cedula: null };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain(
      'Para crear un contrato necesitas registrar tu cédula o NIT en tu perfil.',
    );
    expect(titulo(raiz)).toBeUndefined();
    await pulsar(raiz, 'Ir a Mi perfil');
    expect(mockPush).toHaveBeenCalledWith('/perfil');
  });

  it('al registrar la cédula (se vuelve a cargar el perfil) se habilita el asistente', async () => {
    datos.perfil = { ...PERFIL, cedula: '  ' };
    const { raiz, cliente } = await montar();
    expect(titulo(raiz)).toBeUndefined();
    datos.perfil = PERFIL;
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: ['perfil'] });
    });
    await esperar();
    expect(titulo(raiz)).toBe('Paso 1 de 6 · Unidad');
  });
});

describe('Asistente: paso 1 Unidad', () => {
  it('lista inmuebles y unidades con su plantilla; la plantilla no se elige', async () => {
    const { raiz } = await montar();
    expect(titulo(raiz)).toBe('Paso 1 de 6 · Unidad');
    await pulsar(raiz, 'Calle 45 # 12-30');
    const textos = textosDe(raiz);
    expect(textos).toContain('Plantilla: Vivienda urbana (Ley 820 de 2003)');
    expect(textos).toContain('Plantilla: Local comercial');
    expect(textos).toContain('Plantilla: Parqueadero');
    // No hay ningún control para escoger otra plantilla.
    expect(hayBoton(raiz, 'Local comercial')).toBe(false);
  });

  it('exige elegir una unidad para seguir', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Siguiente');
    expect(titulo(raiz)).toBe('Paso 1 de 6 · Unidad');
    expect(textosDe(raiz)).toContain('Elige la unidad que vas a arrendar.');
  });

  it('con inmuebleId arranca en las unidades de ese inmueble; con unidadId, ya elegida', async () => {
    const a = await montar({ inmuebleId: 'i1' });
    expect(textosDe(a.raiz)).toContain('¿Qué unidad vas a arrendar?');
    const b = await montar({ unidadId: 'u2' });
    expect(textosDe(b.raiz)).toContain('Elegida');
  });

  it('una unidad con contrato muestra "Arrendada hasta…" y sugiere la fecha de inicio', async () => {
    datos.contratos = [
      {
        ...resumenDesdeCuerpo({
          unidad_id: 'u2',
          fecha_inicio: '2026-01-01',
          fecha_fin: '2027-09-30',
          canon_centavos: 1,
        }),
        id: 'viejo',
      },
    ];
    const { raiz } = await montar({ inmuebleId: 'i1' });
    expect(textosDe(raiz)).toContain('Arrendada hasta 30/09/2027');
    await pulsar(raiz, 'Local 1');
    expect(textosDe(raiz).join('|')).toContain('La fecha de inicio sugerida es el 01/10/2027');
    // Se puede seguir y el inicio ya viene en la fecha sugerida.
    await pulsar(raiz, 'Siguiente');
    await llenarInquilinoNuevo(raiz);
    await pulsar(raiz, 'Siguiente');
    await llenarPago(raiz);
    await pulsar(raiz, 'Siguiente');
    expect(textosDe(raiz)).toContain('1 de octubre de 2027');
  });
});

describe('Asistente: pasos 2 a 6', () => {
  it('inquilino nuevo: documento normalizado en el cuerpo y SOLO inquilino_nuevo', async () => {
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    const cuerpo = mockPost.mock.calls[0][1];
    expect(cuerpo.inquilino_nuevo).toEqual({
      nombre: 'Camilo Pardo',
      cedula: '1020304050',
      telefono: '3001234567',
    });
    expect('inquilino_id' in cuerpo).toBe(false);
  });

  it('el segundo modo solo aparece si ya hay inquilinos; elegir uno envía SOLO inquilino_id', async () => {
    const sin = await montar();
    await pulsar(sin.raiz, 'Calle 45 # 12-30');
    await pulsar(sin.raiz, 'Apto 302');
    await pulsar(sin.raiz, 'Siguiente');
    expect(
      sin.raiz.root.findAll((n) => n.props.accessibilityLabel === 'Ya arrendó conmigo'),
    ).toHaveLength(0);

    datos.inquilinos = [INQUILINO_EXISTENTE];
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Apto 302');
    await pulsar(raiz, 'Siguiente');
    await act(async () => porEtiqueta(raiz, 'Ya arrendó conmigo').props.onPress());
    expect(textosDe(raiz)).toContain('Vinculado');
    expect(textosDe(raiz).join('|')).toContain('Se usarán los datos de tu último contrato');
    await pulsar(raiz, 'Siguiente');
    expect(titulo(raiz)).toBe('Paso 2 de 6 · Inquilino');
    await pulsar(raiz, 'Laura Mejía');
    await pulsar(raiz, 'Siguiente');
    await llenarPago(raiz);
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Confirmar y crear contrato');
    const cuerpo = mockPost.mock.calls[0][1];
    expect(cuerpo.inquilino_id).toBe('q7');
    expect('inquilino_nuevo' in cuerpo).toBe(false);
  });

  it('inquilino nuevo incompleto: errores en español y no avanza', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Apto 302');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    expect(titulo(raiz)).toBe('Paso 2 de 6 · Inquilino');
    expect(textosDe(raiz)).toContain('Escribe el nombre del inquilino.');
  });

  it('vivienda: sin campo de depósito, con la nota de la Ley 820 y el cuerpo sin deposito_centavos', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Apto 302');
    await pulsar(raiz, 'Siguiente');
    await llenarInquilinoNuevo(raiz);
    await pulsar(raiz, 'Siguiente');
    expect(campoDe(raiz, 'Depósito (opcional)')).toBeUndefined();
    expect(textosDe(raiz).join('|')).toContain(
      'la ley no permite depósito en dinero (Ley 820, art. 16)',
    );
    // El canon de la unidad viene precargado.
    expect(campoDe(raiz, 'Canon mensual')?.props.value).toBe('1.800.000');
    await llenarPago(raiz, '1800000');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Confirmar y crear contrato');
    const cuerpo = mockPost.mock.calls[0][1];
    expect('deposito_centavos' in cuerpo).toBe(false);
    expect(cuerpo.tipo_plantilla).toBe('VIVIENDA_URBANA_LEY_820');
    expect(cuerpo.canon_centavos).toBe(180_000_000);
  });

  it.each([
    ['Local 1', 'LOCAL_COMERCIAL'],
    ['Parqueadero 5', 'PARQUEADERO'],
  ])('%s: el depósito aparece, es opcional y se envía si se escribe', async (unidad, plantilla) => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, unidad);
    await pulsar(raiz, 'Siguiente');
    await llenarInquilinoNuevo(raiz);
    await pulsar(raiz, 'Siguiente');
    expect(campoDe(raiz, 'Depósito (opcional)')).toBeDefined();
    await llenarPago(raiz);
    // Opcional: se puede seguir sin depósito.
    await pulsar(raiz, 'Siguiente');
    expect(titulo(raiz)).toBe('Paso 4 de 6 · Fechas');
    await pulsar(raiz, 'Atrás');
    await escribirEn(raiz, 'Depósito (opcional)', '5000000');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Confirmar y crear contrato');
    const cuerpo = mockPost.mock.calls[0][1];
    expect(cuerpo.tipo_plantilla).toBe(plantilla);
    expect(cuerpo.deposito_centavos).toBe(500_000_000);
  });

  it('pago: valida día de pago, canon y forma; "Transferencia" llena la forma de pago', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Local 1');
    await pulsar(raiz, 'Siguiente');
    await llenarInquilinoNuevo(raiz);
    await pulsar(raiz, 'Siguiente');
    await escribirEn(raiz, 'Día de pago (1 a 31)', '40');
    await pulsar(raiz, 'Siguiente');
    expect(titulo(raiz)).toBe('Paso 3 de 6 · Pago');
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Escribe el canon mensual');
    expect(todo).toContain('El día de pago es un número del 1 al 31.');
    expect(todo).toContain('Escribe la forma de pago.');
    await pulsar(raiz, 'Consignación');
    expect(campoDe(raiz, 'Forma de pago')?.props.value).toBe('Consignación');
    expect(campoDe(raiz, 'Día de pago (1 a 31)')?.props.keyboardType).toBe('number-pad');
  });

  it('fechas: por defecto hoy y 12 meses; los atajos recalculan el fin', async () => {
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    expect(textosDe(raiz).join('|')).toContain('Quedará Activo');
    await pulsar(raiz, 'Confirmar y crear contrato');
    const cuerpo = mockPost.mock.calls[0][1];
    expect(cuerpo.fecha_inicio).toBe(HOY);
    expect(cuerpo.fecha_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('inicio futuro: aviso de Programado y el fin se calcula desde ese inicio', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Apto 302');
    await pulsar(raiz, 'Siguiente');
    await llenarInquilinoNuevo(raiz);
    await pulsar(raiz, 'Siguiente');
    await llenarPago(raiz, '1800000');
    await pulsar(raiz, 'Siguiente');

    await elegirFecha(raiz, 'Fecha de inicio', new Date(2030, 2, 15, 9, 30));
    expect(textosDe(raiz)).toContain(
      'El contrato quedará Programado: empieza el 15 de marzo de 2030',
    );
    await pulsar(raiz, '24 meses');
    await pulsar(raiz, 'Siguiente');
    await pulsar(raiz, 'Siguiente');
    expect(textosDe(raiz).join('|')).toContain('Quedará Programado');
    await pulsar(raiz, 'Confirmar y crear contrato');
    const cuerpo = mockPost.mock.calls[0][1];
    expect(cuerpo.fecha_inicio).toBe('2030-03-15');
    expect(cuerpo.fecha_fin).toBe('2032-03-14');
  });

  it('"Otra fecha": un fin que ya pasó no deja avanzar', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Apto 302');
    await pulsar(raiz, 'Siguiente');
    await llenarInquilinoNuevo(raiz);
    await pulsar(raiz, 'Siguiente');
    await llenarPago(raiz, '1800000');
    await pulsar(raiz, 'Siguiente');
    await elegirFecha(raiz, 'Fecha de inicio', new Date(2020, 0, 1, 12));
    await elegirFecha(raiz, 'Fecha de fin', new Date(2020, 11, 31, 12));
    await pulsar(raiz, 'Siguiente');
    expect(titulo(raiz)).toBe('Paso 4 de 6 · Fechas');
    expect(textosDe(raiz)).toContain('La fecha de fin debe ser posterior a hoy.');
  });

  it('resumen: aviso de modelos, datos en lectura y "Editar" lleva al paso', async () => {
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    const textos = textosDe(raiz);
    expect(titulo(raiz)).toBe('Paso 6 de 6 · Resumen');
    expect(textos).toContain(
      'Las plantillas de RentCheck son modelos. Verifica que el contrato se ajuste a tu caso antes de firmarlo.',
    );
    expect(textos).toContain('Canon: $ 2.500.000');
    expect(textos).toContain('Plantilla: Vivienda urbana (Ley 820 de 2003)');
    expect(textos).toContain('Camilo Pardo');
    const editar = botonesEditar(raiz);
    expect(editar).toHaveLength(5);
    await act(async () => editar[2].props.onPress());
    expect(titulo(raiz)).toBe('Paso 3 de 6 · Pago');
  });
});

describe('Asistente: navegación hacia atrás', () => {
  it('Atrás (botón del encabezado o físico) vuelve al paso anterior', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Apto 302');
    await pulsar(raiz, 'Siguiente');
    expect(titulo(raiz)).toBe('Paso 2 de 6 · Inquilino');
    const evento = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    await act(async () => mockListeners[mockListeners.length - 1](evento));
    expect(evento.preventDefault).toHaveBeenCalled();
    expect(titulo(raiz)).toBe('Paso 1 de 6 · Unidad');
  });

  it('en el primer paso, con datos escritos, pide confirmación; "Salir" deja salir', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { raiz } = await montar();
    await pulsar(raiz, 'Calle 45 # 12-30');
    await pulsar(raiz, 'Apto 302');
    const evento = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    await act(async () => mockListeners[mockListeners.length - 1](evento));
    expect(evento.preventDefault).toHaveBeenCalled();
    expect(alerta.mock.calls[0][0]).toBe('¿Salir sin crear el contrato?');
    expect(alerta.mock.calls[0][1]).toBe('Se perderá lo que escribiste.');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });

  it('en el primer paso sin escribir nada sale sin preguntar', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await montar();
    const evento = { preventDefault: jest.fn(), data: { action: {} } };
    await act(async () => mockListeners[mockListeners.length - 1](evento));
    expect(evento.preventDefault).not.toHaveBeenCalled();
    expect(alerta).not.toHaveBeenCalled();
  });
});

describe('Asistente: envío', () => {
  it('éxito: replace a la pantalla de éxito (el asistente no queda en la pila) y no pide confirmar al salir', async () => {
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/contrato/[id]/creado',
      params: { id: 'nuevo1' },
    });
    const evento = { preventDefault: jest.fn(), data: { action: {} } };
    await act(async () => mockListeners[mockListeners.length - 1](evento));
    expect(evento.preventDefault).not.toHaveBeenCalled();
  });

  it('doble toque en "Confirmar": UNA sola llamada a crearContrato y el botón dice "Creando contrato…"', async () => {
    let terminar!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar();
    await llegarAlResumen(raiz);

    await pulsar(raiz, 'Confirmar y crear contrato');
    const enCurso = botonDe(raiz, 'Creando contrato…');
    expect(enCurso.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await act(async () => enCurso.props.onPress());
    await esperar();
    expect(mockPost).toHaveBeenCalledTimes(1);

    await act(async () => terminar({ id: 'nuevo1' }));
    await esperar();
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('crea con el plazo largo y sin Idempotency-Key', async () => {
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(mockPost.mock.calls[0][0]).toBe('/contratos');
    expect(mockPost.mock.calls[0][2]).toEqual({ tiempo: 60_000 });
    expect(JSON.stringify(mockPost.mock.calls[0])).not.toMatch(/idempoten/i);
  });

  it('tiempo agotado: verifica con GET /contratos y, si existe, llega al éxito sin crear otro', async () => {
    mockPost.mockImplementation(
      async (_ruta: string, cuerpo: Parameters<typeof resumenDesdeCuerpo>[0]) => {
        datos.contratos = [resumenDesdeCuerpo(cuerpo)];
        throw new ErrorTimeout();
      },
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    await esperar();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/contrato/[id]/creado',
      params: { id: 'nuevo1' },
    });
  });

  it('sin respuesta y el contrato no está: "No se creó. Puedes intentarlo de nuevo." y se puede reintentar', async () => {
    mockPost.mockRejectedValueOnce(new ErrorSinConexion()).mockResolvedValue({ id: 'nuevo1' });
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    await esperar();
    expect(textosDe(raiz)).toContain('No se creó. Puedes intentarlo de nuevo.');
    expect(mockReplace).not.toHaveBeenCalled();
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('no se pudo ni verificar: avisa que no sabemos si se creó y ofrece verificar de nuevo', async () => {
    mockPost.mockRejectedValue(new ErrorTimeout());
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    mockGet.mockImplementation(async (ruta: string) => {
      if (ruta === '/contratos') throw new ErrorSinConexion();
      return [];
    });
    await pulsar(raiz, 'Confirmar y crear contrato');
    await esperar();
    expect(textosDe(raiz).join('|')).toContain('No sabemos si el contrato se creó');
    expect(hayBoton(raiz, 'Verificar si se creó')).toBe(true);
  });

  it('un 409 después de un intento sin respuesta se verifica antes de mostrar el error', async () => {
    let intento = 0;
    mockPost.mockImplementation(
      async (_r: string, cuerpo: Parameters<typeof resumenDesdeCuerpo>[0]) => {
        intento += 1;
        if (intento === 1) throw new ErrorSinConexion();
        datos.contratos = [resumenDesdeCuerpo(cuerpo)];
        throw new ErrorApi({
          status: 409,
          codigo: 'CONFLICTO',
          mensaje: 'Esta unidad ya tiene un contrato activo',
        });
      },
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    await esperar();
    expect(mockReplace).not.toHaveBeenCalled();
    await pulsar(raiz, 'Confirmar y crear contrato');
    await esperar();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/contrato/[id]/creado',
      params: { id: 'nuevo1' },
    });
  });

  it('un 409 sin intento previo sin respuesta: muestra el error y lleva a Fechas', async () => {
    mockPost.mockRejectedValue(
      new ErrorApi({
        status: 409,
        codigo: 'CONFLICTO',
        mensaje: 'Esta unidad ya tiene un contrato activo',
      }),
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(textosDe(raiz)).toContain('Esta unidad ya tiene un contrato activo');
    expect(titulo(raiz)).toBe('Paso 4 de 6 · Fechas');
  });

  it.each([
    ['FECHA_FIN_PASADA', 400, 'La fecha de fin del contrato debe ser posterior a hoy.', 4],
    [
      'DEPOSITO_NO_PERMITIDO_VIVIENDA',
      400,
      'En vivienda urbana no se puede exigir depósito (Ley 820 de 2003).',
      3,
    ],
    ['INQUILINO_AMBIGUO', 400, 'Indica un inquilino existente o uno nuevo, no los dos.', 2],
    ['INQUILINO_DATOS_INVALIDOS', 400, 'Los datos del inquilino no son válidos.', 2],
    [
      'PLANTILLA_NO_CORRESPONDE_A_UNIDAD',
      400,
      'La plantilla elegida no corresponde a esta unidad.',
      1,
    ],
    ['NO_ENCONTRADO', 404, 'No encontrado. Puede que ya no exista o que no tengas acceso.', 1],
  ])('%s: mensaje en español y salto al paso %i', async (codigo, status, mensaje, paso) => {
    mockPost.mockRejectedValue(new ErrorApi({ status, codigo, mensaje: 'texto técnico' }));
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(textosDe(raiz)).toContain(mensaje);
    expect(titulo(raiz)?.startsWith(`Paso ${paso} de 6`)).toBe(true);
  });

  it('TRASLAPE_DE_CONTRATOS: dice con qué contrato choca y lleva a Fechas', async () => {
    mockPost.mockRejectedValue(
      new ErrorApi({
        status: 409,
        codigo: 'TRASLAPE_DE_CONTRATOS',
        mensaje: 'x',
        detalles: {
          fecha_inicio: '2026-10-01T00:00:00.000Z',
          fecha_fin: '2027-09-30T00:00:00.000Z',
        },
      }),
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(textosDe(raiz)).toContain('Choca con el contrato del 01/10/2026 al 30/09/2027.');
    expect(titulo(raiz)).toBe('Paso 4 de 6 · Fechas');
  });

  it('SOLICITUD_INVALIDA (cédula fuera de rango): el texto del servidor y paso Inquilino', async () => {
    const texto = 'La cédula debe tener entre 5 y 20 caracteres alfanuméricos.';
    mockPost.mockRejectedValue(
      new ErrorApi({ status: 400, codigo: 'SOLICITUD_INVALIDA', mensaje: texto }),
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(textosDe(raiz)).toContain(texto);
    expect(titulo(raiz)).toBe('Paso 2 de 6 · Inquilino');
  });

  it('VALIDACION: mensaje y la lista de detalles, sin salir del resumen', async () => {
    mockPost.mockRejectedValue(
      new ErrorApi({
        status: 400,
        codigo: 'VALIDACION',
        mensaje: 'x',
        detalles: ['dia_pago must not be greater than 31'],
      }),
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    expect(textosDe(raiz)).toContain('Revisa los datos: alguno no es válido.');
    expect(textosDe(raiz)).toContain('• dia_pago must not be greater than 31');
    expect(titulo(raiz)).toBe('Paso 6 de 6 · Resumen');
  });

  it('CEDULA_ARRENDADOR_REQUERIDA: pantalla de cédula con acceso a Mi perfil', async () => {
    mockPost.mockRejectedValue(
      new ErrorApi({ status: 409, codigo: 'CEDULA_ARRENDADOR_REQUERIDA', mensaje: 'x' }),
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    datos.perfil = { ...PERFIL, cedula: null };
    await pulsar(raiz, 'Confirmar y crear contrato');
    await esperar();
    expect(textosDe(raiz)).toContain(
      'Para crear un contrato necesitas registrar tu cédula o NIT en tu perfil.',
    );
    expect(hayBoton(raiz, 'Ir a Mi perfil')).toBe(true);
  });

  it('nada sensible en los logs (documento, teléfono, código)', async () => {
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    const { raiz } = await montar();
    await llegarAlResumen(raiz);
    await pulsar(raiz, 'Confirmar y crear contrato');
    const impreso = JSON.stringify(espias.flatMap((e) => e.mock.calls));
    expect(impreso).not.toMatch(/1020304050|3001234567|RC-/);
  });
});

const DETALLE: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-10-01T00:00:00.000Z',
  fecha_fin: '2027-09-30T00:00:00.000Z',
  canon_centavos: 250_000_000,
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  vinculado: false,
  inquilino: { id: 'q1', nombre: 'Camilo Pardo' },
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  codigo_acceso: { codigo: 'RC-AB3D-9KPX', expira_en: '2026-10-31T15:00:00.000Z' },
};

describe('Contrato creado', () => {
  const montarCreado = async () => {
    mockParams = { id: 'c1' };
    const r = await renderizarPantalla(<Creado />);
    await esperar();
    return r;
  };

  it('muestra el estado real, la unidad, el inquilino, el código y su vencimiento', async () => {
    datos.detalle = DETALLE;
    const { raiz } = await montarCreado();
    const textos = textosDe(raiz);
    expect(textos).toContain('Contrato creado');
    expect(textos).toContain('Activo');
    expect(textos).toContain('Apto 302');
    expect(textos).toContain('Camilo Pardo');
    expect(textos).toContain('RC-AB3D-9KPX');
    expect(textos).toContain('Vence el 31 de octubre de 2026');
    expect(textos.join('|')).not.toContain('Empieza el');
  });

  it('PROGRAMADO: el chip dice Programado y se ve cuándo empieza', async () => {
    datos.detalle = { ...DETALLE, estado: 'PROGRAMADO', fecha_inicio: '2030-03-15T00:00:00.000Z' };
    const { raiz } = await montarCreado();
    expect(textosDe(raiz)).toContain('Programado');
    expect(textosDe(raiz)).toContain('Empieza el 15 de marzo de 2030');
  });

  it('"Compartir código" abre el menú nativo con el mensaje de invitación', async () => {
    datos.detalle = DETALLE;
    const compartir = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const { raiz } = await montarCreado();
    await pulsar(raiz, 'Compartir código');
    expect(compartir).toHaveBeenCalledWith({
      message:
        'Hola Camilo Pardo, te invito a RentCheck para tu contrato de arriendo. Descarga la app y actívalo con el código RC-AB3D-9KPX. Vence el 31 de octubre de 2026.',
    });
  });

  it('"Listo" vuelve a la pestaña Inmuebles', async () => {
    datos.detalle = DETALLE;
    const { raiz } = await montarCreado();
    await pulsar(raiz, 'Listo');
    expect(mockReplace).toHaveBeenCalledWith('/inmuebles');
  });

  it('el botón Atrás de Android no vuelve al asistente: lleva a Inmuebles', async () => {
    datos.detalle = DETALLE;
    const registro = jest.spyOn(BackHandler, 'addEventListener');
    await montarCreado();
    const manejador = registro.mock.calls.find((c) => c[0] === 'hardwareBackPress')?.[1];
    expect((manejador as (() => boolean) | undefined)?.()).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/inmuebles');
  });

  it('cargando y error con reintento', async () => {
    mockGet.mockRejectedValueOnce(new ErrorSinConexion());
    datos.detalle = DETALLE;
    const { raiz } = await montarCreado();
    expect(textosDe(raiz)).toContain(
      'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
    );
    await pulsar(raiz, 'Reintentar');
    expect(textosDe(raiz)).toContain('RC-AB3D-9KPX');
  });
});
