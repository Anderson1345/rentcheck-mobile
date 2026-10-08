// Mi perfil: editar nombre, teléfono y cédula (validada), correo de solo lectura y foto de cédula.
import { Image } from 'expo-image';
import { act } from 'react-test-renderer';

import Perfil from '../../app/(arrendador)/perfil';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type { PerfilArrendador } from '../api/perfil';
import {
  botonDe,
  campoDe,
  escribirEn,
  hayBoton,
  renderizarPantalla,
  textosDe,
} from '../pruebas/pantallas';

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockSubir = jest.fn();
const mockElegir = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
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
    patch: (...a: unknown[]) => mockPatch(...a),
    post: jest.fn(),
    delete: jest.fn(),
    subirArchivo: (...a: unknown[]) => mockSubir(...a),
  },
}));
jest.mock('../utilidades/foto', () => ({
  ...jest.requireActual('../utilidades/foto'),
  elegirFoto: (...a: unknown[]) => mockElegir(...a),
}));

const FOTO = { uri: 'file:///cache/c.jpg', name: 'portada.jpg', type: 'image/jpeg' as const };
const PERFIL: PerfilArrendador = {
  id: 'a1',
  nombre: 'Marta Ríos',
  correo: 'marta@ejemplo.com',
  telefono: '3001234567',
  cedula: null,
  foto_cedula_nit_url: null,
  creado_en: '2026-09-01T10:00:00.000Z',
};
type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];
const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const pulsar = (raiz: Raiz, titulo: string) =>
  act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
const guardar = async (raiz: Raiz) => {
  await pulsar(raiz, 'Guardar cambios');
  await esperar();
};

beforeEach(() => {
  for (const m of [mockGet, mockPatch, mockSubir, mockElegir]) m.mockReset();
  mockGet.mockResolvedValue(PERFIL);
  mockPatch.mockResolvedValue(PERFIL);
});

describe('Mi perfil', () => {
  it('R4-C: "Guardar cambios" en la barra fija; el correo es una fila de solo lectura', async () => {
    const { raiz } = await renderizarPantalla(<Perfil />);
    const barra = raiz.root.findByProps({ testID: 'accion-fija' });
    expect(barra.findAll((n) => n.props.children === 'Guardar cambios').length).toBeGreaterThan(0);
    const desplazable = raiz.root.findAll(
      (n) => n.props.keyboardShouldPersistTaps === 'handled',
    )[0];
    expect(desplazable.findAll((n) => n.props.children === 'Guardar cambios')).toHaveLength(0);
    const filas = raiz.root
      .findAll((n) => typeof n.type === 'string' && n.props.testID === 'dato-perfil')
      .map((f) =>
        f
          .findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string')
          .map((n) => n.props.children),
      );
    expect(filas).toEqual([['Correo', 'marta@ejemplo.com']]);
  });

  it('muestra el correo como solo lectura y los campos con sus valores', async () => {
    const { raiz } = await renderizarPantalla(<Perfil />);
    expect(mockGet).toHaveBeenCalledWith('/arrendadores/perfil');
    const textos = textosDe(raiz);
    expect(textos).toContain('marta@ejemplo.com');
    expect(textos).toContain('No se puede cambiar.');
    expect(campoDe(raiz, 'Correo')).toBeUndefined();
    expect(campoDe(raiz, 'Nombre completo')?.props.value).toBe('Marta Ríos');
    expect(campoDe(raiz, 'Teléfono')?.props.value).toBe('3001234567');
    expect(campoDe(raiz, 'Cédula o NIT')?.props.value).toBe('');
    expect(campoDe(raiz, 'Cédula o NIT')?.props.keyboardType).toBe('number-pad');
    expect(textos).toContain('La cédula es obligatoria para confirmar un contrato.');
  });

  it('envía solo lo que cambió', async () => {
    const { raiz } = await renderizarPantalla(<Perfil />);
    await escribirEn(raiz, 'Teléfono', ' 3109998888 ');
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/arrendadores/perfil', { telefono: '3109998888' });
    expect(textosDe(raiz)).toContain('Cambios guardados.');
  });

  it('la cédula se normaliza (sin puntos ni espacios) antes de enviarla', async () => {
    const { raiz } = await renderizarPantalla(<Perfil />);
    await escribirEn(raiz, 'Cédula o NIT', '1.020.304.050');
    await guardar(raiz);
    expect(mockPatch).toHaveBeenCalledWith('/arrendadores/perfil', { cedula: '1020304050' });
  });

  it.each(['1234', '12ab56', '1234567890123'])('cédula "%s" inválida: no se envía', async (c) => {
    const { raiz } = await renderizarPantalla(<Perfil />);
    await escribirEn(raiz, 'Cédula o NIT', c);
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('La cédula debe tener entre 5 y 12 dígitos, sin letras.');
  });

  it('nombre vacío: error local', async () => {
    const { raiz } = await renderizarPantalla(<Perfil />);
    await escribirEn(raiz, 'Nombre completo', '  ');
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Escribe tu nombre.');
  });

  it('sin cambios no envía nada', async () => {
    const { raiz } = await renderizarPantalla(<Perfil />);
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('No hiciste ningún cambio.');
  });

  it('error del servidor: mensaje por código', async () => {
    mockPatch.mockRejectedValue(new ErrorApi({ status: 400, codigo: 'VALIDACION', mensaje: 'x' }));
    const { raiz } = await renderizarPantalla(<Perfil />);
    await escribirEn(raiz, 'Teléfono', '3000000000');
    await guardar(raiz);
    expect(textosDe(raiz)).toContain('Revisa los datos: alguno no es válido.');
  });

  it('con cédula guardada, ya no se puede dejar vacía', async () => {
    mockGet.mockResolvedValue({ ...PERFIL, cedula: '1020304050' });
    const { raiz } = await renderizarPantalla(<Perfil />);
    expect(campoDe(raiz, 'Cédula o NIT')?.props.value).toBe('1020304050');
    await escribirEn(raiz, 'Cédula o NIT', '');
    await guardar(raiz);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('error al cargar: mensaje y Reintentar', async () => {
    mockGet.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await renderizarPantalla(<Perfil />);
    expect(hayBoton(raiz, 'Reintentar')).toBe(true);
    await pulsar(raiz, 'Reintentar');
    await esperar();
    expect(campoDe(raiz, 'Nombre completo')).toBeDefined();
  });
});

describe('Foto de la cédula', () => {
  it('sube con el cargador (foto-cedula) con vista previa y refresca el perfil', async () => {
    let terminar!: (v: unknown) => void;
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubir.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await renderizarPantalla(<Perfil />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');
    expect(mockSubir).toHaveBeenCalledWith('/arrendadores/perfil/foto-cedula', 'foto', FOTO);
    expect(raiz.root.findAllByType(Image)[0].props.source).toMatchObject({ uri: FOTO.uri });

    const antes = mockGet.mock.calls.length;
    await act(async () => terminar({ ...PERFIL }));
    await esperar();
    expect(mockGet.mock.calls.length).toBeGreaterThan(antes);
  });

  it('es un documento sensible: caché solo en memoria y sin clave de caché', async () => {
    mockGet.mockResolvedValue({
      ...PERFIL,
      foto_cedula_nit_url: 'https://b.test/s/arrendadores/a1/cedula.jpg?token=SECRETO',
    });
    const { raiz } = await renderizarPantalla(<Perfil />);
    const imagen = raiz.root.findAllByType(Image)[0];
    expect(imagen.props.cachePolicy).toBe('memory');
    expect(imagen.props.source.cacheKey).toBeUndefined();
  });

  it('si falla: mensaje y Detalle técnico sin URL ni datos del documento, y Reintentar', async () => {
    mockGet.mockResolvedValue({
      ...PERFIL,
      foto_cedula_nit_url: 'https://b.test/s/arrendadores/a1/cedula.jpg?token=SECRETO',
    });
    mockElegir.mockResolvedValue({ tipo: 'elegida', archivo: FOTO });
    mockSubir
      .mockRejectedValueOnce(
        new ErrorApi({ status: 415, codigo: 'ARCHIVO_CONTENIDO_INVALIDO', mensaje: 'x' }),
      )
      .mockResolvedValue(PERFIL);
    const { raiz } = await renderizarPantalla(<Perfil />);

    await pulsar(raiz, 'Cambiar foto');
    await pulsar(raiz, 'Elegir de la galería');
    await esperar();

    const textos = textosDe(raiz);
    expect(textos).toContain('Esa foto no es válida. Usa una imagen JPG o PNG.');
    expect(textos).toContain('Detalle técnico: HTTP 415 · ARCHIVO_CONTENIDO_INVALIDO');
    expect(textos.join('|')).not.toMatch(/SECRETO|b\.test|cedula\.jpg/);

    await pulsar(raiz, 'Reintentar');
    await esperar();
    expect(mockSubir).toHaveBeenCalledTimes(2);
  });
});
