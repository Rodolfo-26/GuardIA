# Desplegar la API para panel web y app movil

Esta API ya esta separada del frontend en `guardia-panel/api`, asi que puedes desplegarla una sola vez y compartirla entre el panel y la app movil.

## Opcion recomendada

- Frontend web en Vercel, Netlify o Firebase Hosting
- API Node en Render, Railway, Fly.io o Cloud Run
- PostgreSQL administrado en Neon, Supabase, Railway o Cloud SQL

## Flujo de despliegue

1. Crea una base PostgreSQL accesible desde internet.
2. Ejecuta tu esquema con `db/init.sql`.
3. Despliega `guardia-panel/api` como servicio Node o usando el `Dockerfile`.
4. Configura las variables de entorno de la API.
5. Publica el panel con `VITE_API_BASE_URL` apuntando a la URL de la API.
6. Usa esa misma URL en tu app movil.

## Variables de entorno de la API

```env
PORT=8080
DATABASE_URL=postgresql://usuario:password@host:5432/guardia
API_REQUIRE_AUTH=true
CORS_ALLOWED_ORIGINS=https://tu-panel-web.com,http://localhost:5173
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Variable de entorno del panel

En `guardia-panel/.env` de desarrollo:

```env
VITE_API_BASE_URL=http://localhost:4000
```

En produccion del panel:

```env
VITE_API_BASE_URL=https://tu-api-publica.com
```

## Ejemplo con Render

Si quieres una ruta simple y estable:

1. Crea un servicio nuevo desde el repo.
2. Usa como Root Directory `GuardIA web/guardia-panel/api`.
3. Build Command: `npm ci`
4. Start Command: `npm start`
5. Agrega las variables de entorno listadas arriba.

Si prefieres desplegar con Docker desde la raiz del repo, tambien puedes usar el `Dockerfile` de la raiz.

## Verificacion minima despues del despliegue

1. Abre `https://tu-api-publica.com/health`
2. Debe responder algo como:

```json
{ "ok": true, "service": "guardia-api", "database": "connected" }
```

3. Inicia sesion en el panel.
4. Confirma que el panel puede leer `/users`, `/alerts` y `/cameras`.
5. Confirma que la app movil envia `Authorization: Bearer <token>`.

## Recomendaciones para produccion

- No expongas PostgreSQL directamente a la app movil ni al panel.
- Deja `API_REQUIRE_AUTH=true`.
- Usa `CORS_ALLOWED_ORIGINS` con el dominio real del panel.
- Si tu proveedor pone la API en reposo, usa un plan sin sleep o contempla una primera llamada de calentamiento.
- Guarda las credenciales de Firebase Admin solo como variables seguras del proveedor.
