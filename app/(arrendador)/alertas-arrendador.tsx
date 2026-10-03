import { PantallaAlertas } from '@/componentes/alertas/PantallaAlertas';

// Alertas del arrendador. Nombre propio: dos grupos de rutas no pueden compartir URL (la del
// inquilino es /alertas), igual que pagos-arrendador y mas-arrendador.
export default function AlertasArrendador() {
  return <PantallaAlertas rol="arrendador" />;
}
