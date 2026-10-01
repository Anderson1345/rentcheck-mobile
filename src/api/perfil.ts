// Excepción documentada: faltan esquemas en OpenAPI (B-57). El cuerpo de PATCH sale del DTO
// generado; la respuesta de /arrendadores/perfil se escribe a mano según rentcheck-backend.

import { api } from './cliente';
import type { ArchivoFoto } from './inmuebles';
import type { components } from './tipos.gen';

export type DatosActualizarPerfil = components['schemas']['ActualizarPerfilArrendadorDto'];

export interface PerfilArrendador {
  id: string;
  nombre: string;
  /** Solo lectura: el correo no se puede cambiar. */
  correo: string;
  telefono: string;
  cedula: string | null;
  /** URL firmada (1 hora) o null. DOCUMENTO SENSIBLE: nunca se guarda ni se registra. */
  foto_cedula_nit_url: string | null;
  creado_en: string;
}

export const obtenerPerfil = () => api.get<PerfilArrendador>('/arrendadores/perfil');

/** Solo los campos que cambian (nombre, telefono, cedula). */
export const actualizarPerfil = (cambios: DatosActualizarPerfil) =>
  api.patch<PerfilArrendador>('/arrendadores/perfil', cambios);

/** Campo multipart "foto"; responde el perfil con la foto de cédula firmada. */
export const subirFotoCedula = (foto: ArchivoFoto) =>
  api.subirArchivo<PerfilArrendador>('/arrendadores/perfil/foto-cedula', 'foto', foto);
