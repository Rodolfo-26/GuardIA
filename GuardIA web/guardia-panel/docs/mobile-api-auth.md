# API compartida para panel y app movil

La app movil no debe conectarse directo a PostgreSQL. Debe consumir la misma API que usa el panel.

## Flujo recomendado

1. La app movil inicia sesion con Firebase Auth.
2. Obtiene el `idToken` del usuario autenticado.
3. Envia ese token como:

```http
Authorization: Bearer <firebase_id_token>
```

4. La API valida el token con Firebase Admin.
5. La API consulta PostgreSQL y responde los datos.

## Variables para activar proteccion en API

En `api/.env`:

```env
API_REQUIRE_AUTH=true
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Endpoints compartidos actuales

- `GET /users`
- `GET /users/:id`
- `GET /audit/users?limit=5`
- `GET /alerts`
- `PATCH /alerts/:id/workflow`
- `GET /cameras`
- `POST /cameras`
- `PATCH /cameras/:id`

## Roles

La API usa el claim `appRole` de Firebase:

- `Admin`
- `Supervisor`
- `Operador`

## Nota para el compañero de movil

Solo necesita:

- URL base de la API
- mismo proyecto Firebase
- login con Firebase
- enviar `Bearer token` en cada request
