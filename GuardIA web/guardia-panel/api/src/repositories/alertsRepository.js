import { query } from "../db.js";

const alertsBaseQuery = `
  SELECT
    a.id,
    a.titulo,
    a.tipo_evento,
    a.severidad,
    a.estado,
    a.confianza_ia,
    a.descripcion,
    a.detectada_en,
    a.resuelta_en,
    c.nombre AS camera_name,
    z.nombre AS zone_name,
    COALESCE(u.nombre_completo, 'Sin asignar') AS assignee_name,
    u.firebase_uid AS assignee_uid,
    latest_action.nota AS latest_note,
    latest_action.tipo_accion AS latest_action_type,
    latest_action.creado_en AS latest_action_at
  FROM alertas a
  LEFT JOIN camaras c ON c.id = a.camara_id
  LEFT JOIN zonas z ON z.id = c.zona_id
  LEFT JOIN usuarios u ON u.id = a.usuario_asignado_id
  LEFT JOIN LATERAL (
    SELECT aa.tipo_accion, aa.nota, aa.creado_en
    FROM acciones_alerta aa
    WHERE aa.alerta_id = a.id
    ORDER BY aa.creado_en DESC
    LIMIT 1
  ) latest_action ON true
`;

export async function listAlerts() {
  const result = await query(
    `${alertsBaseQuery}
     ORDER BY
       CASE a.severidad
         WHEN 'critica' THEN 1
         WHEN 'alta' THEN 2
         WHEN 'media' THEN 3
         ELSE 4
       END,
       a.detectada_en DESC`,
  );

  return result.rows;
}

export async function updateAlertWorkflow({ alertId, assigneeUid, status, note }) {
  await query("BEGIN");

  try {
    let assigneeDbId = null;

    if (assigneeUid) {
      const userResult = await query(
        `SELECT id FROM usuarios WHERE firebase_uid = $1 LIMIT 1`,
        [assigneeUid],
      );
      assigneeDbId = userResult.rows[0]?.id ?? null;
    }

    const updateResult = await query(
      `
        UPDATE alertas
        SET
          usuario_asignado_id = $2,
          estado = $3::estado_alerta,
          resuelta_en = CASE WHEN $3::estado_alerta = 'resuelta' THEN now() ELSE NULL END
        WHERE id = $1
        RETURNING id
      `,
      [alertId, assigneeDbId, status],
    );

    if (!updateResult.rows[0]) {
      throw new Error("ALERT_NOT_FOUND");
    }

    await query(
      `
        INSERT INTO acciones_alerta (alerta_id, usuario_id, tipo_accion, nota)
        VALUES (
          $1,
          COALESCE($2, (SELECT id FROM usuarios ORDER BY creado_en ASC LIMIT 1)),
          $3,
          $4
        )
      `,
      [alertId, assigneeDbId, status === "resuelta" ? "cerrar" : "registrar", note || "Actualizacion operativa"],
    );

    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
}

export async function createAlertFromMobile({ title, type, severity, description, metadata }) {
  const result = await query(
    `
      INSERT INTO alertas (titulo, tipo_evento, severidad, descripcion, metadata)
      VALUES ($1, $2, $3::severidad_alerta, $4, $5::jsonb)
      RETURNING id
    `,
    [title, type, severity, description, metadata || {}]
  );
  return result.rows[0].id;
}
