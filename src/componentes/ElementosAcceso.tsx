import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RolSesion } from '../sesion/tipos';
import { colores, espaciado } from '../tema';
import { ControlSegmentado } from './ControlSegmentado';
import { Texto } from './Texto';

const OPCIONES_ROL = [
  { valor: 'arrendador', etiqueta: 'Soy arrendador' },
  { valor: 'inquilino', etiqueta: 'Soy inquilino' },
] as const;

/**
 * Selector "Soy arrendador / Soy inquilino" de los logins (maqueta de acceso). Cambiar de rol REEMPLAZA
 * la pantalla (no apila): "atrás" sigue llevando a la bienvenida, no al login del otro rol.
 */
export function SelectorRolAcceso({ rol }: { rol: RolSesion }) {
  const router = useRouter();
  return (
    <ControlSegmentado
      opciones={OPCIONES_ROL}
      valor={rol}
      onCambio={(nuevo) => {
        if (nuevo === rol) return;
        router.replace(nuevo === 'arrendador' ? '/login-arrendador' : '/login-inquilino');
      }}
    />
  );
}

/**
 * Pie de los logins: pregunta y enlace en negrita ("¿No tienes cuenta? Crear cuenta"), centrados y al
 * fondo de la pantalla. El enlace mide al menos 44 dp de alto.
 */
export function PieAcceso({
  pregunta,
  enlace,
  onPress,
  nota,
}: {
  pregunta: string;
  enlace: string;
  onPress: () => void;
  /** Aclaración debajo, en secundario. */
  nota?: string;
}) {
  return (
    <View style={estilos.pie}>
      <View style={estilos.fila}>
        <Texto variante="cuerpo" color={colores.textoSecundario}>
          {pregunta}
        </Texto>
        <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={estilos.enlace}>
          <Texto variante="cuerpoFuerte" color={colores.tintaCapa}>
            {enlace}
          </Texto>
        </Pressable>
      </View>
      {nota ? (
        <Texto variante="secundario" color={colores.textoSecundario} style={estilos.nota}>
          {nota}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pie: { marginTop: 'auto', alignItems: 'center', paddingTop: espaciado.md },
  fila: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  enlace: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaciado.xs },
  nota: { textAlign: 'center' },
});
