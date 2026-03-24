import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import { canManageUsers } from "../config/roleAccess";
import { useAuth } from "../context/AuthContext";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Resumen operativo del sistema de videovigilancia inteligente",
  },
  "/monitoreo": {
    title: "Monitoreo",
    subtitle: "Camaras en vivo y deteccion de eventos en tiempo real",
  },
  "/reportes": {
    title: "Reportes",
    subtitle: "Incidentes registrados por operadores y seguimiento de atencion",
  },
  "/camaras": {
    title: "Camaras",
    subtitle: "Gestion de dispositivos y disponibilidad de nodos",
  },
  "/alertas": {
    title: "Alertas",
    subtitle: "Incidentes, priorizacion y respuesta asistida por IA",
  },
  "/grabaciones": {
    title: "Grabaciones",
    subtitle: "Historial forense y evidencia de video",
  },
  "/usuarios": {
    title: "Usuarios",
    subtitle: "Gestion de cuentas, roles y control de sesiones",
  },
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const { appRole } = useAuth();
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const defaultMeta = PAGE_META[pathname] ?? {
    title: "GuardIA",
    subtitle: "Centro de comando de seguridad",
  };

  const meta =
    pathname === "/usuarios" && !canManageUsers(appRole)
      ? {
          title: "Mi perfil",
          subtitle: "Informacion de cuenta y permisos de acceso",
        }
      : defaultMeta;

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950 text-slate-100">
      <style>{`
        @keyframes guardiaGridMove {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(40px, 40px, 0); }
        }

        @keyframes guardiaBackdropPulse {
          0%, 100% { opacity: 0.18; transform: scale(0.95); }
          50% { opacity: 0.4; transform: scale(1.06); }
        }

        @keyframes guardiaBackdropSweep {
          0% { transform: translateX(-30%); opacity: 0; }
          20% { opacity: 0.3; }
          100% { transform: translateX(140%); opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div
          className="absolute left-[48%] top-[42%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl"
          style={{ animation: "guardiaBackdropPulse 6s ease-in-out infinite" }}
        />
        <div
          className="absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/12 to-transparent"
          style={{ animation: "guardiaBackdropSweep 9s linear infinite" }}
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:40px_40px]"
          style={{ animation: "guardiaGridMove 18s linear infinite" }}
        />
      </div>

      <div className="relative z-10 flex h-screen">
        <Sidebar
          hidden={sidebarHidden}
          onHide={() => setSidebarHidden(true)}
          onShow={() => setSidebarHidden(false)}
        />

        <main
          className={`scrollbar-hidden h-screen flex-1 overflow-y-auto p-4 transition-[margin] duration-300 sm:p-6 lg:p-8 ${
            sidebarHidden ? "ml-0" : "ml-72"
          }`}
        >
          <header
            className={`mb-6 rounded-2xl border border-cyan-300/20 bg-slate-900/70 backdrop-blur ${
              pathname === "/usuarios" ? "p-4" : "p-5"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">AI Security Grid</p>
                <h1 className={`${pathname === "/usuarios" ? "mt-1 text-2xl" : "mt-2 text-3xl"} font-black text-white`}>
                  {meta.title}
                </h1>
                <p className={`${pathname === "/usuarios" ? "mt-0.5 text-xs" : "mt-1 text-sm"} text-slate-300`}>
                  {meta.subtitle}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" /> IA operativa
              </div>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
