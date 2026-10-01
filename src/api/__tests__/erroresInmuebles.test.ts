import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '../cliente';
import {
  MENSAJE_SIN_CONEXION,
  MENSAJE_TIMEOUT,
  mensajeDeError,
  mensajeDeErrorFoto,
  mensajeDeErrorInmueble,
  MENSAJES_ERROR,
} from '../errores';

const api = (status: number, codigo: string | null, mensaje = '') =>
  new ErrorApi({ status, codigo, mensaje });

describe('códigos de inmuebles en el diccionario', () => {
  it.each([
    ['ESTRATO_REQUERIDO', 'Debes indicar el estrato del inmueble.'],
    [
      'CAMPOS_RESIDENCIALES_REQUERIDOS',
      'Para una unidad residencial debes indicar área, habitaciones, baños y ocupantes.',
    ],
    [
      'UNIDAD_CON_CONTRATO_ACTIVO',
      'La unidad tiene un contrato activo y esta acción no se puede hacer.',
    ],
    ['INMUEBLE_CON_DOCUMENTOS', 'Este inmueble tiene documentos y no se puede eliminar.'],
    ['VALIDACION', 'Revisa los datos: alguno no es válido.'],
  ])('%s se muestra en español', (codigo, mensaje) => {
    expect(mensajeDeError(api(400, codigo))).toBe(mensaje);
  });

  it('ERROR_415 (tipo de archivo no permitido que sale del filtro global) tiene mensaje propio', () => {
    expect(MENSAJES_ERROR.ERROR_415).toBe('Ese tipo de archivo no está permitido.');
    expect(mensajeDeError(api(415, 'ERROR_415'))).toBe('Ese tipo de archivo no está permitido.');
  });
});

describe('mensajeDeErrorFoto', () => {
  const NO_VALIDA = 'Esa foto no es válida. Usa una imagen JPG o PNG.';

  it('415 por tipo declarado (ERROR_415) → foto no válida', () => {
    expect(mensajeDeErrorFoto(api(415, 'ERROR_415', 'Tipo de archivo no permitido.'))).toBe(
      NO_VALIDA,
    );
  });

  it('415 por contenido real distinto del tipo (ARCHIVO_CONTENIDO_INVALIDO) → foto no válida', () => {
    expect(mensajeDeErrorFoto(api(415, 'ARCHIVO_CONTENIDO_INVALIDO'))).toBe(NO_VALIDA);
  });

  it('413 (CARGA_DEMASIADO_GRANDE) → demasiado grande, con el máximo de 10 MB', () => {
    expect(mensajeDeErrorFoto(api(413, 'CARGA_DEMASIADO_GRANDE'))).toBe(
      'La foto es demasiado grande (máximo 10 MB). Elige otra o tómala de nuevo.',
    );
  });

  it('400 (foto obligatoria) → pide elegir una foto', () => {
    expect(mensajeDeErrorFoto(api(400, 'SOLICITUD_INVALIDA', 'La foto es obligatoria'))).toBe(
      'No se recibió la foto. Elígela de nuevo.',
    );
  });

  it('sin respuesta al subir (ya no se afirma que falte internet) y tiempo agotado', () => {
    expect(mensajeDeErrorFoto(new ErrorSinConexion())).toBe(
      'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(mensajeDeErrorFoto(new ErrorTimeout())).toBe(MENSAJE_TIMEOUT);
  });

  it('un 404 usa el mensaje de no encontrado y el resto, el general', () => {
    expect(mensajeDeErrorFoto(api(404, 'NO_ENCONTRADO'))).toBe(MENSAJES_ERROR.NO_ENCONTRADO);
    expect(mensajeDeErrorFoto(new Error('boom'))).toBe(mensajeDeError(new Error('boom')));
  });
});

describe('mensajeDeErrorInmueble', () => {
  it('usa el diccionario por código', () => {
    expect(mensajeDeErrorInmueble(api(400, 'ESTRATO_REQUERIDO'))).toBe(
      'Debes indicar el estrato del inmueble.',
    );
  });

  it('un 409 sin código propio muestra el mensaje en español que manda el servidor', () => {
    const texto = 'No se puede quitar el estrato: hay unidades residenciales.';
    expect(mensajeDeErrorInmueble(api(409, null, texto))).toBe(texto);
    expect(mensajeDeErrorInmueble(api(409, 'CONFLICTO', texto))).toBe(texto);
  });

  it('un 409 sin texto cae al mensaje de conflicto', () => {
    expect(mensajeDeErrorInmueble(api(409, 'CONFLICTO'))).toBe(MENSAJES_ERROR.CONFLICTO);
  });

  it('un 409 con código conocido usa el mensaje del diccionario, no el del servidor', () => {
    expect(mensajeDeErrorInmueble(api(409, 'INMUEBLE_CON_DOCUMENTOS', 'texto del servidor'))).toBe(
      MENSAJES_ERROR.INMUEBLE_CON_DOCUMENTOS,
    );
  });

  it('el resto de errores sigue el mensaje general', () => {
    expect(mensajeDeErrorInmueble(new ErrorSinConexion())).toBe(MENSAJE_SIN_CONEXION);
    expect(mensajeDeErrorInmueble(api(500, 'ERROR_INTERNO'))).toBe(MENSAJES_ERROR.ERROR_INTERNO);
  });
});
