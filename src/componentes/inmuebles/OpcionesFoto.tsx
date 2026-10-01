import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import type { ArchivoFoto } from '../../api/inmuebles';
import { espaciado } from '../../tema';
import { elegirFoto, mensajeDeResultadoFoto, type OrigenFoto } from '../../utilidades/foto';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';

interface Props {
  /** Recibe la foto ya validada (JPG o PNG, hasta 10 MB). */
  onElegida: (archivo: ArchivoFoto) => void;
  deshabilitado?: boolean;
  /** Se llama antes de abrir la cámara o la galería; si devuelve false, no se abre (p. ej. falta la zona). */
  antesDeElegir?: () => boolean;
}

/**
 * "Tomar foto" y "Elegir de la galería". Si falta el permiso de la cámara explica cómo activarlo
 * (y, si se negó para siempre, ofrece abrir los ajustes); el resto de la pantalla sigue funcionando.
 */
export function OpcionesFoto({ onElegida, deshabilitado = false, antesDeElegir }: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const [abierto, setAbierto] = useState(false);
  // El selector del sistema tarda en abrir: un segundo toque no debe lanzar otro.
  const enCurso = useRef(false);

  async function elegir(origen: OrigenFoto) {
    if (enCurso.current || deshabilitado) return;
    if (antesDeElegir && !antesDeElegir()) return;
    enCurso.current = true;
    setAbierto(true);
    setMensaje(null);
    setVerAjustes(false);
    try {
      const resultado = await elegirFoto(origen);
      if (resultado.tipo === 'elegida') {
        onElegida(resultado.archivo);
      } else {
        setMensaje(mensajeDeResultadoFoto(resultado));
        setVerAjustes(resultado.tipo === 'denegado' && resultado.definitivo);
      }
    } finally {
      enCurso.current = false;
      setAbierto(false);
    }
  }

  const bloqueado = deshabilitado || abierto;
  return (
    <View style={estilos.contenedor}>
      <Boton
        titulo="Tomar foto"
        icono="camara"
        variante="secundario"
        ancho="completo"
        deshabilitado={bloqueado}
        onPress={() => void elegir('camara')}
      />
      <Boton
        titulo="Elegir de la galería"
        variante="secundario"
        ancho="completo"
        deshabilitado={bloqueado}
        onPress={() => void elegir('galeria')}
      />
      {mensaje ? <Aviso mensaje={mensaje} tono="advertencia" /> : null}
      {verAjustes ? (
        <Boton
          titulo="Abrir ajustes"
          variante="secundario"
          ancho="completo"
          onPress={() => void Linking.openSettings().catch(() => undefined)}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
});
