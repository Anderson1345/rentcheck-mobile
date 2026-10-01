import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { codigoExpirado } from '../../contratos/lectura';
import { colores, espaciado, radios } from '../../tema';
import { formatearFechaLarga } from '../../utilidades/fechas';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';

interface Props {
  acceso: { codigo: string; expira_en: string };
  nombreInquilino: string;
  /** Si se pasa, aparece "Regenerar código" (la confirmación la pide quien lo recibe). */
  onRegenerar?: () => void;
  regenerando?: boolean;
  /** Elementos extra bajo los botones (p. ej. inventario). */
  children?: React.ReactNode;
}

/**
 * Código de acceso del inquilino: texto, vencimiento, QR (solo el texto RC-XXXX-XXXX, sin enlace),
 * copiar y compartir. El código no va a logs ni a mensajes de error. Si expiró, lo dice y no muestra
 * QR ni acciones de compartir: solo ofrece regenerarlo.
 */
export function CodigoAcceso({
  acceso,
  nombreInquilino,
  onRegenerar,
  regenerando,
  children,
}: Props) {
  const [copia, setCopia] = useState<'copiado' | 'error' | null>(null);
  const expirado = codigoExpirado(acceso.expira_en);

  function compartir() {
    const mensaje = `Hola ${nombreInquilino}, te invito a RentCheck para tu contrato de arriendo. Descarga la app y actívalo con el código ${acceso.codigo}. Vence el ${formatearFechaLarga(acceso.expira_en)}.`;
    void Share.share({ message: mensaje });
  }

  // Se copia SOLO el texto del código. Si falla, el aviso no repite el código.
  async function copiar() {
    try {
      await Clipboard.setStringAsync(acceso.codigo);
      setCopia('copiado');
    } catch {
      setCopia('error');
    }
  }

  return (
    <>
      <Superficie style={estilos.tarjeta}>
        <Texto variante="etiqueta" color={colores.textoSecundario}>
          Código de acceso del inquilino
        </Texto>
        {expirado ? (
          <>
            <Aviso tono="advertencia" mensaje="Este código expiró." />
            <Texto variante="cuerpo">{`Venció el ${formatearFechaLarga(acceso.expira_en)}`}</Texto>
          </>
        ) : (
          <>
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
          </>
        )}
      </Superficie>
      <View style={estilos.botones}>
        {expirado ? null : (
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
        )}
        {onRegenerar ? (
          <Boton
            titulo="Regenerar código"
            tituloCargando="Regenerando…"
            cargando={regenerando}
            variante="secundario"
            ancho="completo"
            onPress={onRegenerar}
          />
        ) : null}
        {children}
      </View>
    </>
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
