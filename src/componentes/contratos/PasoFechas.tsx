import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BorradorContrato } from '../../contratos/esquemas';
import { colores, espaciado, radios, tintaAlfa } from '../../tema';
import { compararFechas, formatearFechaLarga } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { Texto } from '../Texto';

type Errores = Partial<Record<keyof BorradorContrato, string>>;

interface Props {
  valores: BorradorContrato;
  errores: Errores;
  hoy: string;
  cambiar: (parcial: Partial<BorradorContrato>) => void;
}

const DURACIONES = [6, 12, 24, 36];

/** El valor de negocio es siempre "AAAA-MM-DD": se toman el año, mes y día que eligió la persona. */
export function textoDeFechaElegida(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Date local solo para abrir el selector (a mediodía, para que ninguna zona horaria cambie el día). */
function fechaParaSelector(texto: string, respaldo: string): Date {
  const [anio, mes, dia] = (/^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : respaldo)
    .split('-')
    .map(Number);
  return new Date(anio, mes - 1, dia, 12, 0, 0);
}

export function SelectorFecha({
  etiqueta,
  valor,
  hoy,
  error,
  onCambio,
}: {
  etiqueta: string;
  valor: string;
  hoy: string;
  error?: string;
  onCambio: (fecha: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const alElegir = (evento: DateTimePickerEvent, fecha?: Date) => {
    setAbierto(false);
    if (evento.type === 'set' && fecha) onCambio(textoDeFechaElegida(fecha));
  };
  return (
    <View style={estilos.campo}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        onPress={() => setAbierto(true)}
        style={[estilos.caja, error ? estilos.conError : null]}
      >
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          {etiqueta}
        </Texto>
        <Texto variante="cuerpoFuerte">{valor ? formatearFechaLarga(valor) : 'Elegir fecha'}</Texto>
      </Pressable>
      {error ? (
        <Texto variante="secundario" color={colores.peligroTexto}>
          {error}
        </Texto>
      ) : null}
      {abierto ? (
        <DateTimePicker value={fechaParaSelector(valor, hoy)} mode="date" onChange={alElegir} />
      ) : null}
    </View>
  );
}

/** Paso 4: fecha de inicio y duración (6, 12, 24, 36 meses u otra fecha de fin). */
export function PasoFechas({ valores, errores, hoy, cambiar }: Props) {
  const futuro = valores.fechaInicio !== '' && compararFechas(valores.fechaInicio, hoy) > 0;
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        ¿Desde y hasta cuándo?
      </Texto>
      <SelectorFecha
        etiqueta="Fecha de inicio"
        valor={valores.fechaInicio}
        hoy={hoy}
        error={errores.fechaInicio}
        onCambio={(fechaInicio) => cambiar({ fechaInicio })}
      />
      {futuro ? (
        <Aviso
          tono="informacion"
          mensaje={`El contrato quedará Programado: empieza el ${formatearFechaLarga(valores.fechaInicio)}`}
        />
      ) : null}

      <Texto variante="etiqueta" color={colores.textoFuerte}>
        Duración
      </Texto>
      <View style={estilos.atajos}>
        {DURACIONES.map((meses) => (
          <Boton
            key={meses}
            titulo={`${meses} meses`}
            variante={valores.duracionMeses === meses ? 'primario' : 'secundario'}
            onPress={() => cambiar({ duracionMeses: meses })}
          />
        ))}
        <Boton
          titulo="Otra fecha"
          variante={valores.duracionMeses === null ? 'primario' : 'secundario'}
          onPress={() => cambiar({ duracionMeses: null })}
        />
      </View>
      <SelectorFecha
        etiqueta="Fecha de fin"
        valor={valores.fechaFin}
        hoy={hoy}
        error={errores.fechaFin}
        onCambio={(fechaFin) => cambiar({ fechaFin, duracionMeses: null })}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
  campo: { gap: espaciado.xxs },
  caja: {
    minHeight: 64,
    borderRadius: radios.medio,
    backgroundColor: tintaAlfa(0.05),
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs,
    justifyContent: 'center',
  },
  conError: { boxShadow: `0 0 0 2px ${colores.peligroTexto}` },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
});
