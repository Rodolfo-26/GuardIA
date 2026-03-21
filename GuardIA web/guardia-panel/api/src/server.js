import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import readline from "readline";
import { attachAuthContext, requireAuth, requireRole } from "./authMiddleware.js";
import { pool, query } from "./db.js";
import {
  createAuditEntry,
  createUserProfile,
  getUserById,
  listRecentUserAudit,
  listUsers,
  revokeUserSessionsByFirebaseUid,
  updateUserRoleByFirebaseUid,
  updateUserStatusByFirebaseUid,
} from "./repositories/usersRepository.js";
import { serializeAudit, serializeUser } from "./serializers.js";
import { listAlerts, updateAlertWorkflow, createAlertFromMobile } from "./repositories/alertsRepository.js";
import { createCamera, listCameras, updateCamera } from "./repositories/camerasRepository.js";
import { listRecordings } from "./repositories/recordingsRepository.js";
import { logEvent, LOG_FILE_PATH } from "./logger.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(attachAuthContext);

// ─── HTTP Request Logger Middleware ───
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logEvent("info", "HTTP_REQUEST", `${req.method} ${req.path}`,
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      { method: req.method, path: req.originalUrl, statusCode: res.statusCode, durationMs: duration, ip: req.ip }
    );
  });
  next();
});

app.get("/health", async (_req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, service: "guardia-api", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.get("/users", requireAuth, async (_req, res, next) => {
  try {
    const rows = await listUsers();
    res.json({ items: rows.map(serializeUser), total: rows.length });
  } catch (error) {
    next(error);
  }
});

app.get("/users/:id", requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado." });
      return;
    }

    res.json({ item: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/audit/users", requireAuth, async (req, res, next) => {
  try {
    const limitValue = Math.min(Math.max(Number(req.query.limit || 5), 1), 50);
    const rows = await listRecentUserAudit(limitValue);
    res.json({ items: rows.map(serializeAudit), total: rows.length });
  } catch (error) {
    next(error);
  }
});

app.get("/alerts", requireAuth, async (_req, res, next) => {
  try {
    const items = await listAlerts();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.patch("/alerts/:id/workflow", requireAuth, requireRole(["Admin", "Supervisor", "Operador"]), async (req, res, next) => {
  try {
    const { assigneeUid, status, note } = req.body ?? {};

    if (!["nueva", "en_proceso", "resuelta"].includes(status)) {
      res.status(400).json({ message: "Estado invalido." });
      return;
    }

    await updateAlertWorkflow({
      alertId: req.params.id,
      assigneeUid: assigneeUid || null,
      status,
      note: note || "",
    });

    logEvent("info", "CRUD_ALERTS", "update_alert_workflow",
      `Alerta ${req.params.id} actualizada a estado '${status}'`,
      { alertId: req.params.id, status, assigneeUid: assigneeUid || null, note: note || "" }
    );

    res.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ALERT_NOT_FOUND") {
      res.status(404).json({ message: "Alerta no encontrada." });
      return;
    }

    next(error);
  }
});

app.post("/reports", requireAuth, async (req, res, next) => {
  try {
    const { type, urgency, description, location, notifyZoneOnly } = req.body ?? {};

    let severity = "media";
    if (urgency === "Baja") severity = "baja";
    if (urgency === "Alta") severity = "alta";

    const alertId = await createAlertFromMobile({
      title: "Reporte: " + (type || "Otro"),
      type: type || "reporte_usuario",
      severity,
      description: description || "Sin descripción proporcionada",
      metadata: { location, notifyZoneOnly, source: "mobile_app_report", folio: `GIA-${Date.now().toString().slice(-6)}` }
    });

    logEvent("info", "CRUD_ALERTS", "create_report",
      `Reporte creado con id ${alertId}`,
      { alertId, type, severity }
    );

    res.status(201).json({
      id: alertId,
      folio: `GIA-2026-${Date.now().toString().slice(-4)}`,
      status: "sent",
      message: "Reporte enviado exitosamente"
    });
  } catch (error) {
    next(error);
  }
});

app.post("/panic", requireAuth, async (req, res, next) => {
  try {
    const alertId = await createAlertFromMobile({
      title: "Botón de Pánico",
      type: "panico",
      severity: "critica",
      description: "El usuario ha activado el botón de pánico desde la aplicación móvil.",
      metadata: { source: "mobile_app_panic", user_firebase_uid: req.user?.uid || "desconocido" }
    });

    logEvent("info", "CRUD_ALERTS", "create_panic",
      `Botón de pánico activado con id ${alertId}`,
      { alertId }
    );

    res.status(201).json({
      message: "Alerta de pánico enviada",
      incidentId: alertId
    });
  } catch (error) {
    next(error);
  }
});

app.get("/cameras", requireAuth, async (_req, res, next) => {
  try {
    const items = await listCameras();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get("/recordings", requireAuth, async (_req, res, next) => {
  try {
    const items = await listRecordings();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/cameras", requireAuth, requireRole(["Admin", "Supervisor"]), async (req, res, next) => {
  try {
    const createdId = await createCamera(req.body ?? {});

    logEvent("info", "CRUD_CAMERAS", "create_camera",
      `Camara '${req.body?.name || "Sin nombre"}' creada con id ${createdId}`,
      { cameraId: createdId, name: req.body?.name, zone: req.body?.zone }
    );

    res.status(201).json({ ok: true, id: createdId });
  } catch (error) {
    next(error);
  }
});

app.patch("/cameras/:id", requireAuth, requireRole(["Admin", "Supervisor"]), async (req, res, next) => {
  try {
    const updated = await updateCamera(req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ message: "Camara no encontrada." });
      return;
    }

    logEvent("info", "CRUD_CAMERAS", "update_camera",
      `Camara ${req.params.id} actualizada`,
      { cameraId: req.params.id, changes: req.body }
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/users", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
  try {
    const {
      firebaseUid,
      fullName,
      email,
      role,
      status,
      site,
    } = req.body ?? {};

    if (!firebaseUid || !fullName || !email || !role || !status || !site) {
      res.status(400).json({ message: "Faltan campos obligatorios." });
      return;
    }

    if (!["admin", "supervisor", "operador"].includes(role)) {
      res.status(400).json({ message: "Rol invalido." });
      return;
    }

    if (!["activo", "inactivo", "bloqueado"].includes(status)) {
      res.status(400).json({ message: "Estado invalido." });
      return;
    }

    const created = await createUserProfile({
      firebaseUid,
      fullName,
      email,
      role,
      status,
      site,
    });

    if (!created) {
      res.status(500).json({ message: "No fue posible guardar el usuario." });
      return;
    }

    await createAuditEntry({
      targetFirebaseUid: firebaseUid,
      action: "create_user",
      changes: { email, role, status, site },
    });

    logEvent("info", "CRUD_USERS", "create_user",
      `Usuario '${fullName}' (${email}) creado con rol '${role}'`,
      { firebaseUid, email, role, status, site }
    );

    res.status(201).json({ ok: true, firebaseUid });
  } catch (error) {
    next(error);
  }
});

app.patch("/users/:id/role", requireAuth, requireRole(["Admin"]), async (req, res, next) => {
  try {
    const { role } = req.body ?? {};

    if (!["admin", "supervisor", "operador"].includes(role)) {
      res.status(400).json({ message: "Rol invalido." });
      return;
    }

    const updated = await updateUserRoleByFirebaseUid(req.params.id, role);

    if (!updated) {
      res.status(404).json({ message: "Usuario no encontrado." });
      return;
    }

    await createAuditEntry({
      targetFirebaseUid: req.params.id,
      action: "update_role",
      changes: { role },
    });

    logEvent("info", "CRUD_USERS", "update_role",
      `Rol de usuario ${req.params.id} actualizado a '${role}'`,
      { firebaseUid: req.params.id, newRole: role }
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.patch("/users/:id/status", requireAuth, requireRole(["Admin", "Supervisor"]), async (req, res, next) => {
  try {
    const { status } = req.body ?? {};

    if (!["activo", "inactivo", "bloqueado"].includes(status)) {
      res.status(400).json({ message: "Estado invalido." });
      return;
    }

    const updated = await updateUserStatusByFirebaseUid(req.params.id, status);

    if (!updated) {
      res.status(404).json({ message: "Usuario no encontrado." });
      return;
    }

    await createAuditEntry({
      targetFirebaseUid: req.params.id,
      action: "update_status",
      changes: { status },
    });

    logEvent("info", "CRUD_USERS", "update_status",
      `Estado de usuario ${req.params.id} actualizado a '${status}'`,
      { firebaseUid: req.params.id, newStatus: status }
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/users/:id/close-sessions", requireAuth, requireRole(["Admin", "Supervisor"]), async (req, res, next) => {
  try {
    await revokeUserSessionsByFirebaseUid(req.params.id);

    await createAuditEntry({
      targetFirebaseUid: req.params.id,
      action: "close_sessions",
      changes: { source: "panel" },
    });

    logEvent("info", "CRUD_USERS", "close_sessions",
      `Sesiones del usuario ${req.params.id} cerradas desde el panel`,
      { firebaseUid: req.params.id }
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// ─── Endpoint: Registrar evento de login/logout desde el frontend ───
app.post("/audit/login", requireAuth, async (req, res, next) => {
  try {
    const { action, email } = req.body ?? {};

    if (!["login", "logout", "mfa_verified", "login_failed"].includes(action)) {
      res.status(400).json({ message: "Accion invalida." });
      return;
    }

    logEvent("info", "AUTH", action,
      action === "login"
        ? `Usuario ${email || "desconocido"} inicio sesion`
        : action === "logout"
          ? `Usuario ${email || "desconocido"} cerro sesion`
          : action === "mfa_verified"
            ? `Usuario ${email || "desconocido"} verifico MFA`
            : `Intento de login fallido para ${email || "desconocido"}`,
      { email: email || "desconocido", action, ip: req.ip }
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// ─── Endpoint: Leer logs del archivo (paginado) ───
app.get("/audit/logs", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const category = req.query.category || null;

    if (!fs.existsSync(LOG_FILE_PATH)) {
      res.json({ items: [], total: 0, file: LOG_FILE_PATH });
      return;
    }

    const allLines = [];
    const fileStream = fs.createReadStream(LOG_FILE_PATH, { encoding: "utf8" });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (category && parsed.category !== category) continue;
        allLines.push(parsed);
      } catch {
        // Linea no valida, ignorar
      }
    }

    const recent = allLines.slice(-limit).reverse();
    res.json({ items: recent, total: allLines.length, file: LOG_FILE_PATH });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  logEvent("error", "SYSTEM", "unhandled_error",
    `Error interno: ${error.message || "Error desconocido"}`,
    { stack: error.stack }
  );

  console.error("[guardia-api]", error);
  res.status(500).json({
    message: "Ocurrio un error interno en la API.",
  });
});

const server = app.listen(port, () => {
  logEvent("info", "SYSTEM", "server_start",
    `GuardIA API escuchando en http://localhost:${port}`,
    { port, logFile: LOG_FILE_PATH }
  );
  console.log(`GuardIA API escuchando en http://localhost:${port}`);
});

async function shutdown(signal) {
  logEvent("info", "SYSTEM", "server_shutdown",
    `Cerrando servidor por ${signal}`,
    { signal }
  );

  console.log(`Cerrando servidor por ${signal}...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
