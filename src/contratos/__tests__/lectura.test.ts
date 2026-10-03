import type { ContratoResumen } from '../../api/contratos';
import { contratoListaEjemplo } from '../../pruebas/datosContratos';
import {
  avanceContrato,
  proximosPagos,
  textoChipContrato,
  textoDiasRestantes,
  buscarContratos,
  codigoExpirado,
  conteosFiltros,
  ESTADO_PAGO_FILA,
  estadoDeFila,
  ETIQUETA_DOCUMENTO,
  filtrarContratos,
  inicialesDe,
  nombreArchivoDocumento,
  subtituloDeFila,
} from '../lectura';

const c = (
  id: string,
  estado: ContratoResumen['estado'],
  extra: Partial<ContratoResumen> = {},
): ContratoResumen => contratoListaEjemplo({ id, estado, ...extra });
// R2-B: activo al día, activo en mora, activo sin vincular, programado y tres cerrados (uno con deuda).
const LISTA = [
  c('a', 'ACTIVO', { vinculado: true }),
  c('m', 'ACTIVO', { vinculado: true, estado_pago: 'EN_MORA' }),
  c('s', 'ACTIVO'),
  c('p', 'PROGRAMADO', { estado_pago: 'PENDIENTE' }),
  c('v', 'VENCIDO', { estado_pago: 'EN_MORA' }),
  c('t', 'TERMINADO_ANTICIPADAMENTE'),
  c('x', 'CANCELADO', { estado_pago: 'PENDIENTE' }),
];
const ids = (l: ContratoResumen[]) => l.map((i) => i.id);

describe('filtrarContratos y conteosFiltros (R2-B)', () => {
  it('Todos conserva el orden del servidor', () => {
    expect(ids(filtrarContratos(LISTA, 'TODOS'))).toEqual(['a', 'm', 's', 'p', 'v', 't', 'x']);
  });
  it('Activos: solo ACTIVO (un programado no es activo)', () => {
    expect(ids(filtrarContratos(LISTA, 'ACTIVOS'))).toEqual(['a', 'm', 's']);
  });
  it('En mora: estado_pago EN_MORA, también un contrato cerrado con deuda', () => {
    expect(ids(filtrarContratos(LISTA, 'EN_MORA'))).toEqual(['m', 'v']);
  });
  it('Cerrados: vencido, terminado anticipadamente y cancelado', () => {
    expect(ids(filtrarContratos(LISTA, 'CERRADOS'))).toEqual(['v', 't', 'x']);
  });
  it('los conteos salen de la lista', () => {
    expect(conteosFiltros(LISTA)).toEqual({ TODOS: 7, ACTIVOS: 3, EN_MORA: 2, CERRADOS: 3 });
    expect(conteosFiltros([])).toEqual({ TODOS: 0, ACTIVOS: 0, EN_MORA: 0, CERRADOS: 0 });
  });
});

describe('buscarContratos', () => {
  const lista = [
    c('1', 'ACTIVO', {
      unidad: { id: 'u1', nombre: 'Habitación Norte', tipo: 'HABITACION' },
      inquilino: { id: 'q1', nombre: 'José Peña' },
    }),
    c('2', 'ACTIVO', {
      unidad: { id: 'u2', nombre: 'Local 5', tipo: 'LOCAL' },
      inquilino: { id: 'q2', nombre: 'Laura Mejía' },
    }),
  ];
  it('por unidad o por inquilino, sin distinguir mayúsculas ni tildes', () => {
    expect(ids(buscarContratos(lista, 'habitacion'))).toEqual(['1']);
    expect(ids(buscarContratos(lista, 'JOSE pena'))).toEqual(['1']);
    expect(ids(buscarContratos(lista, 'mejia'))).toEqual(['2']);
    expect(ids(buscarContratos(lista, 'local'))).toEqual(['2']);
  });
  it('vacío o solo espacios: toda la lista; sin coincidencias: vacía', () => {
    expect(ids(buscarContratos(lista, '  '))).toEqual(['1', '2']);
    expect(buscarContratos(lista, 'zzz')).toEqual([]);
  });
});

describe('estadoDeFila y subtituloDeFila', () => {
  it('cada valor de EstadoPagoContrato tiene texto y tono (un Record lo obliga)', () => {
    expect(ESTADO_PAGO_FILA).toEqual({
      AL_DIA: { texto: 'Al día', tono: 'exito' },
      EN_MORA: { texto: 'En mora', tono: 'peligro' },
      PENDIENTE: { texto: 'Pendiente', tono: 'advertencia' },
    });
    expect(estadoDeFila(c('1', 'ACTIVO', { vinculado: true, estado_pago: 'PENDIENTE' }))).toEqual({
      texto: 'Pendiente',
      tono: 'advertencia',
    });
  });
  it('al día, en mora, sin vincular, programado y cerrado', () => {
    const [a, m, s, p, v, t] = LISTA;
    expect(estadoDeFila(a)).toEqual({ texto: 'Al día', tono: 'exito' });
    expect(estadoDeFila(m)).toEqual({ texto: 'En mora', tono: 'peligro' });
    expect(estadoDeFila(s)).toEqual({ texto: 'Sin vincular', tono: 'neutro' });
    expect(estadoDeFila(p)).toEqual({ texto: 'Programado', tono: 'programado' });
    // Un cerrado con deuda sigue diciendo que debe; uno sin deuda, "Cerrado".
    expect(estadoDeFila(v)).toEqual({ texto: 'En mora', tono: 'peligro' });
    expect(estadoDeFila(t)).toEqual({ texto: 'Cerrado', tono: 'neutro' });
  });
  it('subtítulo: unidad y fecha de fin, o cómo se cerró', () => {
    expect(subtituloDeFila(c('1', 'ACTIVO'))).toBe('Apto 302 · hasta 30/09/2027');
    expect(subtituloDeFila(c('1', 'PROGRAMADO'))).toBe('Apto 302 · desde 01/10/2026');
    expect(subtituloDeFila(c('1', 'VENCIDO'))).toBe('Apto 302 · finalizó el 30/09/2027');
    expect(subtituloDeFila(c('1', 'TERMINADO_ANTICIPADAMENTE'))).toBe(
      'Apto 302 · terminado anticipadamente',
    );
    expect(subtituloDeFila(c('1', 'CANCELADO'))).toBe('Apto 302 · cancelado');
  });
  it('iniciales del inquilino', () => {
    expect(inicialesDe('Camilo Pardo')).toBe('CP');
    expect(inicialesDe('  josé   felipe de la Peña ')).toBe('JP');
    expect(inicialesDe('Comercial')).toBe('C');
    expect(inicialesDe('')).toBe('?');
  });
});

describe('documentos', () => {
  it('tipos legibles', () => {
    expect(ETIQUETA_DOCUMENTO).toEqual({
      CONTRATO_ORIGINAL: 'Contrato original',
      OTROSI_INCREMENTO: 'Otrosí por incremento',
      OTROSI_PRORROGA: 'Otrosí por prórroga',
    });
  });
  it('nombre de archivo sin datos sensibles', () => {
    expect(nombreArchivoDocumento('c1', 2)).toBe('contrato-c1-v2.pdf');
  });
});

describe('codigoExpirado', () => {
  const ahora = new Date('2026-10-01T12:00:00.000Z').getTime();
  it('compara el instante de expiración', () => {
    expect(codigoExpirado('2026-10-01T11:59:59.000Z', ahora)).toBe(true);
    expect(codigoExpirado('2026-10-08T12:00:00.000Z', ahora)).toBe(false);
  });
});

describe('detalle (R2-B): avance, chip y próximos pagos', () => {
  it('avance del contrato y días restantes en días de Bogotá (hoy se pasa, no se lee el reloj)', () => {
    expect(
      avanceContrato('2026-10-01T00:00:00.000Z', '2027-09-30T00:00:00.000Z', '2026-10-02'),
    ).toEqual({ fraccion: 1 / 364, diasRestantes: 363 });
    expect(avanceContrato('2026-10-01', '2027-09-30', '2026-09-01')).toEqual({
      fraccion: 0,
      diasRestantes: 394,
    });
    expect(avanceContrato('2026-10-01', '2027-09-30', '2027-12-01')).toEqual({
      fraccion: 1,
      diasRestantes: 0,
    });
    expect(textoDiasRestantes(1)).toBe('1 día restante');
    expect(textoDiasRestantes(0)).toBe('0 días restantes');
  });

  it('chip: estado del contrato y, si está activo o debe, el estado de pago', () => {
    expect(textoChipContrato('ACTIVO', 'AL_DIA')).toBe('Activo · Al día');
    expect(textoChipContrato('ACTIVO', 'EN_MORA')).toBe('Activo · En mora');
    expect(textoChipContrato('ACTIVO', undefined)).toBe('Activo');
    expect(textoChipContrato('PROGRAMADO', 'PENDIENTE')).toBe('Programado');
    expect(textoChipContrato('VENCIDO', 'EN_MORA')).toBe('Finalizado · En mora');
    expect(textoChipContrato('VENCIDO', 'AL_DIA')).toBe('Finalizado');
  });

  it('próximos pagos: hasta 3 períodos sin pagar, en el orden del servidor', () => {
    const p = (periodo: string, estado: 'PAGADO' | 'VENCIDO' | 'PENDIENTE') => ({
      periodo,
      fechaLimite: periodo,
      canonVigenteCentavos: 1,
      montoAprobadoCentavos: 0,
      estado,
    });
    const lista = [
      p('2026-10-01', 'PAGADO'),
      p('2026-11-01', 'VENCIDO'),
      p('2026-12-01', 'VENCIDO'),
      p('2027-01-01', 'VENCIDO'),
      p('2027-02-01', 'PENDIENTE'),
    ];
    expect(proximosPagos(lista).map((x) => x.periodo)).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
    ]);
    expect(proximosPagos([p('2026-10-01', 'PAGADO')])).toEqual([]);
  });
});
