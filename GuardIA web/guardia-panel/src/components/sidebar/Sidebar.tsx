import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NavItem from "./NavItem";

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, appRole } = useAuth();
  const isAdminOrSupervisor = appRole === "Admin" || appRole === "Supervisor";
  const usersLabel = isAdminOrSupervisor ? "Usuarios" : "Mi perfil";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-72 overflow-y-hidden border-r border-cyan-400/10 bg-slate-950/80 p-4 backdrop-blur">
      <div className="flex h-full flex-col">
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4">
          <div className="flex items-center gap-3 pb-4">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10">
              <div className="h-5 w-5 rounded-md bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
            </div>
            <div>
              <div className="text-lg font-black leading-5 text-white">GuardIA</div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-300">Control Center</div>
            </div>
          </div>

          <nav className="space-y-2 border-t border-white/10 pt-4">
            <NavItem label="Dashboard" to="/dashboard" />
            <NavItem label="Monitoreo" to="/monitoreo" />
            <NavItem label="Alertas" to="/alertas" />
            <NavItem label="Grabaciones" to="/grabaciones" />
            {isAdminOrSupervisor && <NavItem label="Camaras" to="/camaras" />}
            <NavItem label={usersLabel} to="/usuarios" />
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto w-full rounded-xl border border-rose-300/35 bg-rose-400/10 px-3 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20"
        >
          Cerrar sesion
        </button>
        </div>
    </aside>
  );
}
