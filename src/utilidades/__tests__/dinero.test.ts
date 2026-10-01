import { centavosAPesosTexto, pesosTextoACentavos } from '../dinero';

describe('centavosAPesosTexto', () => {
  it('formatea pesos enteros con puntos de miles', () => {
    expect(centavosAPesosTexto(125_000_000)).toBe('$ 1.250.000');
    expect(centavosAPesosTexto(100_000)).toBe('$ 1.000');
    expect(centavosAPesosTexto(99_900)).toBe('$ 999');
    expect(centavosAPesosTexto(100)).toBe('$ 1');
  });

  it('formatea cero', () => {
    expect(centavosAPesosTexto(0)).toBe('$ 0');
  });

  it('formatea millones grandes', () => {
    expect(centavosAPesosTexto(123_456_789_000)).toBe('$ 1.234.567.890');
  });

  it('muestra los centavos con coma solo cuando no son múltiplo de 100', () => {
    expect(centavosAPesosTexto(125_000_050)).toBe('$ 1.250.000,50');
    expect(centavosAPesosTexto(105)).toBe('$ 1,05');
  });

  it('formatea negativos con el signo adelante', () => {
    expect(centavosAPesosTexto(-125_000_000)).toBe('-$ 1.250.000');
  });

  it('rechaza valores que no son enteros seguros', () => {
    expect(() => centavosAPesosTexto(10.5)).toThrow();
    expect(() => centavosAPesosTexto(Number.NaN)).toThrow();
    expect(() => centavosAPesosTexto(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('pesosTextoACentavos', () => {
  it('convierte números sin separadores', () => {
    expect(pesosTextoACentavos('1250000')).toBe(125_000_000);
    expect(pesosTextoACentavos('0')).toBe(0);
  });

  it('acepta puntos como separador de miles', () => {
    expect(pesosTextoACentavos('1.250.000')).toBe(125_000_000);
    expect(pesosTextoACentavos('1.250')).toBe(125_000);
  });

  it('acepta comas como separador de miles', () => {
    expect(pesosTextoACentavos('1,250,000')).toBe(125_000_000);
    expect(pesosTextoACentavos('1,250')).toBe(125_000);
  });

  it('ignora el símbolo de pesos y los espacios', () => {
    expect(pesosTextoACentavos('$ 1.250.000')).toBe(125_000_000);
    expect(pesosTextoACentavos('  $1.250.000  ')).toBe(125_000_000);
  });

  it('rechaza decimales ambiguos', () => {
    expect(pesosTextoACentavos('1.5')).toBeNull();
    expect(pesosTextoACentavos('1,5')).toBeNull();
    expect(pesosTextoACentavos('1.50')).toBeNull();
    expect(pesosTextoACentavos('1.250,50')).toBeNull();
    expect(pesosTextoACentavos('1,250.50')).toBeNull();
  });

  it('rechaza separadores mezclados o mal agrupados', () => {
    expect(pesosTextoACentavos('1.250,000')).toBeNull();
    expect(pesosTextoACentavos('12.50.000')).toBeNull();
    expect(pesosTextoACentavos('1..250')).toBeNull();
    expect(pesosTextoACentavos('.250')).toBeNull();
  });

  it('rechaza negativos', () => {
    expect(pesosTextoACentavos('-5000')).toBeNull();
    expect(pesosTextoACentavos('-1.250.000')).toBeNull();
  });

  it('rechaza vacío y texto', () => {
    expect(pesosTextoACentavos('')).toBeNull();
    expect(pesosTextoACentavos('   ')).toBeNull();
    expect(pesosTextoACentavos('abc')).toBeNull();
    expect(pesosTextoACentavos('12abc')).toBeNull();
    expect(pesosTextoACentavos('$')).toBeNull();
  });

  it('rechaza cifras que no caben como entero seguro', () => {
    expect(pesosTextoACentavos('9999999999999999999')).toBeNull();
  });

  it('ida y vuelta: lo que se formatea se vuelve a leer igual', () => {
    for (const centavos of [0, 100, 99_900, 125_000_000, 123_456_789_000]) {
      expect(pesosTextoACentavos(centavosAPesosTexto(centavos))).toBe(centavos);
    }
  });
});
