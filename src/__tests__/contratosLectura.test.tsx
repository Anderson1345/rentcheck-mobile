// Contratos del arrendador (E5-A): lista con filtros, detalle de solo lectura, documentos y código.
import { Alert, RefreshControl, ScrollView, Share } from 'react-native';
import { act } from 'react-test-renderer';

import ContratosTab from '../../app/(arrendador)/(pestanas)/contratos-arrendador';
import Detalle from '../../app/(arrendador)/contrato/[id]/index';
import { ErrorApi, ErrorSinConexion } from '../api/cliente';
import type { ContratoDetalle, ContratoResumen, DocumentoContrato } from '../api/contratos';
import { botonDe, hayBoton, renderizarPantalla, textosDe } from '../pruebas/pantallas';

jest.setTimeout(60_000);

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDescargar = jest.fn();
const mockCompartir = jest.fn();
const mockBorrar = jest.fn();
const mockCopiar = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
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
jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View testID="codigo-qr" {...props} />,
  };
});
jest.mock('expo-clipboard', () => ({ setStringAsync: (...a: unknown[]) => mockCopiar(...a) }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: (...a: unknown[]) => mockDescargar(...a),
  deleteAsync: (...a: unknown[]) => mockBorrar(...a),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: (...a: unknown[]) => mockCompartir(...a),
}));
jest.mock('../api/cliente', () => ({
  ...jest.requireActual('../api/cliente'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));

type Raiz = Awaited<ReturnType<typeof renderizarPantalla>>['raiz'];

const resumen = (extra: Partial<ContratoResumen> & { id: string }): ContratoResumen => ({
  estado: 'ACTIVO',
  fecha_inicio: '2026-10-01T00:00:00.000Z',
  fecha_fin: '2027-09-30T00:00:00.000Z',
  canon_centavos: 250_000_000,
  vinculado: false,
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  inquilino: { id: 'q1', nombre: 'Camilo Pardo' },
  codigo_acceso: null,
  ...extra,
});
const DETALLE: ContratoDetalle = {
  id: 'c1',
  estado: 'ACTIVO',
  fecha_inicio: '2026-10-01T00:00:00.000Z',
  fecha_fin: '2027-09-30T00:00:00.000Z',
  canon_centavos: 250_000_000,
  tipo_plantilla: 'VIVIENDA_URBANA_LEY_820',
  dia_pago: 5,
  deposito_centavos: null,
  vinculado: false,
  inquilino: { id: 'q1', nombre: 'Camilo Pardo', cedula: '1020304050', telefono: '3001234567' },
  unidad: { id: 'u1', nombre: 'Apto 302', tipo: 'APARTAMENTO' },
  codigo_acceso: { codigo: 'RC-AB3D-9KPX', expira_en: '2099-10-08T12:00:00.000Z' },
  incrementos_ipc: [],
  aviso_no_renovacion: { estado: 'NINGUNO', dado_por: null, dado_en: null, motivo: null },
  terminacion_anticipada: {
    estado: 'NINGUNA',
    solicitada_por: null,
    solicitada_en: null,
    motivo: null,
    fecha_efectiva: null,
  },
};
const DOC: DocumentoContrato = {
  id: 'd1',
  tipo: 'CONTRATO_ORIGINAL',
  version: 1,
  generado_en: '2026-10-01T15:00:00.000Z',
  hash_sha256: 'abc',
  url_firmada: 'https://b.test/s/doc1.pdf?token=SECRETO1',
};

const datos: { lista: ContratoResumen[]; detalle: ContratoDetalle; docs: DocumentoContrato[] } = {
  lista: [],
  detalle: DETALLE,
  docs: [DOC],
};

const esperar = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
  });
const pulsar = async (raiz: Raiz, titulo: string) => {
  await act(async () => {
    botonDe(raiz, titulo).props.onPress();
  });
  await esperar();
};
const porEtiqueta = (raiz: Raiz, etiqueta: string) =>
  raiz.root.find((n) => n.props.accessibilityLabel === etiqueta && !!n.props.onPress);
const qr = (raiz: Raiz) => raiz.root.findAll((n) => n.props.testID === 'codigo-qr')[0];

beforeEach(() => {
  jest.restoreAllMocks();
  for (const m of [
    mockGet,
    mockPost,
    mockPush,
    mockBack,
    mockReplace,
    mockDescargar,
    mockCompartir,
    mockBorrar,
    mockCopiar,
  ]) {
    m.mockReset();
  }
  mockParams = { id: 'c1' };
  Object.assign(datos, { lista: [], detalle: DETALLE, docs: [DOC] });
  mockGet.mockImplementation(async (ruta: string) => {
    if (ruta === '/contratos') return datos.lista;
    if (ruta === '/contratos/c1') return datos.detalle;
    if (ruta === '/contratos/c1/documentos') return datos.docs;
    throw new Error(`GET inesperado ${ruta}`);
  });
  mockDescargar.mockResolvedValue({ status: 200, uri: 'file:///cache/contrato-c1-v1.pdf' });
  mockCompartir.mockResolvedValue(undefined);
  mockBorrar.mockResolvedValue(undefined);
  mockCopiar.mockResolvedValue(true);
});

describe('Pestaña Contratos', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<ContratosTab />);
    await esperar();
    return r;
  };

  it('sin contratos: mensaje propio y botón "Nuevo contrato"', async () => {
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Aún no tienes contratos');
    await pulsar(raiz, 'Nuevo contrato');
    expect(mockPush).toHaveBeenCalledWith('/contrato/nuevo');
  });

  it('cargando: esqueleto', async () => {
    mockGet.mockReturnValue(new Promise(() => undefined));
    const { raiz } = await renderizarPantalla(<ContratosTab />);
    expect(
      raiz.root.findAll((n) => n.props.accessibilityRole === 'progressbar').length,
    ).toBeGreaterThan(0);
  });

  it('error: mensaje y Reintentar', async () => {
    mockGet.mockRejectedValueOnce(new ErrorSinConexion());
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain(
      'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
    );
    await pulsar(raiz, 'Reintentar');
    expect(textosDe(raiz)).toContain('Aún no tienes contratos');
  });

  it('con contratos: unidad, inquilino, estado, fechas, canon y vínculo; toca para abrir el detalle', async () => {
    datos.lista = [
      resumen({ id: 'a', vinculado: true }),
      resumen({
        id: 'b',
        estado: 'PROGRAMADO',
        unidad: { id: 'u2', nombre: 'Local 1', tipo: 'LOCAL' },
        inquilino: { id: 'q2', nombre: 'Laura Mejía' },
      }),
    ];
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toContain('Apto 302');
    expect(textos).toContain('Camilo Pardo');
    expect(textos).toContain('Activo');
    expect(textos).toContain('Programado');
    expect(textos).toContain('Vinculado');
    expect(textos).toContain('Sin vincular');
    expect(textos).toContain('01/10/2026 – 30/09/2027');
    expect(textos).toContain('$ 2.500.000');
    await pulsar(raiz, 'Local 1');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/contrato/[id]', params: { id: 'b' } });
    // Con contratos, el botón "Nuevo contrato" sigue a la vista.
    expect(hayBoton(raiz, 'Nuevo contrato')).toBe(true);
  });

  it('filtros: Activos, Programados, Finalizados y Todos; el vacío del filtro es otro mensaje', async () => {
    datos.lista = [
      resumen({ id: 'a', unidad: { id: 'u1', nombre: 'Unidad A', tipo: 'CASA' } }),
      resumen({
        id: 'p',
        estado: 'PROGRAMADO',
        unidad: { id: 'u2', nombre: 'Unidad P', tipo: 'CASA' },
      }),
      resumen({
        id: 'v',
        estado: 'VENCIDO',
        unidad: { id: 'u3', nombre: 'Unidad V', tipo: 'CASA' },
      }),
      resumen({
        id: 'x',
        estado: 'CANCELADO',
        unidad: { id: 'u4', nombre: 'Unidad X', tipo: 'CASA' },
      }),
    ];
    const { raiz } = await montar();
    const filtrar = async (e: string) => act(async () => porEtiqueta(raiz, e).props.onPress());

    await filtrar('Activos');
    expect(textosDe(raiz)).toEqual(expect.arrayContaining(['Unidad A']));
    expect(textosDe(raiz)).not.toContain('Unidad P');
    await filtrar('Programados');
    expect(textosDe(raiz)).toContain('Unidad P');
    expect(textosDe(raiz)).not.toContain('Unidad A');
    await filtrar('Finalizados');
    expect(textosDe(raiz)).toContain('Unidad V');
    expect(textosDe(raiz)).toContain('Unidad X');
    expect(textosDe(raiz)).not.toContain('Unidad A');
    await filtrar('Todos');
    expect(textosDe(raiz)).toContain('Unidad A');
  });

  it('ningún contrato en el filtro: mensaje distinto de "no tienes contratos"', async () => {
    datos.lista = [resumen({ id: 'a' })];
    const { raiz } = await montar();
    await act(async () => porEtiqueta(raiz, 'Finalizados').props.onPress());
    expect(textosDe(raiz)).toContain('Ningún contrato en este filtro');
    expect(textosDe(raiz)).not.toContain('Aún no tienes contratos');
  });

  it('arrastrar para refrescar vuelve a pedir la lista', async () => {
    const { raiz } = await montar();
    const antes = mockGet.mock.calls.length;
    const control = raiz.root.findByType(ScrollView).props.refreshControl;
    expect(control.type).toBe(RefreshControl);
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(mockGet.mock.calls.length).toBeGreaterThan(antes);
  });
});

describe('Detalle del contrato', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Detalle />);
    await esperar();
    return r;
  };

  it('datos: estado, unidad, plantilla, fechas, canon, día de pago e inquilino; vivienda sin depósito', async () => {
    datos.detalle = { ...DETALLE, deposito_centavos: 500_000_000 };
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toContain('Activo');
    expect(textos).toContain('Apto 302');
    expect(textos).toContain('Vivienda urbana (Ley 820 de 2003)');
    expect(textos).toContain('1 de octubre de 2026 al 30 de septiembre de 2027');
    expect(textos).toContain('Canon: $ 2.500.000');
    expect(textos).toContain('Día de pago: 5');
    expect(textos).toContain('Camilo Pardo');
    expect(textos).toContain('Cédula 1020304050');
    expect(textos).toContain('Teléfono 3001234567');
    expect(textos.join('|')).not.toContain('Depósito');
  });

  it('local o parqueadero: muestra el depósito; el correo solo si el servidor lo envía', async () => {
    datos.detalle = {
      ...DETALLE,
      tipo_plantilla: 'LOCAL_COMERCIAL',
      deposito_centavos: 500_000_000,
      inquilino: { ...DETALLE.inquilino, correo: 'camilo@x.co' },
    };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Depósito: $ 5.000.000');
    expect(textosDe(raiz)).toContain('Correo camilo@x.co');
    const sin = await montar();
    expect(sin.raiz).toBeDefined();
  });

  it('historial de incrementos de IPC en solo lectura', async () => {
    datos.detalle = {
      ...DETALLE,
      incrementos_ipc: [
        {
          id: 'i1',
          fecha_aplicacion: '2027-10-01T00:00:00.000Z',
          canon_anterior_centavos: 250_000_000,
          canon_nuevo_centavos: 260_000_000,
          porcentaje_ipc_aplicado: '4',
        },
      ],
    };
    const { raiz } = await montar();
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Incrementos de IPC');
    expect(todo).toContain('$ 2.500.000 → $ 2.600.000');
    expect(todo).toContain('01/10/2027');
  });

  it('sin incrementos no hay sección', async () => {
    const { raiz } = await montar();
    expect(textosDe(raiz).join('|')).not.toContain('Incrementos de IPC');
  });

  it('aviso de no renovación y terminación anticipada: solo información, sin botones de aviso ni de terminación', async () => {
    datos.detalle = {
      ...DETALLE,
      aviso_no_renovacion: {
        estado: 'DADO',
        dado_por: 'INQUILINO',
        dado_en: '2026-12-01T10:00:00.000Z',
        motivo: 'Me mudo',
      },
      terminacion_anticipada: {
        estado: 'SOLICITADA',
        solicitada_por: 'ARRENDADOR',
        solicitada_en: '2026-12-02T10:00:00.000Z',
        motivo: 'Venta',
        fecha_efectiva: '2027-01-31T00:00:00.000Z',
      },
    };
    const { raiz } = await montar();
    const todo = textosDe(raiz).join('|');
    expect(todo).toContain('Aviso de no renovación dado por el inquilino el 01/12/2026');
    expect(todo).toContain('Me mudo');
    expect(todo).toContain('Terminación anticipada solicitada por el arrendador');
    expect(todo).toContain('31/01/2027');
    // Sin los booleanos puede_dar / puede_cancelar del servidor no hay botones de aviso; la
    // terminación anticipada llega en E5-C.
    for (const accion of [
      'Cancelar aviso',
      'Dar aviso de no renovación',
      'Confirmar terminación',
      'Solicitar terminación',
    ]) {
      expect(hayBoton(raiz, accion)).toBe(false);
    }
  });

  it('"Fotos de inventario" abre la pantalla de inventario (entrega)', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Fotos de inventario');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/contrato/[id]/inventario',
      params: { id: 'c1' },
    });
  });

  it('404: "Contrato no encontrado" con botón para volver', async () => {
    mockGet.mockImplementation(async (ruta: string) => {
      if (ruta === '/contratos/c1') {
        throw new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'x' });
      }
      return [];
    });
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Contrato no encontrado');
    await pulsar(raiz, 'Volver');
    expect(mockBack).toHaveBeenCalled();
  });

  it('otro error: mensaje y Reintentar', async () => {
    mockGet.mockImplementationOnce(async () => {
      throw new ErrorSinConexion();
    });
    const { raiz } = await montar();
    await pulsar(raiz, 'Reintentar');
    expect(textosDe(raiz)).toContain('Camilo Pardo');
  });
});

describe('Detalle: documentos', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Detalle />);
    await esperar();
    return r;
  };

  it('lista las versiones con tipo legible, versión y fecha', async () => {
    datos.docs = [
      DOC,
      {
        ...DOC,
        id: 'd2',
        tipo: 'OTROSI_INCREMENTO',
        version: 2,
        generado_en: '2027-10-01T15:00:00.000Z',
      },
    ];
    const { raiz } = await montar();
    const textos = textosDe(raiz);
    expect(textos).toContain('Contrato original');
    expect(textos).toContain('Versión 1 · 01/10/2026');
    expect(textos).toContain('Otrosí por incremento');
    expect(textos).toContain('Versión 2 · 01/10/2027');
  });

  it('"Ver y compartir": pide la lista fresca, descarga al caché y abre el selector; funciona dos veces', async () => {
    const { raiz } = await montar();
    const pedidos = () =>
      mockGet.mock.calls.filter((c) => c[0] === '/contratos/c1/documentos').length;
    const antes = pedidos();

    await pulsar(raiz, 'Ver y compartir');
    expect(pedidos()).toBe(antes + 1);
    expect(mockDescargar).toHaveBeenCalledWith(
      'https://b.test/s/doc1.pdf?token=SECRETO1',
      'file:///cache/contrato-c1-v1.pdf',
    );
    expect(mockCompartir).toHaveBeenCalledWith(
      'file:///cache/contrato-c1-v1.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );

    // Segunda vez: la URL firmada nueva viene de otra lista fresca.
    datos.docs = [{ ...DOC, url_firmada: 'https://b.test/s/doc1.pdf?token=SECRETO2' }];
    await pulsar(raiz, 'Ver y compartir');
    expect(mockDescargar).toHaveBeenCalledTimes(2);
    expect(mockDescargar.mock.calls[1][0]).toContain('SECRETO2');
    expect(mockCompartir).toHaveBeenCalledTimes(2);
  });

  it('el archivo descargado se borra del caché después de compartirlo', async () => {
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    expect(mockBorrar).toHaveBeenCalledWith('file:///cache/contrato-c1-v1.pdf', {
      idempotent: true,
    });
  });

  it('doble toque: una sola descarga', async () => {
    let terminar!: (v: unknown) => void;
    mockDescargar.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    const boton = raiz.root.find(
      (n) => n.props.accessibilityRole === 'button' && n.props.accessibilityState?.busy === true,
    );
    await act(async () => boton.props.onPress());
    await act(async () => boton.props.onPress());
    expect(mockDescargar).toHaveBeenCalledTimes(1);
    await act(async () => terminar({ status: 200, uri: 'file:///cache/contrato-c1-v1.pdf' }));
    await esperar();
  });

  it('sin url_firmada: "Archivo no disponible", sin romper la pantalla', async () => {
    datos.docs = [{ ...DOC, url_firmada: null }];
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Archivo no disponible');
    expect(hayBoton(raiz, 'Ver y compartir')).toBe(false);
    expect(textosDe(raiz)).toContain('Camilo Pardo');
  });

  it('la lista fresca trae el archivo sin URL: avisa "Archivo no disponible"', async () => {
    const { raiz } = await montar();
    datos.docs = [{ ...DOC, url_firmada: null }];
    await pulsar(raiz, 'Ver y compartir');
    expect(mockDescargar).not.toHaveBeenCalled();
    expect(textosDe(raiz)).toContain('Archivo no disponible');
  });

  it('si falla la descarga: mensaje claro (sin URL) y Reintentar', async () => {
    mockDescargar.mockRejectedValueOnce(
      new Error('fallo https://b.test/s/doc1.pdf?token=SECRETO1'),
    );
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    const textos = textosDe(raiz);
    expect(textos).toContain('No pudimos descargar el documento. Inténtalo de nuevo.');
    expect(textos.join('|')).not.toMatch(/SECRETO|b\.test/);
    await pulsar(raiz, 'Reintentar');
    expect(mockCompartir).toHaveBeenCalledTimes(1);
  });

  it('un estado HTTP de error al descargar también es un fallo', async () => {
    mockDescargar.mockResolvedValueOnce({ status: 403, uri: 'file:///cache/x.pdf' });
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    expect(textosDe(raiz)).toContain('No pudimos descargar el documento. Inténtalo de nuevo.');
    expect(mockCompartir).not.toHaveBeenCalled();
  });

  it('nada sensible en los logs (URL firmada, código, cédula)', async () => {
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    const { raiz } = await montar();
    await pulsar(raiz, 'Ver y compartir');
    const impreso = JSON.stringify(espias.flatMap((e) => e.mock.calls));
    expect(impreso).not.toMatch(/SECRETO|RC-AB3D|1020304050/);
  });
});

describe('Detalle: código de acceso', () => {
  const montar = async () => {
    const r = await renderizarPantalla(<Detalle />);
    await esperar();
    return r;
  };

  it('sin vincular y vigente: texto, QR solo con el código, copiar y compartir', async () => {
    const compartir = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('RC-AB3D-9KPX');
    expect(qr(raiz).props.value).toBe('RC-AB3D-9KPX');
    await pulsar(raiz, 'Copiar código');
    expect(mockCopiar).toHaveBeenCalledWith('RC-AB3D-9KPX');
    expect(textosDe(raiz)).toContain('Copiado');
    await pulsar(raiz, 'Compartir código');
    expect(compartir.mock.calls[0][0].message).toContain('Hola Camilo Pardo');
    expect(compartir.mock.calls[0][0].message).toContain('RC-AB3D-9KPX');
  });

  it('vinculado: sin código ni QR, con la explicación', async () => {
    datos.detalle = { ...DETALLE, vinculado: true, codigo_acceso: null };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('El inquilino ya vinculó este contrato.');
    expect(qr(raiz)).toBeUndefined();
    expect(hayBoton(raiz, 'Regenerar código')).toBe(false);
  });

  it('vinculado aunque el servidor aún mande el código: no se muestra', async () => {
    datos.detalle = { ...DETALLE, vinculado: true };
    const { raiz } = await montar();
    expect(textosDe(raiz).join('|')).not.toContain('RC-AB3D-9KPX');
    expect(qr(raiz)).toBeUndefined();
  });

  it('expirado: lo dice y ofrece regenerar (sin QR)', async () => {
    datos.detalle = {
      ...DETALLE,
      codigo_acceso: { codigo: 'RC-AB3D-9KPX', expira_en: '2020-01-01T00:00:00.000Z' },
    };
    const { raiz } = await montar();
    expect(textosDe(raiz)).toContain('Este código expiró.');
    expect(qr(raiz)).toBeUndefined();
    expect(hayBoton(raiz, 'Regenerar código')).toBe(true);
  });

  it('regenerar pide confirmación, cambia el código mostrado y el doble toque no lo repite', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    let terminar!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => (terminar = r)));
    const { raiz } = await montar();

    await pulsar(raiz, 'Regenerar código');
    expect(alerta.mock.calls[0][0]).toBe('Regenerar código');
    expect(alerta.mock.calls[0][1]).toBe('El código anterior dejará de servir.');
    expect(mockPost).not.toHaveBeenCalled();

    const confirmar = alerta.mock.calls[0][2]?.[1];
    await act(async () => confirmar?.onPress?.());
    await act(async () => confirmar?.onPress?.());
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/contratos/c1/regenerar-codigo');

    await act(async () =>
      terminar({ codigo: 'RC-ZZZZ-2222', expira_en: '2099-11-01T12:00:00.000Z' }),
    );
    await esperar();
    expect(textosDe(raiz)).toContain('RC-ZZZZ-2222');
    expect(textosDe(raiz).join('|')).not.toContain('RC-AB3D-9KPX');
    expect(qr(raiz).props.value).toBe('RC-ZZZZ-2222');
  });

  it('cancelar la confirmación no regenera', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { raiz } = await montar();
    await pulsar(raiz, 'Regenerar código');
    expect(alerta.mock.calls[0][2]?.[0].text).toBe('Cancelar');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('si regenerar falla: mensaje en español, sin el código', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPost.mockRejectedValue(
      new ErrorApi({ status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'RC-AB3D-9KPX no' }),
    );
    const { raiz } = await montar();
    await pulsar(raiz, 'Regenerar código');
    await act(async () => alerta.mock.calls[0][2]?.[1].onPress?.());
    await esperar();
    expect(textosDe(raiz)).toContain(
      'No encontrado. Puede que ya no exista o que no tengas acceso.',
    );
    expect(textosDe(raiz)).toContain('RC-AB3D-9KPX');
  });
});
