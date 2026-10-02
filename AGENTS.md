# RentCheck móvil — reglas para agentes

## Stack
Expo (SDK estable actual) + TypeScript estricto + Expo Router + TanStack Query + React Hook Form + Zod + expo-secure-store. Tipos de la API generados en src/api/tipos.gen.ts desde docs/api/openapi.json (npm run api:tipos). No escribir tipos de la API a mano.

## Reglas
- La app no decide reglas de negocio: muestra lo que responde la API y valida formularios solo para ayudar al usuario.
- Dinero en centavos (entero) en todo el código; formatear a pesos solo en la vista (src/utilidades/dinero.ts).
- Token solo en expo-secure-store. Nada sensible en AsyncStorage ni en logs.
- URLs firmadas de archivos: nunca guardarlas; volver a pedir el recurso.
- Errores: mostrar según error.codigo de la API; un mensaje genérico si no hay código.
- La primera petición puede tardar hasta 60 s (Render dormido): mostrar "Conectando con el servidor…".
- Imágenes: comprimir con expo-image-manipulator (ancho máximo 1600, JPEG 0.75) antes de subir.
- Pantallas de un rol solo dentro de su grupo de rutas: (arrendador) o (inquilino).
- Textos de interfaz en español de Colombia.
- Las pruebas no pueden depender de la fecha de hoy: usa un reloj simulado o calcula lo esperado de forma independiente; nunca una cadena de fecha fija contra un valor relativo a hoy.

## Verificación antes de reportar
npx tsc --noEmit && npm run lint && npx expo-doctor
Describe el recorrido manual para probar en el teléfono.

## Prohibido
- Modificar ../rentcheck-backend o ../rentcheck-frontend.
- Agregar dependencias que no pida el prompt sin justificarlo en el reporte.
- Push o merge.
