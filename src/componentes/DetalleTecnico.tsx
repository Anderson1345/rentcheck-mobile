import { colores } from '../tema';
import { Texto } from './Texto';

/**
 * Línea pequeña bajo el mensaje de un fallo ("Detalle técnico: HTTP 415 · ERROR_415"): permite
 * diagnosticar sin conectar el teléfono. El texto ya viene saneado (sin URLs, tokens ni rutas).
 */
export function DetalleTecnico({ detalle }: { detalle: string | null | undefined }) {
  if (!detalle) return null;
  return (
    <Texto variante="secundario" color={colores.textoSecundario}>
      {`Detalle técnico: ${detalle}`}
    </Texto>
  );
}
