// Lista de inmuebles del arrendador (R2-A): cabecera con conteos y ocupación, tarjetas con portada,
// chip de cobro (del Panel), miniaturas de unidades e ingresos del año; cargando, vacío, error con
// reintento y refresco. El Panel se simula: sin él (cargando o con error) la lista se ve igual.
import { Image } from 'expo-image';
import { RefreshControl, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { act } from 'react-test-renderer';

import Inmuebles from '../../app/(arrendador)/(pestanas)/inmuebles';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import { MENSAJE_SIN_CONEXION } from '../api/errores';
import { inmuebleEjemplo, unidadEjemplo } from '../pruebas/datosInmuebles';
import { panelEjemplo, unidadOcupacion } from '../pruebas/datosPanel';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';
import { coloresEstado } from '../tema';

const mockPush = jest.fn();
const mockListar = jest.fn();
const mockPanel = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
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
jest.mock('../api/inmuebles', () => ({
  ...jest.requireActual('../api/inmuebles'),
  listarInmuebles: (...a: unknown[]) => mockListar(...a),
}));
jest.mock('../api/panel', () => ({
  ...jest.requireActual('../api/panel'),
  obtenerPanelArrendador: (...a: unknown[]) => mockPanel(...a),
}));

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];
const estaCargando = (raiz: Raiz) =>
  raiz.root.findAll(
    (n) => n.props.accessibilityRole === 'progressbar' && n.props.accessibilityLabel === 'Cargando',
  ).length > 0;
/** Nodos nativos con ese testID (el componente y su vista nativa comparten props). */
const porTestId = (raiz: Raiz, testID: string) =>
  raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
const tarjeta = (raiz: Raiz, direccion: string) =>
  raiz.root.find(
    (n) =>
      n.props.testID === 'tarjeta-inmueble' &&
      typeof n.type !== 'string' &&
      n.findAll((h) => h.props.children === direccion).length > 0,
  );
const textosDeTarjeta = (raiz: Raiz, direccion: string) =>
  tarjeta(raiz, direccion)
    .findAll((n) => typeof n.props.children === 'string')
    .map((n) => n.props.children as string);

// Tres inmuebles: A con una unidad en mora, B al día, C sin ocupar.
const INMUEBLES = [
  inmuebleEjemplo({
    id: 'A',
    direccion: 'Calle A 1',
    unidades: [unidadEjemplo({ id: 'a1' }), unidadEjemplo({ id: 'a2' })],
  }),
  inmuebleEjemplo({
    id: 'B',
    direccion: 'Carrera B 2',
    ciudad: 'Medellín',
    estrato: null,
    unidades: [unidadEjemplo({ id: 'b1' })],
  }),
  inmuebleEjemplo({ id: 'C', direccion: 'Diagonal C 3', unidades: [unidadEjemplo({ id: 'c1' })] }),
];
const PANEL = panelEjemplo({
  ocupacion: {
    unidades: 4,
    ocupadas: 3,
    libres: 1,
    con_contrato_programado: 0,
    porcentaje: 75,
    unidades_detalle: [
      unidadOcupacion('a1', 'A', 'EN_MORA'),
      unidadOcupacion('a2', 'A', 'AL_DIA'),
      unidadOcupacion('b1', 'B', 'AL_DIA'),
      unidadOcupacion('c1', 'C', 'LIBRE'),
    ],
  },
  por_inmueble: [
    {
      inmueble_id: 'A',
      direccion: 'Calle A 1',
      ingresos_anio_centavos: 1_365_000_000,
      unidades: 2,
      ocupadas: 2,
    },
    {
      inmueble_id: 'B',
      direccion: 'Carrera B 2',
      ingresos_anio_centavos: 180_000_000,
      unidades: 1,
      ocupadas: 1,
    },
    {
      inmueble_id: 'C',
      direccion: 'Diagonal C 3',
      ingresos_anio_centavos: 0,
      unidades: 1,
      ocupadas: 0,
    },
  ],
});

beforeEach(() => {
  mockPush.mockReset();
  mockListar.mockReset();
  mockPanel.mockReset();
  mockPanel.mockResolvedValue(PANEL);
});

describe('Inmuebles (lista)', () => {
  it('cargando: muestra el esqueleto de la lista, no la pantalla vacía', async () => {
    mockListar.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(estaCargando(raiz)).toBe(true);
    expect(textosDe(raiz)).not.toContain('Aún no tienes inmuebles');
  });

  it('vacío: "Aún no tienes inmuebles" y el botón "Agregar inmueble" abre el formulario', async () => {
    mockListar.mockResolvedValue([]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);

    expect(textosDe(raiz)).toContain('Aún no tienes inmuebles');
    expect(estaCargando(raiz)).toBe(false);
    await act(async () => botonDe(raiz, 'Agregar inmueble').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/inmueble/nuevo');
  });

  it('error: mensaje por código y "Reintentar" vuelve a pedir la lista', async () => {
    mockListar.mockRejectedValueOnce(new ErrorSinConexion());
    mockListar.mockResolvedValue([inmuebleEjemplo()]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);

    expect(textosDe(raiz)).toContain(MENSAJE_SIN_CONEXION);
    expect(textosDe(raiz)).not.toContain('Aún no tienes inmuebles');

    await act(async () => botonDe(raiz, 'Reintentar').props.onPress());
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
    });

    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(textosDe(raiz)).toContain('Calle 45 # 12-30');
  });

  it('error del servidor con código: usa el mensaje en español de ese código', async () => {
    mockListar.mockRejectedValue(
      new ErrorApi({ status: 403, codigo: 'PROHIBIDO', mensaje: 'Forbidden' }),
    );
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(textosDe(raiz)).toContain('No tienes permiso para hacer esto.');
  });

  it('cabecera: inmuebles, unidades y ocupación % del Panel', async () => {
    mockListar.mockResolvedValue(INMUEBLES);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const datos = porTestId(raiz, 'dato-cabecera').map((n) =>
      n
        .findAll((h) => typeof h.type === 'string' && typeof h.props.children === 'string')
        .map((h) => h.props.children as string)
        .join(' '),
    );
    expect(datos).toEqual(['3 inmuebles', '4 unidades', '75% ocupación']);
  });

  it('cabecera sin porcentaje (null o sin Panel): "—"', async () => {
    mockListar.mockResolvedValue(INMUEBLES);
    mockPanel.mockRejectedValue(new ErrorSinConexion());
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(textosDe(raiz)).toContain('—');
  });

  it('tarjetas: dirección, ciudad · estrato, chip de cobro, unidades y ocupadas, e ingresos del año', async () => {
    mockListar.mockResolvedValue(INMUEBLES);
    const { raiz } = await renderizarPantalla(<Inmuebles />);

    const a = textosDeTarjeta(raiz, 'Calle A 1');
    expect(a).toEqual(
      expect.arrayContaining([
        'Bogotá · Estrato 4',
        '1 en mora',
        '2 unidades · 2 ocupadas',
        'Ingresos 2031',
        '$ 13,65 M',
      ]),
    );
    const b = textosDeTarjeta(raiz, 'Carrera B 2');
    expect(b).toEqual(
      expect.arrayContaining(['Medellín', 'Al día', '1 unidad · 1 ocupada', '$ 1,8 M']),
    );
    const c = textosDeTarjeta(raiz, 'Diagonal C 3');
    expect(c).toEqual(expect.arrayContaining(['Libre', '1 unidad · 0 ocupadas', '$ 0']));
  });

  it('el chip usa el tono del estado: mora en peligro, al día en éxito, libre en neutro', async () => {
    mockListar.mockResolvedValue(INMUEBLES);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const fondo = (direccion: string) =>
      (
        StyleSheet.flatten(
          tarjeta(raiz, direccion).findAll(
            (n) => n.props.testID === 'chip-cobro' && typeof n.type === 'string',
          )[0].props.style,
        ) as ViewStyle
      ).backgroundColor;
    expect(fondo('Calle A 1')).toBe(coloresEstado.peligro.senal);
    expect(fondo('Carrera B 2')).toBe(coloresEstado.exito.senal);
    expect(fondo('Diagonal C 3')).toBe(coloresEstado.neutro.senal);
  });

  it('sin Panel (cargando): las tarjetas se ven, sin chip ni ingresos', async () => {
    mockListar.mockResolvedValue(INMUEBLES);
    mockPanel.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const a = textosDeTarjeta(raiz, 'Calle A 1');
    expect(a).toEqual(expect.arrayContaining(['Calle A 1', '2 unidades']));
    expect(a.join(' ')).not.toMatch(/en mora|Al día|Libre|Ingresos|ocupadas/);
  });

  it('sin Panel (error): igual, la lista no se bloquea', async () => {
    mockListar.mockResolvedValue(INMUEBLES);
    mockPanel.mockRejectedValue(new ErrorApi({ status: 500, codigo: null, mensaje: 'x' }));
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(textosDe(raiz)).toEqual(
      expect.arrayContaining(['Calle A 1', 'Carrera B 2', 'Diagonal C 3']),
    );
    expect(textosDe(raiz).join(' ')).not.toMatch(/en mora|Ingresos/);
  });

  it('tocar una tarjeta abre el detalle del inmueble', async () => {
    mockListar.mockResolvedValue(INMUEBLES);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    await act(async () => tarjeta(raiz, 'Carrera B 2').props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/inmueble/[id]', params: { id: 'B' } });
  });

  it('miniaturas de unidades: foto o marcador con inicial, hasta 3 y "+N"', async () => {
    mockListar.mockResolvedValue([
      inmuebleEjemplo({
        unidades: [
          unidadEjemplo({ id: 'u1', nombre: 'Apto 101', foto_principal_url: 'https://f/u1' }),
          unidadEjemplo({ id: 'u2', nombre: 'Bodega', foto_principal_url: null }),
          unidadEjemplo({ id: 'u3', nombre: 'Casa', foto_principal_url: 'https://f/u3' }),
          unidadEjemplo({ id: 'u4', nombre: 'Local', foto_principal_url: 'https://f/u4' }),
          unidadEjemplo({ id: 'u5', nombre: 'Patio', foto_principal_url: null }),
        ],
      }),
    ]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const fotos = raiz.root
      .findAllByType(Image)
      .map((i) => (i.props.source as { uri: string }).uri);
    expect(fotos).toEqual(['https://f/u1', 'https://f/u3']);
    const sinFoto = porTestId(raiz, 'miniatura-sin-foto');
    expect(sinFoto).toHaveLength(1);
    expect(sinFoto[0].findAll((n) => n.props.children === 'B').length).toBeGreaterThan(0);
    expect(textosDe(raiz)).toContain('+2');
  });

  it('una miniatura cuya foto no carga pasa al marcador (sin hueco)', async () => {
    mockListar.mockResolvedValue([
      inmuebleEjemplo({
        unidades: [unidadEjemplo({ nombre: 'Apto 9', foto_principal_url: 'https://f/rota' })],
      }),
    ]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const imagen = raiz.root.findAllByType(Image)[0];
    await act(async () => imagen.props.onError?.({ error: 'expiró' }));
    expect(raiz.root.findAllByType(Image)).toHaveLength(0);
    expect(porTestId(raiz, 'miniatura-sin-foto')).toHaveLength(1);
  });

  it('portada: URL firmada; sin portada, el bloque de tinta con "Sin foto"', async () => {
    mockListar.mockResolvedValue([
      inmuebleEjemplo({ foto_portada_url: 'https://firmada/portada' }),
      inmuebleEjemplo({ id: 'i2', direccion: 'Sin foto aquí', foto_portada_url: null }),
    ]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const imagenes = raiz.root.findAllByType(Image);
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0].props.source).toMatchObject({ uri: 'https://firmada/portada' });
    expect(porTestId(raiz, 'portada-marcador')).toHaveLength(1);
    expect(textosDeTarjeta(raiz, 'Sin foto aquí')).toContain('Sin foto');
  });

  it('al final, la tarjeta "Agregar inmueble" abre el formulario; también el "+" de la cabecera', async () => {
    mockListar.mockResolvedValue([inmuebleEjemplo()]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(textosDe(raiz)).toContain('Agregar inmueble');
    const final = raiz.root.find((n) => n.props.testID === 'agregar-inmueble' && !!n.props.onPress);
    await act(async () => final.props.onPress());
    expect(mockPush).toHaveBeenLastCalledWith('/inmueble/nuevo');
    mockPush.mockClear();
    const mas = raiz.root.find(
      (n) => n.props.accessibilityLabel === 'Agregar inmueble' && !!n.props.onPress,
    );
    await act(async () => mas.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/inmueble/nuevo');
  });

  it('arrastrar para refrescar vuelve a pedir la lista y el Panel', async () => {
    mockListar.mockResolvedValue([inmuebleEjemplo()]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    expect(mockListar).toHaveBeenCalledTimes(1);
    expect(mockPanel).toHaveBeenCalledTimes(1);

    const control = raiz.root.findByType(ScrollView).props.refreshControl;
    expect(control.type).toBe(RefreshControl);
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(mockPanel).toHaveBeenCalledTimes(2);
  });

  it('con la lista vacía también se puede arrastrar para refrescar', async () => {
    mockListar.mockResolvedValue([]);
    const { raiz } = await renderizarPantalla(<Inmuebles />);
    const control = raiz.root.findByType(ScrollView).props.refreshControl;
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(hayBoton(raiz, 'Agregar inmueble')).toBe(true);
  });
});
