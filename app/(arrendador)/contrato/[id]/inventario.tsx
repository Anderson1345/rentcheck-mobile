import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ErrorSinConexion, ErrorTimeout } from '@/api/cliente';
import { detalleTecnico, mensajeDeError, mensajeDeErrorFoto } from '@/api/errores';
import type { ArchivoFoto } from '@/api/inmuebles';
import { type Momento, subirFotoInventario } from '@/api/inventario';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { DetalleTecnico } from '@/componentes/DetalleTecnico';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { FilaLista } from '@/componentes/FilaLista';
import { OpcionesFoto } from '@/componentes/inmuebles/OpcionesFoto';
import { PortadaInmueble } from '@/componentes/inmuebles/PortadaInmueble';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useFotosInventario } from '@/consultas/inventario';
import { validarZona, ZONAS, type ZonaChip } from '@/contratos/zonas';
import { colores, espaciado, radios, tintaAlfa } from '@/tema';
import { formatearFechaCorta } from '@/utilidades/fechas';

type EstadoFoto = 'pendiente' | 'subiendo' | 'subida' | 'error' | 'incierta';

interface FotoLocal {
  clave: number;
  foto: ArchivoFoto;
  zona: string;
  estado: EstadoFoto;
  error?: { mensaje: string; detalle: string | null };
}

const TEXTO_ESTADO: Record<EstadoFoto, string> = {
  pendiente: 'pendiente',
  subiendo: 'subiendo',
  subida: 'subida',
  error: 'con error',
  incierta: 'incierta, puede haberse subido',
};
const MENSAJE_INCIERTA = 'Puede haberse subido; revisa la lista antes de reintentar.';

export default function InventarioContrato() {
  const router = useRouter();
  const { id, momento: parametro } = useLocalSearchParams<{ id: string; momento?: string }>();
  // DEVOLUCION lo usará E5; aquí queda funcionando pero sin enlace desde la interfaz.
  const momento: Momento = parametro === 'DEVOLUCION' ? 'DEVOLUCION' : 'ENTREGA';
  const lista = useFotosInventario(id, momento);

  const [chip, setChip] = useState<ZonaChip | null>(null);
  const [otra, setOtra] = useState('');
  const [errorZona, setErrorZona] = useState<string | null>(null);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [procesando, setProcesando] = useState(false);
  const siguienteClave = useRef(1);
  // Una foto en vuelo no se vuelve a enviar (no hay Idempotency-Key en el servidor).
  const enVuelo = useRef(new Set<number>());
  const procesandoCola = useRef(false);

  const actualizar = (clave: number, parcial: Partial<FotoLocal>) =>
    setFotos((actuales) => actuales.map((f) => (f.clave === clave ? { ...f, ...parcial } : f)));

  function zonaValida(): string | null {
    const resultado = validarZona(chip, otra);
    if (resultado.zona === undefined) {
      setErrorZona(resultado.error);
      return null;
    }
    setErrorZona(null);
    return resultado.zona;
  }

  function agregar(foto: ArchivoFoto) {
    const zona = zonaValida();
    if (zona === null) return;
    setFotos((actuales) => [
      ...actuales,
      { clave: siguienteClave.current++, foto, zona, estado: 'pendiente' },
    ]);
  }

  /** Sube UNA foto. Timeout o sin respuesta = "incierta": se recarga la lista y no se reintenta sola. */
  async function subirUna(item: FotoLocal) {
    if (enVuelo.current.has(item.clave)) return;
    enVuelo.current.add(item.clave);
    actualizar(item.clave, { estado: 'subiendo', error: undefined });
    try {
      await subirFotoInventario(id, item.foto, momento, item.zona);
      actualizar(item.clave, { estado: 'subida' });
    } catch (falla) {
      if (falla instanceof ErrorTimeout || falla instanceof ErrorSinConexion) {
        actualizar(item.clave, { estado: 'incierta' });
        await lista.refetch();
      } else {
        actualizar(item.clave, {
          estado: 'error',
          error: { mensaje: mensajeDeErrorFoto(falla), detalle: detalleTecnico(falla) },
        });
      }
    } finally {
      enVuelo.current.delete(item.clave);
    }
  }

  /** Terminada una tanda: se recarga la lista del servidor y las subidas salen de la cola local. */
  async function cerrarTanda() {
    await lista.refetch();
    setFotos((actuales) => actuales.filter((f) => f.estado !== 'subida'));
  }

  async function subirTodas() {
    if (procesandoCola.current) return;
    procesandoCola.current = true;
    setProcesando(true);
    try {
      const pendientes = fotos.filter((f) => f.estado === 'pendiente');
      for (const item of pendientes) await subirUna(item); // una por una, en orden
      await cerrarTanda();
    } finally {
      procesandoCola.current = false;
      setProcesando(false);
    }
  }

  async function reintentar(item: FotoLocal) {
    await subirUna(item);
    await cerrarTanda();
  }

  function terminar() {
    const salir = () => {
      if (router.canGoBack()) router.back();
      else router.replace('/inmuebles');
    };
    if (fotos.length === 0) {
      salir();
      return;
    }
    Alert.alert('Hay fotos sin subir', 'Las fotos que no subiste no se guardan.', [
      { text: 'Seguir aquí', style: 'cancel' },
      { text: 'Terminar', style: 'destructive', onPress: salir },
    ]);
  }

  const hayPendientes = fotos.some((f) => f.estado === 'pendiente');
  const subidas = lista.data ?? [];

  return (
    <PantallaPila>
      <Texto variante="titulo" accessibilityRole="header">
        {momento === 'ENTREGA' ? 'Inventario de entrega' : 'Inventario de devolución'}
      </Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>
        Las fotos son opcionales. Elige la zona y agrega las fotos que quieras.
      </Texto>

      <View style={estilos.grupo}>
        <Texto variante="etiqueta" color={colores.textoFuerte}>
          Zona
        </Texto>
        <View accessibilityRole="radiogroup" style={estilos.chips}>
          {ZONAS.map((zona) => {
            const activo = zona === chip;
            return (
              <Pressable
                key={zona}
                accessibilityRole="radio"
                accessibilityLabel={zona}
                accessibilityState={{ selected: activo }}
                onPress={() => {
                  setChip(zona);
                  setErrorZona(null);
                }}
                style={[estilos.chip, activo && estilos.chipActivo]}
              >
                <Texto variante="etiqueta" color={activo ? colores.sobreTinta : colores.texto}>
                  {zona}
                </Texto>
              </Pressable>
            );
          })}
        </View>
        {chip === 'Otra' ? (
          <CampoTexto
            etiqueta="Nombre de la zona"
            valor={otra}
            onCambio={setOtra}
            keyboardType="default"
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        ) : null}
        {errorZona ? <Aviso mensaje={errorZona} /> : null}
        <OpcionesFoto onElegida={agregar} antesDeElegir={() => zonaValida() !== null} />
      </View>

      {fotos.length > 0 ? (
        <View style={estilos.grupo}>
          <Texto variante="tituloSeccion" accessibilityRole="header">
            Por subir
          </Texto>
          {fotos.map((item) => (
            <Superficie key={item.clave} style={estilos.item}>
              <View
                accessible
                accessibilityLabel={`${item.zona}, ${TEXTO_ESTADO[item.estado]}`}
                accessibilityLiveRegion="polite"
                style={estilos.filaItem}
              >
                <PortadaInmueble url={item.foto.uri} variante="miniatura" />
                <View style={estilos.textos}>
                  <Texto variante="filaTitulo">{item.zona}</Texto>
                  <Texto variante="secundario" color={colores.textoSecundario}>
                    {item.estado === 'pendiente'
                      ? 'Pendiente'
                      : item.estado === 'subiendo'
                        ? 'Subiendo…'
                        : item.estado === 'subida'
                          ? 'Subida'
                          : item.estado === 'error'
                            ? 'No se subió'
                            : 'Incierta'}
                  </Texto>
                </View>
              </View>
              {item.estado === 'error' && item.error ? (
                <>
                  <Aviso mensaje={item.error.mensaje} />
                  <DetalleTecnico detalle={item.error.detalle} />
                </>
              ) : null}
              {item.estado === 'incierta' ? (
                <Aviso tono="advertencia" mensaje={MENSAJE_INCIERTA} />
              ) : null}
              <View style={estilos.accionesItem}>
                {item.estado === 'error' || item.estado === 'incierta' ? (
                  <Boton
                    titulo="Reintentar"
                    variante="secundario"
                    onPress={() => void reintentar(item)}
                  />
                ) : null}
                {item.estado !== 'subiendo' && item.estado !== 'subida' ? (
                  <Boton
                    titulo="Quitar"
                    variante="secundario"
                    onPress={() => setFotos((a) => a.filter((f) => f.clave !== item.clave))}
                  />
                ) : null}
              </View>
            </Superficie>
          ))}
          {hayPendientes || procesando ? (
            <Boton
              titulo="Subir fotos"
              tituloCargando="Subiendo…"
              cargando={procesando}
              ancho="completo"
              onPress={() => void subirTodas()}
            />
          ) : null}
        </View>
      ) : null}

      <View style={estilos.grupo}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          Fotos subidas
        </Texto>
        {lista.isPending ? <EsqueletoCarga filas={2} /> : null}
        {lista.isError && lista.data === undefined ? (
          <>
            <Aviso mensaje={mensajeDeError(lista.error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void lista.refetch()}
            />
          </>
        ) : null}
        {lista.data !== undefined && subidas.length === 0 ? (
          <Texto variante="cuerpo" color={colores.textoSecundario}>
            Aún no hay fotos.
          </Texto>
        ) : null}
        {subidas.length > 0 ? (
          <Superficie relleno="ninguno">
            {subidas.map((foto, indice) => (
              <FilaLista
                key={foto.id}
                miniatura={
                  <PortadaInmueble
                    url={foto.foto_url}
                    variante="miniatura"
                    inmuebleId={`inventario:${foto.id}`}
                    descripcion={`Foto de inventario: ${foto.zona}`}
                    alFallarUrl={() => void lista.refetch({ cancelRefetch: false })}
                    ampliable
                  />
                }
                titulo={foto.zona}
                subtitulo={formatearFechaCorta(foto.creado_en)}
                separador={indice > 0}
              />
            ))}
          </Superficie>
        ) : null}
      </View>

      <Boton titulo="Terminar" variante="secundario" ancho="completo" onPress={terminar} />
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  chip: {
    minHeight: 48,
    paddingHorizontal: espaciado.md,
    borderRadius: radios.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tintaAlfa(0.06),
  },
  chipActivo: { backgroundColor: colores.tinta },
  item: { gap: espaciado.xs },
  filaItem: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textos: { flex: 1, gap: 2 },
  accionesItem: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
});
