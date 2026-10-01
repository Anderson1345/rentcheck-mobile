import { Pressable, StyleSheet, Text } from 'react-native';

import { colores, espaciado, radios, tipografia } from '../tema';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
}

export function Boton({ titulo, onPress, variante = 'primario', deshabilitado = false }: Props) {
  const esPrimario = variante === 'primario';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        esPrimario ? estilos.primario : estilos.secundario,
        (pressed || deshabilitado) && estilos.atenuado,
      ]}
    >
      <Text style={[estilos.texto, esPrimario ? estilos.textoPrimario : estilos.textoSecundario]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radios.md,
    paddingHorizontal: espaciado.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primario: { backgroundColor: colores.primario },
  secundario: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.primario,
  },
  atenuado: { opacity: 0.6 },
  texto: { fontSize: tipografia.normal, fontWeight: '600' },
  textoPrimario: { color: colores.sobrePrimario },
  textoSecundario: { color: colores.primario },
});
