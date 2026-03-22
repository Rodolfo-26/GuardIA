import { apiGet } from "./apiClient";

export type ResidentStatus = "Activo" | "Inactivo" | "Moroso" | "Visitante";

export type ResidentRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  unit: string;
  accessReference: string;
  status: ResidentStatus;
  notes: string;
  community: string;
  createdAt: string;
};

type ApiResident = {
  id: string;
  comunidad_id: string;
  comunidad_nombre: string;
  nombre_completo: string;
  correo: string | null;
  telefono: string | null;
  direccion_interna: string;
  referencia_acceso: string | null;
  estado: "activo" | "inactivo" | "moroso" | "visitante";
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
};

function toStatus(value: ApiResident["estado"]): ResidentStatus {
  if (value === "moroso") return "Moroso";
  if (value === "visitante") return "Visitante";
  if (value === "inactivo") return "Inactivo";
  return "Activo";
}

function toResident(item: ApiResident): ResidentRecord {
  return {
    id: item.id,
    fullName: item.nombre_completo,
    email: item.correo || "Sin correo",
    phone: item.telefono || "Sin telefono",
    unit: item.direccion_interna,
    accessReference: item.referencia_acceso || "Sin referencia",
    status: toStatus(item.estado),
    notes: item.notas || "Sin notas registradas.",
    community: item.comunidad_nombre,
    createdAt: item.creado_en,
  };
}

export async function fetchResidents() {
  const response = await apiGet<{ items: ApiResident[] }>("/residents");
  return response.items.map(toResident);
}
