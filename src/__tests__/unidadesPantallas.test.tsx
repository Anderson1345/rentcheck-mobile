// Nueva unidad y editar unidad: campos según el uso, envío de solo lo cambiado, errores del
// servidor, eliminar con confirmación y foto de la unidad. El cliente de API se simula; los
// esquemas, hooks y errores son los reales.
import { Image } from 'expo-image';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';

import EditarUnidad from '../../app/(arrendador)/inmueble/[id]/unidad/[unidadId]';
import NuevaUnidad from '../../app/(arrendador)/inmueble/[id]/unidad/nueva';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import { inmuebleEjemplo, unidadEjemplo, unidadPrincipalNueva } from '../pruebas/datosInmuebles';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();
const mockSubir = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockElegir = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegir(...a),
}));

const FOTO = { uri: 'file:///cache/u.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };
type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const porEtiqueta = (raiz: Raiz, etiqueta: string) =>
  raiz.root.findAll((n) => n.props.accessibilityLabel === etiqueta && !!n.props.onPress);
const tocar = (raiz: Raiz, etiqueta: string) =>
  act(async () => {
    porEtiqueta(raiz, etiqueta)[0].props.onPress();
  });
const pulsar = (raiz: Raiz, titulo: string) =>
  act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
const interruptor = (raiz: Raiz) =>
  raiz.root.find(
    (n) => n.props.accessibilityLabel === 'Acepta mascotas' && !!n.props.onValueChange,
  );

async function llenarResidencial(raiz: Raiz) {
  await escribirEn(raiz, 'Nombre de la unidad', ' Apto 101 ');
  await escribirEn(raiz, 'Canon base', '1200000');
  await escribirEn(raiz, 'Área (m²)', '58,5');
  await escribirEn(raiz, 'Habitaciones', '2');
  await escribirEn(raiz, 'Baños', '1');
  await escribirEn(raiz, 'Ocupantes máximos', '4');
}

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [
    mockGet,
    mockPost,
    mockPatch,
    mockDelete,
    mockSubir,
    mockPush,
    mockBack,
    mockReplace,
    mockElegir,
  ]) {
    m.mockReset();
  }
  mockParams = { id: 'i1', unidadId: 'u1' };
  mockGet.mockResolvedValue(inmuebleEjemplo());
  mockPost.mockResolvedValue(unidadEjemplo());
  mockPatch.mockResolvedValue(unidadEjemplo());
  mockDelete.mockResolvedValue(unidadEjemplo());
});

describe('Nueva unidad', () => {
  it('campos, uso Residencial por defecto, teclados numéricos y nota de la foto', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    expect(mockGet).toHaveBeenCalledWith('/inmuebles/i1');
    expect(porEtiqueta(raiz, 'Residencial')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
    for (const tipo of ['Apartamento', 'Casa', 'Local', 'Parqueadero', 'Habitación']) {
      expect(porEtiqueta(raiz, tipo)).toHaveLength(1);
    }
    expect(campoDe(raiz, 'Área (m²)')?.props.keyboardType).toBe('decimal-pad');
    for (const c of ['Habitaciones', 'Baños', 'Ocupantes máximos']) {
      expect(campoDe(raiz, c)?.props.keyboardType).toBe('number-pad');
    }
    expect(textosDe(raiz)).toContain('Podrás agregar la foto después de crearla.');
    expect(hayBoton(raiz, 'Tomar foto')).toBe(false);
  });

  it('residencial: envía todo, con el canon en centavos enteros, y vuelve al detalle', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await llenarResidencial(raiz);
    await act(async () => interruptor(raiz).props.onValueChange(true));

    await pulsar(raiz, 'Crear unidad');
    await esperar();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/inmuebles/i1/unidades', {
      nombre: 'Apto 101',
      tipo: 'APARTAMENTO',
      uso_permitido: 'RESIDENCIAL',
      canon_base_centavos: 120_000_000,
      metros_cuadrados: 58.5,
      numero_habitaciones: 2,
      numero_banos: 1,
      ocupantes_maximos: 4,
      acepta_mascotas: true,
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('comercial: oculta los campos residenciales y no los envía (mascotas en false)', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await tocar(raiz, 'Comercial');
    expect(campoDe(raiz, 'Área (m²)')).toBeUndefined();
    expect(campoDe(raiz, 'Habitaciones')).toBeUndefined();

    await escribirEn(raiz, 'Nombre de la unidad', 'Local 1');
    await escribirEn(raiz, 'Canon base', '3000000');
    await pulsar(raiz, 'Crear unidad');
    await esperar();

    expect(mockPost).toHaveBeenCalledWith('/inmuebles/i1/unidades', {
      nombre: 'Local 1',
      tipo: 'APARTAMENTO',
      uso_permitido: 'COMERCIAL',
      canon_base_centavos: 300_000_000,
      acepta_mascotas: false,
    });
  });

  it('elegir Local o Parqueadero sugiere Comercial (y se puede volver a cambiar)', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await tocar(raiz, 'Local');
    expect(porEtiqueta(raiz, 'Comercial')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
    await tocar(raiz, 'Residencial');
    expect(porEtiqueta(raiz, 'Residencial')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
    await tocar(raiz, 'Parqueadero');
    expect(porEtiqueta(raiz, 'Comercial')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('residencial incompleta: errores locales y ninguna petición', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await escribirEn(raiz, 'Nombre de la unidad', 'Apto');
    await pulsar(raiz, 'Crear unidad');
    await esperar();
    expect(mockPost).not.toHaveBeenCalled();
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Escribe el canon base.');
    expect(todo).toContain('Escribe el área');
  });

  it('inmueble sin estrato + uso Residencial: avisa antes de enviar y ofrece Editar inmueble', async () => {
    mockGet.mockResolvedValue(inmuebleEjemplo({ estrato: null }));
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    expect(textosDe(raiz)).toContain(
      'Este inmueble no tiene estrato; edítalo para agregar una unidad residencial.',
    );
    await pulsar(raiz, 'Editar inmueble');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/inmueble/[id]/editar',
      params: { id: 'i1' },
    });
    await tocar(raiz, 'Comercial');
    expect(textosDe(raiz).join('|')).not.toContain('no tiene estrato');
  });

  it('con estrato no hay aviso', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    expect(textosDe(raiz).join('|')).not.toContain('no tiene estrato');
  });

  it.each([
    [
      new ErrorApi({ status: 400, codigo: 'ESTRATO_REQUERIDO', mensaje: 'x' }),
      'Debes indicar el estrato del inmueble.',
    ],
    [
      new ErrorApi({
        status: 400,
        codigo: 'CAMPOS_RESIDENCIALES_REQUERIDOS',
        mensaje: 'x',
        detalles: ['metros_cuadrados es obligatorio'],
      }),
      'Para una unidad residencial debes indicar área, habitaciones, baños y ocupantes.',
    ],
    [new ErrorSinConexion(), 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.'],
  ])('error del servidor: lo muestra claro y no navega', async (error, mensaje) => {
    mockPost.mockRejectedValue(error);
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await llenarResidencial(raiz);
    await pulsar(raiz, 'Crear unidad');
    await esperar();
    expect(textosDe(raiz)).toContain(mensaje);
    expect(mockBack).not.toHaveBeenCalled();
    expect(hayBoton(raiz, 'Crear unidad')).toBe(true);
  });

  it('un segundo toque mientras envía no duplica la unidad', async () => {
    let terminar!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await tocar(raiz, 'Comercial');
    await escribirEn(raiz, 'Nombre de la unidad', 'L');
    await escribirEn(raiz, 'Canon base', '1000');
    await pulsar(raiz, 'Crear unidad');
    await act(async () => botonDe(raiz, 'Creando unidad…').props.onPress());
    expect(mockPost).toHaveBeenCalledTimes(1);
    await act(async () => terminar(unidadEjemplo()));
    await esperar();
  });

  it('inmueble inexistente: "No encontrado"', async () => {
    mockGet.mockRejectedValue(new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' }));
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    expect(textosDe(raiz)).toContain('No encontrado');
  });
});

describe('Editar unidad', () => {
  it('precarga los datos y muestra el canon formateado', async () => {
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    expect(campoDe(raiz, 'Nombre de la unidad')?.props.value).toBe('Apto 302');
    expect(campoDe(raiz, 'Canon base')?.props.value).toBe('1.800.000');
    expect(campoDe(raiz, 'Área (m²)')?.props.value).toBe('58.5');
    expect(interruptor(raiz).props.value).toBe(true);
  });

  it('envía SOLO el campo que cambió', async () => {
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await escribirEn(raiz, 'Nombre de la unidad', 'Apto 303');
    await pulsar(raiz, 'Guardar cambios');
    await esperar();
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/i1/unidades/u1', { nombre: 'Apto 303' });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('sin cambios no envía nada', async () => {
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await pulsar(raiz, 'Guardar cambios');
    await esperar();
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });

  it('comercial → residencial envía el uso y los CUATRO campos residenciales', async () => {
    mockGet.mockResolvedValue(
      inmuebleEjemplo({
        unidades: [
          unidadEjemplo({
            tipo: 'LOCAL',
            uso_permitido: 'COMERCIAL',
            metros_cuadrados: null,
            numero_habitaciones: null,
            numero_banos: null,
            ocupantes_maximos: null,
            acepta_mascotas: false,
          }),
        ],
      }),
    );
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    expect(campoDe(raiz, 'Área (m²)')).toBeUndefined();
    await tocar(raiz, 'Residencial');
    await escribirEn(raiz, 'Área (m²)', '40');
    await escribirEn(raiz, 'Habitaciones', '1');
    await escribirEn(raiz, 'Baños', '1');
    await escribirEn(raiz, 'Ocupantes máximos', '2');

    await pulsar(raiz, 'Guardar cambios');
    await esperar();

    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/i1/unidades/u1', {
      uso_permitido: 'RESIDENCIAL',
      metros_cuadrados: 40,
      numero_habitaciones: 1,
      numero_banos: 1,
      ocupantes_maximos: 2,
    });
  });

  it('la unidad principal "Por completar": al completar los 4 datos se envían y se vuelve', async () => {
    mockGet.mockResolvedValue(inmuebleEjemplo({ unidades: [unidadPrincipalNueva({ id: 'u1' })] }));
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await escribirEn(raiz, 'Área (m²)', '50');
    await escribirEn(raiz, 'Habitaciones', '2');
    await escribirEn(raiz, 'Baños', '1');
    await escribirEn(raiz, 'Ocupantes máximos', '3');
    await pulsar(raiz, 'Guardar cambios');
    await esperar();
    expect(mockPatch).toHaveBeenCalledWith('/inmuebles/i1/unidades/u1', {
      metros_cuadrados: 50,
      numero_habitaciones: 2,
      numero_banos: 1,
      ocupantes_maximos: 3,
    });
  });

  it('409 UNIDAD_CON_CONTRATO_ACTIVO: muestra su mensaje', async () => {
    mockPatch.mockRejectedValue(
      new ErrorApi({ status: 409, codigo: 'UNIDAD_CON_CONTRATO_ACTIVO', mensaje: 'texto' }),
    );
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await tocar(raiz, 'Casa');
    await pulsar(raiz, 'Guardar cambios');
    await esperar();
    expect(textosDe(raiz)).toContain(
      'La unidad tiene un contrato activo y esta acción no se puede hacer.',
    );
    expect(textosDe(raiz)).toContain('Detalle técnico: HTTP 409 · UNIDAD_CON_CONTRATO_ACTIVO');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('unidad inexistente en ese inmueble: "No encontrado"', async () => {
    mockParams = { id: 'i1', unidadId: 'otra' };
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    expect(textosDe(raiz)).toContain('No encontrado');
  });
});

describe('Eliminar unidad', () => {
  it('pide confirmación (no se puede deshacer); cancelar no borra', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await pulsar(raiz, 'Eliminar unidad');
    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, mensaje, botones] = alerta.mock.calls[0];
    expect(titulo).toBe('Eliminar unidad');
    expect(mensaje).toContain('no se puede deshacer');
    expect(botones?.map((b) => b.text)).toEqual(['Cancelar', 'Eliminar']);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('al confirmar elimina y vuelve al detalle', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await pulsar(raiz, 'Eliminar unidad');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await esperar();
    expect(mockDelete).toHaveBeenCalledWith('/inmuebles/i1/unidades/u1');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('409 con texto sin código: muestra el texto del servidor', async () => {
    const texto = 'No se puede eliminar: esta unidad tiene contratos asociados';
    mockDelete.mockRejectedValue(
      new ErrorApi({ status: 409, codigo: 'CONFLICTO', mensaje: texto }),
    );
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await pulsar(raiz, 'Eliminar unidad');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await esperar();
    expect(textosDe(raiz)).toContain(texto);
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('Foto de la unidad', () => {
  it('sube con el cargador (foto-principal), muestra la vista previa y refresca', async () => {
    let terminar!: (v: unknown) => void;
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubir.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<EditarUnidad />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');

    expect(mockSubir).toHaveBeenCalledWith(
      '/inmuebles/i1/unidades/u1/foto-principal',
      'foto',
      FOTO,
    );
    expect(raiz.root.findAllByType(Image)[0].props.source).toMatchObject({ uri: FOTO.uri });
    expect(textosDe(raiz)).toContain('Subiendo foto…');
    const antes = mockGet.mock.calls.length;

    await act(async () => terminar(unidadEjemplo()));
    await esperar();
    expect(textosDe(raiz)).not.toContain('Subiendo foto…');
    expect(mockGet.mock.calls.length).toBeGreaterThan(antes);
  });

  it('si falla: mensaje, Detalle técnico y Reintentar con la misma foto', async () => {
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubir
      .mockRejectedValueOnce(new ErrorSinConexion(new Error('Network request failed')))
      .mockResolvedValue(unidadEjemplo());
    const { raiz } = await renderizarPantalla(<EditarUnidad />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');
    await esperar();
    expect(textosDe(raiz)).toContain(
      'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(textosDe(raiz)).toContain(
      'Detalle técnico: Sin respuesta · Error: Network request failed',
    );

    await pulsar(raiz, 'Reintentar');
    await esperar();
    expect(mockSubir).toHaveBeenCalledTimes(2);
    expect(mockSubir).toHaveBeenLastCalledWith(
      '/inmuebles/i1/unidades/u1/foto-principal',
      'foto',
      FOTO,
    );
    expect(textosDe(raiz).join('|')).not.toContain('Detalle técnico');
  });

  it('la imagen de la unidad usa una clave de caché estable con prefijo "unidad:"', async () => {
    mockGet.mockResolvedValue(
      inmuebleEjemplo({
        unidades: [
          unidadEjemplo({
            foto_principal_url: 'https://b.test/s/inmuebles/i1/unidades/u1.jpg?token=A',
          }),
        ],
      }),
    );
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    const fuente = raiz.root.findAllByType(Image)[0].props.source;
    expect(fuente.cacheKey).toContain('unidad:u1');
    expect(fuente.cacheKey).not.toContain('token');
  });
});

describe('Duplicar unidad (R2-A)', () => {
  it('desde la unidad, "Duplicar unidad" abre la nueva unidad del mismo inmueble con ?desde=', async () => {
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await pulsar(raiz, 'Duplicar unidad');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/inmueble/[id]/unidad/nueva',
      params: { id: 'i1', desde: 'u1' },
    });
  });

  it('la nueva unidad llega con todo copiado salvo el nombre (vacío y enfocado) y sin foto', async () => {
    mockParams = { id: 'i1', desde: 'u1' };
    mockGet.mockResolvedValue(
      inmuebleEjemplo({
        unidades: [unidadEjemplo({ foto_principal_url: 'https://firmada/u1' })],
      }),
    );
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    const nombre = campoDe(raiz, 'Nombre de la unidad');
    expect(nombre?.props.value).toBe('');
    expect(nombre?.props.autoFocus).toBe(true);
    expect(campoDe(raiz, 'Canon base')?.props.value).toBe('1.800.000');
    expect(campoDe(raiz, 'Área (m²)')?.props.value).toBe('58.5');
    expect(campoDe(raiz, 'Habitaciones')?.props.value).toBe('2');
    expect(campoDe(raiz, 'Baños')?.props.value).toBe('2');
    expect(campoDe(raiz, 'Ocupantes máximos')?.props.value).toBe('4');
    expect(interruptor(raiz).props.value).toBe(true);
    expect(porEtiqueta(raiz, 'Apartamento')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(porEtiqueta(raiz, 'Residencial')[0].props.accessibilityState).toMatchObject({
      selected: true,
    });
    // La foto no se copia: la nueva unidad no muestra ninguna imagen.
    expect(raiz.root.findAllByType(Image)).toHaveLength(0);
    expect(textosDe(raiz).join(' ')).toContain('Apto 302');
  });

  it('al guardar es una creación normal con los valores copiados y el nombre nuevo', async () => {
    mockParams = { id: 'i1', desde: 'u1' };
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await escribirEn(raiz, 'Nombre de la unidad', 'Apto 303');
    await pulsar(raiz, 'Crear unidad');
    await esperar();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/inmuebles/i1/unidades', {
      nombre: 'Apto 303',
      tipo: 'APARTAMENTO',
      uso_permitido: 'RESIDENCIAL',
      canon_base_centavos: 180_000_000,
      metros_cuadrados: 58.5,
      numero_habitaciones: 2,
      numero_banos: 2,
      ocupantes_maximos: 4,
      acepta_mascotas: true,
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('sin nombre no se envía (misma validación de siempre)', async () => {
    mockParams = { id: 'i1', desde: 'u1' };
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await pulsar(raiz, 'Crear unidad');
    await esperar();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('una unidad comercial se copia comercial (sin los campos residenciales)', async () => {
    mockParams = { id: 'i1', desde: 'u9' };
    mockGet.mockResolvedValue(
      inmuebleEjemplo({
        unidades: [
          unidadEjemplo({
            id: 'u9',
            nombre: 'Local 1',
            tipo: 'LOCAL',
            uso_permitido: 'COMERCIAL',
            canon_base_centavos: 250_000_000,
            metros_cuadrados: null,
            numero_habitaciones: null,
            numero_banos: null,
            ocupantes_maximos: null,
            acepta_mascotas: false,
          }),
        ],
      }),
    );
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await escribirEn(raiz, 'Nombre de la unidad', 'Local 2');
    await pulsar(raiz, 'Crear unidad');
    await esperar();
    expect(mockPost).toHaveBeenCalledWith('/inmuebles/i1/unidades', {
      nombre: 'Local 2',
      tipo: 'LOCAL',
      uso_permitido: 'COMERCIAL',
      canon_base_centavos: 250_000_000,
      acepta_mascotas: false,
    });
  });

  it('si la unidad a duplicar ya no está, avisa y deja el formulario vacío', async () => {
    mockParams = { id: 'i1', desde: 'no-existe' };
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    expect(textosDe(raiz).join(' ')).toContain('No encontramos la unidad para duplicar');
    expect(campoDe(raiz, 'Canon base')?.props.value).toBe('');
  });

  it('el botón principal queda fijo abajo en la nueva unidad (formulario largo)', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    const barra = raiz.root.findByProps({ testID: 'accion-fija' });
    expect(barra.findAll((n) => n.props.children === 'Crear unidad').length).toBeGreaterThan(0);
  });
});

/** R4-E: el botón vive en la barra fija, no en el contenido que se desplaza. */
const enBarraFija = (raiz: Raiz, titulo: string) => {
  const barras = raiz.root.findAll((n) => n.props.testID === 'accion-fija');
  if (barras.length === 0) return false;
  const desplazable = raiz.root.findAll((n) => n.props.keyboardShouldPersistTaps === 'handled')[0];
  const tiene = (n: (typeof barras)[number]) =>
    n.findAll((h) => h.props.children === titulo).length > 0;
  return tiene(barras[0]) && !tiene(desplazable);
};
const encabezadosDe = (raiz: Raiz) =>
  raiz.root
    .findAll((n) => n.props.accessibilityRole === 'header' && typeof n.props.children === 'string')
    .map((n) => n.props.children as string);

describe('Formulario de unidad: rediseño (R4-E)', () => {
  it('nueva: secciones con encabezado; Comercial oculta "Características"', async () => {
    const { raiz } = await renderizarPantalla(<NuevaUnidad />);
    await esperar();
    expect(encabezadosDe(raiz)).toEqual(
      expect.arrayContaining(['Datos de la unidad', 'Características']),
    );
    await tocar(raiz, 'Comercial');
    expect(encabezadosDe(raiz)).not.toContain('Características');
  });

  it('editar: "Guardar cambios" en la barra fija, foto ampliable y eliminar siguen ahí', async () => {
    mockParams = { id: 'i1', unidadId: 'u1' };
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await esperar();
    expect(enBarraFija(raiz, 'Guardar cambios')).toBe(true);
    expect(encabezadosDe(raiz)).toEqual(
      expect.arrayContaining(['Datos de la unidad', 'Foto de la unidad']),
    );
    expect(raiz.root.findAll((n) => n.props.ampliable === true).length).toBeGreaterThan(0);
    expect(hayBoton(raiz, 'Eliminar unidad')).toBe(true);
    expect(hayBoton(raiz, 'Duplicar unidad')).toBe(true);
  });

  it('editar sin cambios: no llama al servidor', async () => {
    const { raiz } = await renderizarPantalla(<EditarUnidad />);
    await esperar();
    await pulsar(raiz, 'Guardar cambios');
    await esperar();
    expect(mockPatch).not.toHaveBeenCalled();
  });
});
