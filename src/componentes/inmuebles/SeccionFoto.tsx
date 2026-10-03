import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ArchivoFoto } from '../../api/inmuebles';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import type { NombreIcono } from '../iconos/Icono';
import { DetalleTecnico } from '../DetalleTecnico';
import { Superficie } from '../Superficie';
import { Texto } from '../Texto';
import { OpcionesFoto } from './OpcionesFoto';
import { PortadaInmueble } from './PortadaInmueble';
import type { useSubidaFoto } from './useSubidaFoto';

interface Props {
  titulo: string;
  /** URL firmada actual o null. */
  url: string | null;
  /** Clave de caché estable de la imagen; sin ella (documentos sensibles) no hay clave. */
  claveCache?: string;
  cachePolicy?: 'memory' | 'memory-disk';
  icono?: NombreIcono;
  descripcion: string;
  subida: ReturnType<typeof useSubidaFoto>;
  /** Se llama con cada foto elegida (el padre decide cómo subirla). */
  onElegida: (foto: ArchivoFoto) => void;
  alFallarUrl?: () => void;
  nota?: string;
}

/**
 * Foto con vista previa y "Cambiar foto": portada de la unidad y foto de la cédula. Mientras sube se
 * ve la foto local; si falla, mensaje en español, "Detalle técnico" y Reintentar.
 */
export function SeccionFoto({
  titulo,
  url,
  claveCache,
  cachePolicy,
  icono,
  descripcion,
  subida,
  onElegida,
  alFallarUrl,
  nota,
}: Props) {
  const [verOpciones, setVerOpciones] = useState(false);
  return (
    <View style={estilos.grupo}>
      <Texto variante="tituloSeccion" accessibilityRole="header">
        {titulo}
      </Texto>
      <PortadaInmueble
        url={subida.pendiente?.uri ?? url}
        variante="grande"
        inmuebleId={claveCache}
        cachePolicy={cachePolicy}
        icono={icono}
        descripcion={descripcion}
        alFallarUrl={alFallarUrl}
        ampliable
      />
      {nota ? (
        <Texto variante="secundario" color={colores.textoSecundario}>
          {nota}
        </Texto>
      ) : null}
      {subida.subiendo ? (
        <Texto variante="secundario" color={colores.textoSecundario}>
          Subiendo foto…
        </Texto>
      ) : null}
      {subida.error && subida.pendiente ? (
        <View style={estilos.grupo}>
          <Aviso mensaje={subida.error.mensaje} />
          <DetalleTecnico detalle={subida.error.detalle} />
          <Boton
            titulo="Reintentar"
            variante="secundario"
            ancho="completo"
            deshabilitado={subida.subiendo}
            onPress={() => void subida.reintentar()}
          />
        </View>
      ) : null}
      <Boton
        titulo="Cambiar foto"
        icono="camara"
        variante="secundario"
        ancho="completo"
        onPress={() => setVerOpciones((visible) => !visible)}
      />
      {verOpciones ? (
        <Superficie>
          <OpcionesFoto
            onElegida={(foto) => {
              onElegida(foto);
              setVerOpciones(false);
            }}
            deshabilitado={subida.subiendo}
          />
        </Superficie>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
});
