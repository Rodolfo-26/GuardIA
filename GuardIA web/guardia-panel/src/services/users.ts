import type { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc, increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { firebaseDb, firebaseFunctions } from "../lib/firebase";

export type AppUserRole = "Admin" | "Operador" | "Supervisor";
export type AppUserStatus = "Activo" | "Inactivo" | "Bloqueado";

export type AppUserRecord = {
  id: string;
  fullName: string;
  email: string;
  role: AppUserRole;
  status: AppUserStatus;
  site: string;
  lastAccess: string;
  sessions: number;
  alertsHandled: number;
};

type FirestoreUserDoc = {
  displayName?: string;
  email?: string;
  role?: AppUserRole;
  status?: AppUserStatus;
  site?: string;
  sessions?: number;
  alertsHandled?: number;
  lastAccessAt?: { toDate?: () => Date } | null;
};

const USERS_COLLECTION = "usuarios";
const USER_AUDIT_COLLECTION = "auditoria_usuarios";

export type UserAuditRecord = {
  id: string;
  action: string;
  actorUid: string;
  actorName: string;
  actorRole: AppUserRole | "Desconocido";
  targetUid: string;
  targetName: string;
  createdAt: string;
};

function formatLastAccess(value?: { toDate?: () => Date } | null) {
  if (!value || typeof value.toDate !== "function") return "Sin registro";
  return value.toDate().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function toRecord(id: string, data: FirestoreUserDoc): AppUserRecord {
  return {
    id,
    fullName: data.displayName ?? "Sin nombre",
    email: data.email ?? "sin-correo",
    role: data.role ?? "Operador",
    status: data.status ?? "Activo",
    site: data.site ?? "Sin sede",
    lastAccess: formatLastAccess(data.lastAccessAt ?? null),
    sessions: data.sessions ?? 0,
    alertsHandled: data.alertsHandled ?? 0,
  };
}

function formatAuditDate(value?: { toDate?: () => Date } | null) {
  if (!value || typeof value.toDate !== "function") return "Ahora";
  return value.toDate().toLocaleString("es-CO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export function subscribeUsers(
  onData: (items: AppUserRecord[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const usersRef = collection(firebaseDb, USERS_COLLECTION);
  const usersQuery = query(usersRef, orderBy("displayName"));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs.map((docItem) => toRecord(docItem.id, docItem.data() as FirestoreUserDoc));
      onData(users);
    },
    onError,
  );
}

export function subscribeCurrentUser(
  userId: string,
  onData: (items: AppUserRecord[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const userRef = doc(firebaseDb, USERS_COLLECTION, userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) {
        onData([]);
        return;
      }
      onData([toRecord(snap.id, snap.data() as FirestoreUserDoc)]);
    },
    onError,
  );
}

export function subscribeUserAuditLogs(
  onData: (items: UserAuditRecord[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const logsRef = collection(firebaseDb, USER_AUDIT_COLLECTION);
  const logsQuery = query(logsRef, orderBy("createdAt", "desc"), limit(12));

  return onSnapshot(
    logsQuery,
    (snapshot) => {
      const items = snapshot.docs.map((item) => {
        const data = item.data() as {
          action?: string;
          actorUid?: string;
          actorName?: string;
          actorRole?: AppUserRole;
          targetUid?: string;
          targetName?: string;
          createdAt?: { toDate?: () => Date } | null;
        };
        return {
          id: item.id,
          action: data.action ?? "unknown",
          actorUid: data.actorUid ?? "-",
          actorName: data.actorName ?? "Sin nombre",
          actorRole: data.actorRole ?? "Desconocido",
          targetUid: data.targetUid ?? "-",
          targetName: data.targetName ?? "Sin nombre",
          createdAt: formatAuditDate(data.createdAt ?? null),
        };
      });
      onData(items);
    },
    onError,
  );
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(firebaseDb, USERS_COLLECTION, user.uid);
  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(userRef);

    if (!snap.exists()) {
      tx.set(
        userRef,
        {
          displayName: user.displayName || user.email?.split("@")[0] || "Usuario",
          email: user.email || "",
          role: "Operador" as AppUserRole,
          status: "Activo" as AppUserStatus,
          site: "Sede Principal",
          sessions: 0,
          alertsHandled: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const data = snap.data();
    tx.set(
      userRef,
      {
        displayName: data.displayName || user.displayName || user.email?.split("@")[0] || "Usuario",
        email: data.email || user.email || "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function registerUserLogin(user: User) {
  const userRef = doc(firebaseDb, USERS_COLLECTION, user.uid);

  await setDoc(
    userRef,
    {
      displayName: user.displayName || user.email?.split("@")[0] || "Usuario",
      email: user.email || "",
      lastAccessAt: serverTimestamp(),
      sessions: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function registerUserLogout(user: User) {
  const userRef = doc(firebaseDb, USERS_COLLECTION, user.uid);

  await runTransaction(firebaseDb, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) {
      tx.set(
        userRef,
        {
          displayName: user.displayName || user.email?.split("@")[0] || "Usuario",
          email: user.email || "",
          role: "Operador" as AppUserRole,
          status: "Activo" as AppUserStatus,
          site: "Sede Principal",
          sessions: 0,
          alertsHandled: 0,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const currentSessions = Number(snap.data().sessions ?? 0);
    tx.update(userRef, {
      sessions: Math.max(0, currentSessions - 1),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateUserRole(userId: string, role: AppUserRole) {
  const callable = httpsCallable<{ targetUid: string; role: AppUserRole }, { ok: boolean }>(
    firebaseFunctions,
    "updateUserRole",
  );
  await callable({ targetUid: userId, role });
}

export async function updateUserStatus(userId: string, status: AppUserStatus) {
  const callable = httpsCallable<{ targetUid: string; status: AppUserStatus }, { ok: boolean }>(
    firebaseFunctions,
    "updateUserStatus",
  );
  await callable({ targetUid: userId, status });
}

export async function closeUserSessions(userId: string) {
  const callable = httpsCallable<{ targetUid: string }, { ok: boolean }>(
    firebaseFunctions,
    "closeUserSessions",
  );
  await callable({ targetUid: userId });
}

export async function createUserWithAuth(input: {
  fullName: string;
  email: string;
  password: string;
  role: AppUserRole;
  status: AppUserStatus;
  site: string;
}) {
  const createUserByAdmin = httpsCallable<
    {
      fullName: string;
      email: string;
      password: string;
      appRole: AppUserRole;
      status: AppUserStatus;
      site: string;
    },
    { uid: string }
  >(firebaseFunctions, "createUserByAdmin");

  const response = await createUserByAdmin({
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    appRole: input.role,
    status: input.status,
    site: input.site.trim(),
  });

  return response.data.uid;
}

export async function syncMyRoleClaim() {
  const callable = httpsCallable<undefined, { appRole: AppUserRole }>(
    firebaseFunctions,
    "syncMyRoleClaim",
  );
  const response = await callable();
  return response.data.appRole;
}

export async function getUserRoleFromProfile(userId: string): Promise<AppUserRole | null> {
  const ref = doc(firebaseDb, USERS_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const role = (snap.data() as FirestoreUserDoc).role;
  if (role === "Admin" || role === "Supervisor" || role === "Operador") return role;
  return null;
}
