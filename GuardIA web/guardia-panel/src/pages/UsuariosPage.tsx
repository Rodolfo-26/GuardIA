import { useEffect, useMemo, useState } from "react";
import {
  closeUserSessions,
  subscribeUsers,
  updateUserRole,
  updateUserStatus,
  type AppUserRecord,
  type AppUserRole,
  type AppUserStatus,
} from "../services/users";

export default function UsuariosPage() {
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppUserStatus | "Todos">("Todos");
  const [roleFilter, setRoleFilter] = useState<AppUserRole | "Todos">("Todos");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      (items) => {
        setUsers(items);
        setIsLoading(false);
        setError("");
      },
      () => {
        setIsLoading(false);
        setError("No fue posible cargar usuarios desde Firebase.");
      },
    );

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        user.id.toLowerCase().includes(normalized) ||
        user.fullName.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        user.site.toLowerCase().includes(normalized);

      const matchesStatus = statusFilter === "Todos" || user.status === statusFilter;
      const matchesRole = roleFilter === "Todos" || user.role === roleFilter;

      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [query, roleFilter, statusFilter, users]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    if (!filtered.some((user) => user.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((user) => user.id === selectedId) ?? null;

  const counters = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        if (user.status === "Activo") acc.active += 1;
        if (user.status === "Inactivo") acc.inactive += 1;
        if (user.status === "Bloqueado") acc.blocked += 1;
        if (user.role === "Operador") acc.operators += 1;
        return acc;
      },
      { active: 0, inactive: 0, blocked: 0, operators: 0 },
    );
  }, [users]);

  async function withAction(run: () => Promise<void>) {
    setActionError("");
    try {
      await run();
    } catch {
      setActionError("No se pudo completar la accion en Firebase.");
    }
  }

  function handleToggleStatus() {
    if (!selected) return;
    const nextStatus: AppUserStatus = selected.status === "Activo" ? "Inactivo" : "Activo";
    void withAction(() => updateUserStatus(selected.id, nextStatus));
  }

  function handleRoleChange(nextRole: AppUserRole) {
    if (!selected) return;
    void withAction(() => updateUserRole(selected.id, nextRole));
  }

  function handleCloseSessions() {
    if (!selected) return;
    void withAction(() => closeUserSessions(selected.id));
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Usuarios activos" value={`${counters.active}`} tone="emerald" sub="Sesion habilitada" />
        <MetricCard label="Usuarios inactivos" value={`${counters.inactive}`} tone="amber" sub="Sin actividad reciente" />
        <MetricCard label="Bloqueados" value={`${counters.blocked}`} tone="rose" sub="Requieren revision" />
        <MetricCard label="Operadores" value={`${counters.operators}`} tone="cyan" sub="Respuesta operativa" />
      </div>

      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_auto]">
          <input
            className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="Buscar por nombre, correo, sede o ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppUserStatus | "Todos")}
          >
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as AppUserRole | "Todos")}
          >
            <option value="Todos">Todos</option>
            <option value="Admin">Admin</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Operador">Operador</option>
          </select>

          <button
            type="button"
            className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100"
            title="La creacion de usuarios Auth requiere flujo administrativo (Cloud Function/Admin SDK)."
          >
            Nuevo usuario
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {actionError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr_0.9fr]">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Usuarios registrados</h3>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">Cargando usuarios...</p>
            ) : filtered.length ? (
              filtered.map((user) => {
                const active = user.id === selectedId;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedId(user.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-cyan-300/45 bg-cyan-400/10"
                        : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{user.fullName}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                      <StatusTag status={user.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                      <span>{user.site}</span>
                      <span>{user.id.slice(0, 10)}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                No hay usuarios con esos filtros.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Perfil operativo</h3>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-cyan-300/20 bg-slate-950/70 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Usuario seleccionado</p>
                <p className="mt-2 text-lg font-black text-white">{selected.fullName}</p>
                <p className="mt-1 text-sm text-slate-300">{selected.email}</p>
              </div>

              <div className="grid gap-2">
                <DetailRow label="ID" value={selected.id} />
                <DetailRow label="Rol" value={selected.role} />
                <DetailRow label="Estado" value={selected.status} />
                <DetailRow label="Sede/Zona" value={selected.site} />
                <DetailRow label="Ultimo acceso" value={selected.lastAccess} />
                <DetailRow label="Sesiones activas" value={`${selected.sessions}`} />
                <DetailRow label="Alertas atendidas" value={`${selected.alertsHandled}`} />
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              Selecciona un usuario para ver su informacion.
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Acciones administrativas</h3>
          {selected ? (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleToggleStatus}
                className="w-full rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20"
              >
                {selected.status === "Activo" ? "Marcar inactivo" : "Activar usuario"}
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange("Operador")}
                className="w-full rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
              >
                Asignar rol operador
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange("Supervisor")}
                className="w-full rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
              >
                Asignar rol supervisor
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange("Admin")}
                className="w-full rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
              >
                Asignar rol admin
              </button>

              <button
                type="button"
                onClick={handleCloseSessions}
                className="w-full rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
              >
                Cerrar sesiones activas
              </button>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              Sin usuario seleccionado.
            </p>
          )}

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Politica recomendada</p>
            <p className="mt-2 text-sm text-slate-300">
              Crear usuarios de autenticacion desde backend seguro (Admin SDK) y mantener este panel para gestion operativa.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "amber" | "rose" | "cyan";
}) {
  const toneClass: Record<typeof tone, string> = {
    emerald: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-200",
    rose: "border-rose-300/25 bg-rose-400/10 text-rose-200",
    cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
  };

  return (
    <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-3xl font-black text-white">{value}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass[tone]}`}>Live</span>
      </div>
      <p className="mt-2 text-xs text-slate-300">{sub}</p>
    </article>
  );
}

function StatusTag({ status }: { status: AppUserStatus }) {
  const cls =
    status === "Activo"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
      : status === "Inactivo"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : "border-rose-300/30 bg-rose-400/10 text-rose-200";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{status}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}
