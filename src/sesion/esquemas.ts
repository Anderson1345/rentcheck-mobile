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
