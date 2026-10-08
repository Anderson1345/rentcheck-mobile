import { StyleSheet, View } from 'react-native';

import type { Inmueble, UnidadInmueble } from '../../api/inmuebles';
import { type BorradorContrato, normalizarDocumento, PASO } from '../../contratos/esquemas';
import { ETIQUETA_PLANTILLA, esPlantillaVivienda } from '../../contratos/plantilla';
import { colores, espaciado, tintaAlfa } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { compararFechas, formatearFechaLarga } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { CampoTexto } from '../CampoTexto';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

interface PropsGarantias {
  valores: BorradorContrato;
  cambiar: (parcial: Partial<BorradorContrato>) => void;
}

/** Paso 5 (opcional): fiador, codeudor o póliza, y condiciones particulares. */
export function PasoGarantias({ valores, cambiar }: PropsGarantias) {
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Garantías y condiciones
      </Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>
        Este paso es opcional.
      </Texto>
      <CampoTexto
        etiqueta="Fiador, codeudor o póliza"
        valor={valores.datosFiador}
        onCambio={(datosFiador) => cambiar({ datosFiador })}
        keyboardType="default"
        autoCapitalize="sentences"
        returnKeyType="next"
      />
      <CampoTexto
        etiqueta="Condiciones particulares"
        valor={valores.condiciones}
        onCambio={(condiciones) => cambiar({ condiciones })}
        keyboardType="default"
        autoCapitalize="sentences"
        returnKeyType="done"
        ayuda="Si lo dejas vacío, el contrato usa un texto por defecto."
      />
    </View>
  );
}

interface PropsResumen {
  valores: BorradorContrato;
  inmueble: Inmueble | undefined;
  unidad: UnidadInmueble | undefined;
  /** Nombre del inquilino elegido de la lista (modo "Ya arrendó conmigo"). */
  nombreInquilinoExistente: string | null;
  hoy: string;
  onEditar: (paso: number) => void;
}

interface Fila {
  etiqueta: string;
  valor: string;
}

/**
 * Un grupo del resumen (R4-D): encabezado con "Editar" (vuelve a su paso, como antes) y sus datos en
 * filas de etiqueta y valor dentro de un contenedor.
 */
function Grupo({
  clave,
  titulo,
  paso,
  onEditar,
  filas,
}: {
  clave: string;
  titulo: string;
  paso: number;
  onEditar: (paso: number) => void;
  filas: Fila[];
}) {
  return (
    <View testID={`resumen-${clave}`} style={estilos.seccion}>
      <EncabezadoSeccion
        titulo={titulo}
        enlace={{
          etiqueta: 'Editar',
          etiquetaAccesible: `Editar ${titulo.toLowerCase()}`,
          onPress: () => onEditar(paso),
        }}
      />
      <Superficie relleno="ninguno">
        {filas.map((fila, indice) => (
          <View
            key={fila.etiqueta}
            testID="fila-resumen"
            style={[estilos.fila, indice > 0 && estilos.conSeparador]}
          >
            <Texto variante="secundario" color={colores.textoSecundario}>
              {fila.etiqueta}
            </Texto>
            <Texto variante="cuerpoFuerte">{fila.valor}</Texto>
          </View>
        ))}
      </Superficie>
    </View>
  );
}

/** Paso 6: todo en lectura, en grupos con "Editar", y el aviso obligatorio sobre las plantillas. */
export function PasoResumen({
  valores: v,
  inmueble,
  unidad,
  nombreInquilinoExistente,
  hoy,
  onEditar,
}: PropsResumen) {
  const vivienda = v.plantilla !== null && esPlantillaVivienda(v.plantilla);
  const programado = compararFechas(v.fechaInicio, hoy) > 0;
  const conTexto = (filas: Fila[]) => filas.filter((f) => f.valor !== '');
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Revisa y confirma
      </Texto>
      <Grupo
        clave="unidad"
        titulo="Unidad"
        paso={PASO.UNIDAD}
        onEditar={onEditar}
        filas={conTexto([
          { etiqueta: 'Unidad', valor: unidad?.nombre ?? '' },
          {
            etiqueta: 'Inmueble',
            valor: inmueble ? `${inmueble.direccion}, ${inmueble.ciudad}` : '',
          },
          { etiqueta: 'Plantilla', valor: v.plantilla ? ETIQUETA_PLANTILLA[v.plantilla] : '' },
        ])}
      />
      <Grupo
        clave="inquilino"
        titulo="Inquilino"
        paso={PASO.INQUILINO}
        onEditar={onEditar}
        filas={conTexto(
          v.modoInquilino === 'existente'
            ? [
                { etiqueta: 'Nombre', valor: nombreInquilinoExistente ?? '' },
                { etiqueta: 'Inquilino', valor: 'Ya arrendó contigo' },
              ]
            : [
                { etiqueta: 'Nombre', valor: v.nombre.trim() },
                { etiqueta: 'Documento', valor: normalizarDocumento(v.documento) },
                { etiqueta: 'Teléfono', valor: v.telefono.trim() },
              ],
        )}
      />
      <Grupo
        clave="pago"
        titulo="Pago"
        paso={PASO.PAGO}
        onEditar={onEditar}
        filas={conTexto([
          { etiqueta: 'Canon', valor: centavosAPesosTexto(v.canonCentavos ?? 0) },
          { etiqueta: 'Día de pago', valor: v.diaPago },
          { etiqueta: 'Forma de pago', valor: v.formaPago.trim() },
          { etiqueta: 'Recaudo', valor: v.datosRecaudo.trim() },
          ...(!vivienda && v.depositoCentavos
            ? [{ etiqueta: 'Depósito', valor: centavosAPesosTexto(v.depositoCentavos) }]
            : []),
        ])}
      />
      <Grupo
        clave="fechas"
        titulo="Fechas"
        paso={PASO.FECHAS}
        onEditar={onEditar}
        filas={[
          { etiqueta: 'Inicio', valor: formatearFechaLarga(v.fechaInicio) },
          { etiqueta: 'Fin', valor: formatearFechaLarga(v.fechaFin) },
          { etiqueta: 'Estado', valor: programado ? 'Quedará Programado' : 'Quedará Activo' },
        ]}
      />
      <Grupo
        clave="garantias"
        titulo="Garantías"
        paso={PASO.GARANTIAS}
        onEditar={onEditar}
        filas={
          v.datosFiador.trim() || v.condiciones.trim()
            ? conTexto([
                { etiqueta: 'Fiador, codeudor o póliza', valor: v.datosFiador.trim() },
                { etiqueta: 'Condiciones particulares', valor: v.condiciones.trim() },
              ])
            : [{ etiqueta: 'Garantías', valor: 'Sin garantías ni condiciones particulares.' }]
        }
      />
      <Aviso
        tono="informacion"
        mensaje="Las plantillas de RentCheck son modelos. Verifica que el contrato se ajuste a tu caso antes de firmarlo."
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.md },
  seccion: { gap: espaciado.xs },
  fila: { gap: 2, paddingHorizontal: espaciado.md, paddingVertical: espaciado.sm, minHeight: 56 },
  conSeparador: { borderTopWidth: 1, borderTopColor: tintaAlfa(0.07) },
});
