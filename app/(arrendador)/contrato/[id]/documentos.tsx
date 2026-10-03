import { useLocalSearchParams } from 'expo-router';

import { listarDocumentos } from '@/api/contratos';
import { SeccionDocumentos } from '@/componentes/contratos/LecturaContrato';
import { BotonRegenerar } from '@/componentes/contratos/TerminacionYCorreccion';
import { PantallaPila } from '@/componentes/PantallaPila';
import { useDocumentos } from '@/consultas/contratos';

/**
 * Documentos del contrato (R2-B): la sección que antes vivía en el detalle, sin cambios. Cada versión se
 * ve y se comparte con una URL firmada fresca; "¿Falta un documento? Generar" genera solo lo que falta.
 */
export default function DocumentosContrato() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentos = useDocumentos(id);
  return (
    <PantallaPila>
      <SeccionDocumentos
        contratoId={id}
        consulta={documentos}
        pedirLista={listarDocumentos}
        pie={
          <BotonRegenerar contratoId={id} titulo="¿Falta un documento? Generar" conConfirmacion />
        }
      />
    </PantallaPila>
  );
}
