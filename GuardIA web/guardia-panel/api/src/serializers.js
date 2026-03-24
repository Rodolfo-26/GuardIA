const userRoleMap = {
  admin: "Admin",
  supervisor: "Supervisor",
  operador: "Operador",
};

const userStatusMap = {
  activo: "Activo",
  inactivo: "Inactivo",
  bloqueado: "Bloqueado",
};

function formatLastAccess(value) {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatAuditDate(value) {
  if (!value) return "Ahora";
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function serializeUser(row) {
  return {
    id: row.firebase_uid,
    dbId: row.id,
    firebaseUid: row.firebase_uid,
    fullName: row.nombre_completo,
    email: row.correo,
    role: userRoleMap[row.rol] ?? "Operador",
    status: userStatusMap[row.estado] ?? "Activo",
    site: row.sede ?? "Sin sede",
    lastAccess: formatLastAccess(row.ultimo_login_en),
    sessions: Number(row.sesiones_activas ?? 0),
    alertsHandled: Number(row.alertas_atendidas ?? 0),
    createdAt: row.creado_en,
    updatedAt: row.actualizado_en,
  };
}

export function serializeAudit(row) {
  return {
    id: row.id,
    action: row.accion,
    entity: row.entidad,
    actorUid: row.actor_firebase_uid ?? "-",
    actorName: row.actor_nombre ?? "Sistema",
    actorRole: userRoleMap[row.actor_rol] ?? "Desconocido",
    targetUid: row.afectado_firebase_uid ?? "-",
    targetName: row.afectado_nombre ?? "Sin objetivo",
    createdAt: formatAuditDate(row.creado_en),
    changes: row.cambios_json ?? {},
  };
}

export function serializeReport(row) {
  return {
    id: row.id,
    createdByUserId: row.created_by_firebase_uid ?? row.created_by_user_id,
    createdByName: row.created_by_name ?? "Sin autor",
    role: row.role,
    type: row.type,
    priority: row.priority,
    location: row.ubicacion ?? "Sin ubicacion",
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
