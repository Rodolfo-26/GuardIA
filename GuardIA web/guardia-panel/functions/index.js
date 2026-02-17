const admin = require("firebase-admin");
const functions = require("firebase-functions/v1");

admin.initializeApp();
const db = admin.firestore();
const AUDIT_COLLECTION = "auditoria_usuarios";

function isAdminFromToken(auth) {
  const claims = auth?.token || {};
  return claims.appRole === "Admin" || claims.role === "Admin" || claims.admin === true;
}

function isSupervisorFromToken(auth) {
  const claims = auth?.token || {};
  return claims.appRole === "Supervisor" || claims.role === "Supervisor";
}

async function isAdminUser(uid) {
  try {
    const profile = await db.collection("usuarios").doc(uid).get();
    const role = profile.exists ? profile.data()?.role : null;
    return role === "Admin";
  } catch {
    return false;
  }
}

async function getProfileRole(uid) {
  try {
    const profile = await db.collection("usuarios").doc(uid).get();
    return profile.exists ? profile.data()?.role || null : null;
  } catch {
    return null;
  }
}

async function getEffectiveRole(context) {
  if (isAdminFromToken(context.auth)) return "Admin";
  if (isSupervisorFromToken(context.auth)) return "Supervisor";
  const role = await getProfileRole(context.auth.uid);
  if (role === "Admin" || role === "Supervisor" || role === "Operador") return role;
  return "Operador";
}

function assertNonEmpty(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", `Campo invalido: ${field}`);
  }
}

async function writeAuditLog({
  actorUid,
  actorName = null,
  actorRole,
  action,
  targetUid,
  targetName = null,
  beforeData = null,
  afterData = null,
  meta = {},
}) {
  await db.collection(AUDIT_COLLECTION).add({
    actorUid,
    actorName,
    actorRole,
    action,
    targetUid,
    targetName,
    beforeData,
    afterData,
    meta,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function getUserDisplayName(uid) {
  if (!uid) return null;
  try {
    const profile = await db.collection("usuarios").doc(uid).get();
    if (profile.exists) {
      const data = profile.data() || {};
      return data.displayName || data.email || uid;
    }
  } catch {
    // noop
  }

  try {
    const authUser = await admin.auth().getUser(uid);
    return authUser.displayName || authUser.email || uid;
  } catch {
    return uid;
  }
}

exports.createUserByAdmin = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const callerUid = context.auth.uid;
  const callerIsAdmin = isAdminFromToken(context.auth) || (await isAdminUser(callerUid));
  if (!callerIsAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden crear usuarios.");
  }

  const { fullName, email, password, appRole, status, site } = data || {};

  assertNonEmpty(fullName, "fullName");
  assertNonEmpty(email, "email");
  assertNonEmpty(password, "password");
  assertNonEmpty(appRole, "appRole");
  assertNonEmpty(status, "status");
  assertNonEmpty(site, "site");

  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "La contrasena debe tener al menos 6 caracteres.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = appRole.trim();
  const normalizedStatus = status.trim();

  if (!["Admin", "Operador", "Supervisor"].includes(normalizedRole)) {
    throw new functions.https.HttpsError("invalid-argument", "Rol invalido.");
  }

  if (!["Activo", "Inactivo", "Bloqueado"].includes(normalizedStatus)) {
    throw new functions.https.HttpsError("invalid-argument", "Estado invalido.");
  }

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName: fullName.trim(),
      disabled: normalizedStatus !== "Activo",
    });
  } catch (error) {
    const code = error?.code || "";
    if (code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "El correo ya existe en Authentication.");
    }
    throw new functions.https.HttpsError("internal", "No se pudo crear el usuario en Authentication.");
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, {
    appRole: normalizedRole,
  });

  await db.collection("usuarios").doc(userRecord.uid).set(
    {
      displayName: fullName.trim(),
      email: normalizedEmail,
      role: normalizedRole,
      status: normalizedStatus,
      site: site.trim(),
      sessions: 0,
      alertsHandled: 0,
      lastAccessAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: callerUid,
      source: "admin_function",
    },
    { merge: true },
  );

  await writeAuditLog({
    actorUid: callerUid,
    actorName: await getUserDisplayName(callerUid),
    actorRole: "Admin",
    action: "create_user",
    targetUid: userRecord.uid,
    targetName: fullName.trim(),
    beforeData: null,
    afterData: {
      role: normalizedRole,
      status: normalizedStatus,
      site: site.trim(),
      email: normalizedEmail,
    },
    meta: { source: "createUserByAdmin" },
  });

  return { uid: userRecord.uid };
});

exports.syncMyRoleClaim = functions.region("us-central1").https.onCall(async (_, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const uid = context.auth.uid;
  const profile = await db.collection("usuarios").doc(uid).get();
  const profileRole = profile.exists ? profile.data()?.role : null;
  const role = ["Admin", "Supervisor", "Operador"].includes(profileRole) ? profileRole : "Operador";

  await admin.auth().setCustomUserClaims(uid, {
    appRole: role,
  });

  return { appRole: role };
});

exports.updateUserRole = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const authTime = Number(context.auth.token?.auth_time || 0);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const maxAgeSeconds = 5 * 60;
  if (!authTime || nowSeconds - authTime > maxAgeSeconds) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Verificacion requerida. Vuelve a autenticarte para cambiar roles.",
    );
  }

  const actorUid = context.auth.uid;
  const actorRole = await getEffectiveRole(context);
  if (actorRole !== "Admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden cambiar roles.");
  }

  const { targetUid, role } = data || {};
  assertNonEmpty(targetUid, "targetUid");
  assertNonEmpty(role, "role");
  if (!["Admin", "Operador", "Supervisor"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Rol invalido.");
  }

  const userRef = db.collection("usuarios").doc(targetUid);
  const beforeSnap = await userRef.get();
  if (!beforeSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Usuario no encontrado.");
  }

  const before = beforeSnap.data() || {};
  await userRef.set(
    {
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    },
    { merge: true },
  );

  const authUser = await admin.auth().getUser(targetUid);
  await admin.auth().setCustomUserClaims(targetUid, {
    ...(authUser.customClaims || {}),
    appRole: role,
  });

  await writeAuditLog({
    actorUid,
    actorName: await getUserDisplayName(actorUid),
    actorRole,
    action: "update_role",
    targetUid,
    targetName: before.displayName || before.email || targetUid,
    beforeData: { role: before.role || null },
    afterData: { role },
    meta: { source: "updateUserRole" },
  });

  return { ok: true };
});

exports.updateUserStatus = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const actorUid = context.auth.uid;
  const actorRole = await getEffectiveRole(context);
  if (actorRole !== "Admin" && actorRole !== "Supervisor") {
    throw new functions.https.HttpsError("permission-denied", "No tienes permisos para cambiar estado.");
  }

  const { targetUid, status } = data || {};
  assertNonEmpty(targetUid, "targetUid");
  assertNonEmpty(status, "status");
  if (!["Activo", "Inactivo", "Bloqueado"].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Estado invalido.");
  }

  const userRef = db.collection("usuarios").doc(targetUid);
  const beforeSnap = await userRef.get();
  if (!beforeSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Usuario no encontrado.");
  }

  const before = beforeSnap.data() || {};
  if (actorRole === "Supervisor" && before.role === "Admin") {
    throw new functions.https.HttpsError("permission-denied", "Supervisor no puede modificar admins.");
  }

  await userRef.set(
    {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    },
    { merge: true },
  );

  if (before.authUid || targetUid) {
    try {
      await admin.auth().updateUser(targetUid, { disabled: status !== "Activo" });
    } catch {
      // Si no existe en Auth, mantenemos el cambio operativo en Firestore.
    }
  }

  await writeAuditLog({
    actorUid,
    actorName: await getUserDisplayName(actorUid),
    actorRole,
    action: "update_status",
    targetUid,
    targetName: before.displayName || before.email || targetUid,
    beforeData: { status: before.status || null },
    afterData: { status },
    meta: { source: "updateUserStatus" },
  });

  return { ok: true };
});

exports.closeUserSessions = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const actorUid = context.auth.uid;
  const actorRole = await getEffectiveRole(context);
  const { targetUid } = data || {};
  assertNonEmpty(targetUid, "targetUid");

  const canManage =
    actorRole === "Admin" ||
    actorRole === "Supervisor" ||
    (actorRole === "Operador" && actorUid === targetUid);

  if (!canManage) {
    throw new functions.https.HttpsError("permission-denied", "No tienes permisos para cerrar sesiones.");
  }

  const userRef = db.collection("usuarios").doc(targetUid);
  const beforeSnap = await userRef.get();
  if (!beforeSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Usuario no encontrado.");
  }

  const before = beforeSnap.data() || {};
  await userRef.set(
    {
      sessions: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    },
    { merge: true },
  );

  await writeAuditLog({
    actorUid,
    actorName: await getUserDisplayName(actorUid),
    actorRole,
    action: "close_sessions",
    targetUid,
    targetName: before.displayName || before.email || targetUid,
    beforeData: { sessions: before.sessions ?? null },
    afterData: { sessions: 0 },
    meta: { source: "closeUserSessions" },
  });

  return { ok: true };
});
