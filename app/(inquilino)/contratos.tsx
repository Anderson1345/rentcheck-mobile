import { Aviso } from '@/componentes/Aviso';
import { InicioProvisional } from '@/componentes/InicioProvisional';
import { useVincularPendiente } from '@/sesion/useVincularPendiente';

export default function ContratosInquilino() {
  // "Ya tengo cuenta": si la activación dejó un código pendiente, se vincula al entrar.
  const vinculacion = useVincularPendiente();

  return (
    <InicioProvisional rol="Inquilino" entrega="E6">
      {vinculacion.estado === 'vinculando' ? (
        <Aviso tono="informacion" mensaje="Agregando tu contrato…" />
      ) : vinculacion.estado === 'vinculado' ? (
        <Aviso
          tono="exito"
          mensaje={`Contrato agregado: ${vinculacion.contrato.unidad.nombre} · ${vinculacion.contrato.inmueble.direccion}.`}
        />
      ) : vinculacion.estado === 'error' ? (
        <Aviso mensaje={vinculacion.mensaje} />
      ) : null}
    </InicioProvisional>
  );
}
