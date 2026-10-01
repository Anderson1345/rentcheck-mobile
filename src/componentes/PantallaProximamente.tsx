import { StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from './CabeceraTinta';
import { EstadoMensaje } from './EstadoMensaje';

interface Props {
  titulo: string;
  /** Entrega en la que llega la pantalla real ("E5"). */
  entrega: string;
  mensaje: string;
}

/** Pestaña que todavía no tiene lógica: cabecera de la sección y "Próximamente (entrega)". */
export function PantallaProximamente({ titulo, entrega, mensaje }: Props) {
  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera titulo={titulo} />
      </CabeceraTinta>
      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <EstadoMensaje titulo={`Próximamente (${entrega})`} mensaje={mensaje} />
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: espaciado.xl },
});
