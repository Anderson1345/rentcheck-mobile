import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { ContratoDetalle } from '@/api/contratos';
import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { CargaContrato } from '@/componentes/contratos/AccionesContrato';
import { CodigoAcceso } from '@/componentes/contratos/CodigoAcceso';
import { useRegenerarCodigo } from '@/consultas/contratos';
import { espaciado } from '@/tema';

/**
 * Código de acceso del contrato (R2-B): la sección que antes vivía en el detalle, sin cambios. Con el
 * contrato vinculado no hay código (solo la explicación); si no, código, QR, copiar, compartir y regenerar.
 */
export default function AccesoContrato() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CargaContrato id={id}>{(contrato) => <Acceso contrato={contrato} />}</CargaContrato>;
}

function Acceso({ contrato: c }: { contrato: ContratoDetalle }) {
  const regenerar = useRegenerarCodigo(c.id);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);

  if (c.vinculado) {
    return <Aviso tono="informacion" mensaje="El inquilino ya vinculó este contrato." />;
  }
  if (!c.codigo_acceso) {
    return <Aviso tono="informacion" mensaje="Este contrato no tiene código de acceso." />;
  }

  async function confirmarRegenerar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setError(null);
    try {
      await regenerar.mutateAsync();
    } catch (falla) {
      setError(mensajeDeError(falla));
    } finally {
      enCurso.current = false;
    }
  }

  return (
    <View style={estilos.grupo}>
      {error ? <Aviso mensaje={error} /> : null}
      <CodigoAcceso
        acceso={c.codigo_acceso}
        nombreInquilino={c.inquilino.nombre}
        regenerando={regenerar.isPending}
        onRegenerar={() =>
          Alert.alert('Regenerar código', 'El código anterior dejará de servir.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Regenerar', style: 'destructive', onPress: () => void confirmarRegenerar() },
          ])
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
});
