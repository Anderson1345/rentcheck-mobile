import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../cliente';
import { MENSAJE_GENERICO, MENSAJES_ERROR, mensajeDeError } from '../errores';

describe('diccionario de errores', () => {
  it('incluye los códigos conocidos que pide la entrega', () => {
    for (const codigo of [
      'CAMPO_NO_EDITABLE',
      'ARCHIVO_CONTENIDO_INVALIDO',
      'FECHA_FIN_PASADA',
      'NO_ENCONTRADO',
    ]) {
      expect(MENSAJES_ERROR[codigo]).toBeTruthy();
    }
  });

  it('todos los mensajes están escritos (no vacíos) y terminan en punto', () => {
    for (const [codigo, mensaje] of Object.entries(MENSAJES_ERROR)) {
      expect(mensaje.trim().length).toBeGreaterThan(5);
      expect(`${codigo}: ${mensaje.endsWith('.')}`).toBe(`${codigo}: true`);
    }
  });
});

describe('mensajeDeError', () => {
  it('usa el diccionario según el código de la API', () => {
    const error = new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'Cannot GET /x' });
    expect(mensajeDeError(error)).toBe(MENSAJES_ERROR.NO_ENCONTRADO);
  });

  it('con un código que no está en el diccionario, usa el mensaje genérico', () => {
    const error = new ErrorApi({ status: 409, codigo: 'CODIGO_NUEVO_DEL_BACKEND', mensaje: 'x' });
    expect(mensajeDeError(error)).toBe(MENSAJE_GENERICO);
  });

  it('sin código usa el mensaje genérico', () => {
    const error = new ErrorApi({ status: 500, codigo: null, mensaje: '' });
    expect(mensajeDeError(error)).toBe(MENSAJE_GENERICO);
  });

  it('tiempo agotado y sin conexión tienen su propio mensaje', () => {
    expect(mensajeDeError(new ErrorTimeout())).not.toBe(MENSAJE_GENERICO);
    expect(mensajeDeError(new ErrorSinConexion())).not.toBe(MENSAJE_GENERICO);
    expect(mensajeDeError(new ErrorTimeout())).not.toBe(mensajeDeError(new ErrorSinConexion()));
  });

  it('cualquier otra cosa usa el mensaje genérico', () => {
    expect(mensajeDeError(new Error('boom'))).toBe(MENSAJE_GENERICO);
    expect(mensajeDeError('texto')).toBe(MENSAJE_GENERICO);
    expect(mensajeDeError(undefined)).toBe(MENSAJE_GENERICO);
  });
});
