// Panel v2 (R3-A): presentación de los bloques nuevos. Solo formato, orden para mostrar y escala de las
// barras: los montos, días, porcentajes y estados vienen del servidor.
import type { PendientesPanel, UnidadOcupacionPanel } from '../../api/panel';
import { destinoCartera, destinoDeLista } from '../destinos';
import {
  agruparPorInmueble,
  escalarBarras,
  inicialDeMes,
  mosaicosParaHoy,
  textoDias,
  textoOcupadas,
  textoVariacion,
  tonoDiasMora,
} from '../presentacion';

const pendientes = (extra: Partial<PendientesPanel> = {}): PendientesPanel => ({
  comprobantes_por_validar: 0,
  mantenimientos_pendientes: 0,
  solicitudes_abiertas: { total: 0, urgentes: 0 },
  contratos_por_vencer: { cantidad: 0, contratos: [] },
  incrementos_disponibles: { cantidad: 0, contratos: [] },
  terminaciones_por_confirmar: { cantidad: 0, contratos: [] },
  ...extra,
});
const contrato = (contrato_id: string) => ({
  contrato_id,
  unidad: 'Apto',
  inmueble: 'Calle',
  fecha_fin: '2026-10-30',
});

describe('mosaicosParaHoy', () => {
  it('todo en cero: ningún mosaico', () => {
    expect(mosaicosParaHoy(pendientes())).toEqual([]);
  });

  it('solo los pendientes con conteo mayor que 0, en el orden fijo, con su texto en singular o plural', () => {
    const mosaicos = mosaicosParaHoy(
      pendientes({
        comprobantes_por_validar: 3,
        solicitudes_abiertas: { total: 1, urgentes: 0 },
        incrementos_disponibles: {
          cantidad: 2,
          contratos: [
            { ...contrato('i1'), disponible_desde: '2026-09-01', ipc_faltante: false },
            { ...contrato('i2'), disponible_desde: '2026-09-01', ipc_faltante: false },
          ],
        },
      }),
    );
    expect(mosaicos.map((m) => [m.clave, m.cantidad, m.texto])).toEqual([
      ['comprobantes', 3, 'comprobantes por validar'],
      ['solicitudes', 1, 'solicitud abierta'],
      ['incrementos', 2, 'incrementos disponibles'],
    ]);
  });

  it('solicitudes con urgentes: "· N urgentes" (tono peligro); sin urgentes no lo dice', () => {
    const [con] = mosaicosParaHoy(pendientes({ solicitudes_abiertas: { total: 4, urgentes: 2 } }));
    expect(con).toMatchObject({ texto: 'solicitudes abiertas', urgentes: '· 2 urgentes' });
    const [una] = mosaicosParaHoy(pendientes({ solicitudes_abiertas: { total: 4, urgentes: 1 } }));
    expect(una.urgentes).toBe('· 1 urgente');
    const [sin] = mosaicosParaHoy(pendientes({ solicitudes_abiertas: { total: 4, urgentes: 0 } }));
    expect(sin.urgentes).toBeNull();
  });

  it('cada mosaico navega a su destino: un solo contrato abre ese contrato; varios, la lista', () => {
    const mosaicos = mosaicosParaHoy(
      pendientes({
        comprobantes_por_validar: 1,
        solicitudes_abiertas: { total: 2, urgentes: 0 },
        contratos_por_vencer: { cantidad: 1, contratos: [contrato('cv1')] },
        incrementos_disponibles: {
          cantidad: 3,
          contratos: [{ ...contrato('i1'), disponible_desde: '2026-09-01', ipc_faltante: false }],
        },
        terminaciones_por_confirmar: { cantidad: 1, contratos: [contrato('ct1')] },
      }),
    );
    expect(Object.fromEntries(mosaicos.map((m) => [m.clave, m.destino]))).toEqual({
      comprobantes: { pathname: '/pagos-arrendador' },
      solicitudes: { pathname: '/mantenimiento' },
      porVencer: { pathname: '/contrato/[id]', params: { id: 'cv1' } },
      incrementos: { pathname: '/contratos-arrendador' },
      terminaciones: { pathname: '/contrato/[id]/terminacion', params: { id: 'ct1' } },
    });
  });
});

describe('destinos', () => {
  it('lista con un contrato: el destino del contrato; si no, la lista de contratos', () => {
    const abrir = (id: string) => ({ pathname: '/contrato/[id]' as const, params: { id } });
    expect(destinoDeLista({ cantidad: 1, contratos: [{ contrato_id: 'c1' }] }, abrir)).toEqual(
      abrir('c1'),
    );
    expect(destinoDeLista({ cantidad: 2, contratos: [{ contrato_id: 'c1' }] }, abrir)).toEqual({
      pathname: '/contratos-arrendador',
    });
    expect(destinoDeLista({ cantidad: 1, contratos: [{ contrato_id: '' }] }, abrir)).toEqual({
      pathname: '/contratos-arrendador',
    });
  });

  it('"Ver cartera": la lista de contratos con el filtro En mora', () => {
    expect(destinoCartera()).toEqual({
      pathname: '/contratos-arrendador',
      params: { filtro: 'EN_MORA' },
    });
  });
});

describe('quién te debe: días de mora', () => {
  it('tono: peligro desde 30 días, advertencia con menos', () => {
    expect(tonoDiasMora(29)).toBe('advertencia');
    expect(tonoDiasMora(30)).toBe('peligro');
    expect(tonoDiasMora(1)).toBe('advertencia');
  });
  it('texto: "1 día" / "N días"', () => {
    expect(textoDias(1)).toBe('1 día');
    expect(textoDias(38)).toBe('38 días');
  });
});

describe('cómo va el año', () => {
  it('inicial del mes (E, F, M…)', () => {
    expect(
      ['2026-01', '2026-02', '2026-03', '2026-06', '2026-10', '2026-12'].map(inicialDeMes),
    ).toEqual(['E', 'F', 'M', 'J', 'O', 'D']);
    expect(inicialDeMes('mal')).toBe('');
  });

  it('escala las barras contra el valor más alto de los dos años; todo en cero → 0', () => {
    expect(escalarBarras([0, 50, 100, 25])).toEqual([0, 0.5, 1, 0.25]);
    expect(escalarBarras([0, 0])).toEqual([0, 0]);
    expect(escalarBarras([])).toEqual([]);
  });

  it('variación: "+12%", "−8%" y null (sin chip)', () => {
    expect(textoVariacion(12)).toEqual({ texto: '+12%', tono: 'exito', sube: true });
    expect(textoVariacion(0)).toEqual({ texto: '+0%', tono: 'exito', sube: true });
    expect(textoVariacion(-8)).toEqual({ texto: '−8%', tono: 'peligro', sube: false });
    expect(textoVariacion(null)).toBeNull();
  });
});

describe('ocupación', () => {
  const u = (
    unidad_id: string,
    inmueble_id: string,
    estado: UnidadOcupacionPanel['estado'],
  ): UnidadOcupacionPanel => ({
    unidad_id,
    nombre: unidad_id,
    inmueble_id,
    inmueble_direccion: `Dirección ${inmueble_id}`,
    estado,
  });

  it('agrupa por inmueble conservando el orden del servidor', () => {
    expect(
      agruparPorInmueble([u('a1', 'A', 'AL_DIA'), u('a2', 'A', 'LIBRE'), u('b1', 'B', 'EN_MORA')]),
    ).toEqual([
      {
        inmuebleId: 'A',
        direccion: 'Dirección A',
        unidades: [u('a1', 'A', 'AL_DIA'), u('a2', 'A', 'LIBRE')],
      },
      { inmuebleId: 'B', direccion: 'Dirección B', unidades: [u('b1', 'B', 'EN_MORA')] },
    ]);
    expect(agruparPorInmueble([])).toEqual([]);
  });

  it('"unidades ocupadas · 88%" o sin porcentaje si el servidor no lo da', () => {
    expect(textoOcupadas(88)).toBe('unidades ocupadas · 88%');
    expect(textoOcupadas(null)).toBe('unidades ocupadas');
  });
});
