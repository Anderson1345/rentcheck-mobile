import { StyleSheet, View } from 'react-native';

import type { Inmueble, UnidadInmueble } from '../../api/inmuebles';
import { claveFotoUnidad } from '../../consultas/inmuebles';
import { ETIQUETA_PLANTILLA, plantillaParaUnidad } from '../../contratos/plantilla';
import type { BorradorContrato } from '../../contratos/esquemas';
import { type OcupacionUnidad, textoOcupacion } from '../../contratos/ocupacion';
import { ETIQUETA_TIPO_UNIDAD, ETIQUETA_USO } from '../../inmuebles/etiquetas';
import { colores, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { EstadoMensaje } from '../EstadoMensaje';
import { FilaLista } from '../FilaLista';
import { PortadaInmueble } from '../inmuebles/PortadaInmueble';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

interface Props {
  valores: BorradorContrato;
  error?: string;
  inmuebles: Inmueble[];
  ocupacion: Record<string, OcupacionUnidad>;
  onElegirUnidad: (inmueble: Inmueble, unidad: UnidadInmueble) => void;
  /** Sin unidades: lleva a Inmuebles para crear una. */
  onIrAInmuebles: () => void;
}

/**
 * Paso 1 (rediseño R4-D): las unidades de todos los inmuebles en filas, agrupadas por inmueble (el del
 * parámetro de entrada primero). Cada fila trae la foto de la unidad (o su icono), tipo y uso, la
 * plantilla que le corresponde, si está arrendada y el canon base como sugerencia; la elegida va
 * marcada. Una unidad arrendada se puede elegir: el inicio sugerido es el día siguiente a su contrato.
 */
export function PasoUnidad({
  valores,
  error,
  inmuebles,
  ocupacion,
  onElegirUnidad,
  onIrAInmuebles,
}: Props) {
  const conUnidades = inmuebles.filter((i) => i.unidades.length > 0);
  if (conUnidades.length === 0) {
    return (
      <EstadoMensaje
        titulo="Aún no tienes unidades para arrendar"
        mensaje="Primero agrega un inmueble con una unidad; después vuelve aquí para crear el contrato."
      >
        <Boton
          titulo="Ir a Inmuebles"
          variante="acento"
          ancho="completo"
          onPress={onIrAInmuebles}
        />
      </EstadoMensaje>
    );
  }

  // El inmueble con el que se entró (desde su detalle) va primero; los demás, en el orden de siempre.
  const ordenados = [
    ...conUnidades.filter((i) => i.id === valores.inmuebleId),
    ...conUnidades.filter((i) => i.id !== valores.inmuebleId),
  ];
  const elegida = inmuebles.flatMap((i) => i.unidades).find((u) => u.id === valores.unidadId);
  const sugerida = elegida ? ocupacion[elegida.id]?.fechaInicioSugerida : null;

  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        ¿Qué unidad vas a arrendar?
      </Texto>
      {ordenados.map((inmueble) => (
        <View key={inmueble.id} style={estilos.seccion}>
          <EncabezadoSeccion titulo={inmueble.direccion} />
          <Superficie relleno="ninguno">
            {inmueble.unidades.map((u, indice) => {
              const info = ocupacion[u.id];
              const esElegida = u.id === valores.unidadId;
              const canon =
                u.canon_base_centavos > 0 ? centavosAPesosTexto(u.canon_base_centavos) : null;
              return (
                <View key={u.id} testID="unidad-asistente">
                  <FilaLista
                    miniatura={
                      <PortadaInmueble
                        url={u.foto_principal_url}
                        variante="miniatura"
                        inmuebleId={claveFotoUnidad(u.id)}
                      />
                    }
                    titulo={u.nombre}
                    separador={indice > 0}
                    valor={canon ?? (esElegida ? 'Elegida' : undefined)}
                    valorSecundario={canon && esElegida ? 'Elegida' : undefined}
                    tonoValorSecundario="exito"
                    onPress={() => onElegirUnidad(inmueble, u)}
                    detalle={
                      <View style={estilos.detalle}>
                        <Texto variante="secundario" color={colores.textoSecundario}>
                          {`${inmueble.ciudad} · ${ETIQUETA_TIPO_UNIDAD[u.tipo]} · ${ETIQUETA_USO[u.uso_permitido]}`}
                        </Texto>
                        <Texto variante="secundario" color={colores.textoSecundario}>
                          {`Plantilla: ${ETIQUETA_PLANTILLA[plantillaParaUnidad(u.tipo, u.uso_permitido)]}`}
                        </Texto>
                        {info ? (
                          <Texto variante="etiqueta" color={colores.textoFuerte}>
                            {textoOcupacion(info)}
                          </Texto>
                        ) : null}
                      </View>
                    }
                  />
                </View>
              );
            })}
          </Superficie>
        </View>
      ))}
      {sugerida ? (
        <Aviso
          tono="advertencia"
          mensaje={`Esta unidad ya tiene un contrato. La fecha de inicio sugerida es el ${formatearFechaCorta(sugerida)}.`}
        />
      ) : null}
      {error ? <Aviso mensaje={error} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.md },
  seccion: { gap: espaciado.xs },
  detalle: { gap: 2, flexShrink: 1 },
});
