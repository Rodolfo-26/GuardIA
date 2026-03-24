import { query } from "../db.js";

export async function listReports(communityId) {
  const result = await query(
    `
      SELECT
        r.id,
        r.created_by_user_id,
        u.firebase_uid AS created_by_firebase_uid,
        u.nombre_completo AS created_by_name,
        r.role,
        r.type,
        r.priority,
        r.ubicacion,
        r.description,
        r.status,
        r.created_at,
        r.updated_at
      FROM reportes r
      JOIN usuarios u ON u.id = r.created_by_user_id
      WHERE u.comunidad_id = $1
      ORDER BY r.created_at DESC
    `,
    [communityId],
  );

  return result.rows;
}

/**
 * Crea un reporte en la tabla `reportes`.
 * Recibe el firebase_uid del usuario y lo resuelve al id interno (uuid)
 * de la tabla `usuarios` para cumplir con la FK.
 */
export async function createReport({
  firebase_uid,
  role,
  type,
  priority,
  description,
  status,
  ubicacion,
}) {
  // Resolver firebase_uid → usuarios.id (uuid)
  const userResult = await query(
    `SELECT id FROM usuarios WHERE firebase_uid = $1 LIMIT 1`,
    [firebase_uid],
  );

  if (!userResult.rows[0]) {
    throw new Error("USER_NOT_FOUND");
  }

  const userId = userResult.rows[0].id;

  const result = await query(
    `
      INSERT INTO reportes (created_by_user_id, role, type, priority, description, status, ubicacion)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [userId, role, type, priority, description, status, ubicacion || null],
  );

  return result.rows[0].id;
}
