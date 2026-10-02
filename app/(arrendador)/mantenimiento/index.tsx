import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { ColaSolicitudes } from '@/componentes/mantenimiento/ColaSolicitudes';
import { PantallaPila } from '@/componentes/PantallaPila';
import { clavesSolicitudes } from '@/consultas/mantenimiento';

// Mantenimiento del arrendador: pantalla de pila (se llega desde "Más"), con el encabezado nativo de
// la pila y su botón atrás. Dos grupos de rutas no pueden compartir URL: el detalle del inquilino es
// /solicitud/[id], por eso este va en /mantenimiento/[id].
export default function MantenimientoArrendador() {
  const cliente = useQueryClient();
  const [refrescando, setRefrescando] = useState(false);

  async function arrastrar() {
    setRefrescando(true);
    try {
      await cliente.invalidateQueries({ queryKey: clavesSolicitudes.todos });
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <PantallaPila
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={arrastrar} />}
    >
      <ColaSolicitudes />
    </PantallaPila>
  );
}
