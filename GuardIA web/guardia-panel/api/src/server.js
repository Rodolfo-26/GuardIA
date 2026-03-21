import cors from "cors";
import express from "express";
import dotenv from "dotenv";
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
import { listAlerts, updateAlertWorkflow } from "./repositories/alertsRepository.js";
import { createCamera, listCameras, updateCamera } from "./repositories/camerasRepository.js";

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

    res.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ALERT_NOT_FOUND") {
      res.status(404).json({ message: "Alerta no encontrada." });
      return;
    }

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

app.post("/cameras", requireAuth, requireRole(["Admin", "Supervisor"]), async (req, res, next) => {
  try {
    const createdId = await createCamera(req.body ?? {});
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

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error("[guardia-api]", error);
  res.status(500).json({
    message: "Ocurrio un error interno en la API.",
  });
});

const server = app.listen(port, () => {
  console.log(`GuardIA API escuchando en http://localhost:${port}`);
});

async function shutdown(signal) {
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
