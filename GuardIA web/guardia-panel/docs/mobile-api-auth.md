# API compartida para panel y app movil

La app movil no debe conectarse directo a PostgreSQL. Tanto el panel web como la app movil deben consumir la misma API publica.

## Arquitectura recomendada

1. Despliega `guardia-panel/api` en un hosting publico.
2. Conecta esa API a tu base PostgreSQL.
3. Configura el panel con `VITE_API_BASE_URL=https://tu-api-publica.com`.
4. Configura la app movil con la misma URL base.
5. Haz que ambos clientes inicien sesion con el mismo proyecto de Firebase Auth.
6. Envia el `idToken` de Firebase en cada request:

```http
Authorization: Bearer <firebase_id_token>
```

La API valida el token con Firebase Admin, revisa el rol del usuario y despues consulta PostgreSQL.

## Variables necesarias en la API

En `api/.env` o en las variables del proveedor:

```env
PORT=8080
DATABASE_URL=postgresql://usuario:password@host:5432/guardia
API_REQUIRE_AUTH=true
CORS_ALLOWED_ORIGINS=https://tu-panel-web.com,http://localhost:5173
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Importante sobre CORS

- `CORS_ALLOWED_ORIGINS` solo aplica al navegador del panel web.
- La app movil nativa normalmente no depende de CORS.
- Si no defines `CORS_ALLOWED_ORIGINS`, la API aceptara cualquier origen web.
- En produccion conviene registrar solo tu dominio del panel.

## Endpoints compartidos actuales

- `GET /health`
- `GET /users`
- `GET /users/:id`
- `GET /audit/users?limit=5`
- `GET /alerts`
- `PATCH /alerts/:id/workflow`
- `GET /cameras`
- `POST /cameras`
- `PATCH /cameras/:id`

## Roles esperados

La API usa el claim `appRole` de Firebase:

- `Admin`
- `Supervisor`
- `Operador`

## Lo que necesita el equipo movil

- URL base de la API publica
- mismo proyecto Firebase
- login con Firebase Auth
- enviar `Bearer token` en cada request

## Recomendacion practica

Para evitar problemas, separa despliegues asi:

- API: Render, Railway, Fly.io o Cloud Run
- Base de datos: Neon, Supabase, Railway Postgres o Cloud SQL
- Panel web: Vercel, Netlify o Firebase Hosting

El punto importante no es el proveedor, sino que exista una sola API publica central para ambos clientes.
