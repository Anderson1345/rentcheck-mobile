import { Image } from 'expo-image';
import { type ReactNode, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';
import {
  alMover,
  alSoltar,
  alTocar,
  type EstadoZoom,
  estadoInicial,
  type Toque,
} from '../utilidades/zoomImagen';
import { Boton } from './Boton';

interface PropsVisor {
  visible: boolean;
  /** Imagen a mostrar; sin ella no se dibuja nada. */
  uri: string | null;
  /** Lo que lee el lector de pantalla ("Comprobante del pago"). */
  descripcion: string;
  onCerrar: () => void;
  /** La imagen no cargó (lo habitual: la URL firmada venció): quien la pidió puede renovarla. */
  onError?: () => void;
  /** Documentos sensibles (comprobantes, cédulas): 'memory' no guarda la imagen en disco. */
  cachePolicy?: 'memory' | 'memory-disk';
}

function aToques(evento: GestureResponderEvent): Toque[] {
  return evento.nativeEvent.touches.map((t) => ({ x: t.pageX, y: t.pageY }));
}
const marcaDeTiempo = (evento: GestureResponderEvent) => evento.nativeEvent.timestamp || Date.now();

/** "2.5" para 2,5×; "2" para 2×. */
const textoDeZoom = (escala: number) => `Zoom ${Number(escala.toFixed(1))}×`;

/**
 * Visor de imágenes a pantalla completa (R1): pellizco para acercar, doble toque para acercar o volver,
 * arrastrar para moverse con zoom, y arrastrar hacia abajo (sin zoom) o tocar "Cerrar" para salir. Solo usa
 * eventos táctiles de React Native y expo-image: funciona en Expo Go. La lógica del zoom está en
 * utilidades/zoomImagen.ts.
 *
 * La URL firmada no se guarda aquí: quien lo usa la pasa en `uri` mientras está abierto.
 */
export function VisorImagen({ visible, ...contenido }: PropsVisor) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={contenido.onCerrar}>
      {/* El contenido (y su zoom) solo existe mientras está abierto: cada apertura empieza en 1×. */}
      {visible ? <ContenidoVisor {...contenido} /> : null}
    </Modal>
  );
}

function ContenidoVisor({
  uri,
  descripcion,
  onCerrar,
  onError,
  cachePolicy = 'memory',
}: Omit<PropsVisor, 'visible'>) {
  const { top, bottom } = useSafeAreaInsets();
  const caja = useWindowDimensions();
  // La referencia es la fuente de verdad (los eventos llegan muy seguidos); el estado solo dibuja.
  const estadoRef = useRef<EstadoZoom>(estadoInicial);
  const [estado, setEstado] = useState<EstadoZoom>(estadoInicial);

  function fijar(siguiente: EstadoZoom) {
    estadoRef.current = siguiente;
    setEstado(siguiente);
  }

  const medidas = { ancho: caja.width, alto: caja.height };

  return (
    <View
      style={[
        estilos.fondo,
        { paddingTop: top + espaciado.sm, paddingBottom: bottom + espaciado.md },
      ]}
    >
      <View
        testID="visor-gestos"
        accessibilityValue={{ text: textoDeZoom(estado.escala) }}
        style={estilos.gestos}
        onTouchStart={(e) => fijar(alTocar(estadoRef.current, aToques(e), marcaDeTiempo(e)))}
        onTouchMove={(e) => fijar(alMover(estadoRef.current, aToques(e), medidas))}
        onTouchEnd={(e) => {
          const { estado: siguiente, cerrar } = alSoltar(
            estadoRef.current,
            aToques(e),
            marcaDeTiempo(e),
            medidas,
          );
          fijar(siguiente);
          if (cerrar) onCerrar();
        }}
        onTouchCancel={() => fijar({ ...estadoRef.current, gesto: null, cierreDy: 0 })}
      >
        {uri ? (
          <Image
            source={{ uri }}
            contentFit="contain"
            cachePolicy={cachePolicy}
            accessibilityLabel={descripcion}
            accessible
            onError={onError}
            style={[
              estilos.imagen,
              {
                opacity: 1 - Math.min(estado.cierreDy / 400, 0.6),
                transform: [
                  { translateX: estado.x },
                  { translateY: estado.y + estado.cierreDy },
                  { scale: estado.escala },
                ],
              },
            ]}
          />
        ) : null}
      </View>
      <Boton titulo="Cerrar" variante="sobreTinta" ancho="completo" onPress={onCerrar} />
    </View>
  );
}

interface PropsAmpliable {
  uri: string | null;
  descripcion: string;
  /** La miniatura (o lo que se toca para ampliar). */
  children: ReactNode;
  onError?: () => void;
  cachePolicy?: 'memory' | 'memory-disk';
  /** Estilo del área tocable (p. ej. ancho completo). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Envuelve una imagen: tocarla la abre en el visor. Sin `uri` (no hay foto) deja el contenido tal cual,
 * sin botón y sin ventana.
 */
export function ImagenAmpliable({
  uri,
  descripcion,
  children,
  onError,
  cachePolicy,
  style,
}: PropsAmpliable) {
  const [abierta, setAbierta] = useState(false);
  if (!uri) return <>{children}</>;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ampliar ${descripcion}`}
        onPress={() => setAbierta(true)}
        style={style}
      >
        {children}
      </Pressable>
      <VisorImagen
        visible={abierta}
        uri={uri}
        descripcion={descripcion}
        onCerrar={() => setAbierta(false)}
        onError={onError}
        cachePolicy={cachePolicy}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colores.tinta,
    paddingHorizontal: espaciado.md,
    gap: espaciado.md,
  },
  gestos: { flex: 1, overflow: 'hidden' },
  imagen: { flex: 1, width: '100%' },
});
