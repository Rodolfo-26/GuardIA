import type { User } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { firebaseDb } from "../lib/firebase";

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

export async function ensureUserProfile(user: User) {
  const userRef = doc(firebaseDb, USERS_COLLECTION, user.uid);

  await setDoc(
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
}

export async function registerUserLogin(user: User) {
  const userRef = doc(firebaseDb, USERS_COLLECTION, user.uid);

  await setDoc(
    userRef,
    {
      displayName: user.displayName || user.email?.split("@")[0] || "Usuario",
      email: user.email || "",
      status: "Activo" as AppUserStatus,
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
  const userRef = doc(firebaseDb, USERS_COLLECTION, userId);
  await setDoc(userRef, { role, updatedAt: serverTimestamp() }, { merge: true });
}

export async function updateUserStatus(userId: string, status: AppUserStatus) {
  const userRef = doc(firebaseDb, USERS_COLLECTION, userId);
  await setDoc(userRef, { status, updatedAt: serverTimestamp() }, { merge: true });
}

export async function closeUserSessions(userId: string) {
  const userRef = doc(firebaseDb, USERS_COLLECTION, userId);
  await setDoc(userRef, { sessions: 0, updatedAt: serverTimestamp() }, { merge: true });
}
