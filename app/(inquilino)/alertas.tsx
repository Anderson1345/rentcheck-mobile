import { PantallaAlertas } from '@/componentes/alertas/PantallaAlertas';

// Alertas del inquilino (la del arrendador es /alertas-arrendador: dos grupos no comparten URL).
export default function AlertasInquilino() {
  return <PantallaAlertas rol="inquilino" />;
}
