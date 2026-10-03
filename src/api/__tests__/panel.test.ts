import { obtenerPanelArrendador } from '../panel';

const mockGet = jest.fn();
jest.mock('../cliente', () => ({
  api: { get: (...a: unknown[]) => mockGet(...a) },
}));

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({});
});

describe('contrato de GET /arrendadores/panel', () => {
  it('pide GET /arrendadores/panel, sin parámetros', async () => {
    await obtenerPanelArrendador();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/arrendadores/panel');
  });

  it('devuelve el cuerpo tal cual (la app no calcula nada)', async () => {
    const cuerpo = { mes: '2026-10' };
    mockGet.mockResolvedValue(cuerpo);
    await expect(obtenerPanelArrendador()).resolves.toBe(cuerpo);
  });

  it('un error de la API se propaga tal cual', async () => {
    const error = new Error('falló');
    mockGet.mockRejectedValue(error);
    await expect(obtenerPanelArrendador()).rejects.toBe(error);
  });
});
