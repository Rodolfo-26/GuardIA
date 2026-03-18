import { query } from "../db.js";

const usersBaseQuery = `
  SELECT
    u.id,
    u.firebase_uid,
    u.nombre_completo,
    u.correo,
    r.nombre AS rol,
    u.estado,
    COALESCE(u.sede_zona, 'Sin sede') AS sede,
    u.ultimo_login_en,
    u.creado_en,
    u.actualizado_en,
    COUNT(DISTINCT su.id) FILTER (WHERE su.revocado_en IS NULL AND su.expira_en > now()) AS sesiones_activas,
    COUNT(DISTINCT aa.id) AS alertas_atendidas
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  LEFT JOIN sesiones_usuario su ON su.usuario_id = u.id
  LEFT JOIN acciones_alerta aa ON aa.usuario_id = u.id
`;

export async function listUsers() {
  const result = await query(
    `${usersBaseQuery}
     GROUP BY u.id, r.nombre
     ORDER BY u.nombre_completo ASC`,
  );

  return result.rows;
}

export async function getUserById(userId) {
  const result = await query(
    `${usersBaseQuery}
     WHERE u.firebase_uid = $1
     GROUP BY u.id, r.nombre`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function listRecentUserAudit(limitValue) {
  const result = await query(
    `
      SELECT
        ba.id,
        ba.accion,
        ba.entidad,
        ba.actor_usuario_id,
        actor.firebase_uid AS actor_firebase_uid,
        actor.nombre_completo AS actor_nombre,
        actor_role.nombre AS actor_rol,
        ba.afectado_usuario_id,
        affected.firebase_uid AS afectado_firebase_uid,
        affected.nombre_completo AS afectado_nombre,
        ba.cambios_json,
        ba.creado_en
      FROM bitacora_auditoria ba
      LEFT JOIN usuarios actor ON actor.id = ba.actor_usuario_id
      LEFT JOIN roles actor_role ON actor_role.id = actor.rol_id
      LEFT JOIN usuarios affected ON affected.id = ba.afectado_usuario_id
      WHERE ba.entidad = 'usuarios'
      ORDER BY ba.creado_en DESC
      LIMIT $1
    `,
    [limitValue],
  );

  return result.rows;
}

export async function updateUserRoleByFirebaseUid(firebaseUid, roleName) {
  const result = await query(
    `
      UPDATE usuarios u
      SET
        rol_id = r.id,
        actualizado_en = now()
      FROM roles r
      WHERE u.firebase_uid = $1
        AND r.nombre = $2::rol_usuario
      RETURNING u.id, u.firebase_uid
    `,
    [firebaseUid, roleName],
  );

  return result.rows[0] ?? null;
}

export async function updateUserStatusByFirebaseUid(firebaseUid, statusName) {
  const result = await query(
    `
      UPDATE usuarios
      SET
        estado = $2::estado_usuario,
        actualizado_en = now()
      WHERE firebase_uid = $1
      RETURNING id, firebase_uid
    `,
    [firebaseUid, statusName],
  );

  return result.rows[0] ?? null;
}

export async function revokeUserSessionsByFirebaseUid(firebaseUid) {
  const result = await query(
    `
      UPDATE sesiones_usuario su
      SET revocado_en = now()
      FROM usuarios u
      WHERE u.id = su.usuario_id
        AND u.firebase_uid = $1
        AND su.revocado_en IS NULL
      RETURNING su.id
    `,
    [firebaseUid],
  );

  return result.rowCount ?? 0;
}

export async function createAuditEntry({
  targetFirebaseUid,
  action,
  changes,
}) {
  await query(
    `
      INSERT INTO bitacora_auditoria (
        actor_usuario_id,
        afectado_usuario_id,
        accion,
        entidad,
        cambios_json
      )
      VALUES (
        NULL,
        (SELECT id FROM usuarios WHERE firebase_uid = $1 LIMIT 1),
        $2,
        'usuarios',
        $3::jsonb
      )
    `,
    [targetFirebaseUid, action, JSON.stringify(changes ?? {})],
  );
}

export async function createUserProfile({
  firebaseUid,
  fullName,
  email,
  role,
  status,
  site,
}) {
  const result = await query(
    `
      INSERT INTO usuarios (
        firebase_uid,
        rol_id,
        nombre_completo,
        correo,
        estado,
        sede_zona
      )
      SELECT
        $1,
        r.id,
        $2,
        $3,
        $4::estado_usuario,
        $5
      FROM roles r
      WHERE r.nombre = $6::rol_usuario
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        rol_id = EXCLUDED.rol_id,
        nombre_completo = EXCLUDED.nombre_completo,
        correo = EXCLUDED.correo,
        estado = EXCLUDED.estado,
        sede_zona = EXCLUDED.sede_zona,
        actualizado_en = now()
      RETURNING id, firebase_uid
    `,
    [firebaseUid, fullName, email, status, site, role],
  );

  return result.rows[0] ?? null;
}
