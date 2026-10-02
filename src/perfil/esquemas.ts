// Perfil del arrendador. El backend no valida el formato de la cédula: la validación es de la app.

import { z } from 'zod';

import type { DatosActualizarPerfil } from '../api/perfil';

/** Quita espacios, puntos y guiones ("1.020.304-050" → "1020304050"). */
export function normalizarCedula(entrada: string): string {
  return entrada.replace(/[\s.-]/g, '');
}

export const MENSAJE_CEDULA = 'La cédula debe tener entre 5 y 12 dígitos, sin letras.';

/**
 * `cedulaOriginal`: la que ya está guardada. Si existe, no se puede dejar vacía (el backend no
 * permite borrarla desde aquí). Vacía y sin cédula previa es válido: no se envía.
 */
export function esquemaPerfil(cedulaOriginal: string) {
  return z.object({
    nombre: z.string().trim().min(1, 'Escribe tu nombre.'),
    telefono: z.string().trim().min(1, 'Escribe tu teléfono.'),
    cedula: z
      .string()
      .transform(normalizarCedula)
      .refine(
        (valor) => (valor === '' ? cedulaOriginal === '' : /^\d{5,12}$/.test(valor)),
        MENSAJE_CEDULA,
      ),
  });
}

export interface ValoresPerfil {
  nombre: string;
  telefono: string;
  cedula: string;
}

/** Solo lo que cambió: nombre y teléfono recortados, cédula normalizada. */
export function camposCambiadosPerfil(
  original: ValoresPerfil,
  nuevos: ValoresPerfil,
): DatosActualizarPerfil {
  const cambios: DatosActualizarPerfil = {};
  const nombre = nuevos.nombre.trim();
  const telefono = nuevos.telefono.trim();
  const cedula = normalizarCedula(nuevos.cedula);
  if (nombre !== original.nombre.trim()) cambios.nombre = nombre;
  if (telefono !== original.telefono.trim()) cambios.telefono = telefono;
  if (cedula !== '' && cedula !== normalizarCedula(original.cedula)) cambios.cedula = cedula;
  return cambios;
}

/** Perfil del inquilino: solo nombre y teléfono (la cédula y el correo no se editan aquí). */
export function esquemaPerfilInquilino() {
  return z.object({
    nombre: z.string().trim().min(1, 'Escribe tu nombre.'),
    telefono: z.string().trim().min(1, 'Escribe tu teléfono.'),
  });
}

export interface ValoresPerfilInquilino {
  nombre: string;
  telefono: string;
}

/** Solo lo que cambió, recortado. Sin cambios devuelve un objeto vacío (no se llama al servidor). */
export function camposCambiadosPerfilInquilino(
  original: ValoresPerfilInquilino,
  nuevos: ValoresPerfilInquilino,
): Partial<ValoresPerfilInquilino> {
  const cambios: Partial<ValoresPerfilInquilino> = {};
  const nombre = nuevos.nombre.trim();
  const telefono = nuevos.telefono.trim();
  if (nombre !== original.nombre.trim()) cambios.nombre = nombre;
  if (telefono !== original.telefono.trim()) cambios.telefono = telefono;
  return cambios;
}
