import type { AppUserRole } from "../services/users";

export function isAdminOrSupervisor(role: AppUserRole | null) {
  return role === "Admin" || role === "Supervisor";
}

export function canAccessDashboard(role: AppUserRole | null) {
  return isAdminOrSupervisor(role);
}

export function canAccessResidents(role: AppUserRole | null) {
  return isAdminOrSupervisor(role);
}

export function canManageUsers(role: AppUserRole | null) {
  return isAdminOrSupervisor(role);
}

export function canAccessCameraInventory(role: AppUserRole | null) {
  return role === "Admin" || role === "Supervisor" || role === "Operador";
}

export function canManageCameras(role: AppUserRole | null) {
  return isAdminOrSupervisor(role);
}

export function getDefaultPanelRoute(role: AppUserRole | null) {
  return canAccessDashboard(role) ? "/dashboard" : "/monitoreo";
}
