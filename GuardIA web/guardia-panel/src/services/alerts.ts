import { apiGet, apiSend } from "./apiClient";

export type AlertLevel = "Critica" | "Alta" | "Media" | "Baja";
export type AlertStatus = "Nueva" | "En proceso" | "Resuelta";
export type AlertAction = "Escalar" | "Despachar" | "Registrar" | "Cerrar";

export type AlertItem = {
  id: string;
  title: string;
  zone: string;
  camera: string;
  time: string;
  level: AlertLevel;
  status: AlertStatus;
  confidence: number;
  assignee: string;
  assigneeUid: string | null;
  notes: string;
  summary: string;
  protocol: string;
  eta: string;
  source: string;
  lastUpdate: string;
  actions: AlertAction[];
};

type ApiAlert = {
  id: string;
  titulo: string;
  tipo_evento: string;
  severidad: "critica" | "alta" | "media" | "baja";
  estado: "nueva" | "en_proceso" | "resuelta" | "descartada";
  confianza_ia: number | null;
  descripcion: string | null;
  detectada_en: string;
  resuelta_en: string | null;
  camera_name: string;
  zone_name: string;
  assignee_name: string;
  assignee_uid: string | null;
  latest_note: string | null;
  latest_action_type: string | null;
  latest_action_at: string | null;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelative(value: string | null) {
  if (!value) return "Sin actualizacion";
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  return `Hace ${diffHours} h`;
}

function toLevel(value: ApiAlert["severidad"]): AlertLevel {
  return value === "critica" ? "Critica" : value === "alta" ? "Alta" : value === "media" ? "Media" : "Baja";
}

function toStatus(value: ApiAlert["estado"]): AlertStatus {
  return value === "nueva" ? "Nueva" : value === "en_proceso" ? "En proceso" : "Resuelta";
}

function toActions(status: AlertStatus): AlertAction[] {
  if (status === "Nueva") return ["Escalar", "Despachar", "Registrar"];
  if (status === "En proceso") return ["Despachar", "Registrar", "Cerrar"];
  return ["Registrar"];
}

function toAlert(item: ApiAlert): AlertItem {
  const status = toStatus(item.estado);
  return {
    id: item.id,
    title: item.titulo,
    zone: item.zone_name,
    camera: item.camera_name,
    time: formatTime(item.detectada_en),
    level: toLevel(item.severidad),
    status,
    confidence: Math.round((item.confianza_ia ?? 0) * 100),
    assignee: item.assignee_name,
    assigneeUid: item.assignee_uid,
    notes: item.latest_note || "Sin nota operativa registrada.",
    summary: item.descripcion || "Sin resumen disponible.",
    protocol: `P-${item.tipo_evento}`,
    eta: status === "Resuelta" ? "Cerrada" : status === "Nueva" ? "< 5 min" : "En curso",
    source: item.tipo_evento,
    lastUpdate: formatRelative(item.latest_action_at || item.detectada_en),
    actions: toActions(status),
  };
}

export async function fetchAlerts() {
  const response = await apiGet<{ items: ApiAlert[] }>("/alerts");
  return response.items.map(toAlert);
}

export async function saveAlertWorkflow(input: {
  id: string;
  assigneeUid: string | null;
  status: AlertStatus;
  note: string;
}) {
  const statusMap: Record<AlertStatus, "nueva" | "en_proceso" | "resuelta"> = {
    Nueva: "nueva",
    "En proceso": "en_proceso",
    Resuelta: "resuelta",
  };

  return apiSend<{ ok: boolean }>(`/alerts/${input.id}/workflow`, {
    method: "PATCH",
    body: JSON.stringify({
      assigneeUid: input.assigneeUid,
      status: statusMap[input.status],
      note: input.note,
    }),
  });
}
