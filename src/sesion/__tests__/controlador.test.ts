import type {
  RespuestaAutenticacionArrendador,
  RespuestaAutenticacionInquilino,
} from '../../api/auth';
import { crearToken } from '../../pruebas/crearToken';
import type { AlmacenSesion } from '../almacen';
import { crearControladorSesion } from '../controlador';
import type { DatosSesion } from '../tipos';

const AHORA_MS = 1_000_000; // 1000 s
const EXP_VIGENTE = 5_000;
const EXP_VENCIDO = 500;

const esperar = () => new Promise<void>((resolver) => setImmediate(resolver));

function almacenFalso(inicial: DatosSesion | null = null) {
  let guardado = inicial;
  const almacen = {
    guardar: jest.fn(async (datos: DatosSesion) => {
      guardado = datos;
    }),
    leer: jest.fn(async () => guardado),
    borrar: jest.fn(async () => {
      guardado = null;
    }),
  } satisfies AlmacenSesion;
  return { almacen, contenido: () => guardado };
}

function crear(inicial: DatosSesion | null = null) {
  const { almacen, contenido } = almacenFalso(inicial);
  const limpiarCache = jest.fn();
  const controlador = crearControladorSesion({ almacen, limpiarCache, ahora: () => AHORA_MS });
  return { controlador, almacen, contenido, limpiarCache };
}

const respuestaArrendador = (exp = EXP_VIGENTE): RespuestaAutenticacionArrendador => ({
  access_token: crearToken({ id: 'a1', exp }),
  arrendador: {
    id: 'a1',
    nombre: 'Marta Ríos',
    correo: 'marta@ejemplo.com',
    telefono: '3001234567',
    foto_cedula_nit_url: 'https://firmada.example/foto',
    creado_en: '2026-09-01T00:00:00.000Z',
  },
});

const respuestaInquilino = (): RespuestaAutenticacionInquilino => ({
  access_token: crearToken({ inquilinoId: 'i1', exp: EXP_VIGENTE }),
  inquilino: {
    id: 'i1',
    nombre: 'Camilo Pardo',
    correo: 'camilo@ejemplo.com',
    telefono: '3009876543',
    creado_en: '2026-09-01T00:00:00.000Z',
  },
});

const guardadaArrendador = (exp = EXP_VIGENTE): DatosSesion => ({
  token: crearToken({ id: 'a1', exp }),
  rol: 'arrendador',
  usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
});

describe('arranque de la sesión', () => {
  it('empieza en "cargando" hasta que termina de leer el almacén', async () => {
    const { controlador } = crear();
    expect(controlador.obtener()).toEqual({ estado: 'cargando', usuario: null, aviso: null });
    await controlador.arrancar();
    expect(controlador.obtener().estado).toBe('anonimo');
  });

  it('sin nada guardado: anónimo, sin aviso', async () => {
    const { controlador } = crear();
    await controlador.arrancar();
    expect(controlador.obtener()).toEqual({ estado: 'anonimo', usuario: null, aviso: null });
    expect(controlador.obtenerToken()).toBeNull();
  });

  it('con una sesión vigente guardada: la restaura con su rol y usuario', async () => {
    const guardada = guardadaArrendador();
    const { controlador, almacen } = crear(guardada);
    await controlador.arrancar();
    expect(controlador.obtener()).toEqual({
      estado: 'arrendador',
      usuario: guardada.usuario,
      aviso: null,
    });
    expect(controlador.obtenerToken()).toBe(guardada.token);
    expect(almacen.borrar).not.toHaveBeenCalled();
  });

  it('con el token vencido: anónimo con aviso de sesión vencida y se borra lo guardado', async () => {
    const { controlador, almacen, contenido } = crear(guardadaArrendador(EXP_VENCIDO));
    await controlador.arrancar();
    expect(controlador.obtener()).toEqual({
      estado: 'anonimo',
      usuario: null,
      aviso: 'SESION_VENCIDA',
    });
    expect(controlador.obtenerToken()).toBeNull();
    expect(almacen.borrar).toHaveBeenCalled();
    expect(contenido()).toBeNull();
  });

  it('con un token ilegible: anónimo sin aviso y se borra lo guardado', async () => {
    const { controlador, almacen } = crear({ ...guardadaArrendador(), token: 'basura' });
    await controlador.arrancar();
    expect(controlador.obtener()).toEqual({ estado: 'anonimo', usuario: null, aviso: null });
    expect(almacen.borrar).toHaveBeenCalled();
  });

  it('si el rol guardado no coincide con el del token, manda el token: se descarta la sesión', async () => {
    const { controlador, almacen } = crear({ ...guardadaArrendador(), rol: 'inquilino' });
    await controlador.arrancar();
    expect(controlador.obtener().estado).toBe('anonimo');
    expect(almacen.borrar).toHaveBeenCalled();
  });
});

describe('iniciar y cerrar sesión', () => {
  it('iniciar como arrendador: guarda solo lo mínimo, fija el rol del token y expone el token', async () => {
    const { controlador, almacen, contenido } = crear();
    await controlador.arrancar();
    const respuesta = respuestaArrendador();
    await controlador.iniciarSesion(respuesta);

    expect(controlador.obtener()).toEqual({
      estado: 'arrendador',
      usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
      aviso: null,
    });
    expect(controlador.obtenerToken()).toBe(respuesta.access_token);
    expect(almacen.guardar).toHaveBeenCalledTimes(1);
    expect(contenido()).toEqual({
      token: respuesta.access_token,
      rol: 'arrendador',
      usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
    });
  });

  it('iniciar como inquilino', async () => {
    const { controlador } = crear();
    await controlador.arrancar();
    await controlador.iniciarSesion(respuestaInquilino());
    expect(controlador.obtener().estado).toBe('inquilino');
    expect(controlador.obtener().usuario?.nombre).toBe('Camilo Pardo');
  });

  it('el rol sale del token, no de la respuesta: un token de inquilino en una respuesta de arrendador se rechaza', async () => {
    const { controlador, almacen } = crear();
    await controlador.arrancar();
    const manipulada = {
      ...respuestaArrendador(),
      access_token: crearToken({ inquilinoId: 'i1', exp: EXP_VIGENTE }),
    };
    await expect(controlador.iniciarSesion(manipulada)).rejects.toThrow();
    expect(controlador.obtener().estado).toBe('anonimo');
    expect(almacen.guardar).not.toHaveBeenCalled();
  });

  it('un token vencido o ilegible en la respuesta se rechaza', async () => {
    const { controlador } = crear();
    await controlador.arrancar();
    await expect(controlador.iniciarSesion(respuestaArrendador(EXP_VENCIDO))).rejects.toThrow();
    await expect(
      controlador.iniciarSesion({ ...respuestaArrendador(), access_token: 'basura' }),
    ).rejects.toThrow();
    expect(controlador.obtener().estado).toBe('anonimo');
  });

  it('si el llavero falla al guardar, la sesión sigue activa en esta ejecución', async () => {
    const { controlador, almacen } = crear();
    almacen.guardar.mockRejectedValueOnce(new Error('llavero lleno'));
    await controlador.arrancar();
    await controlador.iniciarSesion(respuestaArrendador());
    expect(controlador.obtener().estado).toBe('arrendador');
  });

  it('iniciar sesión borra el aviso de sesión vencida', async () => {
    const { controlador } = crear(guardadaArrendador(EXP_VENCIDO));
    await controlador.arrancar();
    expect(controlador.obtener().aviso).toBe('SESION_VENCIDA');
    await controlador.iniciarSesion(respuestaArrendador());
    expect(controlador.obtener().aviso).toBeNull();
  });

  it('cerrar sesión borra el almacén, limpia la caché de consultas y vuelve a anónimo', async () => {
    const { controlador, almacen, contenido, limpiarCache } = crear();
    await controlador.arrancar();
    await controlador.iniciarSesion(respuestaArrendador());
    await controlador.cerrarSesion();

    expect(controlador.obtener()).toEqual({ estado: 'anonimo', usuario: null, aviso: null });
    expect(controlador.obtenerToken()).toBeNull();
    expect(almacen.borrar).toHaveBeenCalled();
    expect(contenido()).toBeNull();
    expect(limpiarCache).toHaveBeenCalledTimes(1);
  });

  it('cerrar sesión funciona aunque el llavero falle al borrar', async () => {
    const { controlador, almacen, limpiarCache } = crear();
    await controlador.arrancar();
    await controlador.iniciarSesion(respuestaArrendador());
    almacen.borrar.mockRejectedValueOnce(new Error('llavero no disponible'));
    await controlador.cerrarSesion();
    expect(controlador.obtener().estado).toBe('anonimo');
    expect(limpiarCache).toHaveBeenCalled();
  });
});

describe('401 en cualquier llamada', () => {
  it('con el token vigente: cierra la sesión con aviso de sesión vencida y limpia la caché', async () => {
    const { controlador, limpiarCache } = crear();
    await controlador.arrancar();
    const respuesta = respuestaArrendador();
    await controlador.iniciarSesion(respuesta);
    controlador.alRecibir401(respuesta.access_token);
    await esperar();

    expect(controlador.obtener()).toEqual({
      estado: 'anonimo',
      usuario: null,
      aviso: 'SESION_VENCIDA',
    });
    expect(limpiarCache).toHaveBeenCalled();
  });

  it('un 401 de un token viejo (de una sesión anterior) no cierra la sesión nueva', async () => {
    const { controlador } = crear();
    await controlador.arrancar();
    await controlador.iniciarSesion(respuestaArrendador());
    controlador.alRecibir401(crearToken({ id: 'a1', exp: 4_000 }));
    await esperar();
    expect(controlador.obtener().estado).toBe('arrendador');
  });

  it('sin sesión no hace nada', async () => {
    const { controlador, limpiarCache } = crear();
    await controlador.arrancar();
    controlador.alRecibir401('token-cualquiera');
    await esperar();
    expect(controlador.obtener().aviso).toBeNull();
    expect(limpiarCache).not.toHaveBeenCalled();
  });
});

describe('suscripción', () => {
  it('notifica los cambios y la instantánea es estable mientras nada cambia', async () => {
    const { controlador } = crear();
    const oyente = jest.fn();
    const baja = controlador.suscribir(oyente);
    expect(controlador.obtener()).toBe(controlador.obtener());

    await controlador.arrancar();
    expect(oyente).toHaveBeenCalled();
    const antes = controlador.obtener();
    await controlador.iniciarSesion(respuestaArrendador());
    expect(controlador.obtener()).not.toBe(antes);

    baja();
    oyente.mockClear();
    await controlador.cerrarSesion();
    expect(oyente).not.toHaveBeenCalled();
  });
});
