import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type FieldErrors, type Resolver, useForm, useWatch } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';

import { listarContratos } from '@/api/contratos';
import { ErrorApi, ErrorSinConexion, ErrorTimeout } from '@/api/cliente';
import {
  detallesDeErrorContrato,
  mensajeDeError,
  mensajeDeErrorContrato,
  type PasoDeError,
  pasoDeErrorContrato,
} from '@/api/errores';
import type { Inmueble, UnidadInmueble } from '@/api/inmuebles';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { PasoFechas } from '@/componentes/contratos/PasoFechas';
import { PasoGarantias, PasoResumen } from '@/componentes/contratos/PasoGarantiasResumen';
import { PasoInquilino } from '@/componentes/contratos/PasoInquilino';
import { PasoPago } from '@/componentes/contratos/PasoPago';
import { PasoUnidad } from '@/componentes/contratos/PasoUnidad';
import { EsqueletoCarga } from '@/componentes/EsqueletoCarga';
import { EstadoMensaje } from '@/componentes/EstadoMensaje';
import { PantallaConectando } from '@/componentes/PantallaConectando';
import { PantallaPila } from '@/componentes/PantallaPila';
import { Texto } from '@/componentes/Texto';
import {
  useContratos,
  useCrearContrato,
  useInquilinos,
  useRefrescarTrasCrear,
} from '@/consultas/contratos';
import { useRefrescarAlEnfocar } from '@/consultas/enfoque';
import { useInmuebles } from '@/consultas/inmuebles';
import { usePerfil } from '@/consultas/perfil';
import { construirCuerpo } from '@/contratos/cuerpo';
import {
  type BorradorContrato,
  borradorInicial,
  erroresDePaso,
  PASO,
  TOTAL_PASOS,
} from '@/contratos/esquemas';
import { fechaFinPorMeses } from '@/contratos/fechasContrato';
import { ocupacionPorUnidad } from '@/contratos/ocupacion';
import { plantillaParaUnidad } from '@/contratos/plantilla';
import { buscarContratoCreado } from '@/contratos/recuperacion';
import { colores, espaciado, radios, tintaAlfa } from '@/tema';
import { hoyBogota } from '@/utilidades/fechas';

const TITULOS = ['Unidad', 'Inquilino', 'Pago', 'Fechas', 'Garantías', 'Resumen'];
const PASO_DE_ERROR: Record<Exclude<PasoDeError, 'cedula'>, number> = {
  unidad: PASO.UNIDAD,
  inquilino: PASO.INQUILINO,
  pago: PASO.PAGO,
  fechas: PASO.FECHAS,
};

interface ErrorVisible {
  mensaje: string;
  detalles: string[];
}

export default function NuevoContrato() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ inmuebleId?: string; unidadId?: string }>();
  const perfil = usePerfil();
  const inmuebles = useInmuebles();
  const contratos = useContratos();
  const inquilinos = useInquilinos();
  const crear = useCrearContrato();
  const refrescarTrasCrear = useRefrescarTrasCrear();
  useRefrescarAlEnfocar(perfil);

  const hoy = useMemo(() => hoyBogota(), []);
  const [paso, setPaso] = useState(0);
  const pasoRef = useRef(0);
  const [error, setError] = useState<ErrorVisible | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [incierto, setIncierto] = useState(false);
  const enCurso = useRef(false);
  const huboIntentoSinRespuesta = useRef(false);
  const salidaPermitida = useRef(false);
  const preseleccionHecha = useRef(false);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<BorradorContrato>({
    // Valida solo los campos del paso actual (el esquema por paso vive en contratos/esquemas.ts).
    resolver: ((valores: BorradorContrato) => {
      const encontrados = erroresDePaso(pasoRef.current, valores, hoy);
      const campos = Object.keys(encontrados) as (keyof BorradorContrato)[];
      if (campos.length === 0) return { values: valores, errors: {} };
      return {
        values: {},
        errors: Object.fromEntries(
          campos.map((c) => [c, { type: 'validate', message: encontrados[c] }]),
        ),
      };
    }) as unknown as Resolver<BorradorContrato>,
    defaultValues: { ...borradorInicial(hoy), fechaFin: fechaFinPorMeses(hoy, 12) },
  });
  const valores = useWatch({ control }) as BorradorContrato;
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = isDirty;
  });

  const irAPaso = useCallback((nuevo: number) => {
    pasoRef.current = nuevo;
    setPaso(nuevo);
  }, []);

  /** Cambia campos del borrador; la duración en meses mantiene la fecha de fin al día. */
  const cambiar = useCallback(
    (parcial: Partial<BorradorContrato>) => {
      const opciones = { shouldDirty: true } as const;
      for (const [campo, valor] of Object.entries(parcial)) {
        setValue(campo as keyof BorradorContrato, valor as never, opciones);
      }
      if ('fechaInicio' in parcial || 'duracionMeses' in parcial) {
        const actual = getValues();
        if (actual.duracionMeses !== null && actual.fechaInicio) {
          setValue(
            'fechaFin',
            fechaFinPorMeses(actual.fechaInicio, actual.duracionMeses),
            opciones,
          );
        }
      }
    },
    [getValues, setValue],
  );

  const ocupacion = useMemo(() => ocupacionPorUnidad(contratos.data ?? []), [contratos.data]);

  const elegirUnidad = useCallback(
    (inmueble: Inmueble, unidad: UnidadInmueble) => {
      const info = ocupacion[unidad.id];
      cambiar({
        inmuebleId: inmueble.id,
        unidadId: unidad.id,
        plantilla: plantillaParaUnidad(unidad.tipo, unidad.uso_permitido),
        // Si la unidad tiene un contrato, el inicio sugerido es el día siguiente a su fin.
        ...(info?.fechaInicioSugerida ? { fechaInicio: info.fechaInicioSugerida } : {}),
        ...(unidad.canon_base_centavos > 0 && getValues('canonCentavos') === null
          ? { canonCentavos: unidad.canon_base_centavos }
          : {}),
      });
    },
    [cambiar, getValues, ocupacion],
  );

  // Entrada desde el detalle de un inmueble (o de una unidad): arranca ahí.
  useEffect(() => {
    if (preseleccionHecha.current || !inmuebles.data || !contratos.data) return;
    preseleccionHecha.current = true;
    const lista = inmuebles.data;
    if (params.unidadId) {
      const inmueble = lista.find((i) => i.unidades.some((u) => u.id === params.unidadId));
      const unidad = inmueble?.unidades.find((u) => u.id === params.unidadId);
      if (inmueble && unidad) {
        elegirUnidad(inmueble, unidad);
        return;
      }
    }
    if (params.inmuebleId && lista.some((i) => i.id === params.inmuebleId)) {
      cambiar({ inmuebleId: params.inmuebleId });
    }
  }, [inmuebles.data, contratos.data, params.unidadId, params.inmuebleId, elegirUnidad, cambiar]);

  // Atrás (botón del encabezado y botón físico de Android): paso anterior; en el primer paso, con
  // datos escritos, pide confirmación.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (evento) => {
      if (salidaPermitida.current) return;
      if (pasoRef.current > 0) {
        evento.preventDefault();
        irAPaso(pasoRef.current - 1);
        return;
      }
      if (!dirtyRef.current) return;
      evento.preventDefault();
      Alert.alert('¿Salir sin crear el contrato?', 'Se perderá lo que escribiste.', [
        { text: 'Seguir aquí', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            salidaPermitida.current = true;
            navigation.dispatch(evento.data.action);
          },
        },
      ]);
    });
  }, [navigation, irAPaso]);

  function irAlExito(id: string) {
    salidaPermitida.current = true;
    router.replace({ pathname: '/contrato/[id]/creado', params: { id } });
  }

  /** Busca en GET /contratos el contrato que se envió; true si lo encontró (y ya navegó). */
  async function verificarSiSeCreo(): Promise<boolean | null> {
    try {
      const lista = await listarContratos();
      const id = buscarContratoCreado(getValues(), lista);
      if (id) {
        await refrescarTrasCrear();
        irAlExito(id);
        return true;
      }
      return false;
    } catch {
      return null;
    }
  }

  function mostrarErrorDelServidor(falla: unknown) {
    const destino = pasoDeErrorContrato(falla);
    setError({ mensaje: mensajeDeErrorContrato(falla), detalles: detallesDeErrorContrato(falla) });
    if (destino === 'cedula') {
      void perfil.refetch();
    } else if (destino) {
      if (destino === 'unidad') void inmuebles.refetch();
      irAPaso(PASO_DE_ERROR[destino]);
    }
  }

  async function confirmarYCrear() {
    if (enCurso.current) return;
    enCurso.current = true;
    setEnviando(true);
    setError(null);
    setIncierto(false);
    try {
      const creado = await crear.mutateAsync(construirCuerpo(getValues()));
      irAlExito(creado.id);
    } catch (falla) {
      if (falla instanceof ErrorTimeout || falla instanceof ErrorSinConexion) {
        huboIntentoSinRespuesta.current = true;
        setError({ mensaje: 'No sabemos si el contrato se creó. Verificando…', detalles: [] });
        const resultado = await verificarSiSeCreo();
        if (resultado === null) {
          setIncierto(true);
          setError({
            mensaje:
              'No sabemos si el contrato se creó y no pudimos comprobarlo. Verifica antes de intentarlo de nuevo.',
            detalles: [],
          });
        } else if (resultado === false) {
          setError({ mensaje: 'No se creó. Puedes intentarlo de nuevo.', detalles: [] });
        }
      } else if (
        huboIntentoSinRespuesta.current &&
        falla instanceof ErrorApi &&
        falla.status === 409 &&
        (falla.codigo === 'CONFLICTO' || falla.codigo === 'TRASLAPE_DE_CONTRATOS')
      ) {
        // Un intento anterior pudo crear el contrato: se verifica antes de mostrar el choque.
        const resultado = await verificarSiSeCreo();
        if (resultado !== true) mostrarErrorDelServidor(falla);
      } else {
        mostrarErrorDelServidor(falla);
      }
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }

  async function verificarOtraVez() {
    setEnviando(true);
    const resultado = await verificarSiSeCreo();
    setEnviando(false);
    if (resultado === false) {
      setIncierto(false);
      setError({ mensaje: 'No se creó. Puedes intentarlo de nuevo.', detalles: [] });
    }
  }

  async function siguiente() {
    await handleSubmit(() => {
      setError(null);
      irAPaso(pasoRef.current + 1);
    })();
  }

  // --- Carga previa: cédula del arrendador y datos para el asistente ---
  if (perfil.data === undefined) {
    return (
      <PantallaPila>
        {perfil.isPending ? (
          <PantallaConectando />
        ) : (
          <>
            <Aviso mensaje={mensajeDeError(perfil.error)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => void perfil.refetch()}
            />
          </>
        )}
      </PantallaPila>
    );
  }
  if (!perfil.data.cedula?.trim()) {
    return (
      <PantallaPila>
        <EstadoMensaje
          titulo="Falta tu cédula"
          mensaje="Para crear un contrato necesitas registrar tu cédula o NIT en tu perfil."
        >
          <Boton
            titulo="Ir a Mi perfil"
            variante="acento"
            ancho="completo"
            onPress={() => router.push('/perfil')}
          />
        </EstadoMensaje>
      </PantallaPila>
    );
  }
  if (
    inmuebles.data === undefined ||
    contratos.data === undefined ||
    inquilinos.data === undefined
  ) {
    const falla = inmuebles.error ?? contratos.error ?? inquilinos.error;
    return (
      <PantallaPila>
        {falla ? (
          <>
            <Aviso mensaje={mensajeDeError(falla)} />
            <Boton
              titulo="Reintentar"
              variante="secundario"
              ancho="completo"
              onPress={() => {
                void inmuebles.refetch();
                void contratos.refetch();
                void inquilinos.refetch();
              }}
            />
          </>
        ) : (
          <EsqueletoCarga filas={3} />
        )}
      </PantallaPila>
    );
  }

  const inmueble = inmuebles.data.find((i) => i.id === valores.inmuebleId);
  const unidad = inmueble?.unidades.find((u) => u.id === valores.unidadId);
  const erroresPlanos = Object.fromEntries(
    Object.entries(errors as FieldErrors<BorradorContrato>).map(([c, e]) => [
      c,
      (e as { message?: string } | undefined)?.message,
    ]),
  ) as Partial<Record<keyof BorradorContrato, string>>;
  const ultimo = paso === TOTAL_PASOS - 1;

  return (
    <PantallaPila>
      <View style={estilos.progreso}>
        <Texto variante="etiqueta" color={colores.textoFuerte}>
          {`Paso ${paso + 1} de ${TOTAL_PASOS} · ${TITULOS[paso]}`}
        </Texto>
        <View style={estilos.barra} accessibilityRole="progressbar">
          <View style={[estilos.relleno, { width: `${((paso + 1) / TOTAL_PASOS) * 100}%` }]} />
        </View>
      </View>

      {error ? (
        <View style={estilos.error}>
          <Aviso mensaje={error.mensaje} />
          {error.detalles.map((d) => (
            <Texto key={d} variante="secundario" color={colores.textoSecundario}>
              {`• ${d}`}
            </Texto>
          ))}
        </View>
      ) : null}

      {paso === PASO.UNIDAD ? (
        <PasoUnidad
          valores={valores}
          error={erroresPlanos.unidadId}
          inmuebles={inmuebles.data}
          ocupacion={ocupacion}
          onElegirInmueble={(id) =>
            cambiar({ inmuebleId: id, ...(id === null ? { unidadId: null, plantilla: null } : {}) })
          }
          onElegirUnidad={elegirUnidad}
        />
      ) : null}
      {paso === PASO.INQUILINO ? (
        <PasoInquilino
          valores={valores}
          errores={erroresPlanos}
          inquilinos={inquilinos.data}
          cambiar={cambiar}
        />
      ) : null}
      {paso === PASO.PAGO ? (
        <PasoPago valores={valores} errores={erroresPlanos} cambiar={cambiar} />
      ) : null}
      {paso === PASO.FECHAS ? (
        <PasoFechas valores={valores} errores={erroresPlanos} hoy={hoy} cambiar={cambiar} />
      ) : null}
      {paso === PASO.GARANTIAS ? <PasoGarantias valores={valores} cambiar={cambiar} /> : null}
      {paso === PASO.RESUMEN ? (
        <PasoResumen
          valores={valores}
          inmueble={inmueble}
          unidad={unidad}
          nombreInquilinoExistente={
            inquilinos.data.find((q) => q.id === valores.inquilinoId)?.nombre ?? null
          }
          hoy={hoy}
          onEditar={irAPaso}
        />
      ) : null}

      <View style={estilos.botones}>
        {ultimo ? (
          <>
            <Boton
              titulo="Confirmar y crear contrato"
              tituloCargando="Creando contrato…"
              cargando={enviando}
              ancho="completo"
              onPress={() => void confirmarYCrear()}
            />
            {incierto ? (
              <Boton
                titulo="Verificar si se creó"
                variante="secundario"
                ancho="completo"
                deshabilitado={enviando}
                onPress={() => void verificarOtraVez()}
              />
            ) : null}
          </>
        ) : (
          <Boton titulo="Siguiente" ancho="completo" onPress={() => void siguiente()} />
        )}
        {paso > 0 ? (
          <Boton
            titulo="Atrás"
            variante="secundario"
            ancho="completo"
            deshabilitado={enviando}
            onPress={() => irAPaso(paso - 1)}
          />
        ) : null}
      </View>
    </PantallaPila>
  );
}

const estilos = StyleSheet.create({
  progreso: { gap: espaciado.xs },
  barra: {
    height: 6,
    borderRadius: radios.pildora,
    backgroundColor: tintaAlfa(0.08),
    overflow: 'hidden',
  },
  relleno: { height: 6, borderRadius: radios.pildora, backgroundColor: colores.tinta },
  error: { gap: espaciado.xxs },
  botones: { gap: espaciado.xs, marginTop: espaciado.sm },
});
