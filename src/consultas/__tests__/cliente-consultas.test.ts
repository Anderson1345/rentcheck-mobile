import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../../api/cliente';
import { QueryObserver } from '@tanstack/react-query';

import { crearClienteDeConsultas, debeReintentar } from '../cliente-consultas';

const errorApi = (status: number) => new ErrorApi({ status, codigo: null, mensaje: '' });

describe('debeReintentar', () => {
  it('nunca reintenta errores 4xx', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(debeReintentar(0, errorApi(status))).toBe(false);
    }
  });

  it('no reintenta un tiempo agotado', () => {
    expect(debeReintentar(0, new ErrorTimeout())).toBe(false);
  });

  it('reintenta fallos de red y 5xx, pero con tope', () => {
    expect(debeReintentar(0, new ErrorSinConexion())).toBe(true);
    expect(debeReintentar(1, errorApi(503))).toBe(true);
    expect(debeReintentar(2, new ErrorSinConexion())).toBe(false);
    expect(debeReintentar(2, errorApi(500))).toBe(false);
  });
});

describe('el Panel del arrendador se refresca cuando cambian los datos que lo alimentan', () => {
  const PANEL = ['arrendador', 'panel'] as const;
  let cliente: ReturnType<typeof crearClienteDeConsultas>;

  beforeEach(() => {
    cliente = crearClienteDeConsultas();
    cliente.setQueryData(PANEL, { mes: '2026-10' });
  });
  afterEach(() => cliente.clear());

  const invalido = () => cliente.getQueryState(PANEL)?.isInvalidated;

  it.each([
    ['un pago (aprobar o rechazar)', ['contratos', 'pagos', 'lista', 'PENDIENTE']],
    ['un contrato (acción o nuevo)', ['contratos', 'detalle', 'c1']],
    ['un inmueble o una unidad', ['inmuebles', 'lista']],
    ['una solicitud de mantenimiento', ['arrendador', 'solicitudes', 'lista', {}]],
  ])('invalidar %s deja el Panel por refrescar', async (_nombre, clave) => {
    cliente.setQueryData(clave, {});
    expect(invalido()).toBe(false);
    await cliente.invalidateQueries({ queryKey: clave });
    expect(invalido()).toBe(true);
  });

  it.each([
    ['el portal del inquilino', ['inquilino', 'contratos']],
    ['las alertas del arrendador', ['arrendador', 'alertas', 'feed']],
    ['el perfil', ['perfil']],
  ])('invalidar %s no toca el Panel', async (_nombre, clave) => {
    cliente.setQueryData(clave, {});
    await cliente.invalidateQueries({ queryKey: clave });
    expect(invalido()).toBe(false);
  });

  it('invalidar el propio Panel termina (no se dispara a sí mismo)', async () => {
    await cliente.invalidateQueries({ queryKey: PANEL });
    expect(invalido()).toBe(true);
  });

  it('con el Panel en pantalla (insignia de Pagos), muchas consultas invalidadas juntas piden UN solo refresco', async () => {
    const pedir = jest.fn().mockResolvedValue({ mes: '2026-10' });
    const observador = new QueryObserver(cliente, { queryKey: PANEL, queryFn: pedir });
    const baja = observador.subscribe(() => undefined);
    await new Promise<void>((r) => setTimeout(r, 10));
    pedir.mockClear();

    for (const clave of [
      ['contratos', 'pagos', 'lista', 'PENDIENTE'],
      ['contratos', 'pagos', 'lista', 'APROBADO'],
      ['contratos', 'detalle', 'c1'],
      ['contratos', 'lista'],
      ['contratos', 'estado-cuenta', 'c1'],
    ]) {
      cliente.setQueryData(clave, {});
    }
    await cliente.invalidateQueries({ queryKey: ['contratos'] });
    await new Promise<void>((r) => setTimeout(r, 20));

    expect(pedir).toHaveBeenCalledTimes(1);
    baja();
  });
});
