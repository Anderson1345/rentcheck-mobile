# RentCheck móvil

App móvil de RentCheck (Expo + TypeScript + Expo Router). Una sola app para arrendadores e inquilinos.
Las reglas del repositorio están en [AGENTS.md](AGENTS.md); los documentos de referencia, en [docs/](docs).

## Instalar

Requisitos: Node 20 o superior y la app **Expo Go** en el teléfono Android.

```bash
npm install
cp .env.example .env
```

`.env` solo lleva `EXPO_PUBLIC_API_URL` (la URL del backend). No pongas secretos: todo lo que empieza con `EXPO_PUBLIC_` queda dentro de la app.

## Arrancar

```bash
npx expo start
```

Escanea el QR con Expo Go (PC y teléfono en la misma red Wi‑Fi). El backend gratis de Render duerme: la primera petición puede tardar ~60 s.

## Tipos de la API

Los tipos salen de `docs/api/openapi.json` (exportado de `GET /api-json` del backend). Para regenerarlos después de un cambio en la API:

```bash
curl -o docs/api/openapi.json https://rentcheck-backend-9zb6.onrender.com/api-json
npm run api:tipos
```

## Verificación

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
```

## Generar el APK de demostración

El APK se compila en la nube con EAS (perfil `preview`, `buildType: apk`). La URL del backend del APK
sale de `eas.json` (`build.preview.env.EXPO_PUBLIC_API_URL`), **no** de `.env`: EAS respeta `.gitignore`
y `.env` no llega a la compilación. En el APK, Diagnóstico y Galería no existen (solo en desarrollo).

1. Instalar la CLI de EAS: `npm install -g eas-cli`
2. Iniciar sesión con la cuenta de Expo: `eas login`
3. Vincular el proyecto (una sola vez): `eas init`. Escribe `extra.eas.projectId` en `app.json`;
   confirma ese cambio con un commit.
4. Compilar: `eas build -p android --profile preview`. La primera vez, aceptar que EAS genere la
   llave de Android (keystore) y la guarde.
5. Descargar el APK desde el enlace que muestra EAS al terminar.
6. En el teléfono, permitir "instalar apps de origen desconocido" para el navegador o el gestor de
   archivos con el que se abra el APK, e instalarlo.

La versión instalada se ve al final de "Más" ("RentCheck · versión 1.0.0").
