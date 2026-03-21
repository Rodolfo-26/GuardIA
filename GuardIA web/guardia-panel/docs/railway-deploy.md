# Desplegar GuardIA API en Railway

Esta es la forma mas simple de publicar la API actual sin reescribir Express.

## Lo que vas a desplegar

- API: `GuardIA web/guardia-panel/api`
- Panel web: se queda separado y solo apunta a la URL publica de la API
- Base de datos: PostgreSQL de Railway o una PostgreSQL externa

## Por que Railway si encaja aqui

La documentacion oficial de Railway para Node.js indica que detecta `package.json`, instala dependencias y ejecuta el comando de inicio del servicio. Eso encaja bien con esta API porque ya tiene `npm start` en `api/package.json`.

## Paso 1. Crear el proyecto

1. Entra a Railway.
2. Crea un proyecto nuevo.
3. Conecta tu repositorio de GitHub.
4. Crea un servicio nuevo desde el repo.

## Paso 2. Apuntar Railway a la carpeta correcta

En el servicio de la API, usa como Root Directory:

```text
GuardIA web/guardia-panel/api
```

Con eso Railway tomara el `package.json` correcto y podra arrancar la API con `npm start`.

## Paso 3. Crear o conectar PostgreSQL

Tienes dos opciones:

- Agregar un servicio PostgreSQL dentro de Railway
- Usar una base PostgreSQL externa como Neon o Supabase

Si usas PostgreSQL dentro de Railway, toma la cadena de conexion publica y ponla en `DATABASE_URL`.

## Paso 4. Variables de entorno de la API

Configura estas variables en el servicio de Railway:

```env
PORT=8080
DATABASE_URL=postgresql://usuario:password@host:5432/guardia
API_REQUIRE_AUTH=true
CORS_ALLOWED_ORIGINS=https://tu-panel-web.com,http://localhost:5173
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Paso 5. Inicializar la base

Railway te despliega la API, pero tu esquema lo tienes que cargar una vez en PostgreSQL con `db/init.sql`.

El archivo esta aqui:

```text
GuardIA web/guardia-panel/db/init.sql
```

Si quieres datos de prueba, tambien tienes:

```text
GuardIA web/guardia-panel/db/seed-dev.sql
```

## Paso 6. Verificar la API publica

Cuando Railway publique el servicio, abre:

```text
https://tu-servicio.railway.app/health
```

Debes recibir una respuesta similar a:

```json
{ "ok": true, "service": "guardia-api", "database": "connected" }
```

## Paso 7. Conectar el panel web

En el panel, usa:

```env
VITE_API_BASE_URL=https://tu-servicio.railway.app
```

El ejemplo de entorno del panel ya incluye esa variable.

## Paso 8. Conectar la app movil

Usa la misma URL base:

```text
https://tu-servicio.railway.app
```

Y envia siempre:

```http
Authorization: Bearer <firebase_id_token>
```

## Notas importantes

- CORS afecta al panel web, no normalmente a la app movil nativa.
- No expongas PostgreSQL directo a clientes.
- Deja `API_REQUIRE_AUTH=true` en produccion.
- Usa solo el dominio real de tu panel en `CORS_ALLOWED_ORIGINS`.

## Referencias oficiales

- Railway Node.js deploy: https://railway.com/deploy/node-js
- Railway config as code reference: https://docs.railway.com/config-as-code/reference
