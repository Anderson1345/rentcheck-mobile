import { StyleSheet, View } from 'react-native';

import type { Inmueble, UnidadInmueble } from '../../api/inmuebles';
import { ETIQUETA_PLANTILLA, plantillaParaUnidad } from '../../contratos/plantilla';
import type { BorradorContrato } from '../../contratos/esquemas';
import { type OcupacionUnidad, textoOcupacion } from '../../contratos/ocupacion';
import { ETIQUETA_TIPO_UNIDAD, ETIQUETA_USO, textoUnidades } from '../../inmuebles/etiquetas';
import { colores, espaciado } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { FilaLista } from '../FilaLista';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

interface Props {
  valores: BorradorContrato;
  error?: string;
  inmuebles: Inmueble[];
  ocupacion: Record<string, OcupacionUnidad>;
  onElegirInmueble: (inmuebleId: string | null) => void;
  onElegirUnidad: (inmueble: Inmueble, unidad: UnidadInmueble) => void;
}

/** Paso 1: inmueble y unidad. Cada unidad dice qué plantilla le corresponde y si está arrendada. */
export function PasoUnidad({
  valores,
  error,
  inmuebles,
  ocupacion,
  onElegirInmueble,
  onElegirUnidad,
}: Props) {
  const inmueble = inmuebles.find((i) => i.id === valores.inmuebleId);

  if (inmuebles.length === 0) {
    return (
      <Aviso
        tono="informacion"
        mensaje="Primero agrega un inmueble con una unidad para poder crear un contrato."
      />
    );
  }

  if (!inmueble) {
    return (
      <View style={estilos.grupo}>
        <Texto variante="tituloSeccion" accessibilityRole="header">
          ¿Qué inmueble vas a arrendar?
        </Texto>
        <Superficie relleno="ninguno">
          {inmuebles.map((i, indice) => (
            <FilaLista
              key={i.id}
              icono="inmuebles"
              titulo={i.direccion}
              subtitulo={`${i.ciudad} · ${textoUnidades(i.unidades.length)}`}
              conChevron
              separador={indice > 0}
              onPress={() => onElegirInmueble(i.id)}
            />
          ))}
        </Superficie>
        {error ? <Aviso mensaje={error} /> : null}
      </View>
    );
  }

  const elegida = inmueble.unidades.find((u) => u.id === valores.unidadId);
  const sugerida = elegida ? ocupacion[elegida.id]?.fechaInicioSugerida : null;
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        ¿Qué unidad vas a arrendar?
      </Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>
        {`${inmueble.direccion}, ${inmueble.ciudad}`}
      </Texto>
      {inmueble.unidades.length === 0 ? (
        <Aviso tono="informacion" mensaje="Este inmueble no tiene unidades. Agrega una primero." />
      ) : (
        <Superficie relleno="ninguno">
          {inmueble.unidades.map((u, indice) => {
            const info = ocupacion[u.id];
            return (
              <FilaLista
                key={u.id}
                icono="inmuebles"
                titulo={u.nombre}
                separador={indice > 0}
                valor={u.id === valores.unidadId ? 'Elegida' : undefined}
                onPress={() => onElegirUnidad(inmueble, u)}
                detalle={
                  <View style={estilos.detalle}>
                    <Texto variante="secundario" color={colores.textoSecundario}>
                      {`${ETIQUETA_TIPO_UNIDAD[u.tipo]} · ${ETIQUETA_USO[u.uso_permitido]}`}
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
            );
          })}
        </Superficie>
      )}
      {sugerida ? (
        <Aviso
          tono="advertencia"
          mensaje={`Esta unidad ya tiene un contrato. La fecha de inicio sugerida es el ${formatearFechaCorta(sugerida)}.`}
        />
      ) : null}
      {error ? <Aviso mensaje={error} /> : null}
      <Boton
        titulo="Cambiar inmueble"
        variante="secundario"
        ancho="completo"
        onPress={() => onElegirInmueble(null)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
  detalle: { gap: 2, flexShrink: 1 },
});
