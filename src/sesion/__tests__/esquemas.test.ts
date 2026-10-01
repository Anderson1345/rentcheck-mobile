import { esquemaContrasenaNueva, esquemaCorreo, esquemaLogin, esquemaRegistro } from '../esquemas';

const mensajes = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues.map((i) => i.message) ?? [];

describe('esquemaCorreo', () => {
  it('recorta espacios y pasa a minúsculas', () => {
    expect(esquemaCorreo.parse('  Marta@Ejemplo.COM  ')).toBe('marta@ejemplo.com');
  });

  it('rechaza vacío y formatos inválidos con mensaje en español', () => {
    expect(mensajes(esquemaCorreo.safeParse(''))).toContain('Escribe tu correo.');
    expect(mensajes(esquemaCorreo.safeParse('   '))).toContain('Escribe tu correo.');
    for (const malo of ['marta', 'marta@', '@ejemplo.com', 'marta@ejemplo', 'mar ta@ejemplo.com']) {
      expect(mensajes(esquemaCorreo.safeParse(malo))).toContain('Escribe un correo válido.');
    }
  });
});

describe('esquemaContrasenaNueva (mínimo 8, con letra y número)', () => {
  it('acepta contraseñas que cumplen', () => {
    for (const buena of ['abcdefg1', 'Clave2026', '12345678a', 'ñandú2026!']) {
      expect(esquemaContrasenaNueva.safeParse(buena).success).toBe(true);
    }
  });

  it('rechaza cortas, sin número y sin letra', () => {
    expect(esquemaContrasenaNueva.safeParse('abc1234').success).toBe(false);
    expect(esquemaContrasenaNueva.safeParse('abcdefghi').success).toBe(false);
    expect(esquemaContrasenaNueva.safeParse('123456789').success).toBe(false);
    expect(mensajes(esquemaContrasenaNueva.safeParse(''))).toContain('Escribe una contraseña.');
    expect(mensajes(esquemaContrasenaNueva.safeParse('abc1'))).toContain(
      'La contraseña debe tener al menos 8 caracteres, con una letra y un número.',
    );
  });

  it('no recorta la contraseña: los espacios cuentan', () => {
    expect(esquemaContrasenaNueva.parse('abc 1234')).toBe('abc 1234');
  });
});

describe('esquemaLogin', () => {
  it('pide correo y contraseña; no revalida la fuerza de la contraseña', () => {
    expect(esquemaLogin.parse({ correo: ' A@B.CO ', contrasena: 'x' })).toEqual({
      correo: 'a@b.co',
      contrasena: 'x',
    });
    expect(mensajes(esquemaLogin.safeParse({ correo: 'a@b.co', contrasena: '' }))).toContain(
      'Escribe tu contraseña.',
    );
    expect(esquemaLogin.safeParse({ correo: '', contrasena: 'x' }).success).toBe(false);
  });
});

describe('esquemaRegistro', () => {
  const valido = {
    nombre: '  Marta Ríos ',
    correo: 'Marta@Ejemplo.com',
    telefono: ' 300 123 4567 ',
    contrasena: 'Clave2026',
  };

  it('normaliza y acepta un registro completo', () => {
    expect(esquemaRegistro.parse(valido)).toEqual({
      nombre: 'Marta Ríos',
      correo: 'marta@ejemplo.com',
      telefono: '300 123 4567',
      contrasena: 'Clave2026',
    });
  });

  it('nombre y teléfono son obligatorios', () => {
    expect(mensajes(esquemaRegistro.safeParse({ ...valido, nombre: '   ' }))).toContain(
      'Escribe tu nombre.',
    );
    expect(mensajes(esquemaRegistro.safeParse({ ...valido, telefono: '' }))).toContain(
      'Escribe tu teléfono.',
    );
  });

  it('el teléfono admite dígitos, espacios, +, - y paréntesis, y pide al menos 7 dígitos', () => {
    for (const bueno of ['3001234567', '+57 300 123 4567', '(601) 234-5678']) {
      expect(esquemaRegistro.safeParse({ ...valido, telefono: bueno }).success).toBe(true);
    }
    for (const malo of ['abc', '12345', 'llámame']) {
      expect(mensajes(esquemaRegistro.safeParse({ ...valido, telefono: malo }))).toContain(
        'Escribe un teléfono válido.',
      );
    }
  });

  it('la contraseña sigue la regla del registro', () => {
    expect(esquemaRegistro.safeParse({ ...valido, contrasena: 'corta1' }).success).toBe(false);
  });
});
