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
