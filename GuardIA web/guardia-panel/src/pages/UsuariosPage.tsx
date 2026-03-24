import { useEffect, useMemo, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { fetchResidents, type ResidentRecord, type ResidentStatus } from "../services/residents";
import {
  closeUserSessions,
  createUserWithAuth,
  deleteUserAccount,
  subscribeCurrentUser,
  subscribeUserAuditLogs,
  subscribeUsers,
  updateUserRole,
  updateUserStatus,
  type AppUserRecord,
  type UserAuditRecord,
  type AppUserRole,
  type AppUserStatus,
} from "../services/users";
import { useAuth } from "../context/AuthContext";
import CreateUserModal from "./usuarios/components/CreateUserModal";
import RoleVerificationModal from "./usuarios/components/RoleVerificationModal";
import { DetailRow, MetricCard, StatusTag, formatAuditAction } from "./usuarios/components/UsersUi";

export default function UsuariosPage() {
  const { user, appRole } = useAuth();
  const currentUserId = user?.uid ?? "";
  const canManageDirectory = appRole === "Admin" || appRole === "Supervisor";
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<UserAuditRecord[]>([]);
  const [auditError, setAuditError] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"full" | "self">("full");
  const [directoryView, setDirectoryView] = useState<"users" | "residents">("users");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppUserStatus | "Todos">("Todos");
  const [roleFilter, setRoleFilter] = useState<AppUserRole | "Todos">("Todos");
  const [selectedId, setSelectedId] = useState<string>("");
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsError, setResidentsError] = useState("");
  const [residentQuery, setResidentQuery] = useState("");
  const [residentStatusFilter, setResidentStatusFilter] = useState<ResidentStatus | "Todos">("Todos");
  const [residentSelectedId, setResidentSelectedId] = useState("");
  const [residentPage, setResidentPage] = useState(1);
  const residentPageSize = 8;
  const [roleVerification, setRoleVerification] = useState<{
    targetId: string;
    targetName: string;
    nextRole: AppUserRole;
  } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    if (!canManageDirectory) {
      setViewMode("self");
      setIsLoading(true);
      setError("");
      const unsubscribe = subscribeCurrentUser(
        user.uid,
        (items) => {
          setUsers(items);
          setIsLoading(false);
          setError("");
        },
        () => {
          setIsLoading(false);
          setError("No fue posible cargar tu perfil desde la API.");
        },
      );

      return () => unsubscribe();
    }

    let fallbackUnsubscribe: (() => void) | null = null;
    let retryUnsubscribe: (() => void) | null = null;

    const unsubscribe = subscribeUsers(
      (items) => {
        setUsers(items);
        setIsLoading(false);
        setError("");
        setViewMode("full");
      },
      (err) => {
        const code = typeof err === "object" && err && "code" in err ? String(err.code) : "";
        const message = err instanceof Error ? err.message : "";
        if (code.includes("permission-denied")) {
          fallbackUnsubscribe = subscribeCurrentUser(
            user.uid,
            (items) => {
              setUsers(items);
              setIsLoading(false);
              setViewMode("self");

              const selfRole = items[0]?.role;
              if (selfRole === "Admin" || selfRole === "Supervisor") {
                // Si en API ya es Admin/Supervisor, reintentamos listado global sin depender de Firestore.
                void (async () => {
                  if (!retryUnsubscribe) {
                    retryUnsubscribe = subscribeUsers(
                      (fullItems) => {
                        setUsers(fullItems);
                        setIsLoading(false);
                        setError("");
                        setViewMode("full");
                      },
                      () => {
                        setViewMode("self");
                        setError("Acceso limitado: solo puedes ver tu perfil.");
                      },
                    );
                  }
                })();
                return;
              }

              setError("Acceso limitado: solo puedes ver tu perfil.");
            },
            () => {
              setIsLoading(false);
              setError("No fue posible cargar usuarios desde la API.");
            },
          );
          return;
        }
        if (message.includes("No tienes permisos")) {
          fallbackUnsubscribe = subscribeCurrentUser(
            user.uid,
            (items) => {
              setUsers(items);
              setIsLoading(false);
              setViewMode("self");
              setError("");
            },
            () => {
              setIsLoading(false);
              setError("No fue posible cargar tu perfil desde la API.");
            },
          );
          return;
        }
        setIsLoading(false);
        setError("No fue posible cargar usuarios desde la API.");
      },
    );

    return () => {
      unsubscribe();
      if (fallbackUnsubscribe) fallbackUnsubscribe();
      if (retryUnsubscribe) retryUnsubscribe();
    };
  }, [canManageDirectory, user?.uid]);

  useEffect(() => {
    if (viewMode === "self") {
      setAuditLogs([]);
      setAuditError("");
      setDirectoryView("users");
      return;
    }

    const unsubscribe = subscribeUserAuditLogs(
      (items) => {
        setAuditLogs(items);
        setAuditError("");
      },
      () => {
        setAuditError("No fue posible cargar la bitacora de auditoria.");
      },
    );

    return () => unsubscribe();
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "self") {
      setResidents([]);
      setResidentsError("");
      setResidentsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadResidents() {
      setResidentsLoading(true);
      setResidentsError("");
      try {
        const items = await fetchResidents();
        if (!cancelled) {
          setResidents(items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setResidentsError(loadError instanceof Error ? loadError.message : "No fue posible cargar los residentes.");
        }
      } finally {
        if (!cancelled) {
          setResidentsLoading(false);
        }
      }
    }

    void loadResidents();

    return () => {
      cancelled = true;
    };
  }, [viewMode]);

  useEffect(() => {
    if (!actionSuccess) return;
    const timer = window.setTimeout(() => setActionSuccess(""), 3200);
    return () => window.clearTimeout(timer);
  }, [actionSuccess]);

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
    setPage(1);
  }, [query, roleFilter, statusFilter, viewMode]);

  useEffect(() => {
    setResidentPage(1);
  }, [residentQuery, residentStatusFilter, viewMode]);

  useEffect(() => {
    if (!pendingSelectId) return;
    if (!users.some((item) => item.id === pendingSelectId)) return;
    setSelectedId(pendingSelectId);
    setPendingSelectId(null);
  }, [pendingSelectId, users]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    if (!filtered.some((user) => user.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filteredResidents = useMemo(() => {
    const normalized = residentQuery.trim().toLowerCase();

    return residents.filter((resident) => {
      const matchesQuery =
        !normalized ||
        resident.fullName.toLowerCase().includes(normalized) ||
        resident.email.toLowerCase().includes(normalized) ||
        resident.unit.toLowerCase().includes(normalized) ||
        resident.phone.toLowerCase().includes(normalized);

      const matchesStatus = residentStatusFilter === "Todos" || resident.status === residentStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [residentQuery, residentStatusFilter, residents]);

  useEffect(() => {
    if (!filteredResidents.length) {
      setResidentSelectedId("");
      return;
    }

    if (!filteredResidents.some((item) => item.id === residentSelectedId)) {
      setResidentSelectedId(filteredResidents[0].id);
    }
  }, [filteredResidents, residentSelectedId]);

  const residentTotalPages = Math.max(1, Math.ceil(filteredResidents.length / residentPageSize));
  const paginatedResidents = useMemo(() => {
    const start = (residentPage - 1) * residentPageSize;
    return filteredResidents.slice(start, start + residentPageSize);
  }, [filteredResidents, residentPage, residentPageSize]);

  useEffect(() => {
    if (residentPage > residentTotalPages) {
      setResidentPage(residentTotalPages);
    }
  }, [residentPage, residentTotalPages]);

  const selected = filtered.find((user) => user.id === selectedId) ?? null;
  const selectedResident = filteredResidents.find((resident) => resident.id === residentSelectedId) ?? null;
  const detailUser = users.find((item) => item.id === detailUserId) ?? null;
  const currentProfile = users.find((item) => item.id === currentUserId) ?? null;
  const canDeleteUsers = currentProfile?.role === "Admin";
  const isSelfView = viewMode === "self";
  const recentAuditLogs = auditLogs.slice(0, 5);

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

  const residentCounters = useMemo(
    () =>
      residents.reduce(
        (acc, resident) => {
          if (resident.status === "Activo") acc.active += 1;
          if (resident.status === "Moroso") acc.debt += 1;
          if (resident.status === "Visitante") acc.visits += 1;
          return acc;
        },
        { active: 0, debt: 0, visits: 0 },
      ),
    [residents],
  );

  async function withAction(run: () => Promise<void>) {
    setActionError("");
    setActionSuccess("");
    try {
      await run();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (raw.includes("permission-denied") || raw.includes("PERMISSION_DENIED")) {
        setActionError("No tienes permisos para ejecutar esta accion.");
        return;
      }
      setActionError(raw || "No se pudo completar la accion en la API.");
    }
  }

  function handleToggleStatus() {
    if (!selected) return;
    const nextStatus: AppUserStatus = selected.status === "Activo" ? "Inactivo" : "Activo";
    void withAction(async () => {
      await updateUserStatus(selected.id, nextStatus);
      setActionSuccess(`Estado actualizado a ${nextStatus}.`);
    });
  }

  function handleRoleChange(nextRole: AppUserRole) {
    if (!selected) return;
    setRoleVerification({
      targetId: selected.id,
      targetName: selected.fullName,
      nextRole,
    });
  }

  function handleCloseSessions() {
    if (!selected) return;
    void withAction(async () => {
      await closeUserSessions(selected.id);
      setActionSuccess("Las sesiones activas se cerraron correctamente.");
    });
  }

  function handleDeleteUser() {
    if (!selected) return;
    if (selected.id === currentUserId) {
      setActionError("No puedes eliminar tu propia cuenta desde el panel.");
      return;
    }

    const confirmed = window.confirm(`Se eliminara el acceso de ${selected.fullName} en PostgreSQL y Firebase. Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    void withAction(async () => {
      await deleteUserAccount(selected.id);
      setUsers((prev) => prev.filter((item) => item.id !== selected.id));
      setDetailUserId(null);
      setActionSuccess("Usuario eliminado correctamente.");
    });
  }

  async function handleCreateUser(draft: {
    fullName: string;
    email: string;
    password: string;
    role: AppUserRole;
    status: AppUserStatus;
    site: string;
  }) {
    const alreadyExists = users.some((user) => user.email.toLowerCase() === draft.email.toLowerCase());
    if (alreadyExists) {
      throw new Error("Ya existe un usuario con ese correo en el panel.");
    }

    const newId = await createUserWithAuth(draft);
    setActionSuccess("Usuario creado correctamente.");
    setPendingSelectId(newId);
  }

  return (
    <section className="space-y-4">
      {!isSelfView ? (
        <>
          <div className="inline-flex rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setDirectoryView("users")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                directoryView === "users"
                  ? "bg-cyan-400/15 text-cyan-100"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Usuarios
            </button>
            <button
              type="button"
              onClick={() => setDirectoryView("residents")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                directoryView === "residents"
                  ? "bg-cyan-400/15 text-cyan-100"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Residentes
            </button>
          </div>

          {directoryView === "users" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Usuarios activos" value={`${counters.active}`} tone="emerald" sub="Sesion habilitada" />
              <MetricCard label="Usuarios inactivos" value={`${counters.inactive}`} tone="amber" sub="Sin actividad reciente" />
              <MetricCard label="Bloqueados" value={`${counters.blocked}`} tone="rose" sub="Requieren revision" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Residentes activos" value={`${residentCounters.active}`} tone="emerald" sub="Acceso habilitado" />
              <MetricCard label="Morosos" value={`${residentCounters.debt}`} tone="rose" sub="Requieren seguimiento" />
              <MetricCard label="Visitantes" value={`${residentCounters.visits}`} tone="amber" sub="Referencias temporales" />
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Mi rol" value={currentProfile?.role ?? "-"} tone="cyan" sub="Perfil operativo actual" />
          <MetricCard label="Estado de cuenta" value={currentProfile?.status ?? "-"} tone="emerald" sub="Control de acceso" />
          <MetricCard label="Sesiones activas" value={`${currentProfile?.sessions ?? 0}`} tone="amber" sub="Dispositivos vinculados" />
        </div>
      )}

      {!isSelfView && directoryView === "users" && (
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
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100"
            >
              Nuevo usuario
            </button>
          </div>
        </div>
      )}

      {!isSelfView && directoryView === "residents" && (
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto]">
            <input
              className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
              placeholder="Buscar por nombre, correo, telefono o unidad..."
              value={residentQuery}
              onChange={(event) => setResidentQuery(event.target.value)}
            />

            <select
              className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
              value={residentStatusFilter}
              onChange={(event) => setResidentStatusFilter(event.target.value as ResidentStatus | "Todos")}
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Moroso">Moroso</option>
              <option value="Visitante">Visitante</option>
            </select>

            <div className="inline-flex items-center justify-center rounded-xl border border-cyan-300/20 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-cyan-100">
              {filteredResidents.length} registros
            </div>
          </div>

          {residentsError && (
            <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
              {residentsError}
            </p>
          )}
        </div>
      )}

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

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {actionSuccess}
        </div>
      )}

      {!isSelfView && directoryView === "users" ? (
        <>
        <div className="grid gap-4">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Usuarios registrados</h3>
              <p className="mt-1 text-xs text-slate-400">Lista compacta. El detalle y las acciones viven en modal.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                {filtered.length} usuarios
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                Pagina {page}/{totalPages}
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55">
            {isLoading ? (
              <p className="p-4 text-sm text-slate-300">Cargando usuarios...</p>
            ) : paginatedUsers.length ? (
              <>
              <div className="hidden grid-cols-[minmax(0,1.3fr)_170px_170px_auto] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:grid">
                <span>Usuario</span>
                <span>Rol / Sede</span>
                <span>Estado</span>
                <span className="text-right">Accion</span>
              </div>
              <div className="divide-y divide-white/10">
              {paginatedUsers.map((user) => {
                const active = user.id === selectedId;
                const isCurrentSession = user.id === currentUserId;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedId(user.id)}
                    className={`grid w-full gap-3 p-4 text-left transition md:grid-cols-[minmax(0,1.3fr)_170px_170px_auto] md:items-center ${
                      active
                        ? "bg-cyan-400/10"
                        : isCurrentSession
                          ? "bg-emerald-400/10 hover:bg-emerald-400/15"
                          : "bg-slate-950/30 hover:bg-white/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-100">{user.fullName}</p>
                        {isCurrentSession && (
                          <span className="rounded-full border border-emerald-300/35 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                            Sesion actual
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                    <div className="min-w-0 text-xs text-slate-300">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{user.role}</span>
                      <p className="mt-1 truncate text-slate-400">{user.site}</p>
                    </div>
                    <div className="flex items-center gap-2 md:justify-between">
                      <StatusTag status={user.status} />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(user.id);
                          setDetailUserId(user.id);
                        }}
                        className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                      >
                        Ver mas
                      </button>
                    </div>
                  </button>
                );
              })}
              </div>
              </>
            ) : (
              <p className="p-4 text-sm text-slate-300">
                No hay usuarios con esos filtros.
              </p>
            )}
          </div>

          {filtered.length > pageSize ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
                  {page}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </div>
      <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Bitacora de auditoria</h3>
            <p className="mt-1 text-xs text-slate-400">Consulta los ultimos movimientos solo cuando lo necesites.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
          >
            Consultar auditoria
          </button>
        </div>
      </article>
      </>
      ) : !isSelfView && directoryView === "residents" ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Padron de residentes</h3>
                <p className="mt-1 text-xs text-slate-400">Listado unificado con paginacion para no saturar la vista.</p>
              </div>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                Pagina {residentPage}/{residentTotalPages}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {residentsLoading ? (
                <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                  Cargando residentes de la comunidad...
                </p>
              ) : paginatedResidents.length ? (
                paginatedResidents.map((resident) => {
                  const isActive = resident.id === residentSelectedId;
                  return (
                    <button
                      key={resident.id}
                      type="button"
                      onClick={() => setResidentSelectedId(resident.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isActive
                          ? "border-cyan-300/45 bg-cyan-400/10"
                          : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{resident.fullName}</p>
                          <p className="mt-1 truncate text-xs text-slate-300">{resident.unit}</p>
                        </div>
                        <ResidentStatusChip value={resident.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400">
                        <span>{resident.phone}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                          Residente
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                  No hay residentes con esos filtros.
                </p>
              )}
            </div>

            {filteredResidents.length > residentPageSize ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Mostrando {(residentPage - 1) * residentPageSize + 1}-{Math.min(residentPage * residentPageSize, filteredResidents.length)} de {filteredResidents.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setResidentPage((current) => Math.max(1, current - 1))}
                    disabled={residentPage === 1}
                    className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
                    {residentPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResidentPage((current) => Math.min(residentTotalPages, current + 1))}
                    disabled={residentPage === residentTotalPages}
                    className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </article>

          <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Ficha residente</h3>

            {selectedResident ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-cyan-300/20 bg-[radial-gradient(circle_at_25%_30%,rgba(56,189,248,0.25),transparent_45%),linear-gradient(120deg,rgba(15,23,42,0.96),rgba(8,47,73,0.86),rgba(6,95,70,0.8))] p-4">
                  <p className="text-xl font-black text-white">{selectedResident.fullName}</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedResident.community}</p>
                </div>

                <div className="grid gap-2">
                  <DetailRow label="Tipo" value="Residente" />
                  <DetailRow label="Estado" value={selectedResident.status} />
                  <DetailRow label="Unidad" value={selectedResident.unit} />
                  <DetailRow label="Correo" value={selectedResident.email} />
                  <DetailRow label="Telefono" value={selectedResident.phone} />
                  <DetailRow label="Referencia" value={selectedResident.accessReference} />
                  <DetailRow label="Notas" value={selectedResident.notes} />
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                No hay residente seleccionado.
              </p>
            )}
          </article>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Mi perfil</h3>
            {currentProfile ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
                  Sesion actual
                </div>
                <div className="rounded-xl border border-cyan-300/20 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Usuario autenticado</p>
                  <p className="mt-2 text-lg font-black text-white">{currentProfile.fullName}</p>
                  <p className="mt-1 text-sm text-slate-300">{currentProfile.email}</p>
                </div>
                <div className="grid gap-2">
                  <DetailRow label="ID" value={currentProfile.id} />
                  <DetailRow label="Rol" value={currentProfile.role} />
                  <DetailRow label="Estado" value={currentProfile.status} />
                  <DetailRow label="Sede/Zona" value={currentProfile.site} />
                  <DetailRow label="Ultimo acceso" value={currentProfile.lastAccess} />
                  <DetailRow label="Sesiones activas" value={`${currentProfile.sessions}`} />
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                No se pudo cargar tu perfil.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Permisos de tu rol</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-cyan-300/20 bg-slate-950/70 p-3 text-sm text-slate-300">
                Puedes consultar y mantener tu propio perfil operativo.
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                No tienes acceso a la administracion global de usuarios.
              </div>
              <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                Solicita a un Admin o Supervisor cualquier cambio de rol o estado.
              </div>
            </div>
          </article>
        </div>
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (draft) => {
            await handleCreateUser(draft);
            setShowCreateModal(false);
          }}
        />
      )}

      {roleVerification && (
        <RoleVerificationModal
          targetName={roleVerification.targetName}
          nextRole={roleVerification.nextRole}
          onClose={() => setRoleVerification(null)}
          onConfirm={async (password) => {
            const current = roleVerification;
            if (!current) {
              throw new Error("No se encontro la operacion a validar.");
            }
            if (!user || !user.email) {
              throw new Error("No se pudo validar la sesion del administrador.");
            }

            const credential = EmailAuthProvider.credential(user.email, password);
            try {
              await reauthenticateWithCredential(user, credential);
            } catch (err) {
              const raw = err instanceof Error ? err.message : "";
              if (raw.includes("auth/invalid-credential") || raw.includes("auth/wrong-password")) {
                throw new Error("Contrasena incorrecta.");
              }
              throw new Error("No se pudo verificar tu identidad.");
            }

            try {
              await updateUserRole(current.targetId, current.nextRole);
              setActionError("");
              setActionSuccess(`Rol actualizado a ${current.nextRole}.`);
              setRoleVerification(null);
            } catch (err) {
              const raw = err instanceof Error ? err.message : "";
              if (raw.includes("failed-precondition")) {
                throw new Error("Verificacion vencida. Intenta nuevamente.");
              }
              if (raw.includes("permission-denied") || raw.includes("PERMISSION_DENIED")) {
                throw new Error("No tienes permisos para cambiar roles.");
              }
              throw new Error("No se pudo completar el cambio de rol.");
            }
          }}
        />
      )}

      {!isSelfView && showAuditModal && (
        <div className="fixed inset-0 z-[148] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-cyan-300/25 bg-slate-900/95 shadow-[0_0_48px_rgba(34,211,238,0.2)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">Auditoria</p>
                <h3 className="mt-1 text-xl font-black text-white">Ultimos movimientos</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4 p-6">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Descargar PDF
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Exportar Excel
                </button>
              </div>

              {auditError ? (
                <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{auditError}</p>
              ) : recentAuditLogs.length ? (
                <div className="space-y-2">
                  {recentAuditLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">{formatAuditAction(log.action)}</p>
                        <span className="text-xs text-slate-400">{log.createdAt}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">
                        Actor: {log.actorName} ({log.actorRole}) | Afectado: {log.targetName}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                  Sin eventos de auditoria por ahora.
                </p>
              )}

              {!auditError && auditLogs.length > 5 ? (
                <p className="text-xs text-slate-400">
                  Hay {auditLogs.length - 5} eventos adicionales. Usa las opciones de descarga para obtener el historial completo.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {!isSelfView && detailUser && (
        <div className="fixed inset-0 z-[149] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-cyan-300/25 bg-slate-900/95 shadow-[0_0_48px_rgba(34,211,238,0.2)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">Detalle de usuario</p>
                <h3 className="mt-1 text-xl font-black text-white">{detailUser.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailUserId(null)}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                {detailUser.id === currentUserId && (
                  <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
                    Perfil en uso actualmente
                  </div>
                )}
                <div className="rounded-xl border border-cyan-300/20 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Usuario seleccionado</p>
                  <p className="mt-2 text-lg font-black text-white">{detailUser.fullName}</p>
                  <p className="mt-1 text-sm text-slate-300">{detailUser.email}</p>
                </div>

                <div className="grid gap-2">
                  <DetailRow label="ID" value={detailUser.id} />
                  <DetailRow label="Rol" value={detailUser.role} />
                  <DetailRow label="Estado" value={detailUser.status} />
                  <DetailRow label="Sede/Zona" value={detailUser.site} />
                  <DetailRow label="Ultimo acceso" value={detailUser.lastAccess} />
                  <DetailRow label="Sesiones activas" value={`${detailUser.sessions}`} />
                  <DetailRow label="Alertas atendidas" value={`${detailUser.alertsHandled}`} />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(detailUser.id);
                    handleToggleStatus();
                  }}
                  className="w-full rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20"
                >
                  {detailUser.status === "Activo" ? "Marcar inactivo" : "Activar usuario"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(detailUser.id);
                    handleRoleChange("Operador");
                  }}
                  className="w-full rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Asignar rol operador
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(detailUser.id);
                    handleRoleChange("Supervisor");
                  }}
                  className="w-full rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
                >
                  Asignar rol supervisor
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(detailUser.id);
                    handleRoleChange("Admin");
                  }}
                  className="w-full rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  Asignar rol admin
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(detailUser.id);
                    handleCloseSessions();
                  }}
                  className="w-full rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
                >
                  Cerrar sesiones activas
                </button>

                {canDeleteUsers ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(detailUser.id);
                      handleDeleteUser();
                    }}
                    className="w-full rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25"
                  >
                    Eliminar usuario
                  </button>
                ) : null}

                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Politica recomendada</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Crear usuarios de autenticacion desde backend seguro y mantener este panel para gestion operativa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ResidentStatusChip({ value }: { value: ResidentStatus }) {
  const cls =
    value === "Activo"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
      : value === "Moroso"
        ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
        : value === "Visitante"
          ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
          : "border-slate-500/30 bg-slate-400/10 text-slate-300";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{value}</span>;
}
