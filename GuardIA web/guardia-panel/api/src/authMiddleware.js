import { firebaseAdminAuth } from "./firebaseAdmin.js";
import { getAccessScopeByFirebaseUid } from "./repositories/usersRepository.js";

const requireAuthEnabled = String(process.env.API_REQUIRE_AUTH || "false").toLowerCase() === "true";

function getBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith("Bearer ")) return null;
  return headerValue.slice(7).trim();
}

export async function attachAuthContext(req, _res, next) {
  if (!requireAuthEnabled) {
    req.authContext = null;
    next();
    return;
  }

  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      req.authContext = null;
      next();
      return;
    }

    const decoded = await firebaseAdminAuth.verifyIdToken(token);
    const scope = await getAccessScopeByFirebaseUid(decoded.uid);
    req.authContext = {
      uid: decoded.uid,
      role: typeof decoded.appRole === "string" ? decoded.appRole : scope?.rol ?? null,
      dbUserId: scope?.id ?? null,
      communityId: scope?.comunidad_id ?? null,
      communityName: scope?.comunidad_nombre ?? null,
      claims: decoded,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!requireAuthEnabled) {
    next();
    return;
  }

  if (!req.authContext?.uid) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }

  next();
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!requireAuthEnabled) {
      next();
      return;
    }

    if (!req.authContext?.role || !allowedRoles.includes(req.authContext.role)) {
      res.status(403).json({ message: "No autorizado." });
      return;
    }

    next();
  };
}
