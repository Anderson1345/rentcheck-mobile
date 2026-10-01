import { StrictMode } from 'react';
import { act, create } from 'react-test-renderer';

import { ErrorApi } from '../../api/cliente';
import {
  consumirCodigoPendiente,
  guardarCodigoPendiente,
  limpiarCodigoPendiente,
} from '../codigoPendiente';
import { type ResultadoVinculacion, useVincularPendiente } from '../useVincularPendiente';

const mockVincular = jest.fn();
jest.mock('../../api/auth', () => ({
  ...jest.requireActual('../../api/auth'),
  vincularContrato: (...a: unknown[]) => mockVincular(...a),
}));

const CONTRATO = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: 'x',
  fecha_fin: 'y',
  vinculado_en: 'z',
  datos_recaudo: null,
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  inmueble: { id: 'm1', direccion: 'Calle 45 # 12-30', ciudad: 'Bogotá' },
};

function montar(opciones: { estricto?: boolean; consumirAntes?: boolean } = {}) {
  const salida: { actual?: ResultadoVinculacion } = {};
  function Sonda() {
    salida.actual = useVincularPendiente();
    // Simula que otro lector consume el código entre el render y el efecto.
    if (opciones.consumirAntes) consumirCodigoPendiente();
    return null;
  }
  act(() => {
    create(
      opciones.estricto ? (
        <StrictMode>
          <Sonda />
        </StrictMode>
      ) : (
        <Sonda />
      ),
    );
  });
  return salida;
}

const liberar = () =>
  act(async () => {
    await new Promise<void>((resolver) => setTimeout(resolver, 10));
  });

beforeEach(() => {
  jest.clearAllMocks();
  limpiarCodigoPendiente();
});

describe('useVincularPendiente', () => {
  it('sin código pendiente: ninguno y no llama a vincular', () => {
    const salida = montar();
    expect(salida.actual).toEqual({ estado: 'ninguno' });
    expect(mockVincular).not.toHaveBeenCalled();
  });

  it('con código: "vinculando" mientras la petición está en curso y luego el contrato', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    let terminar!: (valor: unknown) => void;
    mockVincular.mockReturnValueOnce(new Promise((r) => (terminar = r)));
    const salida = montar();
    expect(salida.actual).toEqual({ estado: 'vinculando' });
    await act(async () => terminar(CONTRATO));
    expect(salida.actual).toEqual({ estado: 'vinculado', contrato: CONTRATO });
  });

  it('un error de la API pasa a "error" con el mensaje en español', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    mockVincular.mockRejectedValueOnce(
      new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' }),
    );
    const salida = montar();
    await liberar();
    expect(salida.actual?.estado).toBe('error');
  });

  it('si el código ya no existe cuando corre el efecto, NO se queda en "vinculando": pasa a "ninguno"', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    const salida = montar({ consumirAntes: true });
    await liberar();
    expect(mockVincular).not.toHaveBeenCalled();
    expect(salida.actual).toEqual({ estado: 'ninguno' });
  });

  it('con StrictMode (doble efecto) vincula UNA vez y no oculta la petición en curso', async () => {
    guardarCodigoPendiente('RC-AB3D-9KPX');
    let terminar!: (valor: unknown) => void;
    mockVincular.mockReturnValueOnce(new Promise((r) => (terminar = r)));
    const salida = montar({ estricto: true });
    await liberar();
    expect(mockVincular).toHaveBeenCalledTimes(1);
    expect(salida.actual).toEqual({ estado: 'vinculando' });
    await act(async () => terminar(CONTRATO));
    expect(salida.actual?.estado).toBe('vinculado');
  });
});
