import { query } from "../db.js";

const usersBaseQuery = `
  SELECT
    u.id,
    u.firebase_uid,
    u.comunidad_id,
    c.nombre AS comunidad_nombre,
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
  LEFT JOIN comunidades c ON c.id = u.comunidad_id
  LEFT JOIN sesiones_usuario su ON su.usuario_id = u.id
  LEFT JOIN acciones_alerta aa ON aa.usuario_id = u.id
`;

export async function listUsers(communityId) {
  const result = await query(
    `${usersBaseQuery}
     WHERE u.comunidad_id = $1
     GROUP BY u.id, r.nombre, c.nombre
     ORDER BY u.nombre_completo ASC`,
    [communityId],
  );

  return result.rows;
}

export async function getUserById(userId, communityId) {
  const result = await query(
    `${usersBaseQuery}
     WHERE u.firebase_uid = $1
       AND u.comunidad_id = $2
     GROUP BY u.id, r.nombre, c.nombre`,
    [userId, communityId],
  );

  return result.rows[0] ?? null;
}

export async function listRecentUserAudit(limitValue, communityId) {
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
        AND (
          actor.comunidad_id = $2
          OR affected.comunidad_id = $2
        )
      ORDER BY ba.creado_en DESC
      LIMIT $1
    `,
    [limitValue, communityId],
  );

  return result.rows;
}

export async function updateUserRoleByFirebaseUid(firebaseUid, roleName, communityId) {
  const result = await query(
    `
      UPDATE usuarios u
      SET
        rol_id = r.id,
        actualizado_en = now()
      FROM roles r
      WHERE u.firebase_uid = $1
        AND u.comunidad_id = $3
        AND r.nombre = $2::rol_usuario
      RETURNING u.id, u.firebase_uid
    `,
    [firebaseUid, roleName, communityId],
  );

  return result.rows[0] ?? null;
}

export async function updateUserStatusByFirebaseUid(firebaseUid, statusName, communityId) {
  const result = await query(
    `
      UPDATE usuarios
      SET
        estado = $2::estado_usuario,
        actualizado_en = now()
      WHERE firebase_uid = $1
        AND comunidad_id = $3
      RETURNING id, firebase_uid
    `,
    [firebaseUid, statusName, communityId],
  );

  return result.rows[0] ?? null;
}

export async function revokeUserSessionsByFirebaseUid(firebaseUid, communityId) {
  const result = await query(
    `
      UPDATE sesiones_usuario su
      SET revocado_en = now()
      FROM usuarios u
      WHERE u.id = su.usuario_id
        AND u.firebase_uid = $1
        AND u.comunidad_id = $2
        AND su.revocado_en IS NULL
      RETURNING su.id
    `,
    [firebaseUid, communityId],
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
  communityId,
}) {
  const result = await query(
    `
      INSERT INTO usuarios (
        firebase_uid,
        comunidad_id,
        rol_id,
        nombre_completo,
        correo,
        estado,
        sede_zona
      )
      SELECT
        $1,
        $2,
        r.id,
        $3,
        $4,
        $5::estado_usuario,
        $6
      FROM roles r
      WHERE r.nombre = $7::rol_usuario
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        comunidad_id = EXCLUDED.comunidad_id,
        rol_id = EXCLUDED.rol_id,
        nombre_completo = EXCLUDED.nombre_completo,
        correo = EXCLUDED.correo,
        estado = EXCLUDED.estado,
        sede_zona = EXCLUDED.sede_zona,
        actualizado_en = now()
      RETURNING id, firebase_uid
    `,
    [firebaseUid, communityId, fullName, email, status, site, role],
  );

  return result.rows[0] ?? null;
}

export async function getAccessScopeByFirebaseUid(firebaseUid) {
  const result = await query(
    `
      SELECT
        u.id,
        u.firebase_uid,
        u.comunidad_id,
        c.nombre AS comunidad_nombre,
        r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      LEFT JOIN comunidades c ON c.id = u.comunidad_id
      WHERE u.firebase_uid = $1
      LIMIT 1
    `,
    [firebaseUid],
  );

  return result.rows[0] ?? null;
}
