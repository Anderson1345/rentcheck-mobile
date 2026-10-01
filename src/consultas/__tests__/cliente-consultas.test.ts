import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../../api/cliente';
import { debeReintentar } from '../cliente-consultas';

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
