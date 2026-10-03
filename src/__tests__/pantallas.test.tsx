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
import MasInquilino from '../../app/(inquilino)/(pestanas)/mas';
import MiPanel from '../../app/(inquilino)/(pestanas)/mi-panel';
import PagosInquilino from '../../app/(inquilino)/(pestanas)/pagos';
import ReportarPago from '../../app/(inquilino)/reportar-pago';
import SolicitudesInquilino from '../../app/(inquilino)/(pestanas)/solicitudes';
import AgregarContrato from '../../app/(inquilino)/agregar-contrato';
import MisContratos from '../../app/(inquilino)/mis-contratos';
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
import { ContratoSeleccionadoProvider } from '../inquilino/ContratoSeleccionado';
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

const Proveedor = ({ children }: { children: ReactElement }) => (
  <ContratoSeleccionadoProvider>{children}</ContratoSeleccionadoProvider>
);

/**
 * Algo propio de cada pantalla que ya existe al cargar (sin datos del servidor): un texto visible o una
 * etiqueta accesible (campo, indicador de carga). Así "renderiza" no pasa con una pantalla en blanco.
 */
type Esperado = { texto: string } | { etiqueta: string };

const hayEsperado = (raiz: ReactTestRenderer, esperado: Esperado) =>
  'texto' in esperado
    ? textos(raiz).includes(esperado.texto)
    : raiz.root.findAll((n) => n.props.accessibilityLabel === esperado.etiqueta).length > 0;

describe.each<[string, () => ReactElement, boolean, Esperado]>([
  ['Bienvenida', () => <Bienvenida />, false, { texto: '¿Cómo vas a usar RentCheck?' }],
  ['Diagnóstico', () => <Diagnostico />, false, { texto: 'Conectando con el servidor…' }],
  ['Galería', () => <Galeria />, false, { texto: 'Sistema visual Medianoche' }],
  ['Login del arrendador', () => <LoginArrendador />, false, { texto: 'Iniciar sesión' }],
  ['Registro del arrendador', () => <RegistroArrendador />, false, { etiqueta: 'Teléfono' }],
  [
    'Login del inquilino',
    () => <LoginInquilino />,
    false,
    { texto: 'Tengo un código de activación' },
  ],
  ['Revisa tu correo', () => <VerificaCorreo />, false, { etiqueta: 'Código de verificación' }],
  ['Activar (paso 1)', () => <Activar />, false, { etiqueta: 'Código de activación' }],
  [
    'Activar con enlace',
    () => <ActivarConEnlace />,
    false,
    { texto: 'El enlace no es válido. Escribe tu código.' },
  ],
  ['Recuperar contraseña', () => <RecuperarContrasena />, false, { texto: 'Enviar código' }],
  [
    'Restablecer contraseña',
    () => <RestablecerContrasena />,
    false,
    { texto: 'Cambiar contraseña' },
  ],
  [
    'Página no disponible',
    () => <NoEncontrada />,
    false,
    { texto: 'Esta pantalla no está disponible' },
  ],
  ['Panel del arrendador', () => <PanelArrendador />, true, { texto: 'Hola, Marta Ríos' }],
  ['Contratos del arrendador', () => <ContratosArrendador />, true, { texto: 'Contratos' }],
  ['Pagos del arrendador', () => <PagosArrendador />, true, { texto: 'Aprobados' }],
  ['Más del arrendador', () => <MasArrendador />, true, { texto: 'Cerrar sesión' }],
  ['Nuevo inmueble', () => <NuevoInmueble />, true, { etiqueta: 'Matrícula inmobiliaria' }],
  [
    'Mi panel del inquilino',
    () => (
      <Proveedor>
        <MiPanel />
      </Proveedor>
    ),
    true,
    { texto: 'Mi panel' },
  ],
  [
    'Pagos del inquilino',
    () => (
      <Proveedor>
        <PagosInquilino />
      </Proveedor>
    ),
    true,
    { texto: 'Pagos' },
  ],
  [
    // El formulario ("Monto pagado", "Enviar") aparece cuando llegan los datos (se prueba en
    // pagosInquilino.test); al cargar solo existe el indicador, que es lo que se exige aquí.
    'Reportar pago del inquilino',
    () => (
      <Proveedor>
        <ReportarPago />
      </Proveedor>
    ),
    true,
    { etiqueta: 'Cargando' },
  ],
  [
    'Solicitudes del inquilino',
    () => (
      <Proveedor>
        <SolicitudesInquilino />
      </Proveedor>
    ),
    true,
    { texto: 'Solicitudes' },
  ],
  [
    'Más del inquilino',
    () => (
      <Proveedor>
        <MasInquilino />
      </Proveedor>
    ),
    true,
    { texto: 'Mi perfil' },
  ],
  [
    'Mis contratos del inquilino (cargando)',
    () => (
      <Proveedor>
        <MisContratos />
      </Proveedor>
    ),
    true,
    { texto: 'Cargando tus contratos…' },
  ],
  [
    'Agregar contrato con código',
    () => (
      <Proveedor>
        <AgregarContrato />
      </Proveedor>
    ),
    true,
    { etiqueta: 'Código de acceso' },
  ],
])('%s', (_nombre, pantalla, conArrendador, esperado) => {
  it('muestra su contenido propio al cargar', async () => {
    const raiz = await renderizar(pantalla(), conArrendador);
    expect(hayEsperado(raiz, esperado)).toBe(true);
    act(() => raiz.unmount());
  });

  it('renderiza; todo texto usa Manrope y respeta el tamaño mínimo', async () => {
    const raiz = await renderizar(pantalla(), conArrendador);
    const lista = estilosDeTexto(raiz);
    expect(raiz.toJSON()).not.toBeNull();
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
  it('muestra la cabecera de acceso en sus dos variantes', async () => {
    const raiz = await renderizar(<Galeria />);
    const visibles = new Set(textos(raiz));
    expect(visibles).toContain('Cabecera de acceso');
    expect(visibles).toContain('Tus arriendos, claros y al día.');
    expect(visibles).toContain('Crea tu cuenta');
    act(() => raiz.unmount());
  });

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
