import {
  esquemaActivacion,
  esquemaCodigoSeisDigitos,
  esquemaRecuperar,
  esquemaRestablecer,
  esquemaVerificacion,
} from '../esquemas';

const mensajes = (r: {
  success: boolean;
  error?: { issues: { message: string; path: PropertyKey[] }[] };
}) => r.error?.issues.map((i) => i.message) ?? [];

describe('esquemaCodigoSeisDigitos', () => {
  it('acepta exactamente 6 dígitos (recortando espacios)', () => {
    expect(esquemaCodigoSeisDigitos.parse(' 123456 ')).toBe('123456');
  });

  it('rechaza vacío, cortos, largos y no numéricos', () => {
    expect(mensajes(esquemaCodigoSeisDigitos.safeParse(''))).toContain(
      'Escribe el código de 6 dígitos.',
    );
    for (const malo of ['12345', '1234567', 'abcdef', '12 456', '12345a']) {
      expect(mensajes(esquemaCodigoSeisDigitos.safeParse(malo))).toContain(
        'El código tiene 6 dígitos.',
      );
    }
  });
});

describe('esquemaVerificacion', () => {
  it('pide el código de 6 dígitos', () => {
    expect(esquemaVerificacion.parse({ codigo: '000123' })).toEqual({ codigo: '000123' });
    expect(esquemaVerificacion.safeParse({ codigo: '123' }).success).toBe(false);
  });
});

describe('esquemaActivacion', () => {
  const valido = {
    correo: ' Camilo@Ejemplo.com ',
    contrasena: 'Clave2026',
    confirmacion: 'Clave2026',
  };

  it('normaliza el correo y acepta contraseña y confirmación iguales', () => {
    expect(esquemaActivacion.parse(valido)).toEqual({
      correo: 'camilo@ejemplo.com',
      contrasena: 'Clave2026',
      confirmacion: 'Clave2026',
    });
  });

  it('usa las reglas de contraseña nueva (8, letra y número)', () => {
    const r = esquemaActivacion.safeParse({
      ...valido,
      contrasena: 'corta1',
      confirmacion: 'corta1',
    });
    expect(mensajes(r)).toContain(
      'La contraseña debe tener al menos 8 caracteres, con una letra y un número.',
    );
  });

  it('la confirmación debe coincidir y el error cae en el campo de confirmación', () => {
    const r = esquemaActivacion.safeParse({ ...valido, confirmacion: 'Clave2027' });
    expect(mensajes(r)).toContain('Las contraseñas no coinciden.');
    expect(
      r.error?.issues.find((i) => i.message === 'Las contraseñas no coinciden.')?.path,
    ).toEqual(['confirmacion']);
  });

  it('pide confirmar la contraseña', () => {
    expect(mensajes(esquemaActivacion.safeParse({ ...valido, confirmacion: '' }))).toContain(
      'Confirma tu contraseña.',
    );
  });

  it('correo inválido o vacío', () => {
    expect(mensajes(esquemaActivacion.safeParse({ ...valido, correo: 'x' }))).toContain(
      'Escribe un correo válido.',
    );
    expect(mensajes(esquemaActivacion.safeParse({ ...valido, correo: '' }))).toContain(
      'Escribe tu correo.',
    );
  });
});

describe('esquemaRecuperar', () => {
  it('pide un correo válido', () => {
    expect(esquemaRecuperar.parse({ correo: ' A@B.CO ' })).toEqual({ correo: 'a@b.co' });
    expect(esquemaRecuperar.safeParse({ correo: 'no' }).success).toBe(false);
  });
});

describe('esquemaRestablecer', () => {
  const valido = {
    correo: 'a@b.co',
    codigo: '123456',
    nueva_contrasena: 'Clave2027',
    confirmacion: 'Clave2027',
  };

  it('acepta correo, código de 6 dígitos y contraseña nueva confirmada', () => {
    expect(esquemaRestablecer.parse(valido)).toEqual(valido);
  });

  it('valida código, contraseña y coincidencia', () => {
    expect(esquemaRestablecer.safeParse({ ...valido, codigo: '12' }).success).toBe(false);
    expect(
      esquemaRestablecer.safeParse({ ...valido, nueva_contrasena: 'abc', confirmacion: 'abc' })
        .success,
    ).toBe(false);
    const r = esquemaRestablecer.safeParse({ ...valido, confirmacion: 'otra1234' });
    expect(
      r.error?.issues.find((i) => i.message === 'Las contraseñas no coinciden.')?.path,
    ).toEqual(['confirmacion']);
  });
});
