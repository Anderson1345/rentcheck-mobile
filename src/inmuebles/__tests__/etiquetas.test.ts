import { unidadEjemplo, unidadPrincipalNueva } from '../../pruebas/datosInmuebles';
import { textoCanon, unidadPorCompletar } from '../etiquetas';

describe('unidadPorCompletar', () => {
  it('residencial con algún dato en null: por completar', () => {
    expect(unidadPorCompletar(unidadPrincipalNueva())).toBe(true);
    expect(unidadPorCompletar(unidadEjemplo({ numero_banos: null }))).toBe(true);
  });

  it('residencial completa: no', () => {
    expect(unidadPorCompletar(unidadEjemplo())).toBe(false);
  });

  it('COMERCIAL con campos nulos NO está por completar (esos datos no se piden)', () => {
    expect(unidadPorCompletar(unidadPrincipalNueva({ uso_permitido: 'COMERCIAL' }))).toBe(false);
  });
});

describe('textoCanon', () => {
  it('canon 0 (el de la unidad principal automática) es "Sin definir"', () => {
    expect(textoCanon(0)).toBe('Sin definir');
  });
  it('con valor, en pesos', () => {
    expect(textoCanon(180_000_000)).toBe('$ 1.800.000');
  });
});
