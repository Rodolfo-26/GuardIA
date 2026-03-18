import { apiGet, apiSend } from "./apiClient";

export type CameraRecord = {
  id: string;
  name: string;
  zone: string;
  status: "online" | "offline" | "warning";
  protocol: "RTSP" | "ONVIF";
  resolution: "720p" | "1080p" | "4K";
  streamUrl: string;
  aiProfiles: string[];
  retentionDays: number;
};

type ApiCamera = {
  id: string;
  codigo: string;
  nombre: string;
  zone_name: string;
  estado: "online" | "offline" | "mantenimiento";
  protocolo: "RTSP" | "ONVIF";
  resolucion: "720p" | "1080p" | "4K";
  url_stream: string;
  perfiles_ia: string[];
  retencion_dias: number;
};

function toCamera(item: ApiCamera): CameraRecord {
  return {
    id: item.id,
    name: item.nombre,
    zone: item.zone_name,
    status: item.estado === "mantenimiento" ? "warning" : item.estado,
    protocol: item.protocolo,
    resolution: item.resolucion,
    streamUrl: item.url_stream,
    aiProfiles: item.perfiles_ia ?? [],
    retentionDays: item.retencion_dias,
  };
}

export async function fetchCameras() {
  const response = await apiGet<{ items: ApiCamera[] }>("/cameras");
  return response.items.map(toCamera);
}

export async function createCameraRecord(input: Omit<CameraRecord, "id" | "status">) {
  return apiSend<{ ok: boolean; id: string }>("/cameras", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCameraRecord(cameraId: string, input: Omit<CameraRecord, "id" | "status">) {
  return apiSend<{ ok: boolean }>(`/cameras/${cameraId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
