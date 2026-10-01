// Prueba de humo de las pantallas: que rendericen sin errores, que todo texto use Manrope y ningún
// texto baje de 14 sp (12 sp solo en la barra inferior), y que la Galería muestre todos los estados
// del Contexto. No reemplaza el recorrido en el teléfono.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { StyleSheet, Text, TextInput, type TextStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import NoEncontrada from '../../app/+not-found';
import ContratosArrendador from '../../app/(arrendador)/(pestanas)/contratos-arrendador';
import MasArrendador from '../../app/(arrendador)/(pestanas)/mas-arrendador';
import PagosArrendador from '../../app/(arrendador)/(pestanas)/pagos-arrendador';
import PanelArrendador from '../../app/(arrendador)/(pestanas)/panel';
import NuevoInmueble from '../../app/(arrendador)/inmueble/nuevo';
import ContratosInquilino from '../../app/(inquilino)/contratos';
import Bienvenida from '../../app/(auth)/index';
import Activar from '../../app/(auth)/activar';
import ActivarConEnlace from '../../app/(auth)/activar/[codigo]';
import LoginArrendador from '../../app/(auth)/login-arrendador';
import LoginInquilino from '../../app/(auth)/login-inquilino';
import RecuperarContrasena from '../../app/(auth)/recuperar-contrasena';
import RegistroArrendador from '../../app/(auth)/registro-arrendador';
import RestablecerContrasena from '../../app/(auth)/restablecer-contrasena';
import VerificaCorreo from '../../app/(auth)/verifica-correo';
import Diagnostico from '../../app/(auth)/diagnostico';
import Galeria from '../../app/(auth)/galeria';
import { MAPAS_ESTADO, URGENCIAS } from '../componentes/estados';
import { crearToken } from '../pruebas/crearToken';
import { crearControladorSesion } from '../sesion/controlador';
import { SesionProvider } from '../sesion/SesionProvider';
import { fuentes } from '../tema';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({ correo: 'marta@ejemplo.com' }),
  useFocusEffect: () => undefined,
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
// Los logins consultan las capacidades del servidor: aquí, apagadas.
jest.mock('../api/auth', () => ({
  ...jest.requireActual('../api/auth'),
  obtenerCapacidades: async () => ({ verificacion_correo: false, recuperacion_contrasena: false }),
}));
// El Diagnóstico queda "conectando" (la petición no termina) para no salir a la red.
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: { get: () => new Promise(() => undefined) },
}));

// El giro del indicador es un bucle de Animated infinito: en la prueba se dibuja quieto.
jest.mock('../componentes/Indicador', () => {
  const { View } = jest.requireActual('react-native');
  return { Indicador: () => <View accessibilityLabel="Cargando" /> };
});

const FAMILIAS = new Set<string>(Object.values(fuentes));
const clientes: QueryClient[] = [];

afterEach(() => {
  for (const cliente of clientes.splice(0)) cliente.clear();
});

/** Sesión de prueba: sin nada guardado (anónimo) o con un arrendador ya iniciado. */
async function sesionDePrueba(conArrendador: boolean) {
  const guardado = conArrendador
    ? {
        token: crearToken({ id: 'a1', exp: 4_102_444_800 }),
        rol: 'arrendador' as const,
        usuario: { id: 'a1', nombre: 'Marta Ríos', correo: 'marta@ejemplo.com' },
      }
    : null;
  const controlador = crearControladorSesion({
    almacen: {
      guardar: async () => undefined,
      leer: async () => guardado,
      borrar: async () => undefined,
    },
    limpiarCache: () => undefined,
  });
  await controlador.arrancar();
  return controlador;
}

async function renderizar(
  elemento: ReactElement,
  conArrendador = false,
): Promise<ReactTestRenderer> {
  const controlador = await sesionDePrueba(conArrendador);
  // gcTime infinito: sin el temporizador de limpieza de 5 min que dejaría vivo a Jest.
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clientes.push(cliente);
  let renderizado!: ReactTestRenderer;
  act(() => {
    renderizado = create(
      <QueryClientProvider client={cliente}>
        <SesionProvider controlador={controlador}>{elemento}</SesionProvider>
      </QueryClientProvider>,
    );
  });
  return renderizado;
}

/** Estilo efectivo de cada Text, sumando el de sus Text padres (los anidados heredan). */
function estilosDeTexto(raiz: ReactTestRenderer) {
  return raiz.root.findAllByType(Text).map((nodo) => {
    const cadena: TextStyle[] = [];
    for (let actual: typeof nodo | null = nodo; actual; actual = actual.parent) {
      if (actual.type === Text) cadena.unshift(StyleSheet.flatten(actual.props.style) ?? {});
    }
    return { estilo: Object.assign({}, ...cadena) as TextStyle, nodo };
  });
}

function textos(raiz: ReactTestRenderer): string[] {
  return raiz.root
    .findAllByType(Text)
    .flatMap((n) => (Array.isArray(n.props.children) ? n.props.children : [n.props.children]))
    .filter((c): c is string | number => typeof c === 'string' || typeof c === 'number')
    .map(String);
}

describe.each([
  ['Bienvenida', () => <Bienvenida />],
  ['Diagnóstico', () => <Diagnostico />],
  ['Galería', () => <Galeria />],
  ['Login del arrendador', () => <LoginArrendador />],
  ['Registro del arrendador', () => <RegistroArrendador />],
  ['Login del inquilino', () => <LoginInquilino />],
  ['Revisa tu correo', () => <VerificaCorreo />],
  ['Activar (paso 1)', () => <Activar />],
  ['Activar con enlace', () => <ActivarConEnlace />],
  ['Recuperar contraseña', () => <RecuperarContrasena />],
  ['Restablecer contraseña', () => <RestablecerContrasena />],
  ['Página no disponible', () => <NoEncontrada />],
  ['Panel provisional del arrendador', () => <PanelArrendador />, true],
  ['Contratos del arrendador', () => <ContratosArrendador />, true],
  ['Pagos del arrendador (próximamente)', () => <PagosArrendador />, true],
  ['Más del arrendador', () => <MasArrendador />, true],
  ['Nuevo inmueble', () => <NuevoInmueble />, true],
  ['Contratos provisional del inquilino', () => <ContratosInquilino />, true],
])('%s', (_nombre, pantalla, conArrendador = false) => {
  it('renderiza; todo texto usa Manrope y respeta el tamaño mínimo', async () => {
    const raiz = await renderizar(pantalla(), conArrendador);
    const lista = estilosDeTexto(raiz);
    expect(lista.length).toBeGreaterThan(0);
    for (const { estilo } of lista) {
      expect(FAMILIAS.has(String(estilo.fontFamily))).toBe(true);
      expect(estilo.fontSize ?? 0).toBeGreaterThanOrEqual(12);
      // 12 sp solo para la barra inferior (variante "pestana", seminegrita o negrita).
      if ((estilo.fontSize ?? 0) < 14) {
        expect(estilo.fontSize).toBe(12);
        expect([fuentes.seminegrita, fuentes.negrita]).toContain(estilo.fontFamily);
      }
    }
    for (const entrada of raiz.root.findAllByType(TextInput)) {
      const estilo = StyleSheet.flatten(entrada.props.style) as TextStyle;
      expect(FAMILIAS.has(String(estilo.fontFamily))).toBe(true);
      expect(estilo.fontSize ?? 0).toBeGreaterThanOrEqual(14);
    }
    act(() => raiz.unmount());
  });
});

describe('Galería', () => {
  it('muestra todos los estados, la urgencia y "Vence en N días"', async () => {
    const raiz = await renderizar(<Galeria />);
    const visibles = new Set(textos(raiz));
    for (const mapa of Object.values(MAPAS_ESTADO)) {
      for (const { etiqueta } of Object.values(mapa)) expect(visibles).toContain(etiqueta);
    }
    for (const { etiqueta } of Object.values(URGENCIAS))
      expect(visibles).toContain(etiqueta.toLowerCase());
    expect(visibles).toContain('Vence en 30 días');
    expect(visibles).toContain('Conectando con el servidor…');
    act(() => raiz.unmount());
  });

  it('muestra la barra inferior de los dos roles con la insignia "9+"', async () => {
    const raiz = await renderizar(<Galeria />);
    const visibles = new Set(textos(raiz));
    for (const etiqueta of [
      'Panel',
      'Inmuebles',
      'Contratos',
      'Pagos',
      'Más',
      'Mi panel',
      'Solicitudes',
      '3',
      '9+',
    ]) {
      expect(visibles).toContain(etiqueta);
    }
    act(() => raiz.unmount());
  });
});
