import admin from "firebase-admin";
import dotenv from "dotenv";
import { pool, query } from "../db.js";
import "../firebaseAdmin.js";

dotenv.config();

const ROLE_MAP = {
  Admin: "admin",
  Supervisor: "supervisor",
  Operador: "operador",
};

const STATUS_MAP = {
  Activo: "activo",
  Inactivo: "inactivo",
  Bloqueado: "bloqueado",
};

function normalizeRole(value) {
  return ROLE_MAP[value] || "operador";
}

function normalizeStatus(value) {
  return STATUS_MAP[value] || "activo";
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function importUsers() {
  const snapshot = await admin.firestore().collection("usuarios").get();
  let imported = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const firebaseUid = doc.id;
    const fullName = String(data.displayName || data.fullName || data.email || firebaseUid).trim();
    const email = String(data.email || `${firebaseUid}@guardia.local`).trim().toLowerCase();
    const role = normalizeRole(String(data.role || ""));
    const status = normalizeStatus(String(data.status || ""));
    const site = String(data.site || "Sede Principal").trim();
    const lastAccessAt = toDate(data.lastAccessAt);

    await query(
      `
        INSERT INTO usuarios (
          firebase_uid,
          rol_id,
          nombre_completo,
          correo,
          estado,
          sede_zona,
          ultimo_login_en
        )
        SELECT
          $1,
          r.id,
          $2,
          $3,
          $4::estado_usuario,
          $5,
          $6
        FROM roles r
        WHERE r.nombre = $7::rol_usuario
        ON CONFLICT (firebase_uid)
        DO UPDATE SET
          rol_id = EXCLUDED.rol_id,
          nombre_completo = EXCLUDED.nombre_completo,
          correo = EXCLUDED.correo,
          estado = EXCLUDED.estado,
          sede_zona = EXCLUDED.sede_zona,
          ultimo_login_en = COALESCE(EXCLUDED.ultimo_login_en, usuarios.ultimo_login_en),
          actualizado_en = now()
      `,
      [firebaseUid, fullName, email, status, site, lastAccessAt, role],
    );

    imported += 1;
  }

  return imported;
}

async function importAuditLogs() {
  const snapshot = await admin.firestore().collection("auditoria_usuarios").get();
  let imported = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const actorUid = data.actorUid ? String(data.actorUid) : null;
    const targetUid = data.targetUid ? String(data.targetUid) : null;
    const action = String(data.action || "firebase_import");
    const changes = {
      beforeData: data.beforeData || null,
      afterData: data.afterData || null,
      meta: data.meta || null,
      source: "firestore_import",
    };
    const createdAt = toDate(data.createdAt) || new Date();

    await query(
      `
        INSERT INTO bitacora_auditoria (
          actor_usuario_id,
          afectado_usuario_id,
          accion,
          entidad,
          cambios_json,
          creado_en
        )
        SELECT
          (SELECT id FROM usuarios WHERE firebase_uid = $1 LIMIT 1),
          (SELECT id FROM usuarios WHERE firebase_uid = $2 LIMIT 1),
          $3,
          'usuarios',
          $4::jsonb,
          $5
        WHERE NOT EXISTS (
          SELECT 1
          FROM bitacora_auditoria
          WHERE accion = $3
            AND entidad = 'usuarios'
            AND creado_en = $5
            AND afectado_usuario_id IS NOT DISTINCT FROM (SELECT id FROM usuarios WHERE firebase_uid = $2 LIMIT 1)
        )
      `,
      [actorUid, targetUid, action, JSON.stringify(changes), createdAt],
    );

    imported += 1;
  }

  return imported;
}

async function ensureDefaultSede() {
  await query(
    `
      INSERT INTO sedes (nombre, direccion)
      VALUES ('Sede Principal', 'Migrada desde Firebase')
      ON CONFLICT DO NOTHING
    `,
  );
}

async function main() {
  try {
    await ensureDefaultSede();
    const importedUsers = await importUsers();
    const importedAudit = await importAuditLogs();

    console.log(`Usuarios importados desde Firestore: ${importedUsers}`);
    console.log(`Eventos de auditoria importados desde Firestore: ${importedAudit}`);
  } catch (error) {
    console.error("[import:firestore-users]", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
