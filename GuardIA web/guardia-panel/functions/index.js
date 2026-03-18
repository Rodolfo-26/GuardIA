const admin = require("firebase-admin");
const functions = require("firebase-functions/v1");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const AUDIT_COLLECTION = "auditoria_usuarios";
const EMAIL_OTP_COLLECTION = "auth_email_otp";

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

function getOtpHash(uid, code) {
  const secret = functions.config().guardia_auth?.otp_secret || "guardia-dev-otp-secret";
  return crypto.createHash("sha256").update(`${uid}:${code}:${secret}`).digest("hex");
}

function createOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

function buildOtpEmailTemplate({ displayName, code }) {
  return `
    <div style="background:#eef4ff;padding:36px 16px;font-family:Arial,sans-serif;color:#f8fafc;">
      <div style="max-width:640px;margin:0 auto;overflow:hidden;border-radius:30px;border:1px solid #27526d;background:
        radial-gradient(circle at top left, rgba(103,232,249,0.26), transparent 32%),
        radial-gradient(circle at top right, rgba(45,212,191,0.20), transparent 26%),
        linear-gradient(180deg, #14314e 0%, #1b3655 46%, #223b58 100%);
        box-shadow:0 24px 60px rgba(15,23,42,0.24), 0 0 0 1px rgba(125,211,252,0.12);">
        <div style="padding:30px 30px 24px;border-bottom:1px solid rgba(186,230,253,0.18);">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="vertical-align:middle;">
                <div style="display:inline-flex;height:58px;width:58px;align-items:center;justify-content:center;border-radius:18px;border:1px solid rgba(103,232,249,0.42);background:linear-gradient(180deg, rgba(8,145,178,0.46), rgba(14,116,144,0.24));box-shadow:0 0 30px rgba(103,232,249,0.22);">
                  <div style="height:24px;width:24px;border-radius:8px;background:#67e8f9;box-shadow:0 0 22px rgba(103,232,249,0.75);"></div>
                </div>
              </td>
              <td style="padding-left:16px;vertical-align:middle;">
                <p style="margin:0;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#d7f7ff !important;-webkit-text-fill-color:#d7f7ff;font-weight:700;">GuardIA Access</p>
                <h1 style="margin:8px 0 0;font-size:34px;line-height:1;color:#ffffff !important;-webkit-text-fill-color:#ffffff;font-weight:900;">Verificacion de acceso</h1>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <span style="display:inline-block;border-radius:999px;border:1px solid rgba(110,231,183,0.46);background:rgba(16,185,129,0.26);padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:0.08em;color:#ffffff !important;-webkit-text-fill-color:#ffffff;text-transform:uppercase;">
                  Seguridad activa
                </span>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding:30px;">
          <div style="margin:0 0 18px;border-radius:18px;border:1px solid rgba(251,191,36,0.42);background:linear-gradient(90deg, rgba(251,191,36,0.26), rgba(249,115,22,0.20));padding:14px 16px;box-shadow:0 10px 24px rgba(249,115,22,0.14);">
            <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#fff7d6 !important;-webkit-text-fill-color:#fff7d6;">Intento de acceso detectado</p>
          </div>
          <p style="margin:0 0 12px;font-size:16px;color:#ffffff !important;-webkit-text-fill-color:#ffffff;">Hola <span style="color:#ffffff !important;-webkit-text-fill-color:#ffffff;font-weight:800;">${displayName || "usuario"}</span>,</p>
          <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#edf6ff !important;-webkit-text-fill-color:#edf6ff;">
            Detectamos un intento de acceso a tu panel de monitoreo inteligente. Para completar el ingreso,
            confirma tu identidad con el siguiente codigo temporal.
          </p>
          <div style="margin:0 0 18px;padding:24px;border-radius:24px;border:1px solid rgba(103,232,249,0.34);background:
            radial-gradient(circle at top left, rgba(186,230,253,0.28), transparent 38%),
            linear-gradient(135deg, rgba(56,189,248,0.34), rgba(45,212,191,0.30)),
            linear-gradient(180deg, rgba(12,74,110,0.78), rgba(17,24,39,0.66));text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.10), 0 0 44px rgba(56,189,248,0.18);">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#f0f9ff !important;-webkit-text-fill-color:#f0f9ff;">Codigo de acceso</p>
            <div style="font-size:42px;letter-spacing:0.28em;font-weight:900;color:#ffffff !important;-webkit-text-fill-color:#ffffff;text-shadow:0 0 30px rgba(186,230,253,0.48);">${code}</div>
            <p style="margin:14px 0 0;font-size:12px;color:#f8fdff !important;-webkit-text-fill-color:#f8fdff;">Vigencia: 10 minutos</p>
          </div>
          <div style="margin:0 0 18px;padding:16px;border-radius:18px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.12);">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#f8fbff !important;-webkit-text-fill-color:#f8fbff;">
              Si no solicitaste este acceso, ignora este mensaje y revisa la actividad de tu cuenta inmediatamente.
            </p>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border-collapse:collapse;">
            <tr>
              <td style="width:50%;padding-right:6px;">
                <div style="border-radius:16px;border:1px solid rgba(125,211,252,0.20);background:rgba(125,211,252,0.12);padding:14px;">
                  <p style="margin:0;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#d7f7ff !important;-webkit-text-fill-color:#d7f7ff;">Canal</p>
                  <p style="margin:6px 0 0;font-size:14px;font-weight:800;color:#ffffff !important;-webkit-text-fill-color:#ffffff;">Correo seguro</p>
                </div>
              </td>
              <td style="width:50%;padding-left:6px;">
                <div style="border-radius:16px;border:1px solid rgba(110,231,183,0.20);background:rgba(16,185,129,0.13);padding:14px;">
                  <p style="margin:0;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#ecfdf5 !important;-webkit-text-fill-color:#ecfdf5;">Estado</p>
                  <p style="margin:6px 0 0;font-size:14px;font-weight:800;color:#ffffff !important;-webkit-text-fill-color:#ffffff;">Validacion requerida</p>
                </div>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#edf4ff !important;-webkit-text-fill-color:#edf4ff;">
            Este mensaje fue generado por el sistema de acceso seguro de GuardIA.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendOtpEmail({ to, displayName, code }) {
  const apiKey = functions.config().guardia_mail?.api_key || "";
  const from = functions.config().guardia_mail?.from || "";
  const allowDebugFallback = String(process.env.FUNCTIONS_EMULATOR || "").toLowerCase() === "true"
    || String(process.env.GUARDIA_ALLOW_EMAIL_DEBUG_FALLBACK || "true").toLowerCase() === "true";

  if (!apiKey || !from) {
    if (allowDebugFallback) {
      console.log("[GuardIA OTP][EMULATOR]", { to, code });
      return { debugCode: code };
    }
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Configura guardia_mail.api_key y guardia_mail.from para enviar correos OTP.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "GuardIA | Codigo de acceso",
      html: buildOtpEmailTemplate({ displayName, code }),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error("[GuardIA OTP][RESEND_ERROR]", {
      status: response.status,
      to,
      from,
      responseText,
    });

    if (allowDebugFallback) {
      return {
        debugCode: code,
        warning: "fallback_debug_code",
      };
    }

    throw new functions.https.HttpsError("internal", "No fue posible enviar el correo de verificacion.");
  }

  return {};
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

exports.beginEmailSecondFactor = functions.region("us-central1").https.onCall(async (_, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const uid = context.auth.uid;
  const authUser = await admin.auth().getUser(uid);
  const email = authUser.email;
  if (!email) {
    throw new functions.https.HttpsError("failed-precondition", "La cuenta no tiene un correo registrado.");
  }

  const code = createOtpCode();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));
  const profileRole = await getProfileRole(uid);

  const otpRef = db.collection(EMAIL_OTP_COLLECTION).doc(uid);
  await otpRef.set({
    uid,
    email,
    role: profileRole || "Operador",
    codeHash: getOtpHash(uid, code),
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
    usedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const mailResult = await sendOtpEmail({
    to: email,
    displayName: authUser.displayName || email,
    code,
  });

  return {
    ok: true,
    message: "Te enviamos un codigo de verificacion al correo registrado.",
    expiresInSeconds: 600,
    ...(mailResult.debugCode ? { debugCode: mailResult.debugCode } : {}),
  };
});

exports.verifyEmailSecondFactor = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const { code } = data || {};
  assertNonEmpty(code, "code");

  const uid = context.auth.uid;
  const otpRef = db.collection(EMAIL_OTP_COLLECTION).doc(uid);
  const otpSnap = await otpRef.get();
  if (!otpSnap.exists) {
    throw new functions.https.HttpsError("not-found", "No existe una verificacion pendiente.");
  }

  const otp = otpSnap.data() || {};
  const expiresAt = otp.expiresAt?.toDate ? otp.expiresAt.toDate().getTime() : 0;
  const attempts = Number(otp.attempts || 0);
  const maxAttempts = Number(otp.maxAttempts || 5);

  if (otp.usedAt) {
    throw new functions.https.HttpsError("failed-precondition", "Este codigo ya fue utilizado.");
  }

  if (!expiresAt || Date.now() > expiresAt) {
    throw new functions.https.HttpsError("deadline-exceeded", "El codigo ha expirado.");
  }

  if (attempts >= maxAttempts) {
    throw new functions.https.HttpsError("resource-exhausted", "Se excedio el numero de intentos permitidos.");
  }

  const valid = otp.codeHash === getOtpHash(uid, String(code).trim());
  if (!valid) {
    await otpRef.set({ attempts: attempts + 1 }, { merge: true });
    throw new functions.https.HttpsError("permission-denied", "Codigo incorrecto.");
  }

  await otpRef.set(
    {
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: attempts + 1,
    },
    { merge: true },
  );

  await db.collection("usuarios").doc(uid).set(
    {
      lastSecondFactorAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true };
});
