import { claveCachePortada, marcarPortadaCambiada } from '../claveImagen';

const URL_A = 'https://bucket.test/storage/v1/object/sign/inmuebles/i1/portada.jpg?token=AAA&exp=1';
const URL_B = 'https://bucket.test/storage/v1/object/sign/inmuebles/i1/portada.jpg?token=BBB&exp=2';
const T0 = 1_800_000_000_000;
const HORA = 3_600_000;

describe('claveCachePortada', () => {
  it('la misma foto con otra firma tiene la MISMA clave (no se vuelve a descargar)', () => {
    expect(claveCachePortada('i1', URL_A, T0)).toBe(claveCachePortada('i1', URL_B, T0 + HORA));
  });

  it('la clave no contiene la firma ni el token', () => {
    expect(claveCachePortada('i1', URL_A, T0)).not.toMatch(/AAA|token|exp=/);
  });

  it('inmuebles distintos tienen claves distintas', () => {
    expect(claveCachePortada('i1', URL_A, T0)).not.toBe(claveCachePortada('i2', URL_A, T0));
  });

  it('otra ruta de archivo (jpg → png) cambia la clave', () => {
    const png = URL_A.replace('portada.jpg', 'portada.png');
    expect(claveCachePortada('i1', png, T0)).not.toBe(claveCachePortada('i1', URL_A, T0));
  });

  it('al cambiar la foto desde la app, la clave cambia aunque la ruta sea la misma', () => {
    const antes = claveCachePortada('i7', URL_A, T0);
    marcarPortadaCambiada('i7');
    expect(claveCachePortada('i7', URL_B, T0)).not.toBe(antes);
    // Los demás inmuebles no se ven afectados.
    expect(claveCachePortada('i8', URL_A, T0)).toBe(claveCachePortada('i8', URL_B, T0));
  });

  it('pasadas 6 horas se renueva (por si la foto cambió desde otro dispositivo)', () => {
    expect(claveCachePortada('i1', URL_A, T0 + 7 * HORA)).not.toBe(
      claveCachePortada('i1', URL_A, T0),
    );
  });

  it('una imagen local o sin URL no lleva clave', () => {
    expect(claveCachePortada('i1', 'file:///cache/f.jpg', T0)).toBeNull();
    expect(claveCachePortada('i1', null, T0)).toBeNull();
  });
});
