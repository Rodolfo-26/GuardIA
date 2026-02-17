import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AppUserRole } from "../services/users";

export default function RoleRoute({
  children,
  allowedRoles,
  fallbackTo = "/usuarios",
}: {
  children: React.ReactNode;
  allowedRoles: AppUserRole[];
  fallbackTo?: string;
}) {
  const { appRole, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        Verificando permisos...
      </div>
    );
  }

  if (!appRole || !allowedRoles.includes(appRole)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}
