# GuardIA Postgres API

Este arranque deja una API local minima para empezar a mover el panel a PostgreSQL sin tocar todavia el login con Firebase.

## 1. Levantar PostgreSQL

Desde la raiz de `guardia-panel`:

```bash
docker compose up -d
```

Eso crea una base local llamada `guardia` y ejecuta automaticamente [db/init.sql](/c:/Users/estra/Downloads/GuardIA%20web%20(2)/GuardIA%20web/guardia-panel/db/init.sql).

Si quieres datos de prueba:

```bash
docker exec -i guardia-postgres psql -U guardia_app -d guardia < db/seed-dev.sql
```

## 2. Instalar dependencias de la API

```bash
cd api
npm install
```

## 3. Configurar variables

```bash
copy .env.example .env
```

Valor por defecto:

```env
PORT=4000
DATABASE_URL=postgresql://guardia_app:guardia_dev@127.0.0.1:5433/guardia
```

## 4. Ejecutar la API

```bash
npm run dev
```

## 5. Endpoints iniciales

- `GET /health`
- `GET /users`
- `GET /users/:id`
- `GET /audit/users?limit=5`

## 6. Siguiente paso recomendado

Mover [users.ts](/c:/Users/estra/Downloads/GuardIA%20web%20(2)/GuardIA%20web/guardia-panel/src/services/users.ts) a esta API para dejar de leer `usuarios` y `auditoria_usuarios` desde Firestore.
