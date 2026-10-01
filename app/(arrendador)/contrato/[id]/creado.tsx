import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { BackHandler, Share, StyleSheet, View } from 'react-native';

import { mensajeDeError } from '@/api/errores';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { ChipEstado } from '@/componentes/ChipEstado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Superficie } from '@/componentes/Superficie';
import { Texto } from '@/componentes/Texto';
import { useContrato } from '@/consultas/contratos';
import { colores, espaciado, radios } from '@/tema';
import { formatearFechaLarga } from '@/utilidades/fechas';

export default function ContratoCreado() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: contrato, isPending, error, refetch } = useContrato(id);

  const irAInmuebles = () => router.replace('/inmuebles');
  const [copia, setCopia] = useState<'copiado' | 'error' | null>(null);

  // El asistente ya no existe en la pila; Atrás (físico) lleva a Inmuebles, no a un paso viejo.
  useEffect(() => {
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/inmuebles');
      return true;
    });
    return () => suscripcion.remove();
  }, [router]);

  if (contrato === undefined) {
    return (
      <PantallaPila>
        {isPending ? (
          <EsqueletoCarga filas={3} />
        ) : (
          <>
            <Aviso mensaje={mensajeDeError(error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void refetch()}
            />
          </>
        )}
      </PantallaPila>
    );
  }

  const acceso = contrato.codigo_acceso;
  const programado = contrato.estado === 'PROGRAMADO';

  function compartir() {
    if (!acceso || !contrato) return;
    const mensaje = `Hola ${contrato.inquilino.nombre}, te invito a RentCheck para tu contrato de arriendo. Descarga la app y actívalo con el código ${acceso.codigo}. Vence el ${formatearFechaLarga(acceso.expira_en)}.`;
    void Share.share({ message: mensaje });
  }

  // Se copia SOLO el texto del código. Si falla, el aviso no repite el código.
  async function copiar() {
    if (!acceso) return;
    try {
      await Clipboard.setStringAsync(acceso.codigo);
      setCopia('copiado');
    } catch {
      setCopia('error');
    }
  }

  return (
    <PantallaPila>
      <Texto variante="titulo" accessibilityRole="header">
        Contrato creado
      </Texto>
      <Superficie style={estilos.tarjeta}>
        {contrato.estado === 'ACTIVO' || programado ? (
          <ChipEstado tipo="contrato" estado={contrato.estado} />
        ) : null}
        <Texto variante="cuerpoFuerte">{contrato.unidad.nombre}</Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {contrato.inquilino.nombre}
        </Texto>
        {programado ? (
          <Texto variante="cuerpo">{`Empieza el ${formatearFechaLarga(contrato.fecha_inicio)}`}</Texto>
        ) : null}
      </Superficie>

      {acceso ? (
        <Superficie style={estilos.tarjeta}>
          <Texto variante="etiqueta" color={colores.textoSecundario}>
            Código de acceso del inquilino
          </Texto>
          <Texto variante="cifraMedia" cifras selectable={false}>
            {acceso.codigo}
          </Texto>
          <Texto variante="cuerpo">{`Vence el ${formatearFechaLarga(acceso.expira_en)}`}</Texto>
          {/* El QR lleva solo el texto del código (RC-XXXX-XXXX), sin enlace. */}
          <View accessible accessibilityLabel="Código QR del código de acceso" style={estilos.qr}>
            <QRCode value={acceso.codigo} size={176} />
          </View>
          {copia === 'copiado' ? <Aviso tono="exito" mensaje="Copiado" /> : null}
          {copia === 'error' ? <Aviso mensaje="No pudimos copiar el código." /> : null}
        </Superficie>
      ) : null}

      <View style={estilos.botones}>
        {acceso ? (
          <>
            <Boton
              titulo="Copiar código"
              variante="secundario"
              ancho="completo"
              onPress={() => void copiar()}
            />
            <Boton
              titulo="Compartir código"
              icono="compartir"
              ancho="completo"
              onPress={compartir}
            />
          </>
        ) : null}
        <Boton
          titulo="Registrar inventario de entrega"
          variante="secundario"
          ancho="completo"
          onPress={() =>
            router.push({ pathname: '/contrato/[id]/inventario', params: { id: contrato.id } })
          }
        />
        <Boton titulo="Listo" variante="secundario" ancho="completo" onPress={irAInmuebles} />
      </View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: espaciado.xs },
  botones: { gap: espaciado.xs, marginTop: espaciado.sm },
  qr: {
    alignSelf: 'center',
    padding: espaciado.sm,
    borderRadius: radios.medio,
    backgroundColor: '#FFFFFF',
  },
});
