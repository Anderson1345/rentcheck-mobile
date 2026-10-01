import { act, create } from 'react-test-renderer';

import { crearToken } from '../../pruebas/crearToken';
import { crearControladorSesion } from '../controlador';
import { type SesionActual, SesionProvider, useSesion } from '../SesionProvider';

const respuestaInquilino = () => ({
  access_token: crearToken({ inquilinoId: 'i1', exp: 4_102_444_800 }),
  inquilino: { id: 'i1', nombre: 'Camilo', correo: 'c@x.co', telefono: '3', creado_en: 'x' },
});

describe('useSesion().leerEstado', () => {
  it('lee el estado ACTUAL del controlador de forma síncrona, antes de que React vuelva a renderizar', async () => {
    const controlador = crearControladorSesion({
      almacen: {
        guardar: async () => undefined,
        leer: async () => null,
        borrar: async () => undefined,
      },
      limpiarCache: () => undefined,
    });
    await controlador.arrancar();
    const salida: { actual?: SesionActual } = {};
    function Sonda() {
      salida.actual = useSesion();
      return null;
    }
    await act(async () => {
      create(
        <SesionProvider controlador={controlador}>
          <Sonda />
        </SesionProvider>,
      );
    });
    const instantanea = salida.actual!;
    expect(instantanea.leerEstado()).toBe('anonimo');

    // Sin pasar por act: el controlador publica antes de que React re-renderice.
    const promesa = controlador.iniciarSesion(respuestaInquilino());
    expect(instantanea.leerEstado()).toBe('inquilino');
    expect(instantanea.estado).toBe('anonimo'); // la instantánea de React sigue siendo la vieja
    await act(async () => {
      await promesa;
    });
  });

  it('no expone el token', async () => {
    const controlador = crearControladorSesion({
      almacen: {
        guardar: async () => undefined,
        leer: async () => null,
        borrar: async () => undefined,
      },
      limpiarCache: () => undefined,
    });
    await controlador.arrancar();
    const salida: { actual?: SesionActual } = {};
    function Sonda() {
      salida.actual = useSesion();
      return null;
    }
    await act(async () => {
      create(
        <SesionProvider controlador={controlador}>
          <Sonda />
        </SesionProvider>,
      );
    });
    expect(Object.keys(salida.actual!)).not.toContain('token');
    expect(Object.keys(salida.actual!)).not.toContain('obtenerToken');
  });
});
