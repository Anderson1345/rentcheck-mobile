import { aBase64Url, crearToken } from '../../pruebas/crearToken';
import { decodificarToken, estaVencido } from '../jwt';

describe('decodificarToken', () => {
  it('un token con `id` es de arrendador y trae exp', () => {
    const token = crearToken({ id: 'a1', iat: 1_000, exp: 2_000 });
    expect(decodificarToken(token)).toEqual({ rol: 'arrendador', exp: 2_000 });
  });

  it('un token con `inquilinoId` es de inquilino', () => {
    const token = crearToken({ inquilinoId: 'i1', iat: 1_000, exp: 2_000 });
    expect(decodificarToken(token)).toEqual({ rol: 'inquilino', exp: 2_000 });
  });

  it('un token con ambas claves, o con ninguna, no es válido (el rol no es ambiguo)', () => {
    expect(decodificarToken(crearToken({ id: 'a', inquilinoId: 'i', exp: 2_000 }))).toBeNull();
    expect(decodificarToken(crearToken({ sub: 'x', exp: 2_000 }))).toBeNull();
  });

  it('un token sin exp, o con exp que no es número, no es válido', () => {
    expect(decodificarToken(crearToken({ id: 'a1' }))).toBeNull();
    expect(decodificarToken(crearToken({ id: 'a1', exp: '2000' }))).toBeNull();
  });

  it('un id que no es texto no es válido', () => {
    expect(decodificarToken(crearToken({ id: 5, exp: 2_000 }))).toBeNull();
    expect(decodificarToken(crearToken({ id: '', exp: 2_000 }))).toBeNull();
  });

  it('token basura: sin partes, base64 inválido, JSON inválido o payload que no es objeto', () => {
    expect(decodificarToken('')).toBeNull();
    expect(decodificarToken('basura')).toBeNull();
    expect(decodificarToken('a.b')).toBeNull();
    expect(decodificarToken('a.%%%.c')).toBeNull();
    expect(decodificarToken(`x.${aBase64Url('no es json')}.z`)).toBeNull();
    expect(decodificarToken(`x.${aBase64Url('[1,2]')}.z`)).toBeNull();
    expect(decodificarToken(`x.${aBase64Url('"texto"')}.z`)).toBeNull();
  });

  it('decodifica payloads con caracteres no ASCII sin fallar', () => {
    const token = crearToken({ id: 'ñandú-é', exp: 2_000 });
    expect(decodificarToken(token)).toEqual({ rol: 'arrendador', exp: 2_000 });
  });

  it('lee un token codificado por Node (no solo por el ayudante de prueba)', () => {
    const real =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IsOxYW5kw7otMSIsImV4cCI6MjAwMCwiaWF0IjoxfQ.firmaReal_-9';
    expect(decodificarToken(real)).toEqual({ rol: 'arrendador', exp: 2_000 });
  });

  it('no verifica la firma (eso es del servidor): cualquier firma se acepta', () => {
    expect(decodificarToken(crearToken({ id: 'a1', exp: 2_000 }, 'otra'))).not.toBeNull();
  });
});

describe('estaVencido', () => {
  it('compara exp (segundos) con el reloj (milisegundos)', () => {
    expect(estaVencido(2_000, 1_999_000)).toBe(false);
    expect(estaVencido(2_000, 2_000_000)).toBe(true);
    expect(estaVencido(2_000, 2_500_000)).toBe(true);
  });
});
