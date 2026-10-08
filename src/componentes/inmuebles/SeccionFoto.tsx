import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ArchivoFoto } from '../../api/inmuebles';
import { colores, espaciado } from '../../tema';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import type { NombreIcono } from '../iconos/Icono';
import { DetalleTecnico } from '../DetalleTecnico';
import { EncabezadoSeccion } from '../EncabezadoSeccion';
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
  /** Sin subida (crear inmueble, R4-E): la foto se queda local y el padre la sube después. */
  subida?: ReturnType<typeof useSubidaFoto>;
  /** Se llama con cada foto elegida (el padre decide cómo subirla). */
  onElegida: (foto: ArchivoFoto) => void;
  alFallarUrl?: () => void;
  nota?: string;
  /** "Quitar foto" (solo una foto local que aún no se sube). */
  onQuitar?: () => void;
  /** Sin foto todavía: las opciones de Cámara y Galería a la vista, sin el marcador vacío. */
  elegirSinFoto?: boolean;
  deshabilitado?: boolean;
}

/**
 * Foto con vista previa ampliable y "Cambiar foto": portada de la unidad, foto de la cédula y (R4-E) la
 * portada al crear un inmueble. Mientras sube se ve la foto local; si falla, mensaje en español,
 * "Detalle técnico" y Reintentar.
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
  onQuitar,
  elegirSinFoto = false,
  deshabilitado = false,
}: Props) {
  const [verOpciones, setVerOpciones] = useState(false);
  const vista = subida?.pendiente?.uri ?? url;
  const ocupado = deshabilitado || subida?.subiendo === true;
  const opciones = (
    <OpcionesFoto
      onElegida={(foto) => {
        onElegida(foto);
        setVerOpciones(false);
      }}
      deshabilitado={ocupado}
    />
  );
  if (elegirSinFoto && vista === null) {
    return (
      <View style={estilos.grupo}>
        <EncabezadoSeccion titulo={titulo} />
        {opciones}
      </View>
    );
  }
  return (
    <View style={estilos.grupo}>
      <EncabezadoSeccion titulo={titulo} />
      <PortadaInmueble
        url={vista}
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
      {subida?.subiendo ? (
        <Texto variante="secundario" color={colores.textoSecundario}>
          Subiendo foto…
        </Texto>
      ) : null}
      {subida?.error && subida.pendiente ? (
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
      {verOpciones ? <Superficie>{opciones}</Superficie> : null}
      {onQuitar ? (
        <Boton
          titulo="Quitar foto"
          variante="secundario"
          ancho="completo"
          deshabilitado={ocupado}
          onPress={onQuitar}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
});
