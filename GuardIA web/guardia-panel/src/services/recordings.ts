import { apiGet } from "./apiClient";

export type RecordingSeverity = "Alta" | "Media" | "Baja";
export type RecordingEvent = "Intrusion" | "Movimiento" | "Rostro" | "Vehiculo" | "Objeto" | "Biometria" | "General";

export type RecordingItem = {
  id: string;
  camera: string;
  zone: string;
  timestamp: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  durationLabel: string;
  event: RecordingEvent;
  severity: RecordingSeverity;
  confidence: number;
  reviewed: boolean;
  flagged: boolean;
  archived: boolean;
  filePath: string;
  sizeMb: number | null;
  title: string;
  evidenceReason: string;
  statusLabel: string;
};

type ApiRecording = {
  id: string;
  ruta_archivo: string;
  inicio_en: string;
  fin_en: string | null;
  duracion_seg: number | null;
  tamano_mb: number | string | null;
  checksum: string | null;
  archivada: boolean;
  camera_name: string;
  zone_name: string;
  alert_id: string | null;
  alert_title: string | null;
  event_type: string | null;
  severity: "critica" | "alta" | "media" | "baja" | null;
  alert_status: "nueva" | "en_proceso" | "resuelta" | "descartada" | null;
  confidence_ia: number | null;
  evidence_reason: string | null;
  flagged: boolean;
  reviewed: boolean;
};

function formatClock(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeDuration(item: ApiRecording) {
  if (typeof item.duracion_seg === "number" && Number.isFinite(item.duracion_seg)) {
    return Math.max(0, item.duracion_seg);
  }

  if (item.fin_en) {
    const diff = Math.round((new Date(item.fin_en).getTime() - new Date(item.inicio_en).getTime()) / 1000);
    return Math.max(0, diff);
  }

  return 0;
}

function toEvent(value: string | null): RecordingEvent {
  if (!value) return "General";
  if (value.includes("intrusion")) return "Intrusion";
  if (value.includes("mov")) return "Movimiento";
  if (value.includes("veh")) return "Vehiculo";
  if (value.includes("objeto")) return "Objeto";
  if (value.includes("bio")) return "Biometria";
  if (value.includes("rostro") || value.includes("facial")) return "Rostro";
  return "General";
}

function toSeverity(value: ApiRecording["severity"]): RecordingSeverity {
  return value === "critica" || value === "alta" ? "Alta" : value === "media" ? "Media" : "Baja";
}

function toStatusLabel(item: ApiRecording) {
  if (item.archivada) return "Archivada";
  if (item.alert_status === "resuelta") return "Resuelta";
  if (item.alert_status === "en_proceso") return "En proceso";
  if (item.alert_status === "nueva") return "Nueva";
  return "Disponible";
}

function toRecording(item: ApiRecording): RecordingItem {
  const durationSeconds = normalizeDuration(item);
  return {
    id: item.id,
    camera: item.camera_name,
    zone: item.zone_name,
    timestamp: formatClock(item.inicio_en),
    startedAt: item.inicio_en,
    endedAt: item.fin_en,
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    event: toEvent(item.event_type),
    severity: toSeverity(item.severity),
    confidence: Math.round((item.confidence_ia ?? 0) * 100),
    reviewed: Boolean(item.reviewed),
    flagged: Boolean(item.flagged),
    archived: item.archivada,
    filePath: item.ruta_archivo,
    sizeMb: item.tamano_mb == null ? null : Number(item.tamano_mb),
    title: item.alert_title || "Grabacion operativa",
    evidenceReason: item.evidence_reason || "Sin vinculacion de evidencia.",
    statusLabel: toStatusLabel(item),
  };
}

export async function fetchRecordings() {
  const response = await apiGet<{ items: ApiRecording[] }>("/recordings");
  return response.items.map(toRecording);
}
