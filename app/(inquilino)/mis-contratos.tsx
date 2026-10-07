import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ContratoInquilinoResumen } from '@/api/inquilino';
import { Boton } from '@/componentes/Boton';
import { ChipEstado } from '@/componentes/ChipEstado';
import { EncabezadoSeccion } from '@/componentes/EncabezadoSeccion';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { ESTADOS_PAGO_CONTRATO } from '@/componentes/estados';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { Icono } from '@/componentes/iconos/Icono';
import { ErrorConReintento } from '@/componentes/inquilino/PortalInquilino';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContratoSeleccionado } from '@/inquilino/ContratoSeleccionado';
import { colores, coloresEstado, espaciado, tintaAlfa } from '@/tema';
import { formatearFechaCorta } from '@/utilidades/fechas';

const ESTADO_PAGO = { al_dia: 'AL_DIA', en_mora: 'EN_MORA', pendiente: 'PENDIENTE' } as const;
/** Los que ya terminaron van aparte (el servidor no manda los CANCELADO). */
const CERRADOS: readonly ContratoInquilinoResumen['estado'][] = [
  'VENCIDO',
  'TERMINADO_ANTICIPADAMENTE',
];

// Selector de contrato (rediseño R4-B, filas como la lista de contratos de R2-B): elegir uno lo deja
// seleccionado para el panel y el detalle. Vigentes arriba y cerrados aparte, en el orden del servidor.
// "Agregar contrato con código" es el único botón principal, en la barra fija.
export default function MisContratos() {
  const router = useRouter();
  const { lista, contratoId, seleccionar } = useContratoSeleccionado();

  const agregar = () => router.push('/agregar-contrato');

  function elegir(id: string) {
    seleccionar(id);
    if (router.canGoBack()) router.back();
    else router.replace('/mi-panel');
  }

  if (lista.data === undefined) {
    return (
      <PantallaPila>
        {lista.isPending ? (
          <>
            <Texto variante="cuerpo" color={colores.textoSecundario}>
              Cargando tus contratos…
            </Texto>
            <EsqueletoCarga filas={3} />
          </>
        ) : (
          <ErrorConReintento error={lista.error} onReintentar={() => void lista.refetch()} />
        )}
      </PantallaPila>
    );
  }

  if (lista.data.length === 0) {
    return (
      <PantallaPila>
        <EstadoMensaje
          titulo="Aún no tienes contratos"
          mensaje="Agrega tu contrato con el código que te dio tu arrendador."
        >
          <Boton
            titulo="Agregar contrato con código"
            variante="acento"
            ancho="completo"
            onPress={agregar}
          />
        </EstadoMensaje>
      </PantallaPila>
    );
  }

  const vigentes = lista.data.filter((c) => !CERRADOS.includes(c.estado));
  const cerrados = lista.data.filter((c) => CERRADOS.includes(c.estado));
  const grupo = (titulo: string, testID: string, contratos: ContratoInquilinoResumen[]) =>
    contratos.length === 0 ? null : (
      <View testID={testID} style={estilos.grupo}>
        <EncabezadoSeccion titulo={titulo} />
        <Superficie relleno="ninguno">
          {contratos.map((c, indice) => (
            <FilaContrato
              key={c.id}
              contrato={c}
              seleccionado={c.id === contratoId}
              separador={indice > 0}
              onPress={() => elegir(c.id)}
            />
          ))}
        </Superficie>
      </View>
    );

  return (
    <PantallaPila
      accionFija={
        <Boton
          titulo="Agregar contrato con código"
          icono="anadir"
          variante="acento"
          ancho="completo"
          onPress={agregar}
        />
      }
    >
      {grupo('Vigentes', 'contratos-vigentes', vigentes)}
      {grupo('Cerrados', 'contratos-cerrados', cerrados)}
    </PantallaPila>
  );
}

/**
 * Un contrato: icono (en tinta si es el elegido), "dirección · unidad", ciudad y fechas, y a la derecha
 * su estado y, con el contrato ACTIVO, el estado de pago del servidor. El elegido dice "Seleccionado".
 */
function FilaContrato({
  contrato: c,
  seleccionado,
  separador,
  onPress,
}: {
  contrato: ContratoInquilinoResumen;
  seleccionado: boolean;
  separador: boolean;
  onPress: () => void;
}) {
  const titulo = `${c.inmueble.direccion} · ${c.unidad.nombre}`;
  const pago = c.estado_pago ? ESTADOS_PAGO_CONTRATO[ESTADO_PAGO[c.estado_pago]] : null;
  return (
    <View>
      {separador ? <View style={estilos.separador} /> : null}
      <Pressable
        testID="fila-mi-contrato"
        accessibilityRole="button"
        accessibilityState={{ selected: seleccionado }}
        onPress={onPress}
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
      >
        <View style={[estilos.icono, seleccionado && estilos.iconoSeleccionado]}>
          <Icono
            nombre="contratos"
            tamano={22}
            grosor={1.7}
            color={seleccionado ? colores.lima : colores.tinta}
          />
        </View>
        <View style={estilos.textos}>
          <Texto variante="filaTitulo" numberOfLines={2}>
            {titulo}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
            {`${c.inmueble.ciudad} · ${formatearFechaCorta(c.fecha_inicio)} – ${formatearFechaCorta(c.fecha_fin)}`}
          </Texto>
          {seleccionado ? (
            <Texto variante="etiqueta" color={colores.tintaCapa}>
              Seleccionado
            </Texto>
          ) : null}
        </View>
        <View style={estilos.derecha}>
          <ChipEstado tipo="contrato" estado={c.estado} />
          {pago ? (
            <Texto variante="secundario" color={coloresEstado[pago.tono].texto}>
              {pago.etiqueta}
            </Texto>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  fila: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
  },
  presionada: { backgroundColor: tintaAlfa(0.03) },
  icono: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: tintaAlfa(0.06),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoSeleccionado: { backgroundColor: colores.tinta },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  derecha: { alignItems: 'flex-end', gap: 4 },
  separador: { height: 1, marginLeft: 70, backgroundColor: tintaAlfa(0.07) },
});
