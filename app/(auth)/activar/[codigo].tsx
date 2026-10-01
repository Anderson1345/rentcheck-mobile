import { useLocalSearchParams } from 'expo-router';

import { ActivacionInquilino } from '@/componentes/ActivacionInquilino';
import { validarCodigo } from '@/sesion/codigo';

// Enlace rentcheck://activar/<codigo>: muestra el código ya escrito, pero NO llama al servidor sola
// (cada fallo cuenta para el bloqueo de 15 minutos): la persona toca "Continuar".
export default function ActivarConEnlace() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const resultado = validarCodigo(typeof codigo === 'string' ? codigo : '');

  if (!resultado.valido) {
    return <ActivacionInquilino avisoInicial="El enlace no es válido. Escribe tu código." />;
  }
  return <ActivacionInquilino codigoInicial={resultado.codigo} />;
}
