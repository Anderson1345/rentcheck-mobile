// Portal del inquilino (E6-A y E6-B): lógica pura (contrato seleccionado, variantes del panel, claves
// de consulta aisladas, qué acciones se ofrecen, perfil) y capa de API (rutas por id, sin alias
// obsoletos, errores 404/429 al vincular, acciones de contrato y perfil).
import { vincularContrato } from '../../api/auth';
import { ErrorApi, ErrorSinConexion } from '../../api/cliente';
import { mensajeDeErrorActivacion } from '../../api/errores';
import {
  accionesInquilino,
  ADVERTENCIA_TERMINACION,
  huboCambio,
  puedeSolicitarTerminacion,
  textoConfirmarTerminacion,
  textoResumenSolicitud,
} from '../../contratos/acciones';
import { camposCambiadosPerfilInquilino, esquemaPerfilInquilino } from '../../perfil/esquemas';
import {
  actualizarPerfilInquilino,
  cancelarAvisoInquilino,
  cancelarTerminacionInquilino,
  confirmarTerminacionInquilino,
  type ContratoInquilinoDetalle,
  darAvisoInquilino,
  obtenerPerfilInquilino,
  solicitarTerminacionInquilino,
  subirFotoCedulaInquilino,
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
const mockPatch = jest.fn();
const mockSubir = jest.fn();
jest.mock('../../api/cliente', () => ({
  ...jest.requireActual('../../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({});
  mockPost.mockReset().mockResolvedValue({});
  mockPatch.mockReset().mockResolvedValue({});
  mockSubir.mockReset().mockResolvedValue({});
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

// ---------------------------------------------------------------------------------------------
// E6-B: acciones de contrato y perfil
// ---------------------------------------------------------------------------------------------

describe('acciones del portal (POST por id de contrato)', () => {
  it('solicitar terminación: motivo recortado y fecha efectiva', async () => {
    await solicitarTerminacionInquilino('c1', '  Me mudo  ', '2026-11-30');
    expect(mockPost).toHaveBeenCalledWith(
      '/inquilino/contratos/c1/solicitar-terminacion-anticipada',
      {
        motivo: 'Me mudo',
        fecha_efectiva: '2026-11-30',
      },
    );
  });

  it('confirmar y cancelar terminación: sin cuerpo', async () => {
    await confirmarTerminacionInquilino('c1');
    expect(mockPost).toHaveBeenLastCalledWith(
      '/inquilino/contratos/c1/confirmar-terminacion-anticipada',
    );
    await cancelarTerminacionInquilino('c1');
    expect(mockPost).toHaveBeenLastCalledWith(
      '/inquilino/contratos/c1/cancelar-terminacion-anticipada',
    );
  });

  it('dar aviso: con motivo recortado; sin motivo (o en blanco) no lleva cuerpo', async () => {
    await darAvisoInquilino('c1', '  Me mudo ');
    expect(mockPost).toHaveBeenLastCalledWith('/inquilino/contratos/c1/aviso-no-renovacion', {
      motivo: 'Me mudo',
    });
    await darAvisoInquilino('c1', '   ');
    expect(mockPost).toHaveBeenLastCalledWith(
      '/inquilino/contratos/c1/aviso-no-renovacion',
      undefined,
    );
    await darAvisoInquilino('c1');
    expect(mockPost).toHaveBeenLastCalledWith(
      '/inquilino/contratos/c1/aviso-no-renovacion',
      undefined,
    );
  });

  it('cancelar aviso: sin cuerpo', async () => {
    await cancelarAvisoInquilino('c1');
    expect(mockPost).toHaveBeenCalledWith('/inquilino/contratos/c1/cancelar-aviso-no-renovacion');
  });

  it('el id se codifica y nunca se usan los alias mi-*', async () => {
    await confirmarTerminacionInquilino('a/b');
    await cancelarAvisoInquilino('a/b');
    for (const [ruta] of mockPost.mock.calls) {
      expect(String(ruta)).toContain('a%2Fb');
      expect(String(ruta)).not.toContain('/mi-');
    }
  });

  it('los errores del servidor llegan como ErrorApi', async () => {
    const e = new ErrorApi({ status: 409, codigo: 'AVISO_YA_DADO', mensaje: 'x' });
    mockPost.mockRejectedValueOnce(e);
    await expect(darAvisoInquilino('c1')).rejects.toBe(e);
  });
});

describe('perfil del inquilino (API)', () => {
  it('GET /inquilino/perfil', async () => {
    await obtenerPerfilInquilino();
    expect(mockGet).toHaveBeenCalledWith('/inquilino/perfil');
  });

  it('PATCH /inquilino/perfil solo con lo que cambia', async () => {
    await actualizarPerfilInquilino({ telefono: '3109998888' });
    expect(mockPatch).toHaveBeenCalledWith('/inquilino/perfil', { telefono: '3109998888' });
  });

  it('foto de cédula: multipart con el campo "foto"', async () => {
    const foto = { uri: 'file:///c.jpg', name: 'c.jpg', type: 'image/jpeg' as const };
    await subirFotoCedulaInquilino(foto);
    expect(mockSubir).toHaveBeenCalledWith('/inquilino/perfil/foto-cedula', 'foto', foto);
  });
});

describe('perfil del inquilino (esquema y campos cambiados)', () => {
  const original = { nombre: 'Camilo Pardo', telefono: '3001234567' };

  it('solo nombre y teléfono, recortados; nunca cédula ni correo', () => {
    expect(camposCambiadosPerfilInquilino(original, { ...original })).toEqual({});
    expect(
      camposCambiadosPerfilInquilino(original, { nombre: ' Camilo P. ', telefono: '3001234567' }),
    ).toEqual({ nombre: 'Camilo P.' });
    const todo = camposCambiadosPerfilInquilino(original, { nombre: 'A', telefono: ' 1 ' });
    expect(Object.keys(todo).sort()).toEqual(['nombre', 'telefono']);
  });

  it('texto no vacío tras recortar espacios', () => {
    const esquema = esquemaPerfilInquilino();
    expect(esquema.safeParse({ nombre: 'Ana', telefono: '300' }).success).toBe(true);
    expect(esquema.safeParse({ nombre: '   ', telefono: '300' }).success).toBe(false);
    expect(esquema.safeParse({ nombre: 'Ana', telefono: '' }).success).toBe(false);
  });
});

describe('qué botones se ofrecen según el detalle del portal (accionesInquilino)', () => {
  const t = (extra: Partial<NonNullable<ContratoInquilinoDetalle['terminacion_anticipada']>>) => ({
    estado: 'NINGUNA' as const,
    solicitada_por: null,
    solicitada_en: null,
    motivo: null,
    fecha_efectiva: null,
    confirmada_por: null,
    confirmada_en: null,
    puede_confirmar: false,
    puede_cancelar: false,
    ...extra,
  });
  const a = (extra: Partial<NonNullable<ContratoInquilinoDetalle['aviso_no_renovacion']>>) => ({
    estado: 'NINGUNO' as const,
    dado_por: null,
    dado_en: null,
    motivo: null,
    puede_dar: false,
    puede_cancelar: false,
    ...extra,
  });
  const base = {
    estado: 'ACTIVO' as const,
    canon_centavos: 100,
    fecha_fin: '2026-12-31T00:00:00.000Z',
    terminacion_anticipada: t({}),
    aviso_no_renovacion: a({ puede_dar: true }),
  };

  it('ACTIVO sin solicitud: solicitar y dar aviso', () => {
    expect(accionesInquilino(base)).toEqual({
      solicitarTerminacion: true,
      confirmarTerminacion: false,
      cancelarTerminacion: false,
      darAviso: true,
      cancelarAviso: false,
    });
  });

  it('solicitud del arrendador (puede_confirmar): confirmar, no cancelar ni solicitar', () => {
    const r = accionesInquilino({
      ...base,
      terminacion_anticipada: t({
        estado: 'SOLICITADA',
        solicitada_por: 'ARRENDADOR',
        puede_confirmar: true,
      }),
    });
    expect(r.confirmarTerminacion).toBe(true);
    expect(r.cancelarTerminacion).toBe(false);
    expect(r.solicitarTerminacion).toBe(false);
  });

  it('solicitud propia (puede_cancelar): cancelar, no confirmar ni solicitar', () => {
    const r = accionesInquilino({
      ...base,
      terminacion_anticipada: t({
        estado: 'SOLICITADA',
        solicitada_por: 'INQUILINO',
        puede_cancelar: true,
      }),
    });
    expect(r.cancelarTerminacion).toBe(true);
    expect(r.confirmarTerminacion).toBe(false);
    expect(r.solicitarTerminacion).toBe(false);
  });

  it('los booleanos del servidor mandan: sin puede_confirmar no hay botón aunque esté SOLICITADA', () => {
    const r = accionesInquilino({
      ...base,
      terminacion_anticipada: t({ estado: 'SOLICITADA', solicitada_por: 'ARRENDADOR' }),
    });
    expect(r.confirmarTerminacion).toBe(false);
  });

  it('aviso: puede_dar y puede_cancelar', () => {
    expect(
      accionesInquilino({
        ...base,
        aviso_no_renovacion: a({ estado: 'DADO', puede_cancelar: true }),
      }),
    ).toMatchObject({ darAviso: false, cancelarAviso: true });
  });

  it('CONFIRMADA: ninguna acción de terminación', () => {
    const r = accionesInquilino({
      ...base,
      terminacion_anticipada: t({ estado: 'CONFIRMADA' }),
    });
    expect(r.solicitarTerminacion).toBe(false);
    expect(r.confirmarTerminacion).toBe(false);
    expect(r.cancelarTerminacion).toBe(false);
  });

  it.each(['PROGRAMADO', 'VENCIDO', 'TERMINADO_ANTICIPADAMENTE', 'CANCELADO'] as const)(
    '%s: ninguna acción aunque los booleanos vengan en true',
    (estado) => {
      const r = accionesInquilino({
        ...base,
        estado,
        terminacion_anticipada: t({
          estado: 'SOLICITADA',
          solicitada_por: 'ARRENDADOR',
          puede_confirmar: true,
          puede_cancelar: true,
        }),
        aviso_no_renovacion: a({ puede_dar: true, puede_cancelar: true }),
      });
      expect(Object.values(r)).not.toContain(true);
    },
  );

  it('puedeSolicitarTerminacion acepta el detalle del portal', () => {
    expect(puedeSolicitarTerminacion(base)).toBe(true);
    expect(puedeSolicitarTerminacion({ ...base, estado: 'VENCIDO' })).toBe(false);
  });
});

describe('huboCambio con el detalle del portal', () => {
  const t = (estado: 'NINGUNA' | 'SOLICITADA' | 'CONFIRMADA') => ({
    estado,
    solicitada_por: null,
    solicitada_en: null,
    motivo: null,
    fecha_efectiva: null,
  });
  const aviso = (estado: 'NINGUNO' | 'DADO') => ({
    estado,
    dado_por: null,
    dado_en: null,
    motivo: null,
  });
  const detalle = (extra: object = {}) =>
    ({
      estado: 'ACTIVO',
      canon_centavos: 100,
      fecha_fin: '2026-12-31T00:00:00.000Z',
      terminacion_anticipada: t('NINGUNA'),
      aviso_no_renovacion: aviso('NINGUNO'),
      ...extra,
    }) as unknown as ContratoInquilinoDetalle;

  it('solicitar: NINGUNA → SOLICITADA', () => {
    expect(huboCambio('solicitarTerminacion', detalle(), detalle())).toBe(false);
    expect(
      huboCambio(
        'solicitarTerminacion',
        detalle(),
        detalle({ terminacion_anticipada: t('SOLICITADA') }),
      ),
    ).toBe(true);
  });

  it('confirmar: SOLICITADA → CONFIRMADA', () => {
    const solicitada = detalle({ terminacion_anticipada: t('SOLICITADA') });
    expect(huboCambio('confirmarTerminacion', solicitada, solicitada)).toBe(false);
    expect(
      huboCambio(
        'confirmarTerminacion',
        solicitada,
        detalle({ estado: 'TERMINADO_ANTICIPADAMENTE', terminacion_anticipada: t('CONFIRMADA') }),
      ),
    ).toBe(true);
  });

  it('cancelar terminación: SOLICITADA → NINGUNA', () => {
    const solicitada = detalle({ terminacion_anticipada: t('SOLICITADA') });
    expect(huboCambio('cancelarTerminacion', solicitada, solicitada)).toBe(false);
    expect(huboCambio('cancelarTerminacion', solicitada, detalle())).toBe(true);
  });

  it('dar aviso: NINGUNO → DADO; cancelar aviso: DADO → NINGUNO', () => {
    const dado = detalle({ aviso_no_renovacion: aviso('DADO') });
    expect(huboCambio('darAviso', detalle(), detalle())).toBe(false);
    expect(huboCambio('darAviso', detalle(), dado)).toBe(true);
    expect(huboCambio('cancelarAviso', dado, dado)).toBe(false);
    expect(huboCambio('cancelarAviso', dado, detalle())).toBe(true);
  });
});

describe('textos compartidos de la terminación', () => {
  it('advertencia obligatoria con el texto exacto (Contexto §13)', () => {
    expect(ADVERTENCIA_TERMINACION).toBe(
      'Esto es una terminación por mutuo acuerdo. No reemplaza el aviso escrito ni las causales de una terminación unilateral (Ley 820, arts. 22 a 24).',
    );
  });

  it('confirmación fuerte: irreversible y con la fecha efectiva', () => {
    expect(textoConfirmarTerminacion('2026-11-30T00:00:00.000Z')).toBe(
      'Esta acción es irreversible: si la fecha efectiva es hoy, el contrato termina de inmediato; si es futura, sigue activo hasta esa fecha. Fecha efectiva: 30 de noviembre de 2026.',
    );
    expect(textoConfirmarTerminacion(null)).not.toContain('Fecha efectiva');
  });

  it('resumen de la solicitud', () => {
    expect(textoResumenSolicitud('2026-11-30', 'Me mudo')).toBe(
      'Fecha efectiva: 30 de noviembre de 2026. Motivo: Me mudo. La otra parte debe confirmarla.',
    );
  });
});
