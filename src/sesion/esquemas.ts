// Esquemas de los formularios de acceso. Solo ayudan al usuario (campo vacío, formato): el servidor
// manda. Las reglas de contraseña y los campos del registro reflejan RegistroArrendadorDto del
// backend (nombre, correo, telefono y contrasena).

import { z } from 'zod';

/** Correo recortado y en minúsculas, igual que lo normaliza el backend. */
export const esquemaCorreo = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Escribe tu correo.')
  .pipe(z.email('Escribe un correo válido.'));

/** Contraseña nueva: mínimo 8 caracteres, con al menos una letra y un número. No se recorta. */
export const esquemaContrasenaNueva = z
  .string()
  .min(1, 'Escribe una contraseña.')
  .refine((valor) => valor.length >= 8 && /[A-Za-z]/.test(valor) && /\d/.test(valor), {
    message: 'La contraseña debe tener al menos 8 caracteres, con una letra y un número.',
  });

/**
 * Al iniciar sesión solo se pide que no esté vacía: la regla de fortaleza se aplica al crear la
 * contraseña, y una cuenta antigua no debe quedar bloqueada por una regla nueva del teléfono.
 */
export const esquemaLogin = z.object({
  correo: esquemaCorreo,
  contrasena: z.string().min(1, 'Escribe tu contraseña.'),
});

const TELEFONO = /^[\d\s()+-]+$/;

export const esquemaRegistro = z.object({
  nombre: z.string().trim().min(1, 'Escribe tu nombre.'),
  correo: esquemaCorreo,
  telefono: z
    .string()
    .trim()
    .min(1, 'Escribe tu teléfono.')
    .refine((valor) => TELEFONO.test(valor) && valor.replace(/\D/g, '').length >= 7, {
      message: 'Escribe un teléfono válido.',
    }),
  contrasena: esquemaContrasenaNueva,
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosRegistro = z.infer<typeof esquemaRegistro>;

/** Código de verificación o de restablecimiento: exactamente 6 dígitos. */
export const esquemaCodigoSeisDigitos = z
  .string()
  .trim()
  .min(1, 'Escribe el código de 6 dígitos.')
  .regex(/^\d{6}$/, 'El código tiene 6 dígitos.');

const MENSAJE_NO_COINCIDEN = 'Las contraseñas no coinciden.';

/** Que la confirmación sea igual a la contraseña; el error cae en el campo de confirmación. */
function exigirConfirmacion<T extends z.ZodType<Record<string, string>>>(
  esquema: T,
  campo: string,
) {
  return esquema.superRefine((datos, contexto) => {
    if (datos.confirmacion !== '' && datos.confirmacion !== datos[campo]) {
      contexto.addIssue({ code: 'custom', message: MENSAJE_NO_COINCIDEN, path: ['confirmacion'] });
    }
  });
}

const confirmacion = z.string().min(1, 'Confirma tu contraseña.');

/** Activación del inquilino (paso 2): correo y contraseña nueva con confirmación. */
export const esquemaActivacion = exigirConfirmacion(
  z.object({ correo: esquemaCorreo, contrasena: esquemaContrasenaNueva, confirmacion }),
  'contrasena',
);

export const esquemaVerificacion = z.object({ codigo: esquemaCodigoSeisDigitos });

export const esquemaRecuperar = z.object({ correo: esquemaCorreo });

export const esquemaRestablecer = exigirConfirmacion(
  z.object({
    correo: esquemaCorreo,
    codigo: esquemaCodigoSeisDigitos,
    nueva_contrasena: esquemaContrasenaNueva,
    confirmacion,
  }),
  'nueva_contrasena',
);

export type DatosActivacionForm = z.infer<typeof esquemaActivacion>;
export type DatosVerificacion = z.infer<typeof esquemaVerificacion>;
export type DatosRecuperar = z.infer<typeof esquemaRecuperar>;
export type DatosRestablecerForm = z.infer<typeof esquemaRestablecer>;
