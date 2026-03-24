import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NavItem from "./NavItem";

export default function Sidebar({
  hidden,
  onHide,
  onShow,
}: {
  hidden: boolean;
  onHide: () => void;
  onShow: () => void;
}) {
  const navigate = useNavigate();
  const { logout, appRole } = useAuth();
  const isAdminOrSupervisor = appRole === "Admin" || appRole === "Supervisor";
  const usersLabel = isAdminOrSupervisor ? "Usuarios" : "Mi perfil";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={onShow}
        aria-label="Mostrar menu"
        className="sidebar-tab-enter fixed left-0 top-[38%] z-40 -translate-y-1/2 rounded-r-2xl border border-cyan-300/20 border-l-0 bg-slate-900/95 px-3 py-5 text-cyan-100 shadow-[0_14px_34px_rgba(8,47,73,0.35)] transition duration-300 hover:bg-slate-800 hover:pl-4"
      >
        <span className="flex flex-col gap-1">
          <span className="block h-0.5 w-4 rounded-full bg-cyan-100" />
          <span className="block h-0.5 w-4 rounded-full bg-cyan-100" />
          <span className="block h-0.5 w-4 rounded-full bg-cyan-100" />
        </span>
      </button>
    );
  }

  return (
    <aside className="sidebar-enter fixed left-0 top-0 z-30 h-screen w-72 border-r border-cyan-400/10 bg-slate-950/85 backdrop-blur">
      <div className="flex h-full flex-col p-4">
        <div className="sidebar-panel-glow flex h-full flex-col overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-900/78 shadow-[0_18px_44px_rgba(8,47,73,0.22)] transition-transform duration-300">
          <header className="flex h-20 items-center justify-between gap-3 bg-slate-900/92 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10">
                <div className="h-5 w-5 rounded-md bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-black leading-5 text-white">GuardIA</div>
                <div className="truncate text-xs uppercase tracking-[0.16em] text-slate-300">Control Center</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onHide}
              aria-label="Ocultar menu"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-700 text-white transition duration-300 hover:scale-105 hover:bg-rose-600"
            >
              <span className="relative block h-4 w-4">
                <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-white" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-white" />
              </span>
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(15,23,42,0.16),rgba(15,23,42,0))] p-4">
            <div className="p-4">
              <nav className="space-y-2 border-t border-white/10 pt-4">
                <NavItem label="Dashboard" to="/dashboard" />
                <NavItem label="Monitoreo" to="/monitoreo" />
                <NavItem label="Reportes" to="/reportes" />
                <NavItem label="Alertas" to="/alertas" />
                <NavItem label="Grabaciones" to="/grabaciones" />
                <NavItem label="Residentes" to="/residentes" />
                {isAdminOrSupervisor && <NavItem label="Camaras" to="/camaras" />}
                <NavItem label={usersLabel} to="/usuarios" />
              </nav>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-auto w-full rounded-xl border border-rose-300/35 bg-rose-400/10 px-3 py-2.5 text-sm font-semibold text-rose-200 transition duration-300 hover:-translate-y-0.5 hover:bg-rose-400/20"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
