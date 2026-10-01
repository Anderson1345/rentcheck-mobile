// Galería de pruebas del sistema visual Medianoche: cada componente y gráfica con los datos de
// ejemplo de la hoja de componentes del diseño y todos sus estados. No usa la API.
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarRelieve, type TamanoAvatar } from '@/componentes/avatar/AvatarRelieve';
import { NUMERO_VARIANTES, seleccionarRelieve } from '@/componentes/avatar/seleccion';
import { Boton } from '@/componentes/Boton';
import { BotonIcono } from '@/componentes/BotonIcono';
import { CabeceraTinta, ContenidoBajoCabecera, TituloCabecera } from '@/componentes/CabeceraTinta';
import { CampoDinero } from '@/componentes/CampoDinero';
import { ChipEstado, type PropsChipEstado } from '@/componentes/ChipEstado';
import { ControlSegmentado } from '@/componentes/ControlSegmentado';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { MAPAS_ESTADO, type TipoEstado, URGENCIAS, type Urgencia } from '@/componentes/estados';
import { FilaLista } from '@/componentes/FilaLista';
import { AnilloRecaudo } from '@/componentes/graficas/AnilloRecaudo';
import { GraficaAreaIngresos } from '@/componentes/graficas/GraficaAreaIngresos';
import { LineaTiempoPeriodos, type PeriodoLinea } from '@/componentes/graficas/LineaTiempoPeriodos';
import { promedio } from '@/componentes/graficas/geometria';
import { MiniPlanoOcupacion } from '@/componentes/graficas/MiniPlanoOcupacion';
import { Icono, NOMBRES_ICONOS } from '@/componentes/iconos/Icono';
import { TRAZOS_ICONOS } from '@/componentes/iconos/trazos';
import { Marca } from '@/componentes/Marca';
import { MotivoCurvas } from '@/componentes/motivo/MotivoCurvas';
import { PESTANAS_ARRENDADOR, PESTANAS_INQUILINO } from '@/componentes/navegacion/configuracion';
import { NavInferior } from '@/componentes/navegacion/NavInferior';
import { PantallaConectando } from '@/componentes/PantallaConectando';
import { Superficie } from '@/componentes/Superficie';
import { Texto, type VarianteTexto } from '@/componentes/Texto';
import { blancoAlfa, colores, coloresEstado, espaciado, radios, sombras, tintaAlfa } from '@/tema';
import { centavosAPesosTexto } from '@/utilidades/dinero';

// ---------- Datos de ejemplo (hoja de componentes y pantallas del diseño) ----------

const MESES_INGRESOS = [
  { etiqueta: 'mar', centavos: 1_680_000_000 },
  { etiqueta: 'abr', centavos: 1_760_000_000 },
  { etiqueta: 'may', centavos: 1_840_000_000 },
  { etiqueta: 'jun', centavos: 1_900_000_000 },
  { etiqueta: 'jul', centavos: 1_810_000_000 },
  { etiqueta: 'ago', centavos: 1_865_000_000 },
  { etiqueta: 'sep', centavos: 1_365_000_000 },
];

/** Promedio de los meses cerrados (sin el mes en curso), redondeado a centavos enteros. */
const PROMEDIO_CERRADOS = Math.round(promedio(MESES_INGRESOS.slice(0, -1).map((m) => m.centavos)));

const PLANO = [
  {
    nombre: 'Los Almendros',
    unidades: [
      { etiqueta: '601', estado: 'OCUPADA' as const },
      { etiqueta: '501', estado: 'EN_MORA' as const },
      { etiqueta: '402', estado: 'OCUPADA' as const },
      { etiqueta: '302', estado: 'OCUPADA' as const },
      { etiqueta: '201', estado: 'OCUPADA' as const },
      { etiqueta: '101', estado: 'LIBRE' as const },
    ],
  },
  { nombre: 'Laureles', unidades: [{ etiqueta: 'Casa', estado: 'OCUPADA' as const }] },
  { nombre: 'Local 53', unidades: [{ etiqueta: 'Local', estado: 'OCUPADA' as const }] },
];

const PERIODOS: PeriodoLinea[] = [
  { inicial: 'N', mes: 'noviembre', estado: 'PAGADO' },
  { inicial: 'D', mes: 'diciembre', estado: 'PAGADO' },
  { inicial: 'E', mes: 'enero', estado: 'PAGADO' },
  { inicial: 'F', mes: 'febrero', estado: 'PAGADO' },
  { inicial: 'M', mes: 'marzo', estado: 'PAGADO' },
  { inicial: 'A', mes: 'abril', estado: 'PAGADO' },
  { inicial: 'M', mes: 'mayo', estado: 'PARCIAL' },
  { inicial: 'J', mes: 'junio', estado: 'PAGADO' },
  { inicial: 'J', mes: 'julio', estado: 'PAGADO' },
  { inicial: 'A', mes: 'agosto', estado: 'EN_REVISION' },
  { inicial: 'S', mes: 'septiembre', estado: 'VENCIDO', actual: true },
  { inicial: 'O', mes: 'octubre', estado: 'PENDIENTE' },
];

const PERSONAS = [
  { nombre: 'Marta Ríos', detalle: 'Arrendadora' },
  { nombre: 'Camilo Pardo', detalle: 'Apto 302' },
  { nombre: 'Laura Mejía', detalle: 'Apto 501' },
  { nombre: 'Paula Herrera', detalle: 'Apto 601' },
  { nombre: 'Andrés Velásquez', detalle: 'Casa Laureles' },
  { nombre: 'Comercial Norte S.A.S.', detalle: 'Local Calle 53' },
];

/** Un nombre de ejemplo por cada una de las 12 variantes (búsqueda determinista). */
const NOMBRES_POR_VARIANTE: string[] = (() => {
  const encontrados: string[] = [];
  for (let i = 0; encontrados.filter(Boolean).length < NUMERO_VARIANTES && i < 5000; i++) {
    const nombre = `Persona ${i}`;
    const { variante } = seleccionarRelieve(nombre);
    if (!encontrados[variante]) encontrados[variante] = nombre;
  }
  return encontrados;
})();

const ESCALA: { variante: VarianteTexto; muestra: string }[] = [
  { variante: 'cifraProtagonista', muestra: '$ 13.650.000' },
  { variante: 'cifraMedia', muestra: '78 %' },
  { variante: 'titulo', muestra: 'Título de sección' },
  { variante: 'tituloSeccion', muestra: 'Pendientes' },
  { variante: 'valorGrande', muestra: '1.850.000' },
  { variante: 'valor', muestra: '$ 1.850.000' },
  { variante: 'cuerpoFuerte', muestra: 'Botón y énfasis' },
  { variante: 'cuerpo', muestra: 'Texto de cuerpo para párrafos.' },
  { variante: 'filaTitulo', muestra: 'Paula Herrera · 601' },
  { variante: 'etiqueta', muestra: 'Etiqueta' },
  { variante: 'secundario', muestra: 'Texto secundario y ayudas' },
  { variante: 'pestana', muestra: 'Pestaña (12 sp, solo barra inferior)' },
];

const MUESTRAS_COLOR = [
  { nombre: 'Tinta', valor: colores.tinta },
  { nombre: 'Capa', valor: colores.tintaCapa },
  { nombre: 'Lima', valor: colores.lima },
  { nombre: 'Duotono', valor: colores.limaDuotono },
  { nombre: 'Fondo', valor: colores.fondo },
  { nombre: 'Superficie', valor: colores.superficie },
  { nombre: 'Texto', valor: colores.texto },
  { nombre: 'Secundario', valor: colores.textoSecundario },
  { nombre: 'Éxito', valor: coloresEstado.exito.senal },
  { nombre: 'Advertencia', valor: coloresEstado.advertencia.senal },
  { nombre: 'Peligro', valor: coloresEstado.peligro.senal },
  { nombre: 'Información', valor: coloresEstado.informacion.senal },
];

const TITULOS_ESTADO: Record<TipoEstado, string> = {
  pago: 'Pago reportado',
  periodo: 'Período mensual',
  pagoContrato: 'Pago del contrato',
  contrato: 'Contrato',
  vinculo: 'Vínculo',
  unidad: 'Unidad',
  mantenimiento: 'Mantenimiento',
};

// ---------- Piezas de la galería ----------

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <View style={estilos.seccion}>
      <View style={estilos.encabezadoSeccion}>
        <Texto variante="titulo" accessibilityRole="header">
          {titulo}
        </Texto>
        {descripcion ? (
          <Texto variante="secundario" color={colores.textoSecundario}>
            {descripcion}
          </Texto>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Rotulo({ children }: { children: string }) {
  return (
    <Texto variante="etiqueta" color={colores.textoFuerte}>
      {children}
    </Texto>
  );
}

function BloqueTinta({ children }: { children: ReactNode }) {
  return (
    <View style={estilos.bloqueTinta}>
      <MotivoCurvas opacidad={0.1} />
      {children}
    </View>
  );
}

function ChipsDeTipo({ tipo, sobre }: { tipo: TipoEstado; sobre?: 'claro' | 'tinta' }) {
  // Se recorre cada mapa para que la galería muestre siempre todos los estados.
  const estados = Object.keys(MAPAS_ESTADO[tipo]);
  return (
    <View style={estilos.envolver}>
      {estados.map((estado) => (
        <ChipEstado key={estado} {...({ tipo, estado } as PropsChipEstado)} sobre={sobre} />
      ))}
    </View>
  );
}

export default function Galeria() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<'validar' | 'vencidos' | 'historial'>('validar');
  const [monto, setMonto] = useState<number | null>(185_000_000);
  const [montoVacio, setMontoVacio] = useState<number | null>(null);
  const [pestanaArrendador, setPestanaArrendador] = useState('pagos');
  const [pestanaInquilino, setPestanaInquilino] = useState('mi-panel');
  const [cargando, setCargando] = useState(false);

  function simularCarga() {
    setCargando(true);
    setTimeout(() => setCargando(false), 2000);
  }

  return (
    <View style={estilos.pantalla}>
      <CabeceraTinta conSolapa>
        <TituloCabecera
          titulo="Galería"
          subtitulo="Sistema visual Medianoche"
          onVolver={() => router.back()}
        />
      </CabeceraTinta>

      <ContenidoBajoCabecera style={estilos.cuerpo}>
        <ScrollView
          contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.xxl }]}
        >
          {/* ---------- Cabecera de tinta ---------- */}
          <Seccion
            titulo="Cabecera de tinta"
            descripcion="Motivo de curvas de nivel, cifra protagonista y anillo de recaudo."
          >
            <View style={estilos.cabeceraEjemplo}>
              <MotivoCurvas />
              <View style={estilos.filaSaludo}>
                <AvatarRelieve nombre="Marta Ríos" tamano={40} />
                <View style={estilos.flex}>
                  <Texto variante="secundario" color={blancoAlfa(0.64)}>
                    Hola, Marta
                  </Texto>
                  <Texto variante="cuerpoFuerte" color={colores.sobreTinta}>
                    Septiembre 2026
                  </Texto>
                </View>
                <BotonIcono
                  icono="alerta"
                  etiqueta="Alertas"
                  sobreTinta
                  conPunto
                  onPress={() => undefined}
                />
              </View>
              <View style={estilos.cifra}>
                <Texto variante="etiqueta" color={blancoAlfa(0.68)}>
                  Recaudado en septiembre
                </Texto>
                <View style={estilos.filaCifra}>
                  <Texto variante="titulo" color={blancoAlfa(0.5)}>
                    $
                  </Texto>
                  <Texto variante="cifraProtagonista" color={colores.sobreTinta} cifras>
                    13.650.000
                  </Texto>
                </View>
                <Texto variante="secundario" color={blancoAlfa(0.62)} cifras>
                  de {centavosAPesosTexto(1_760_000_000)} esperados
                </Texto>
              </View>
              <AnilloRecaudo
                aprobadoCentavos={1_365_000_000}
                enRevisionCentavos={335_000_000}
                sinReportarCentavos={60_000_000}
              />
            </View>
          </Seccion>

          {/* ---------- Marca, tipografía y color ---------- */}
          <Seccion
            titulo="Marca y tipografía"
            descripcion="Manrope. Cifras con ancho fijo. Mínimo 14 sp (12 sp solo en la barra inferior)."
          >
            <BloqueTinta>
              <Marca tamano="mediana" />
            </BloqueTinta>
            <Superficie style={estilos.pila}>
              {ESCALA.map(({ variante, muestra }) => (
                <View key={variante} style={estilos.filaEscala}>
                  <Texto variante="secundario" color={colores.textoSecundario}>
                    {variante}
                  </Texto>
                  <Texto variante={variante} cifras>
                    {muestra}
                  </Texto>
                </View>
              ))}
            </Superficie>
          </Seccion>

          <Seccion titulo="Color">
            <View style={estilos.envolver}>
              {MUESTRAS_COLOR.map((m) => (
                <View key={m.nombre} style={estilos.muestraColor}>
                  <View style={[estilos.cuadroColor, { backgroundColor: m.valor }]} />
                  <Texto variante="secundario">{m.nombre}</Texto>
                  <Texto variante="secundario" color={colores.textoSecundario}>
                    {m.valor}
                  </Texto>
                </View>
              ))}
            </View>
          </Seccion>

          {/* ---------- Botones ---------- */}
          <Seccion
            titulo="Botones"
            descripcion="Alto 54 dp, radio 16 dp. Mantén presionado para ver el estado presionado (más oscuro, escala 0,98)."
          >
            <Superficie style={estilos.pila}>
              <Rotulo>Primario</Rotulo>
              <Boton titulo="Aprobar" icono="aprobar" ancho="completo" onPress={() => undefined} />
              <Boton
                titulo="Aprobar"
                icono="aprobar"
                ancho="completo"
                deshabilitado
                onPress={() => undefined}
              />
              <Boton
                titulo="Aprobar"
                tituloCargando="Aprobando…"
                icono="aprobar"
                ancho="completo"
                cargando={cargando}
                onPress={simularCarga}
              />
              <Texto variante="secundario" color={colores.textoSecundario}>
                Toca el tercero para verlo cargando 2 s.
              </Texto>
              <Rotulo>Secundario tonal</Rotulo>
              <Boton
                titulo="Ver contrato"
                icono="contratos"
                variante="secundario"
                ancho="completo"
                onPress={() => undefined}
              />
              <Rotulo>Destructivo tonal y de confirmación</Rotulo>
              <Boton
                titulo="Rechazar"
                icono="rechazar"
                variante="destructivo"
                ancho="completo"
                onPress={() => undefined}
              />
              <Boton
                titulo="Rechazar pago"
                icono="rechazar"
                variante="confirmarDestructivo"
                ancho="completo"
                onPress={() => undefined}
              />
              <Rotulo>Botones de icono (48 y 44 dp)</Rotulo>
              <View style={estilos.envolver}>
                <BotonIcono icono="buscar" etiqueta="Buscar" onPress={() => undefined} />
                <BotonIcono icono="filtro" etiqueta="Filtrar" onPress={() => undefined} />
                <BotonIcono icono="compartir" etiqueta="Compartir" onPress={() => undefined} />
                <BotonIcono icono="anadir" etiqueta="Añadir" onPress={() => undefined} />
                <BotonIcono
                  icono="atras"
                  etiqueta="Volver"
                  tamano="compacto"
                  onPress={() => undefined}
                />
                <BotonIcono
                  icono="descarga"
                  etiqueta="Descargar"
                  tamano="compacto"
                  onPress={() => undefined}
                />
              </View>
            </Superficie>
            <BloqueTinta>
              <Boton
                titulo="Reportar pago"
                icono="comprobante"
                variante="acento"
                ancho="completo"
                onPress={() => undefined}
              />
              <View style={estilos.envolver}>
                <Boton titulo="Ver detalle" variante="sobreTinta" onPress={() => undefined} />
                <BotonIcono
                  icono="alerta"
                  etiqueta="Alertas"
                  sobreTinta
                  conPunto
                  onPress={() => undefined}
                />
                <BotonIcono
                  icono="descarga"
                  etiqueta="Descargar"
                  sobreTinta
                  onPress={() => undefined}
                />
                <BotonIcono
                  icono="atras"
                  etiqueta="Volver"
                  tamano="compacto"
                  sobreTinta
                  onPress={() => undefined}
                />
              </View>
            </BloqueTinta>
            <View style={estilos.barraAccion}>
              <Boton
                titulo="Rechazar"
                icono="rechazar"
                variante="destructivo"
                style={estilos.flex}
                onPress={() => undefined}
              />
              <Boton
                titulo="Aprobar"
                icono="aprobar"
                style={estilos.flexMayor}
                onPress={() => undefined}
              />
            </View>
          </Seccion>

          {/* ---------- Estados ---------- */}
          <Seccion
            titulo="Estados"
            descripcion="Señal vertical + nombre. Parcial enciende media luz; los estados apagados llevan la señal hueca. La urgencia se escribe con palabras."
          >
            <Superficie style={estilos.pila}>
              {(Object.keys(MAPAS_ESTADO) as TipoEstado[]).map((tipo) => (
                <View key={tipo} style={estilos.grupoEstado}>
                  <Rotulo>{TITULOS_ESTADO[tipo]}</Rotulo>
                  <ChipsDeTipo tipo={tipo} />
                </View>
              ))}
              <View style={estilos.grupoEstado}>
                <Rotulo>Calculado (no es un estado)</Rotulo>
                <View style={estilos.envolver}>
                  <ChipEstado tipo="venceEn" dias={30} />
                  <ChipEstado tipo="venceEn" dias={1} />
                  <ChipEstado tipo="venceEn" dias={0} />
                </View>
              </View>
              <View style={estilos.grupoEstado}>
                <Rotulo>Urgencia</Rotulo>
                <View style={estilos.envolver}>
                  {(Object.keys(URGENCIAS) as Urgencia[]).map((u) => (
                    <ChipEstado key={u} tipo="urgencia" estado={u} />
                  ))}
                </View>
              </View>
            </Superficie>
            <BloqueTinta>
              <Texto variante="etiqueta" color={blancoAlfa(0.7)}>
                Sobre cabecera de tinta
              </Texto>
              <View style={estilos.envolver}>
                <ChipEstado tipo="pagoContrato" estado="AL_DIA" sobre="tinta" />
                <ChipEstado tipo="pago" estado="PENDIENTE" sobre="tinta" />
                <ChipEstado tipo="periodo" estado="PENDIENTE" sobre="tinta" />
                <ChipEstado tipo="pagoContrato" estado="EN_MORA" sobre="tinta" />
                <ChipEstado tipo="pago" estado="APROBADO" sobre="tinta" />
                <ChipEstado tipo="periodo" estado="PARCIAL" sobre="tinta" />
                <ChipEstado tipo="contrato" estado="CANCELADO" sobre="tinta" />
                <ChipEstado tipo="venceEn" dias={30} sobre="tinta" />
                <ChipEstado tipo="urgencia" estado="ALTO" sobre="tinta" />
              </View>
            </BloqueTinta>
          </Seccion>

          {/* ---------- Iconos ---------- */}
          <Seccion
            titulo="Iconos"
            descripcion="20 propios en contorno (trazo 1,65). Duotono (segunda capa lima) para el activo: 9 iconos."
          >
            <Superficie>
              <View style={estilos.rejillaIconos}>
                {NOMBRES_ICONOS.map((nombre) => (
                  <View key={nombre} style={estilos.celdaIcono}>
                    <View style={estilos.mosaicoIcono}>
                      <Icono nombre={nombre} tamano={28} />
                    </View>
                    <Texto variante="secundario" color={colores.textoFuerte}>
                      {nombre}
                    </Texto>
                  </View>
                ))}
              </View>
              <Rotulo>Duotono · activo</Rotulo>
              <View style={[estilos.rejillaIconos, estilos.margenArriba]}>
                {NOMBRES_ICONOS.filter((n) => 'relleno' in TRAZOS_ICONOS[n]).map((nombre) => (
                  <View key={nombre} style={estilos.mosaicoIcono}>
                    <Icono nombre={nombre} tamano={28} variante="duotono" />
                  </View>
                ))}
              </View>
            </Superficie>
          </Seccion>

          {/* ---------- Filtros y campo de dinero ---------- */}
          <Seccion
            titulo="Filtros"
            descripcion="Control segmentado en píldora, con contador opcional."
          >
            <ControlSegmentado
              valor={filtro}
              onCambio={setFiltro}
              opciones={[
                { valor: 'validar', etiqueta: 'Por validar', contador: 3 },
                { valor: 'vencidos', etiqueta: 'Vencidos', contador: 1 },
                { valor: 'historial', etiqueta: 'Historial' },
              ]}
            />
          </Seccion>

          <Seccion
            titulo="Campo de dinero"
            descripcion="Etiqueta flotante, prefijo $ y teclado numérico. Guarda centavos."
          >
            <CampoDinero
              etiqueta="Monto pagado"
              valorCentavos={montoVacio}
              onCambio={setMontoVacio}
              ayuda={`Valor del período: ${centavosAPesosTexto(185_000_000)}`}
            />
            <CampoDinero
              etiqueta="Monto pagado"
              valorCentavos={monto}
              onCambio={setMonto}
              ayuda={`En centavos: ${monto ?? 'vacío'}`}
            />
            <CampoDinero
              etiqueta="Monto pagado"
              valorCentavos={150_000_000}
              onCambio={() => undefined}
              error="El monto es mayor que el valor del período."
            />
          </Seccion>

          {/* ---------- Filas ---------- */}
          <Seccion
            titulo="Filas de lista"
            descripcion="Título, subtítulo, valor a la derecha; avatar o icono opcional."
          >
            <Superficie relleno="ninguno">
              <FilaLista
                avatar="Paula Herrera"
                titulo="Paula Herrera · 601"
                subtitulo="Septiembre"
                valor={centavosAPesosTexto(185_000_000)}
              />
              <FilaLista
                separador
                avatar="Andrés Velásquez"
                titulo="Andrés Velásquez"
                detalle={
                  <>
                    <ChipEstado tipo="pago" estado="PENDIENTE" />
                    <Texto variante="secundario" color={colores.textoSecundario}>
                      Octubre
                    </Texto>
                  </>
                }
                valor={centavosAPesosTexto(320_000_000)}
              />
              <FilaLista
                separador
                icono="calendario"
                titulo="Contrato vence en 30 días"
                subtitulo="Casa Laureles · Andrés V."
                conChevron
                onPress={() => undefined}
              />
              <FilaLista
                separador
                icono="mantenimiento"
                titulo="2 solicitudes abiertas"
                subtitulo="1 urgente · Local Calle 53"
                conChevron
                onPress={() => undefined}
              />
            </Superficie>
          </Seccion>

          {/* ---------- Identidad ---------- */}
          <Seccion
            titulo="Identidad de las personas"
            descripcion="Avatar de relieve por nombre: 12 variantes fijas y 6 tonos, sin rostros ni iniciales."
          >
            <Superficie style={estilos.pila}>
              <View style={estilos.envolver}>
                {PERSONAS.map((p) => (
                  <View key={p.nombre} style={estilos.persona}>
                    <AvatarRelieve nombre={p.nombre} tamano={56} />
                    <Texto variante="etiqueta">{p.nombre}</Texto>
                    <Texto variante="secundario" color={colores.textoSecundario}>
                      {p.detalle}
                    </Texto>
                  </View>
                ))}
              </View>
              <Rotulo>Tamaños: 56, 40, 32 y 24</Rotulo>
              <View style={estilos.filaTamanos}>
                {([56, 40, 32, 24] as TamanoAvatar[]).map((t) => (
                  <AvatarRelieve key={t} nombre="Camilo Pardo" tamano={t} />
                ))}
              </View>
              <Rotulo>Las 12 variantes</Rotulo>
              <View style={estilos.envolver}>
                {NOMBRES_POR_VARIANTE.map((nombre, i) => (
                  <View key={nombre} style={estilos.variante}>
                    <AvatarRelieve nombre={nombre} tamano={40} />
                    <Texto variante="secundario" color={colores.textoSecundario}>
                      {i + 1}
                    </Texto>
                  </View>
                ))}
              </View>
            </Superficie>
          </Seccion>

          {/* ---------- Carga ---------- */}
          <Seccion
            titulo="Carga y conexión"
            descripcion="Esqueleto con la forma del contenido; el servidor gratuito puede tardar en despertar."
          >
            <EsqueletoCarga />
            <PantallaConectando />
          </Seccion>

          {/* ---------- Gráficas ---------- */}
          <Seccion
            titulo="Gráficas"
            descripcion="Sin ejes ni rejillas pesadas; valores directos sobre la gráfica."
          >
            <Superficie style={estilos.pila}>
              <Rotulo>Ingresos · área</Rotulo>
              <Texto variante="secundario" color={colores.textoSecundario}>
                Promedio 6 meses {centavosAPesosTexto(PROMEDIO_CERRADOS)}
              </Texto>
              <GraficaAreaIngresos
                meses={MESES_INGRESOS}
                ultimoEnCurso
                etiquetaBurbuja="sep. en curso"
                descripcion="Ingresos aprobados de marzo a septiembre; septiembre en curso"
              />
            </Superficie>
            <BloqueTinta>
              <Texto variante="etiqueta" color={blancoAlfa(0.7)}>
                Recaudo del mes · anillo
              </Texto>
              <AnilloRecaudo
                aprobadoCentavos={1_365_000_000}
                enRevisionCentavos={335_000_000}
                sinReportarCentavos={60_000_000}
              />
              <AnilloRecaudo
                aprobadoCentavos={0}
                enRevisionCentavos={0}
                sinReportarCentavos={185_000_000}
              />
            </BloqueTinta>
            <Superficie style={estilos.pila}>
              <Rotulo>Ocupación · mini-plano</Rotulo>
              <MiniPlanoOcupacion inmuebles={PLANO} />
            </Superficie>
            <Superficie style={estilos.pila}>
              <Rotulo>Historial 12 meses · línea de tiempo</Rotulo>
              <LineaTiempoPeriodos periodos={PERIODOS} />
            </Superficie>
          </Seccion>

          {/* ---------- Navegación ---------- */}
          <Seccion
            titulo="Navegación inferior"
            descripcion="Contorno en reposo → duotono con píldora. Etiquetas siempre visibles. Toca para cambiar."
          >
            <Rotulo>Arrendador</Rotulo>
            <View style={estilos.marcoNav}>
              <NavInferior
                pestanas={PESTANAS_ARRENDADOR}
                activa={pestanaArrendador}
                onSeleccionar={setPestanaArrendador}
                insignias={{ pagos: 3, contratos: 12 }}
              />
            </View>
            <Rotulo>Inquilino</Rotulo>
            <View style={estilos.marcoNav}>
              <NavInferior
                pestanas={PESTANAS_INQUILINO}
                activa={pestanaInquilino}
                onSeleccionar={setPestanaInquilino}
              />
            </View>
          </Seccion>
        </ScrollView>
      </ContenidoBajoCabecera>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, paddingTop: 0, paddingHorizontal: 0 },
  contenido: { gap: espaciado.xxl, paddingHorizontal: espaciado.md, paddingTop: espaciado.xl },
  seccion: { gap: espaciado.sm },
  encabezadoSeccion: { gap: espaciado.xxs, paddingHorizontal: 4 },
  pila: { gap: espaciado.sm },
  envolver: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs, alignItems: 'center' },
  flex: { flex: 1 },
  flexMayor: { flex: 1.4 },
  margenArriba: { marginTop: espaciado.sm },
  bloqueTinta: {
    backgroundColor: colores.tinta,
    borderRadius: radios.grande,
    padding: espaciado.lg,
    gap: espaciado.sm,
    overflow: 'hidden',
  },
  cabeceraEjemplo: {
    backgroundColor: colores.tinta,
    borderRadius: radios.grande,
    padding: espaciado.lg,
    gap: espaciado.lg,
    overflow: 'hidden',
  },
  filaSaludo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  cifra: { gap: espaciado.xs },
  filaCifra: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  // El nombre va sobre la muestra: la cifra protagonista (46 sp) necesita todo el ancho.
  filaEscala: { gap: 2 },
  muestraColor: { width: 96, gap: 2 },
  cuadroColor: {
    height: 44,
    borderRadius: radios.pequeno,
    boxShadow: `inset 0 0 0 1px ${tintaAlfa(0.1)}`,
  },
  barraAccion: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colores.superficie,
    padding: espaciado.md,
    borderTopLeftRadius: radios.grande,
    borderTopRightRadius: radios.grande,
    boxShadow: sombras.barraAccion,
  },
  grupoEstado: { gap: espaciado.xs },
  rejillaIconos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  celdaIcono: { minWidth: 72, alignItems: 'center', gap: 4, marginBottom: espaciado.xs },
  mosaicoIcono: {
    width: 56,
    height: 56,
    borderRadius: radios.medio,
    backgroundColor: tintaAlfa(0.04),
    alignItems: 'center',
    justifyContent: 'center',
  },
  persona: { width: 96, gap: 4, marginBottom: espaciado.xs },
  filaTamanos: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  variante: { alignItems: 'center', gap: 2 },
  marcoNav: { marginHorizontal: -espaciado.md, overflow: 'hidden', paddingTop: 20 },
});
