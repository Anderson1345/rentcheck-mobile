import { CampanaAlertas } from '@/componentes/alertas/CampanaAlertas';
import { InicioProvisional } from '@/componentes/InicioProvisional';

export default function PanelArrendador() {
  return (
    <InicioProvisional rol="Arrendador" entrega="E9" accion={<CampanaAlertas rol="arrendador" />} />
  );
}
