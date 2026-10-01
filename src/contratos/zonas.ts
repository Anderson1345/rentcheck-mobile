// Zonas del inventario. El backend solo exige un texto no vacío (CrearFotoInventarioDto.zona); el
// máximo de 60 caracteres es una ayuda de la app para mantener las zonas legibles.

export const ZONAS = ['Sala', 'Cocina', 'Baño', 'Habitación', 'Fachada', 'Otra'] as const;
export type ZonaChip = (typeof ZONAS)[number];
export const ZONA_MAXIMO = 60;

/** La zona a enviar: el chip elegido o, con "Otra", el texto libre recortado. */
export function validarZona(
  chip: ZonaChip | null,
  textoOtra: string,
): { zona: string; error?: undefined } | { zona?: undefined; error: string } {
  if (chip === null) return { error: 'Elige la zona de la foto.' };
  if (chip !== 'Otra') return { zona: chip };
  const texto = textoOtra.trim();
  if (texto === '') return { error: 'Escribe cuál es la zona.' };
  if (texto.length > ZONA_MAXIMO) {
    return { error: `La zona puede tener hasta ${ZONA_MAXIMO} caracteres.` };
  }
  return { zona: texto };
}
