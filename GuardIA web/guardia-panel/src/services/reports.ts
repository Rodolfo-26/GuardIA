import { apiGet } from "./apiClient";

export type ReportPriority = "Alta" | "Media" | "Baja";
export type ReportStatus = "Enviado" | "En revision" | "Cerrado" | "Cancelado";

export type ReportRecord = {
  id: string;
  createdByUserId: string;
  createdByName: string;
  role: string;
  type: string;
  priority: ReportPriority;
  location: string;
  description: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

type ApiReport = {
  id: string;
  createdByUserId: string;
  createdByName: string;
  role: string;
  type: string;
  priority: "alta" | "media" | "baja";
  location: string;
  description: string;
  status: "sent" | "in_review" | "closed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

function toPriority(priority: ApiReport["priority"]): ReportPriority {
  return priority === "alta" ? "Alta" : priority === "media" ? "Media" : "Baja";
}

function toStatus(status: ApiReport["status"]): ReportStatus {
  if (status === "in_review") return "En revision";
  if (status === "closed") return "Cerrado";
  if (status === "cancelled") return "Cancelado";
  return "Enviado";
}

function toReport(item: ApiReport): ReportRecord {
  return {
    id: item.id,
    createdByUserId: item.createdByUserId,
    createdByName: item.createdByName,
    role: item.role,
    type: item.type,
    priority: toPriority(item.priority),
    location: item.location,
    description: item.description,
    status: toStatus(item.status),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function fetchReports() {
  const response = await apiGet<{ items: ApiReport[] }>("/reports");
  return response.items.map(toReport);
}
