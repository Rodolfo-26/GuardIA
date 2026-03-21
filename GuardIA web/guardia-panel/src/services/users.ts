import type { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "../lib/firebase";
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

type Unsubscribe = () => void;

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

export async function fetchUsersList() {
  return fetchUsers();
}

export async function fetchCurrentUserProfile(userId: string) {
  return fetchUserById(userId);
}

export async function fetchRecentUserAuditLogs() {
  return fetchRecentAuditLogs();
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
  try {
    await fetchUserById(user.uid);
  } catch {
    // La sincronizacion del perfil ya no se hace desde el frontend.
  }
}

export async function registerUserLogin(_user: User) {
  // El seguimiento de ultimo acceso y sesiones activas se consolida en backend.
}

export async function registerUserLogout(_user: User) {
  // El seguimiento de ultimo acceso y sesiones activas se consolida en backend.
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

export async function getUserRoleFromProfile(userId: string): Promise<AppUserRole | null> {
  try {
    const item = await fetchUserById(userId);
    return item.role;
  } catch {
    return null;
  }
}
