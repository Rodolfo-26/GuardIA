import { apiGet, apiSend } from "./apiClient";

export type LogEntry = {
  timestamp: string;
  level: string;
  category: string;
  action: string;
  message: string;
  details: Record<string, unknown>;
};

type LogsResponse = {
  items: LogEntry[];
  total: number;
  file: string;
};

export async function fetchActivityLogs(params?: {
  limit?: number;
  category?: string;
}): Promise<LogsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.category) searchParams.set("category", params.category);
  const qs = searchParams.toString();

  return apiGet<LogsResponse>(`/audit/logs${qs ? `?${qs}` : ""}`);
}

export async function reportLoginEvent(
  action: "login" | "logout" | "mfa_verified" | "login_failed",
  email?: string,
): Promise<void> {
  await apiSend<{ ok: boolean }>("/audit/login", {
    method: "POST",
    body: JSON.stringify({ action, email }),
  });
}
