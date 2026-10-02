// Mantenimiento del arrendador (E8-B), lógica sin pantallas: reglas puras (segmentos, contadores,
// filtros, acciones por estado), capa de datos, claves de consulta separadas del inquilino y
// verificación del cambio de estado.
import { QueryClient } from '@tanstack/react-query';

import { ErrorApi } from '../../api/cliente';
import {
  esConflictoDeEstado,
  mensajeDeError,
  mensajeDeErrorEstadoSolicitud,
} from '../../api/errores';
import type { Inmueble } from '../../api/inmuebles';
import type { EstadoSolicitud, SolicitudArrendador } from '../../api/mantenimiento';
import { clavesInquilino } from '../../consultas/inquilino';
import {
  clavesMantenimiento,
  clavesSolicitudes,
  FUENTE_SOLICITUD,
} from '../../consultas/mantenimiento';
import {
  accionesDeEstado,
  contarPorEstado,
  filtrarPorEstado,
  filtrosAParametros,
  FRASE_ESTADO_ARRENDADOR,
  hayFiltros,
  OPCIONES_FILTRO_URGENCIA,
  opcionesDeUnidad,
  SEGMENTOS_ARRENDADOR,
  SIN_FILTROS,
  textoConfirmacion,
  TEXTO_YA_RESUELTA,
} from '../reglas';

const mockGet = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../api/cliente', () => ({
  ...jest.requireActual('../../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    subirArchivo: jest.fn(),
  },
}));

beforeEach(() => {
  mockGet.mockReset();
  mockPatch.mockReset();
});

const solicitud = (id: string, estado: EstadoSolicitud, extra: Partial<SolicitudArrendador> = {}) =>
  ({ id, estado, ...extra }) as SolicitudArrendador;

// ---------------------------------------------------------------------------------------------

describe('segmentos y contadores del arrendador', () => {
  const lista = [
    solicitud('1', 'PENDIENTE'),
    solicitud('2', 'EN_PROCESO'),
    solicitud('3', 'RESUELTO'),
    solicitud('4', 'PENDIENTE'),
    solicitud('5', 'RESUELTO'),
    solicitud('6', 'RESUELTO'),
  ];

  it('un segmento por estado, en este orden, con su etiqueta', () => {
    expect(SEGMENTOS_ARRENDADOR).toEqual([
      { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
      { valor: 'EN_PROCESO', etiqueta: 'En proceso' },
      { valor: 'RESUELTO', etiqueta: 'Resuelta' },
    ]);
  });

  it('cuenta por estado desde UNA lista (los contadores no dependen del segmento elegido)', () => {
    expect(contarPorEstado(lista)).toEqual({ PENDIENTE: 2, EN_PROCESO: 1, RESUELTO: 3 });
    expect(contarPorEstado([])).toEqual({ PENDIENTE: 0, EN_PROCESO: 0, RESUELTO: 0 });
  });

  it('filtra por estado conservando el orden del servidor', () => {
    expect(filtrarPorEstado(lista, 'PENDIENTE').map((s) => s.id)).toEqual(['1', '4']);
    expect(filtrarPorEstado(lista, 'EN_PROCESO').map((s) => s.id)).toEqual(['2']);
    expect(filtrarPorEstado(lista, 'RESUELTO').map((s) => s.id)).toEqual(['3', '5', '6']);
  });
});

describe('filtros de urgencia y unidad', () => {
  it('urgencia: Todas, Alta, Media y Baja', () => {
    expect(OPCIONES_FILTRO_URGENCIA).toEqual([
      { valor: 'TODAS', etiqueta: 'Todas' },
      { valor: 'ALTO', etiqueta: 'Alta' },
      { valor: 'MEDIO', etiqueta: 'Media' },
      { valor: 'BAJO', etiqueta: 'Baja' },
    ]);
  });

  it('sin filtros no hay parámetros; cada filtro activo manda el suyo y NUNCA el estado', () => {
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
    expect(filtrosAParametros(SIN_FILTROS)).toEqual({});
    expect(filtrosAParametros({ urgencia: 'ALTO', unidadId: null })).toEqual({ urgencia: 'ALTO' });
    expect(filtrosAParametros({ urgencia: 'TODAS', unidadId: 'u1' })).toEqual({ unidadId: 'u1' });
    const ambos = filtrosAParametros({ urgencia: 'BAJO', unidadId: 'u1' });
    expect(ambos).toEqual({ urgencia: 'BAJO', unidadId: 'u1' });
    expect(ambos).not.toHaveProperty('estado');
    expect(hayFiltros({ urgencia: 'BAJO', unidadId: null })).toBe(true);
    expect(hayFiltros({ urgencia: 'TODAS', unidadId: 'u1' })).toBe(true);
  });

  it('las opciones de unidad salen de los inmuebles del arrendador, con el inmueble para distinguirlas', () => {
    const inmuebles = [
      {
        id: 'i1',
        direccion: 'Calle 45 # 12-30',
        unidades: [
          { id: 'u1', nombre: 'Apto 101' },
          { id: 'u2', nombre: 'Apto 102' },
        ],
      },
      { id: 'i2', direccion: 'Carrera 7 # 80-10', unidades: [{ id: 'u3', nombre: 'Apto 101' }] },
      { id: 'i3', direccion: 'Sin unidades', unidades: [] },
    ] as unknown as Inmueble[];
    expect(opcionesDeUnidad(inmuebles)).toEqual([
      { valor: 'u1', etiqueta: 'Apto 101 · Calle 45 # 12-30' },
      { valor: 'u2', etiqueta: 'Apto 102 · Calle 45 # 12-30' },
      { valor: 'u3', etiqueta: 'Apto 101 · Carrera 7 # 80-10' },
    ]);
    expect(opcionesDeUnidad([])).toEqual([]);
  });
});

describe('acciones, frases y confirmación por estado', () => {
  it('PENDIENTE ofrece dos acciones, EN_PROCESO una y RESUELTO ninguna', () => {
    expect(accionesDeEstado('PENDIENTE')).toEqual([
      { accion: 'iniciar', titulo: 'Marcar en proceso' },
      { accion: 'resolver', titulo: 'Marcar resuelta' },
    ]);
    expect(accionesDeEstado('EN_PROCESO')).toEqual([
      { accion: 'resolver', titulo: 'Marcar resuelta' },
    ]);
    expect(accionesDeEstado('RESUELTO')).toEqual([]);
    expect(TEXTO_YA_RESUELTA).toBe('Esta solicitud ya está resuelta');
  });

  it('frase por estado desde el punto de vista del arrendador (no la del inquilino)', () => {
    expect(FRASE_ESTADO_ARRENDADOR).toEqual({
      PENDIENTE: 'Está esperando que la atiendas',
      EN_PROCESO: 'La estás atendiendo',
      RESUELTO: 'La marcaste como resuelta',
    });
  });

  it('la confirmación dice qué va a pasar; resolver avisa que queda cerrada y no promete notificaciones', () => {
    const iniciar = textoConfirmacion('iniciar');
    expect(iniciar.titulo).toBe('Marcar en proceso');
    expect(iniciar.confirmar).toBe('Marcar en proceso');
    expect(iniciar.mensaje).toContain('En proceso');

    const resolver = textoConfirmacion('resolver');
    expect(resolver.titulo).toBe('Marcar resuelta');
    expect(resolver.confirmar).toBe('Marcar resuelta');
    expect(resolver.mensaje).toContain('cerrada');
    expect(resolver.mensaje).toContain('resuelta');
    expect(resolver.mensaje).toContain('No se puede volver atrás');
    for (const texto of [iniciar.mensaje, resolver.mensaje]) {
      expect(texto.toLowerCase()).not.toMatch(/notific|alert|recibirá un aviso/);
    }
  });
});

// ---------------------------------------------------------------------------------------------

describe('capa de datos del arrendador', () => {
  // Importación diferida: el módulo usa el `api` simulado de arriba.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const api = () => require('../../api/mantenimiento') as typeof import('../../api/mantenimiento');

  it('sin filtros pide /solicitudes-mantenimiento a secas', async () => {
    mockGet.mockResolvedValue([]);
    await api().listarSolicitudes();
    await api().listarSolicitudes({});
    expect(mockGet).toHaveBeenNthCalledWith(1, '/solicitudes-mantenimiento');
    expect(mockGet).toHaveBeenNthCalledWith(2, '/solicitudes-mantenimiento');
  });

  it('con filtros manda solo los que vienen, codificados', async () => {
    mockGet.mockResolvedValue([]);
    await api().listarSolicitudes({ urgencia: 'ALTO' });
    await api().listarSolicitudes({ unidadId: 'u 1/2' });
    await api().listarSolicitudes({ estado: 'PENDIENTE', urgencia: 'BAJO', unidadId: 'u&1' });
    expect(mockGet.mock.calls.map((c) => c[0])).toEqual([
      '/solicitudes-mantenimiento?urgencia=ALTO',
      '/solicitudes-mantenimiento?unidadId=u%201%2F2',
      '/solicitudes-mantenimiento?estado=PENDIENTE&urgencia=BAJO&unidadId=u%261',
    ]);
  });

  it('el detalle codifica el id y el cambio de estado es un PATCH con {estado}', async () => {
    mockGet.mockResolvedValue({});
    mockPatch.mockResolvedValue({});
    await api().obtenerSolicitud('s/1');
    expect(mockGet).toHaveBeenCalledWith('/solicitudes-mantenimiento/s%2F1');
    await api().cambiarEstadoSolicitud('s/1', 'EN_PROCESO');
    expect(mockPatch).toHaveBeenCalledWith('/solicitudes-mantenimiento/s%2F1/estado', {
      estado: 'EN_PROCESO',
    });
    await api().cambiarEstadoSolicitud('s1', 'RESUELTO');
    expect(mockPatch).toHaveBeenLastCalledWith('/solicitudes-mantenimiento/s1/estado', {
      estado: 'RESUELTO',
    });
  });

  it('no usa nunca el alias obsoleto /mias ni las rutas del inquilino', async () => {
    mockGet.mockResolvedValue([]);
    await api().listarSolicitudes({ urgencia: 'ALTO' });
    expect(JSON.stringify(mockGet.mock.calls)).not.toMatch(/mias|inquilino/);
  });
});

// ---------------------------------------------------------------------------------------------

describe('claves de consulta del arrendador, separadas de las del inquilino', () => {
  const sembrar = (cliente: QueryClient) => {
    cliente.setQueryData(clavesSolicitudes.lista({ urgencia: 'ALTO' }), ['a']);
    cliente.setQueryData(clavesSolicitudes.lista({}), ['b']);
    cliente.setQueryData(clavesSolicitudes.detalle('s1'), { id: 's1' });
    cliente.setQueryData(clavesMantenimiento.lista('c1'), ['i']);
    cliente.setQueryData(clavesMantenimiento.detalle('s1'), { id: 's1' });
  };
  const invalidada = (cliente: QueryClient, clave: readonly unknown[]) =>
    cliente.getQueryState(clave)?.isInvalidated;

  it('cuelgan de su propia raíz ("arrendador"), distinta de "inquilino"', () => {
    expect(clavesSolicitudes.todos[0]).toBe('arrendador');
    expect(clavesMantenimiento.todos[0]).toBe('inquilino');
    expect(clavesSolicitudes.detalle('s1')).not.toEqual(clavesMantenimiento.detalle('s1'));
  });

  it('invalidar las del portal del inquilino no toca las del arrendador', async () => {
    const cliente = new QueryClient();
    sembrar(cliente);
    await cliente.invalidateQueries({ queryKey: clavesInquilino.todos });
    expect(invalidada(cliente, clavesMantenimiento.lista('c1'))).toBe(true);
    expect(invalidada(cliente, clavesSolicitudes.lista({}))).toBe(false);
    expect(invalidada(cliente, clavesSolicitudes.lista({ urgencia: 'ALTO' }))).toBe(false);
    expect(invalidada(cliente, clavesSolicitudes.detalle('s1'))).toBe(false);
  });

  it('invalidar todas las del arrendador alcanza listas con cualquier filtro y el detalle, y no toca al inquilino', async () => {
    const cliente = new QueryClient();
    sembrar(cliente);
    await cliente.invalidateQueries({ queryKey: clavesSolicitudes.todos });
    expect(invalidada(cliente, clavesSolicitudes.lista({}))).toBe(true);
    expect(invalidada(cliente, clavesSolicitudes.lista({ urgencia: 'ALTO' }))).toBe(true);
    expect(invalidada(cliente, clavesSolicitudes.detalle('s1'))).toBe(true);
    expect(invalidada(cliente, clavesMantenimiento.lista('c1'))).toBe(false);
    expect(invalidada(cliente, clavesMantenimiento.detalle('s1'))).toBe(false);
  });

  it('cerrar sesión (clear de toda la caché) las alcanza', () => {
    const cliente = new QueryClient();
    sembrar(cliente);
    cliente.clear();
    expect(cliente.getQueryData(clavesSolicitudes.lista({}))).toBeUndefined();
    expect(cliente.getQueryData(clavesSolicitudes.detalle('s1'))).toBeUndefined();
  });

  it('listas con filtros distintos tienen claves distintas', () => {
    expect(clavesSolicitudes.lista({})).not.toEqual(clavesSolicitudes.lista({ urgencia: 'ALTO' }));
    expect(clavesSolicitudes.lista({ unidadId: 'u1' })).not.toEqual(
      clavesSolicitudes.lista({ unidadId: 'u2' }),
    );
    expect(clavesSolicitudes.lista({ urgencia: 'ALTO' })).toEqual(
      clavesSolicitudes.lista({ urgencia: 'ALTO' }),
    );
  });
});

// ---------------------------------------------------------------------------------------------

describe('verificación del cambio de estado (FUENTE_SOLICITUD.huboCambio)', () => {
  const hubo = (
    accion: 'iniciarSolicitud' | 'resolverSolicitud',
    antes: EstadoSolicitud,
    despues: EstadoSolicitud,
  ) => FUENTE_SOLICITUD.huboCambio?.(accion, solicitud('s', antes), solicitud('s', despues));

  it('iniciar: se aplicó solo si estaba PENDIENTE y ahora está EN_PROCESO', () => {
    expect(hubo('iniciarSolicitud', 'PENDIENTE', 'EN_PROCESO')).toBe(true);
    expect(hubo('iniciarSolicitud', 'PENDIENTE', 'PENDIENTE')).toBe(false);
    expect(hubo('iniciarSolicitud', 'EN_PROCESO', 'EN_PROCESO')).toBe(false);
    expect(hubo('iniciarSolicitud', 'PENDIENTE', 'RESUELTO')).toBe(false);
  });

  it('resolver: se aplicó si estaba PENDIENTE o EN_PROCESO y ahora está RESUELTO; si ya estaba resuelta, no', () => {
    expect(hubo('resolverSolicitud', 'PENDIENTE', 'RESUELTO')).toBe(true);
    expect(hubo('resolverSolicitud', 'EN_PROCESO', 'RESUELTO')).toBe(true);
    expect(hubo('resolverSolicitud', 'RESUELTO', 'RESUELTO')).toBe(false);
    expect(hubo('resolverSolicitud', 'EN_PROCESO', 'EN_PROCESO')).toBe(false);
  });

  it('lee y refresca con las claves del arrendador (no las del inquilino)', async () => {
    mockGet.mockResolvedValue({ id: 's1' });
    await FUENTE_SOLICITUD.obtener('s1');
    expect(mockGet).toHaveBeenCalledWith('/solicitudes-mantenimiento/s1');
    expect(FUENTE_SOLICITUD.claves.todos).toEqual(clavesSolicitudes.todos);
    expect(FUENTE_SOLICITUD.claves.detalle('s1')).toEqual(clavesSolicitudes.detalle('s1'));
  });
});

// ---------------------------------------------------------------------------------------------

describe('mensajes de error del cambio de estado', () => {
  const api = (status: number, codigo: string) => new ErrorApi({ status, codigo, mensaje: 'x' });

  it('TRANSICION_INVALIDA cuenta como conflicto de estado y dice que la solicitud ya cambió', () => {
    expect(esConflictoDeEstado(api(409, 'TRANSICION_INVALIDA'))).toBe(true);
    expect(mensajeDeErrorEstadoSolicitud(api(409, 'TRANSICION_INVALIDA'))).toBe(
      'La solicitud ya cambió de estado. Te mostramos el estado actual.',
    );
  });

  it('404 habla de la solicitud, no del contrato', () => {
    const mensaje = mensajeDeErrorEstadoSolicitud(api(404, 'NO_ENCONTRADO'));
    expect(mensaje).toBe(
      'No encontramos esa solicitud. Puede que ya no exista o que no tengas acceso.',
    );
    expect(mensaje).not.toContain('Contrato');
  });

  it('lo demás sale del diccionario de siempre', () => {
    expect(mensajeDeErrorEstadoSolicitud(api(500, 'ERROR_INTERNO'))).toBe(
      mensajeDeError(api(500, 'ERROR_INTERNO')),
    );
  });
});
