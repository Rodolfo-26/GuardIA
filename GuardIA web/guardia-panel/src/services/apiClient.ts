import { firebaseAuth } from "../lib/firebase";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

async function getAuthHeaders() {
  const user = firebaseAuth.currentUser;
  if (!user) return {};

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.clone().json()) as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
  } catch {
    // Ignora respuestas sin JSON.
  }

  if (response.status === 401) return "Tu sesion expiro. Vuelve a iniciar sesion.";
  if (response.status === 403) return "No tienes permisos para realizar esta accion.";
  if (response.status >= 500) return "El servidor no pudo completar la solicitud.";
  return `API ${response.status}: ${response.statusText}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const requestHeaders = new Headers(init?.headers);
  requestHeaders.set("ngrok-skip-browser-warning", "true");

  if (init?.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  Object.entries(authHeaders).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: requestHeaders,
    ...init,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export async function apiSend<T>(path: string, init: RequestInit): Promise<T> {
  return requestJson<T>(path, init);
}
