import type { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, increment, runTransaction, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { firebaseDb, firebaseFunctions } from "../lib/firebase";
import { apiGet, apiSend } from "./apiClient";

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

async function fetchUsers() {
  const response = await apiGet<{ items: AppUserRecord[] }>("/users");
  return response.items;
}

async function fetchUserById(userId: string) {
  const response = await apiGet<{ item: AppUserRecord }>(`/users/${userId}`);
  return response.item;
}

async function fetchRecentAuditLogs() {
  const response = await apiGet<{ items: UserAuditRecord[] }>("/audit/users?limit=5");
  return response.items;
}

async function createUserProfileInApi(input: {
  firebaseUid: string;
  fullName: string;
  email: string;
  role: AppUserRole;
  status: AppUserStatus;
  site: string;
}) {
  const roleMap: Record<AppUserRole, "admin" | "supervisor" | "operador"> = {
    Admin: "admin",
    Supervisor: "supervisor",
    Operador: "operador",
  };

  const statusMap: Record<AppUserStatus, "activo" | "inactivo" | "bloqueado"> = {
    Activo: "activo",
    Inactivo: "inactivo",
    Bloqueado: "bloqueado",
  };

  return apiSend<{ ok: boolean; firebaseUid: string }>("/users", {
    method: "POST",
    body: JSON.stringify({
      firebaseUid: input.firebaseUid,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      role: roleMap[input.role],
      status: statusMap[input.status],
      site: input.site.trim(),
    }),
  });
}

export function subscribeUsers(
  onData: (items: AppUserRecord[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  void fetchUsers().then(onData).catch(onError);
  return () => undefined;
}

export function subscribeCurrentUser(
  userId: string,
  onData: (items: AppUserRecord[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  void fetchUserById(userId)
    .then((item) => onData(item ? [item] : []))
    .catch(onError);

  return () => undefined;
}

export function subscribeUserAuditLogs(
  onData: (items: UserAuditRecord[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  void fetchRecentAuditLogs().then(onData).catch(onError);
  return () => undefined;
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
  const roleMap: Record<AppUserRole, "admin" | "supervisor" | "operador"> = {
    Admin: "admin",
    Supervisor: "supervisor",
    Operador: "operador",
  };

  await apiSend<{ ok: boolean }>(`/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role: roleMap[role] }),
  });
}

export async function updateUserStatus(userId: string, status: AppUserStatus) {
  const statusMap: Record<AppUserStatus, "activo" | "inactivo" | "bloqueado"> = {
    Activo: "activo",
    Inactivo: "inactivo",
    Bloqueado: "bloqueado",
  };

  await apiSend<{ ok: boolean }>(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: statusMap[status] }),
  });
}

export async function closeUserSessions(userId: string) {
  await apiSend<{ ok: boolean }>(`/users/${userId}/close-sessions`, {
    method: "POST",
    body: JSON.stringify({}),
  });
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

  await createUserProfileInApi({
    firebaseUid: response.data.uid,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    status: input.status,
    site: input.site,
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
