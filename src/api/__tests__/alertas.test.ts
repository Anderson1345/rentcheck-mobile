import {
  marcarAlertaLeida,
  marcarTodasLeidas,
  obtenerConteoAlertas,
  obtenerFeedAlertas,
  TAMANO_PAGINA_ALERTAS,
} from '../alertas';

const mockGet = jest.fn();
const mockPatch = jest.fn();
jest.mock('../cliente', () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({});
  mockPatch.mockReset().mockResolvedValue({});
});

describe('contratos de alertas (rutas reales del OpenAPI)', () => {
  it('la página es de 20 (el valor por defecto del servidor, dentro de 1 a 50)', () => {
    expect(TAMANO_PAGINA_ALERTAS).toBe(20);
  });

  describe('feed', () => {
    it('arrendador: GET /alertas/feed?limite=20, sin cursor en la primera página', async () => {
      await obtenerFeedAlertas('arrendador');
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/alertas/feed?limite=20');
    });

    it('inquilino: GET /inquilino/alertas?limite=20', async () => {
      await obtenerFeedAlertas('inquilino');
      expect(mockGet).toHaveBeenCalledWith('/inquilino/alertas?limite=20');
    });

    it('la segunda página envía el cursor opaco, codificado', async () => {
      await obtenerFeedAlertas('arrendador', 'abc+/=def');
      expect(mockGet).toHaveBeenCalledWith('/alertas/feed?limite=20&cursor=abc%2B%2F%3Ddef');
      await obtenerFeedAlertas('inquilino', 'CURSOR_2');
      expect(mockGet).toHaveBeenLastCalledWith('/inquilino/alertas?limite=20&cursor=CURSOR_2');
    });

    it('devuelve el cuerpo tal cual', async () => {
      const feed = { items: [], siguiente_cursor: null, no_leidas: 0 };
      mockGet.mockResolvedValue(feed);
      await expect(obtenerFeedAlertas('inquilino')).resolves.toBe(feed);
    });
  });

  describe('conteo', () => {
    it('arrendador: GET /alertas/conteo', async () => {
      mockGet.mockResolvedValue({ no_leidas: 3 });
      await expect(obtenerConteoAlertas('arrendador')).resolves.toEqual({
        no_leidas: 3,
      });
      expect(mockGet).toHaveBeenCalledWith('/alertas/conteo');
    });
    it('inquilino: GET /inquilino/alertas/conteo', async () => {
      await obtenerConteoAlertas('inquilino');
      expect(mockGet).toHaveBeenCalledWith('/inquilino/alertas/conteo');
    });
  });

  describe('marcar leídas', () => {
    it('una, arrendador: PATCH /alertas/:id/leida (se usa solo el código HTTP)', async () => {
      mockPatch.mockResolvedValue({ cualquier: 'cosa' });
      await expect(marcarAlertaLeida('arrendador', 'a1')).resolves.toBeUndefined();
      expect(mockPatch).toHaveBeenCalledWith('/alertas/a1/leida');
    });
    it('una, inquilino: PATCH /inquilino/alertas/:id/leida', async () => {
      await marcarAlertaLeida('inquilino', 'a1');
      expect(mockPatch).toHaveBeenCalledWith('/inquilino/alertas/a1/leida');
    });
    it('el id se codifica en la ruta', async () => {
      await marcarAlertaLeida('inquilino', 'a/1');
      expect(mockPatch).toHaveBeenCalledWith('/inquilino/alertas/a%2F1/leida');
    });
    it('todas, arrendador: PATCH /alertas/leidas', async () => {
      mockPatch.mockResolvedValue({ marcadas: 4 });
      await expect(marcarTodasLeidas('arrendador')).resolves.toEqual({
        marcadas: 4,
      });
      expect(mockPatch).toHaveBeenCalledWith('/alertas/leidas');
    });
    it('todas, inquilino: PATCH /inquilino/alertas/leidas', async () => {
      await marcarTodasLeidas('inquilino');
      expect(mockPatch).toHaveBeenCalledWith('/inquilino/alertas/leidas');
    });
  });

  it('un error de la API se propaga tal cual', async () => {
    const error = new Error('falló');
    mockGet.mockRejectedValue(error);
    await expect(obtenerConteoAlertas('arrendador')).rejects.toBe(error);
  });
});
