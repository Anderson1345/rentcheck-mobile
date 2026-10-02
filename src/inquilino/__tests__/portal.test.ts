// Portal del inquilino (E6-A): lógica pura (contrato seleccionado, variantes del panel, claves de
// consulta aisladas) y capa de API (rutas por id, sin alias obsoletos, errores 404/429 al vincular).
import { vincularContrato } from '../../api/auth';
import { ErrorApi, ErrorSinConexion } from '../../api/cliente';
import { mensajeDeErrorActivacion } from '../../api/errores';
import {
  type ContratoInquilinoResumen,
  listarContratosInquilino,
  listarDocumentosInquilino,
  obtenerContratoInquilino,
  obtenerEstadoCuentaInquilino,
  obtenerPanelInquilino,
  type PanelContratoInquilino,
} from '../../api/inquilino';
import { clavesContratos } from '../../consultas/contratos';
import { clavesInquilino, esNoEncontrado } from '../../consultas/inquilino';
import {
  descripcionContrato,
  elegirContratoPorDefecto,
  mensajeFinalizado,
  resolverSeleccion,
  textoDiasRestantes,
  textoVencidos,
  variantePanel,
} from '../seleccion';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../api/cliente', () => ({
  ...jest.requireActual('../../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({});
  mockPost.mockReset().mockResolvedValue({});
});

describe('rutas del portal del inquilino (por id de contrato)', () => {
  it('lista: GET /inquilino/contratos', async () => {
    mockGet.mockResolvedValueOnce([{ id: 'c1' }]);
    await expect(listarContratosInquilino()).resolves.toEqual([{ id: 'c1' }]);
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos');
  });

  it('detalle: GET /inquilino/contratos/:id', async () => {
    await obtenerContratoInquilino('c1');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1');
  });

  it('panel: GET /inquilino/contratos/:id/panel', async () => {
    await obtenerPanelInquilino('c1');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1/panel');
  });

  it('estado de cuenta: GET /inquilino/contratos/:id/estado-cuenta', async () => {
    await obtenerEstadoCuentaInquilino('c1');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1/estado-cuenta');
  });

  it('documentos: GET /inquilino/contratos/:id/documentos', async () => {
    await listarDocumentosInquilino('c1');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/c1/documentos');
  });

  it('el id se codifica en la ruta', async () => {
    await obtenerPanelInquilino('a/b c');
    expect(mockGet).toHaveBeenCalledWith('/inquilino/contratos/a%2Fb%20c/panel');
  });

  it('nunca usa los alias obsoletos /inquilino/mi-*', async () => {
    await listarContratosInquilino();
    await obtenerContratoInquilino('c1');
    await obtenerPanelInquilino('c1');
    await obtenerEstadoCuentaInquilino('c1');
    await listarDocumentosInquilino('c1');
    for (const [ruta] of mockGet.mock.calls) expect(String(ruta)).not.toContain('/mi-');
  });

  it('devuelve el cuerpo tal cual (sin transformar) y propaga el 404 como ErrorApi', async () => {
    const panel = { contratoFinalizado: true, estado: 'VENCIDO' };
    mockGet.mockResolvedValueOnce(panel);
    await expect(obtenerPanelInquilino('c1')).resolves.toBe(panel);
    const error = new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
    mockGet.mockRejectedValueOnce(error);
    await expect(obtenerContratoInquilino('c9')).rejects.toBe(error);
  });
});

describe('vincular con código: POST /inquilino/contratos/vincular', () => {
  it('envía { codigo } y devuelve el resumen', async () => {
    mockPost.mockResolvedValueOnce({ id: 'c1' });
    await expect(vincularContrato('RC-AB3D-9KPX')).resolves.toEqual({ id: 'c1' });
    expect(mockPost).toHaveBeenCalledWith('/inquilino/contratos/vincular', {
      codigo: 'RC-AB3D-9KPX',
    });
  });

  it('404: "Código de acceso no válido." (mensaje genérico, sin inventar causas)', () => {
    const e = new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
    expect(mensajeDeErrorActivacion(e)).toBe('Código de acceso no válido.');
  });

  it('429 DEMASIADOS_INTENTOS: dice cuánto dura el bloqueo', () => {
    const e = new ErrorApi({ status: 429, codigo: 'DEMASIADOS_INTENTOS', mensaje: 'x' });
    expect(mensajeDeErrorActivacion(e)).toContain('15 minutos');
  });

  it('429 sin código (límite de 5 por minuto): pide esperar un momento', () => {
    const e = new ErrorApi({ status: 429, codigo: null, mensaje: 'x' });
    expect(mensajeDeErrorActivacion(e)).toMatch(/espera un momento/i);
  });

  it('sin respuesta: mensaje de conexión', () => {
    expect(mensajeDeErrorActivacion(new ErrorSinConexion())).toMatch(/conexi/i);
  });
});

const fila = (id: string, estado: ContratoInquilinoResumen['estado'] = 'ACTIVO') =>
  ({
    id,
    estado,
    fecha_inicio: '2026-01-01T00:00:00.000Z',
    fecha_fin: '2026-12-31T00:00:00.000Z',
    unidad: { nombre: `Unidad ${id}`, tipo: 'APARTAMENTO' },
    inmueble: { direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
    estado_pago: null,
  }) as ContratoInquilinoResumen;

describe('elegirContratoPorDefecto: el primero de la lista (el servidor ya pone el ACTIVO primero)', () => {
  it('devuelve el id del primero', () => {
    expect(elegirContratoPorDefecto([fila('a'), fila('b', 'PROGRAMADO')])).toBe('a');
  });
  it('lista vacía: null', () => {
    expect(elegirContratoPorDefecto([])).toBeNull();
  });
  it('no reordena por su cuenta (manda el orden del servidor)', () => {
    expect(elegirContratoPorDefecto([fila('p', 'PROGRAMADO'), fila('a')])).toBe('p');
  });
});

describe('resolverSeleccion: el elegido si sigue en la lista; si no, el primero', () => {
  const lista = [fila('a'), fila('b', 'PROGRAMADO'), fila('c', 'VENCIDO')];
  it('respeta el elegido que está en la lista', () => {
    expect(resolverSeleccion(lista, 'b')).toBe('b');
  });
  it('sin elegido: el primero', () => {
    expect(resolverSeleccion(lista, null)).toBe('a');
  });
  it('si el elegido ya no está (desvinculado, cancelado): vuelve al primero', () => {
    expect(resolverSeleccion(lista, 'zzz')).toBe('a');
  });
  it('lista vacía: null aunque haya un elegido', () => {
    expect(resolverSeleccion([], 'a')).toBeNull();
  });
});

describe('variantePanel: mapeo de las tres formas de GET /:id/panel', () => {
  const activo: PanelContratoInquilino = {
    contrato_id: 'c1',
    estado: 'ACTIVO',
    fecha_fin: '2026-12-31T00:00:00.000Z',
    dias_restantes: 30,
    canon_vigente_centavos: 100_000_000,
    estado_pago: 'al_dia',
    proximo_periodo: null,
    periodos_vencidos: { cantidad: 0, total_pendiente_centavos: 0 },
  };
  it('ACTIVO: trae proximo_periodo y no trae contratoFinalizado', () => {
    expect(variantePanel(activo)).toBe('activo');
  });
  it('PROGRAMADO: { contratoFinalizado: false, programado: true }', () => {
    expect(
      variantePanel({
        contratoFinalizado: false,
        programado: true,
        estado: 'PROGRAMADO',
        fecha_inicio: '2027-01-01T00:00:00.000Z',
        fecha_fin: '2027-12-31T00:00:00.000Z',
      }),
    ).toBe('programado');
  });
  it('finalizado: { contratoFinalizado: true, estado }', () => {
    expect(variantePanel({ contratoFinalizado: true, estado: 'VENCIDO' })).toBe('finalizado');
    expect(variantePanel({ contratoFinalizado: true, estado: 'TERMINADO_ANTICIPADAMENTE' })).toBe(
      'finalizado',
    );
  });
});

describe('mensajeFinalizado: según el estado, sin inventar acta ni liquidación (B-53)', () => {
  it('VENCIDO', () => {
    expect(mensajeFinalizado('VENCIDO')).toBe('Tu contrato finalizó.');
  });
  it('TERMINADO_ANTICIPADAMENTE', () => {
    expect(mensajeFinalizado('TERMINADO_ANTICIPADAMENTE')).toBe(
      'Tu contrato terminó de forma anticipada.',
    );
  });
  it('cualquier otro estado: mensaje neutro', () => {
    expect(mensajeFinalizado('CANCELADO')).toBe('Este contrato ya no está vigente.');
  });
  it('ninguno menciona acta ni liquidación', () => {
    for (const e of ['VENCIDO', 'TERMINADO_ANTICIPADAMENTE', 'CANCELADO'] as const) {
      expect(mensajeFinalizado(e)).not.toMatch(/acta|liquidaci/i);
    }
  });
});

describe('descripcionContrato', () => {
  it('unidad · dirección', () => {
    expect(descripcionContrato(fila('a'))).toBe('Unidad a · Calle 45 # 12-30');
  });
});

describe('claves de consulta del inquilino: aisladas por contrato y de las del arrendador', () => {
  it('todas empiezan por "inquilino" y las de un contrato llevan su id', () => {
    const todas = [
      clavesInquilino.contratos,
      clavesInquilino.panel('c1'),
      clavesInquilino.detalle('c1'),
      clavesInquilino.estadoCuenta('c1'),
    ];
    for (const k of todas) expect(k[0]).toBe('inquilino');
    for (const k of todas.slice(1)) expect(k).toContain('c1');
  });
  it('distintos contratos, distintas claves', () => {
    expect(clavesInquilino.panel('c1')).not.toEqual(clavesInquilino.panel('c2'));
    expect(clavesInquilino.detalle('c1')).not.toEqual(clavesInquilino.detalle('c2'));
  });
  it('nunca coinciden con las del arrendador', () => {
    expect(clavesInquilino.detalle('c1')).not.toEqual(clavesContratos.detalle('c1'));
    expect(clavesInquilino.estadoCuenta('c1')).not.toEqual(clavesContratos.estadoCuenta('c1'));
    expect(clavesInquilino.contratos).not.toEqual(clavesContratos.todos);
  });
});

describe('esNoEncontrado', () => {
  const error = (status: number, codigo: string | null) =>
    new ErrorApi({ status, codigo, mensaje: 'x' });
  it('solo un 404 de la API', () => {
    expect(esNoEncontrado(error(404, 'NO_ENCONTRADO'))).toBe(true);
    expect(esNoEncontrado(error(500, null))).toBe(false);
    expect(esNoEncontrado(new Error('x'))).toBe(false);
    expect(esNoEncontrado(null)).toBe(false);
  });
});

describe('textoDiasRestantes', () => {
  it('plural, singular y el último día', () => {
    expect(textoDiasRestantes(30)).toBe('Faltan 30 días para que termine tu contrato');
    expect(textoDiasRestantes(1)).toBe('Falta 1 día para que termine tu contrato');
    expect(textoDiasRestantes(0)).toBe('Tu contrato termina hoy');
  });
});

describe('textoVencidos', () => {
  it('cantidad y total pendiente, con singular y plural', () => {
    expect(textoVencidos(2, 200_000_000)).toBe('2 períodos · Total pendiente $ 2.000.000');
    expect(textoVencidos(1, 50_000_000)).toBe('1 período · Total pendiente $ 500.000');
  });
});
