import { StyleSheet, View } from 'react-native';

import type { Inmueble, UnidadInmueble } from '../../api/inmuebles';
import { type BorradorContrato, normalizarDocumento, PASO } from '../../contratos/esquemas';
import { ETIQUETA_PLANTILLA, esPlantillaVivienda } from '../../contratos/plantilla';
import { colores, espaciado } from '../../tema';
import { centavosAPesosTexto } from '../../utilidades/dinero';
import { compararFechas, formatearFechaLarga } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { CampoTexto } from '../CampoTexto';
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

function Bloque({
  titulo,
  paso,
  onEditar,
  lineas,
}: {
  titulo: string;
  paso: number;
  onEditar: (paso: number) => void;
  lineas: string[];
}) {
  return (
    <Superficie style={estilos.bloque}>
      <View style={estilos.cabecera}>
        <Texto variante="tituloSeccion" accessibilityRole="header" style={estilos.titulo}>
          {titulo}
        </Texto>
        <Boton titulo="Editar" variante="secundario" onPress={() => onEditar(paso)} />
      </View>
      {lineas.map((linea) => (
        <Texto key={linea} variante="cuerpo">
          {linea}
        </Texto>
      ))}
    </Superficie>
  );
}

/** Paso 6: todo en lectura, con "Editar" por bloque y el aviso obligatorio sobre las plantillas. */
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
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        Revisa y confirma
      </Texto>
      <Bloque
        titulo="Unidad"
        paso={PASO.UNIDAD}
        onEditar={onEditar}
        lineas={[
          unidad?.nombre ?? '',
          inmueble ? `${inmueble.direccion}, ${inmueble.ciudad}` : '',
          `Plantilla: ${v.plantilla ? ETIQUETA_PLANTILLA[v.plantilla] : ''}`,
        ].filter(Boolean)}
      />
      <Bloque
        titulo="Inquilino"
        paso={PASO.INQUILINO}
        onEditar={onEditar}
        lineas={
          v.modoInquilino === 'existente'
            ? [nombreInquilinoExistente ?? '', 'Ya arrendó contigo'].filter(Boolean)
            : [v.nombre.trim(), `Documento ${normalizarDocumento(v.documento)}`, v.telefono.trim()]
        }
      />
      <Bloque
        titulo="Pago"
        paso={PASO.PAGO}
        onEditar={onEditar}
        lineas={[
          `Canon: ${centavosAPesosTexto(v.canonCentavos ?? 0)}`,
          `Día de pago: ${v.diaPago}`,
          `Forma de pago: ${v.formaPago.trim()}`,
          `Recaudo: ${v.datosRecaudo.trim()}`,
          ...(!vivienda && v.depositoCentavos
            ? [`Depósito: ${centavosAPesosTexto(v.depositoCentavos)}`]
            : []),
        ]}
      />
      <Bloque
        titulo="Fechas"
        paso={PASO.FECHAS}
        onEditar={onEditar}
        lineas={[
          `Inicio: ${formatearFechaLarga(v.fechaInicio)}`,
          `Fin: ${formatearFechaLarga(v.fechaFin)}`,
          programado ? 'Quedará Programado' : 'Quedará Activo',
        ]}
      />
      <Bloque
        titulo="Garantías"
        paso={PASO.GARANTIAS}
        onEditar={onEditar}
        lineas={
          v.datosFiador.trim() || v.condiciones.trim()
            ? [v.datosFiador.trim(), v.condiciones.trim()].filter(Boolean)
            : ['Sin garantías ni condiciones particulares.']
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
  grupo: { gap: espaciado.sm },
  bloque: { gap: espaciado.xxs },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { flex: 1 },
});
