import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { marcarPortadaCambiada } from '../../inmuebles/claveImagen';
import { colores } from '../../tema';
import { PortadaInmueble } from '../inmuebles/PortadaInmueble';

const imagenes = (raiz: ReactTestRenderer) => raiz.root.findAllByType(Image);
const marcador = (raiz: ReactTestRenderer) =>
  raiz.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'portada-marcador');

async function montar(elemento: React.ReactElement) {
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = create(elemento);
  });
  return raiz;
}

describe('PortadaInmueble', () => {
  it('con URL: muestra la imagen de esa URL', async () => {
    const raiz = await montar(<PortadaInmueble url="https://firmada/a" variante="grande" />);
    expect(imagenes(raiz)).toHaveLength(1);
    expect(imagenes(raiz)[0].props.source).toMatchObject({ uri: 'https://firmada/a' });
    expect(marcador(raiz)).toHaveLength(0);
  });

  it('sin URL: marcador con el motivo de curvas y ninguna imagen', async () => {
    const raiz = await montar(<PortadaInmueble url={null} variante="miniatura" />);
    expect(imagenes(raiz)).toHaveLength(0);
    expect(marcador(raiz)).toHaveLength(1);
  });

  it('URL expirada (la imagen falla): cambia al marcador y pide refrescar UNA vez, sin cuadro roto', async () => {
    const alFallar = jest.fn();
    const raiz = await montar(
      <PortadaInmueble url="https://firmada/vencida" variante="grande" alFallarUrl={alFallar} />,
    );

    await act(async () => imagenes(raiz)[0].props.onError({ nativeEvent: { error: 'HTTP 403' } }));

    expect(alFallar).toHaveBeenCalledTimes(1);
    expect(imagenes(raiz)).toHaveLength(0);
    expect(marcador(raiz)).toHaveLength(1);
  });

  it('cuando llega una URL nueva, vuelve a intentar con la imagen', async () => {
    const raiz = await montar(
      <PortadaInmueble url="https://firmada/vencida" variante="grande" alFallarUrl={jest.fn()} />,
    );
    await act(async () => imagenes(raiz)[0].props.onError({}));
    expect(imagenes(raiz)).toHaveLength(0);

    await act(async () => {
      raiz.update(
        <PortadaInmueble url="https://firmada/nueva" variante="grande" alFallarUrl={jest.fn()} />,
      );
    });

    expect(imagenes(raiz)).toHaveLength(1);
    expect(imagenes(raiz)[0].props.source).toMatchObject({ uri: 'https://firmada/nueva' });
  });

  it('no entra en bucle: tras un refresco automático, un segundo fallo deja el marcador y no pide más', async () => {
    const alFallar = jest.fn();
    const elemento = (url: string) => (
      <PortadaInmueble url={url} variante="grande" alFallarUrl={alFallar} />
    );
    const raiz = await montar(elemento('https://firmada/1'));

    await act(async () => imagenes(raiz)[0].props.onError({}));
    await act(async () => raiz.update(elemento('https://firmada/2')));
    await act(async () => imagenes(raiz)[0].props.onError({}));

    expect(alFallar).toHaveBeenCalledTimes(1);
    expect(imagenes(raiz)).toHaveLength(0);
    expect(marcador(raiz)).toHaveLength(1);
  });

  it('una imagen local de vista previa (file://) no cuenta como URL firmada y se muestra tal cual', async () => {
    const raiz = await montar(<PortadaInmueble url="file:///cache/f.jpg" variante="grande" />);
    expect(imagenes(raiz)[0].props.source).toMatchObject({ uri: 'file:///cache/f.jpg' });
  });

  it('la imagen es decorativa para el lector de pantalla salvo la descripción dada', async () => {
    const raiz = await montar(
      <PortadaInmueble url="https://firmada/a" variante="grande" descripcion="Foto de Calle 45" />,
    );
    expect(imagenes(raiz)[0].props.accessibilityLabel).toBe('Foto de Calle 45');
  });
});

describe('PortadaInmueble: caché estable y sin parpadeo oscuro', () => {
  const firmada = (token: string) =>
    `https://bucket.test/sign/inmuebles/i1/portada.jpg?token=${token}`;

  it('con cachePolicy memory-disk y una transición corta', async () => {
    const raiz = await montar(
      <PortadaInmueble url={firmada('A')} inmuebleId="i1" variante="grande" />,
    );
    const imagen = imagenes(raiz)[0];
    expect(imagen.props.cachePolicy).toBe('memory-disk');
    expect(imagen.props.transition).toBe(150);
  });

  it('si solo cambia la firma de la URL, la clave de caché es la misma; si cambia la foto, no', async () => {
    const raiz = await montar(
      <PortadaInmueble url={firmada('A')} inmuebleId="i1" variante="grande" />,
    );
    const clave = imagenes(raiz)[0].props.source.cacheKey;
    expect(clave).toEqual(expect.any(String));

    await act(async () => {
      raiz.update(<PortadaInmueble url={firmada('B')} inmuebleId="i1" variante="grande" />);
    });
    expect(imagenes(raiz)[0].props.source.cacheKey).toBe(clave);

    marcarPortadaCambiada('i1');
    await act(async () => {
      raiz.update(<PortadaInmueble url={firmada('C')} inmuebleId="i1" variante="grande" />);
    });
    expect(imagenes(raiz)[0].props.source.cacheKey).not.toBe(clave);
  });

  it('el fondo mientras carga es neutro (no el bloque oscuro de tinta)', async () => {
    const raiz = await montar(
      <PortadaInmueble url={firmada('A')} inmuebleId="i1" variante="miniatura" />,
    );
    const contenedor = raiz.root.findAll((n) => typeof n.type === 'string')[0];
    expect(StyleSheet.flatten(contenedor.props.style).backgroundColor).not.toBe(colores.tinta);

    const sinFoto = await montar(<PortadaInmueble url={null} variante="miniatura" />);
    const marco = sinFoto.root.findAll((n) => typeof n.type === 'string')[0];
    expect(StyleSheet.flatten(marco.props.style).backgroundColor).toBe(colores.tinta);
  });
});
