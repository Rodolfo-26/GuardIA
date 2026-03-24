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

export async function createReport({
  createdByUserId,
  role,
  type,
  priority,
  ubicacion,
  description,
  status = "sent",
}) {
  const result = await query(
    `
      INSERT INTO reportes (
        created_by_user_id,
        role,
        type,
        priority,
        ubicacion,
        description,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [createdByUserId, role, type, priority, ubicacion ?? null, description, status],
  );

  return result.rows[0]?.id ?? null;
}
