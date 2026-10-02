# RentCheck — Plan de entregas de la app móvil (E1 a E12)

**Versión 1.4 — 01/10/2026.** Documento de guía para las entregas de la Fase 1 (repositorio `rentcheck-mobile`).

## 0. Para qué sirve y qué lugar ocupa

- Precedencia: `Contexto` (reglas de negocio) > `Plan Técnico` (tecnología y B-xx) > `instrucciones de desarrollo` (proceso y estado) > **este documento** (detalle de cada entrega de la app). Si este documento contradice a los tres anteriores, ganan ellos.
- No es un prompt. Claude (líder técnico) lo usa para redactar el prompt de cada entrega con la plantilla de la sección 4 del documento de instrucciones. La IA de programación recibe el prompt, que cita por ruta e ID; no recibe este documento entero.
- Los endpoints **no se listan aquí a mano**: la fuente es `docs/api/openapi.json` del repositorio de la app. Cada prompt le pide a la IA localizar el endpoint por su función y confirmar el contrato antes de programar. Si falta algo, se anota como `B-xx` y no se corrige desde la app.
- El estado (qué entrega está hecha) vive solo en el documento de instrucciones, sección 9. Aquí no se marca avance.

## 1. Reglas transversales (aplican a todas las entregas)

1. **La app no decide reglas de negocio.** Muestra lo que responde la API. Los formularios validan solo para ayudar (campo vacío, formato); el servidor manda.
2. **Dinero**: entero en centavos en todo el código; `src/utilidades/dinero.ts` lo formatea a pesos colombianos solo en la vista.
3. **Fechas**: las de negocio son `America/Bogota`; `src/utilidades/fechas.ts` las formatea. Nunca construir una fecha de negocio con `new Date()` del teléfono sin pasar por esa utilidad.
4. **Errores**: se muestran según `error.codigo`; un diccionario único `codigo → mensaje en español` en `src/api/errores.ts`. Sin código: mensaje genérico.
5. **Arranque en frío**: Render gratis duerme; la primera petición puede tardar ~60 s. Pantalla "Conectando con el servidor…" y botón de reintento. Nada de spinner infinito.
6. **Pertenencia**: la app nunca filtra por seguridad; si la API responde 404 para un recurso ajeno, se muestra "No encontrado".
7. **Archivos**: URLs firmadas nunca se guardan; se vuelve a pedir el recurso. Imágenes: 1600 px de ancho máximo, JPEG 0.75. El backend valida el contenido real (415 `ARCHIVO_CONTENIDO_INVALIDO`): la app debe mostrar ese error con claridad.
8. **Confirmaciones**: toda acción con efecto legal o de dinero (aprobar/rechazar pago, terminar, prorrogar, no renovar, incremento) pide confirmación con el resumen de lo que se hará.
9. **Textos de interfaz** en español de Colombia. Sin lenguaje técnico para el usuario final.
10. **Tres estados en toda pantalla de datos**: cargando, vacío, error (con reintento).
11. **Verificación de cada entrega**: `npx tsc --noEmit && npm run lint && npx expo-doctor`, pruebas unitarias donde haya lógica (utilidades, cliente de API, cola), y recorrido manual en el teléfono escrito en el reporte.

## 2. Cómo se prueba en el teléfono (Infinix HOT 40i, Android)

- **E1 a E9 y E11**: Expo Go en el teléfono (gratis, sin emulador, sin Android Studio). PC y teléfono en la misma red Wi‑Fi. Se escanea el QR que muestra `npx expo start`.
- **Desde E2** el enlace `rentcheck://activar/<codigo>` y desde **E10** las notificaciones push **no se pueden probar completas en Expo Go** (push remoto no existe en Expo Go de Android desde SDK 53). Para eso se genera una *development build* con EAS (nube, gratis, cuota mensual limitada; se confirma el plan vigente antes de gastar una compilación). En E2 el enlace se puede probar sin build escribiendo el código a mano; la prueba real del enlace queda para la build de E10/E12.
- **E12**: APK `preview` por EAS para instalar en el teléfono sin Expo Go.
- Contra qué backend se prueba: **producción** (`https://rentcheck-backend-9zb6.onrender.com`) con cuentas de prueba propias, mientras no haya usuarios reales. Si se prefiere aislar, la IA puede apuntar a un backend local con `npm run sembrar`, pero el teléfono solo lo ve con la IP del PC en la red: es más trabajo; se decide en E2.

## 3. Entregas

Cada ficha: objetivo · pantallas · reglas clave · referencias · prueba manual · fuera de alcance.

### E1 — Proyecto base

- **Objetivo**: repositorio que arranca en el teléfono con la estructura, las reglas persistentes y las piezas que usarán todas las entregas.
- **Incluye**: proyecto Expo + TypeScript estricto + Expo Router; estructura de Plan Técnico §6; `AGENTS.md` y `CLAUDE.md` (texto en instrucciones §5.2); `docs/` con Contexto, Plan, instrucciones y este documento, más `docs/api/openapi.json`; cliente de API (`fetch`, tiempos de espera 60 s la primera y 20 s las siguientes, errores tipados con `codigo`, inyección de token lista pero sin sesión aún); `npm run api:tipos`; `tema.ts`; `dinero.ts` y `fechas.ts` con pruebas; `errores.ts`; proveedor de TanStack Query; pantalla de bienvenida "Soy arrendador / Soy inquilino" (aún sin login); una pantalla de diagnóstico que llama a un endpoint público (estado del servidor) y muestra "Conectando…"; `eas.json` con perfiles `development` y `preview` (sin ejecutar compilaciones).
- **Fuera**: login, sesión, pantallas de negocio (E2+), NativeWind (se decide en D1; por ahora `tema.ts`).
- **Resultado real (30/09/2026, commit `9dbc794`)**: SDK 57; rutas por rol `/panel` (arrendador) y `/contratos` (inquilino), porque dos grupos no pueden compartir la misma URL; el cliente espera 60 s en frío y 20 s con el servidor despierto (vuelve a 60 s tras 10 min sin respuestas); dinero y fechas sin `Intl` (desfase fijo −5 h); el Diagnóstico usa `GET /auth/capacidades` (sin `/health`: B-57); `eas.json` sin compilaciones. Tipos de ruta (`typedRoutes`) se generan al correr `expo start`: `tsc` no los comprueba hasta entonces.
- **Prueba manual**: abrir en Expo Go, ver bienvenida, tocar cada rol, ver la pantalla de diagnóstico hablar con producción.

### D1 — Diseño de la app (entre E1 y E2)

- **D1-a (hecha)**: Jesús eligió la dirección **Medianoche** en Claude Design (lienzo "RentCheck · Direcciones visuales R2", fila A). Referencia visual en HTML: `docs/diseno/medianoche/` (Panel, Pago, Inquilino, Componentes). Lenguaje: cabecera de tinta profunda con motivo de curvas de nivel, cifra protagonista, acento lima para acciones y datos clave, superficies claras con sombras teñidas, Manrope, iconos propios (contorno y duotono), avatares de relieve generados por persona (sin rostros), estados con "señal" vertical luminosa más texto, gráficas de área, anillo, mini-plano de unidades y línea de tiempo.
- **Correcciones al diseño** (se aplican en D1-b y en las pantallas de E5–E9): (1) un período con comprobante pendiente es **En revisión**, nunca Vencido; solo vuelve a Vencido si se rechaza; (2) en los documentos del inquilino no existe "Acta de entrega" (solo contrato original, otrosíes y comprobantes aprobados); (3) etiquetas de la barra inferior a 12 sp si no caben en 360 dp; (4) el motivo y el mensaje del rechazo dependen de B-59; (5) "11 de 11 a tiempo" y los días de mora salen de la API: si no los devuelve, no se muestran.
- **D1-b (código)**: `expo-font` + `@expo-google-fonts/manrope`; `src/tema.ts` con los tokens del diseño; componentes en `src/componentes/` (botones y estados, chip de estado por enumeración real, control segmentado, navegación inferior con píldora, iconos, avatar de relieve por nombre, cabecera de tinta, superficie, esqueleto de carga, pantalla "Conectando"); gráficas con `react-native-svg` y `expo-linear-gradient` (área de ingresos, anillo de recaudo, mini-plano de ocupación, línea de tiempo de períodos); pantalla Galería de pruebas; bienvenida y diagnóstico restilizados; ícono y splash reales; corrección de `src/utilidades/fechas.ts` (un ISO con hora se trata como instante, salvo medianoche UTC exacta, que es un `@db.Date`). Sin pantallas de negocio ni animaciones complejas (Reanimated queda para E12).
- **Fuera**: pantallas de negocio (E2+), modo oscuro, animaciones.

### E2 — Autenticación (se hace en dos entregas: E2-A y E2-B)

- **E2-A (sesión y acceso)**: cliente de API con manejo global de 401 (cierra la sesión y avisa); sesión en `expo-secure-store` (el JWT dura 7 días; no hay refresh hasta B0.6-B, así que al vencer se pide iniciar sesión otra vez); rol leído del payload del JWT (`id` = arrendador, `inquilinoId` = inquilino); guardias por rol con `Stack.Protected`; login y registro del arrendador, login del inquilino, cerrar sesión; pantallas de inicio provisionales con el nombre del usuario.
- **E2-B (activación y correo)**: activación por código (validar → crear cuenta, o iniciar sesión si ya tiene cuenta y vincular), enlace `rentcheck://activar/<codigo>`, verificación de correo y recuperación de contraseña (ambas apagadas en producción: pruebas automáticas, manual solo cuando haya proveedor de correo).
- Lo siguiente es la ficha original de E2.


- **Objetivo**: entrar y salir de la app con el rol correcto.
- **Pantallas**: login (ambos roles), registro de arrendador, activación por código (validar → crear cuenta), "ya tengo cuenta" → agregar contrato, verificación de correo por código (oculta mientras el backend la tenga apagada; la app lee si está activa), cerrar sesión.
- **Reglas**: token solo en `expo-secure-store`; ante 401 un solo intento de renovar y si falla cerrar sesión (la renovación real llega con B0.6; hasta entonces, cerrar sesión); guardias por rol (un inquilino no entra a `(arrendador)` ni al revés); esquema `rentcheck://` registrado; el código puede llegar escrito, pegado o por enlace.
- **Referencias**: Contexto §3, §4, F1, F4; Plan B-14/B-15 (identidad global y vinculación por código).
- **Prueba manual**: registrar arrendador; cerrar y abrir la app (sigue la sesión); cerrar sesión; probar contraseña mala (mensaje por código); activar un contrato con código de prueba.
- **Fuera**: refresh token y cierre de todas las sesiones (B0.6 + E12); biometría (E12).

### E3 — Inmuebles y unidades (se hace en dos entregas: E3-A y E3-B)

- **E3-A (inmuebles y navegación)**: barra inferior del arrendador (Panel, Inmuebles, Contratos, Pagos, Más; Contratos y Pagos como pantallas "Próximamente" hasta E5 y E7), lista y detalle de inmuebles con sus unidades en solo lectura, crear y editar inmueble (`uso_unidad_principal`, estrato), foto de portada con cámara o galería y `subirArchivo` multipart en el cliente de API.
- **E3-B (unidades y perfil)**: crear, editar y eliminar unidad con campos condicionales por uso, foto principal de la unidad, eliminar inmueble (exige eliminar antes sus unidades), perfil del arrendador con cédula y foto de cédula. Los documentos del inmueble (`/inmuebles/:id/documentos`) no están en ninguna entrega: se decide en E3-B si entran.
- Lo siguiente es la ficha original de E3.

- **Pantallas**: lista de inmuebles, detalle con unidades, crear/editar inmueble (incluye `uso_unidad_principal`), foto de portada (cámara o galería), crear/editar/eliminar unidad con campos condicionales por tipo, perfil del arrendador con cédula.
- **Reglas**: la unidad principal aparece "por completar"; eliminar unidad o inmueble con contratos se rechaza según la API (mostrar el mensaje por código); campos de la unidad cambian según el uso.
- **Referencias**: Contexto §5.3, §5.4, F2, §9.
- **Prueba manual**: crear inmueble con foto tomada con la cámara; editar; crear unidad de cada tipo; intentar una foto inválida (renombrar un archivo) y ver el 415 bien explicado.

### E4 — Asistente de nuevo arrendamiento (se hace en dos entregas: E4-A y E4-B)

- **E4-A (asistente y creación)**: asistente de 6 pasos con barra de progreso, resumen y confirmación, creación del contrato y pantalla "Contrato creado" con el código y compartir. Cerrada.
- **E4-B (inventario y código)**: fotos de inventario de entrega por zona, QR del código (solo el texto del código: el enlace `rentcheck://activar/...` no abre en Expo Go y llega con la development build de E10) y copiar código. Cerrada.
- Lo siguiente es la ficha original de E4.

- **Pantallas**: asistente por pasos de F3 con barra de progreso; resumen y confirmación; fotos de inventario de entrega; compartir código y QR.
- **Reglas**: depósito solo si la plantilla no es vivienda; aviso si falta la cédula del arrendador antes de empezar; aviso si la unidad tiene liquidación pendiente; el PDF lo genera el servidor (la app no arma contratos); nuevo inquilino por documento: no mostrar datos de personas ya existentes; **`POST /contratos` no acepta `Idempotency-Key` (B-60)**: al confirmar, el botón se bloquea y, si no hay respuesta, la app verifica leyendo `GET /contratos` antes de dejar reintentar; los contratos no se encolan sin conexión (E11).
- **Referencias**: Contexto F3, §6; Plan B-16, B-55 (fecha fin pasada), B-48.
- **Prueba manual**: crear contrato de vivienda y de local; doble toque en "Confirmar" (un solo contrato); compartir el código por WhatsApp.

### E5 — Contratos (arrendador) (se hace en tres entregas: E5-A, E5-B y E5-C)

- **E5-A (lectura)**: pestaña Contratos con lista y filtros por estado (se filtra en la app: `GET /contratos` no tiene parámetros), detalle de solo lectura (datos, incrementos de IPC, avisos como información), documentos (ver y compartir PDF; se pide la lista fresca antes de cada descarga porque la URL firmada caduca), código de acceso (ver, compartir, regenerar) y acceso al inventario. Cerrada.
- **E5-B (acciones y períodos)**: estado de cuenta por períodos (`GET /contratos/:id/estado-cuenta`), incremento (avisar al aplicarlo que un período futuro ya pagado por adelantado con el canon anterior queda debiendo la diferencia, límite de B0.3-A2), prórroga (ventana de 90 días previos al vencimiento), aviso de no renovación y su cancelación, y **cancelar un contrato programado** (`POST /contratos/:id/cancelar-programado`; no estaba en la ficha original).
- **E5-C (terminación y correcciones)**: terminación anticipada (solicitar, confirmar la solicitud del inquilino, cancelar la propia) y corregir datos del contrato y del inquilino mientras no estén vinculados (`PATCH /contratos/:id` y `PATCH /contratos/:id/inquilino`; un cambio de cédula regenera el código).
- Lo siguiente es la ficha original de E5.

- **Pantallas**: lista con filtros por estado, detalle, períodos, documentos (ver y compartir PDF con `expo-sharing`), incremento, prórroga, no renovación, terminación, regenerar código, corregir datos del inquilino sin vincular.
- **Reglas**: los topes de incremento los valida el servidor (la app muestra el tope que devuelva); cada acción legal con confirmación; documentos no disponibles (URL nula por `firmarTolerante`) se muestran como "Archivo no disponible", sin romper la pantalla; ZIP por flujo (F11) se descarga y comparte.
- **Referencias**: Contexto §5.6–§5.8, §7.1, F7, F8, F11.
- **Prueba manual**: descargar y abrir un PDF; aplicar un incremento; terminar un contrato de prueba.

### E6 — Portal del inquilino (se hace en dos entregas: E6-A y E6-B)

- **E6-A (lectura)**: barra inferior del inquilino (Mi panel, Pagos, Solicitudes, Más; Pagos y Solicitudes "próximamente"), selector de contrato en memoria, agregar contrato con código (`POST /inquilino/contratos/vincular`), Mi panel (variantes ACTIVO, PROGRAMADO y finalizado; datos de recaudo solo con ACTIVO), Mi contrato (condiciones, incrementos, fotos de entrega, documentos, terminación y aviso solo como información) y estado de cuenta. Cerrada. Las rutas llevan nombres propios (`mi-contrato/[id]`, `mis-contratos`, `agregar-contrato`) porque dos grupos no pueden compartir URL.
- **E6-B (acciones y perfil)**: terminación anticipada (solicitar con motivo y fecha efectiva, confirmar la del arrendador, cancelar la propia) y aviso de no renovación (dar y cancelar) desde el inquilino, con los booleanos `puede_*` del servidor; perfil (nombre y teléfono; cédula y correo solo lectura; foto de cédula); y dos correcciones de E6-A (prueba de render de "Mis contratos" y mensaje único de código no válido).
- Lo siguiente es la ficha original de E6.

- **Pantallas**: selector de contrato + "agregar contrato con código", Mi Panel, Mi Contrato, Mis Documentos, solicitud de terminación y no renovación, editar perfil (nombre y teléfono; el resto no es editable, mostrar `CAMPO_NO_EDITABLE` con claridad).
- **Referencias**: Contexto §10, §7.5, F4, F8; `PATCH /inquilino/perfil`.
- **Prueba manual**: inquilino con dos contratos cambia de uno a otro y ve datos distintos; intenta abrir un contrato ajeno (404).

### E7 — Pagos

- **Inquilino**: lista de períodos (por vencer, vencidos, en revisión), datos de recaudo, reportar pago (período sugerido, monto, fecha, comprobante por cámara, galería o PDF).
- **Arrendador**: cola de validación con monto esperado vs. reportado, aprobar o rechazar (con motivo) con confirmación.
- **Reglas**: dinero en centavos; el comprobante nunca se borra (valor legal); "anular aprobación" llega con B0.6 (B-45) y se agrega entonces.
- **Referencias**: Contexto F5, §5.10, §7.3; Plan B-xx de pagos (mora, períodos). **Depende de B0.6-A** para el motivo y el mensaje del rechazo (B-59); hasta entonces el rechazo no los guarda.
- **Prueba manual**: reportar pago con foto; aprobarlo desde la otra cuenta; rechazar otro y ver el estado.

### E8 — Mantenimiento

- **Inquilino**: crear solicitud (foto o video; solo con contrato Activo) y consultar. **Arrendador**: lista, filtros, cambio de estado.
- **Reglas**: video MP4 validado por el servidor; tamaño máximo según la API (mostrarlo antes de subir).
- **Referencias**: Contexto F6, §5.14, §7.4.

### E9 — Alertas y panel

- **Pantallas**: bandeja de alertas de ambos roles con enlace al recurso; Panel del arrendador (ingresos, recaudo esperado vs. real, ocupación, pendientes, tendencia).
- **Depende de B0.6-A** (endpoint del Panel del arrendador, B-58) y de **B0.6-B** (alertas del inquilino, B-18). Las alertas del arrendador ya existen.
- **Referencias**: Contexto §11, §9.

### E10 — Notificaciones push

- **Incluye**: permisos, registro del token en el backend, recepción y navegación al recurso, preferencias por tipo.
- **Depende de B0.6-B** (tokens y envío). **Requiere development build** y credencial FCM (Firebase plan gratis subida a EAS). Aquí se da el primer uso de una compilación EAS; se confirma antes la cuota vigente.

### E11 — Sin conexión

- **Incluye**: persistencia de la caché de lectura (lo último visto se ve sin red), cola de envíos (reporte de pago y solicitud de mantenimiento) con `Idempotency-Key`, indicador de conexión, reintento automático, pantalla "pendientes de enviar".
- **Reglas**: lo que tiene efecto legal (aprobar, terminar, prorrogar) **no** se encola: exige conexión. Un envío encolado que el servidor rechace se muestra al usuario, no se descarta en silencio.

### E12 — Endurecimiento y APK

- **Incluye**: biometría en acciones sensibles, borrado de datos locales al cerrar sesión, versión mínima de la app, renovación de sesión y cierre de todas las sesiones (B0.6-B), APK `preview` por EAS, recorrido completo F1 a F11 con el checklist de Contexto §14–§15, revisión de permisos de Android y ficha de privacidad.
- **Fuera de V1**: publicación en Play Store (cuesta; se decide aparte), iOS.

## 4. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| Render gratis duerme (primera petición lenta) | Regla transversal 5; cron de tareas diarias ayuda a despertarlo a medianoche, no de día. |
| Expo Go no prueba push ni el enlace real | Development build en E10 (ver sección 2). |
| Cuota gratis de EAS limitada | No compilar hasta E10; una compilación a la vez; confirmar plan vigente. |
| El contrato de la API cambia por B0.6 | Regenerar `openapi.json` y `npm run api:tipos` al cerrar B0.6. |
| Poco espacio en el PC (~5 GB libres) | `node_modules` ocupa ~0,5–1 GB; liberar espacio antes de E1 y no instalar emulador. |
| Fuga de secretos | Solo `EXPO_PUBLIC_API_URL` en `.env`; nunca claves. |

## 5. Orden y dependencias

E1 → D1 → E2 → E3 → E4 → E5 → E6 → B0.6-A → E7 → E8 → B0.6-B → E9 → E10 → E11 → E12. Mismo orden que el documento de instrucciones §8; no se cambia sin pedirlo.
