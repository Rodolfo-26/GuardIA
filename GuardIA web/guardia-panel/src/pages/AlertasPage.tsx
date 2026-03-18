import { useEffect, useMemo, useState } from "react";
import { fetchAlerts, saveAlertWorkflow, type AlertAction, type AlertItem, type AlertLevel, type AlertStatus } from "../services/alerts";

const STATUS_OPTIONS: Array<AlertStatus | "Todas"> = ["Todas", "Nueva", "En proceso", "Resuelta"];
const LEVEL_OPTIONS: Array<AlertLevel | "Todas"> = ["Todas", "Critica", "Alta", "Media", "Baja"];
export default function AlertasPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AlertStatus | "Todas">("Todas");
  const [level, setLevel] = useState<AlertLevel | "Todas">("Todas");
  const [selectedId, setSelectedId] = useState<string>("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAlerts()
      .then((items) => {
        setAlerts(items);
        setError("");
      })
      .catch(() => {
        setError("No fue posible cargar alertas desde PostgreSQL.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesQuery =
        !normalized ||
        alert.id.toLowerCase().includes(normalized) ||
        alert.zone.toLowerCase().includes(normalized) ||
        alert.camera.toLowerCase().includes(normalized) ||
        alert.title.toLowerCase().includes(normalized);

      const matchesStatus = status === "Todas" || alert.status === status;
      const matchesLevel = level === "Todas" || alert.level === level;

      return matchesQuery && matchesStatus && matchesLevel;
    });
  }, [alerts, level, query, status]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    if (!filtered.some((alert) => alert.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((alert) => alert.id === selectedId) ?? null;
  const detailAlert = alerts.find((alert) => alert.id === detailId) ?? null;
  const workflowAlert = alerts.find((alert) => alert.id === workflowId) ?? null;

  const counters = useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        if (alert.level === "Critica") acc.critical += 1;
        if (alert.status === "Nueva") acc.newItems += 1;
        if (alert.status === "En proceso") acc.inProgress += 1;
        if (alert.status === "Resuelta") acc.resolved += 1;
        return acc;
      },
      { critical: 0, newItems: 0, inProgress: 0, resolved: 0 },
    );
  }, [alerts]);

  const assignees = useMemo(() => {
    const items = alerts
      .filter((item) => item.assignee && item.assignee !== "Sin asignar" && item.assigneeUid)
      .map((item) => ({ name: item.assignee, uid: item.assigneeUid as string }));

    const unique = new Map<string, { name: string; uid: string | null }>();
    unique.set("Sin asignar", { name: "Sin asignar", uid: null });

    items.forEach((item) => {
      if (!unique.has(item.name)) {
        unique.set(item.name, item);
      }
    });

    return Array.from(unique.values());
  }, [alerts]);

  function handleWorkflowSaved(updated: AlertItem) {
    setAlerts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setWorkflowId(null);
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Criticas activas" value={`${counters.critical}`} tone="rose" sub="Atencion inmediata" />
        <MetricCard label="Nuevas" value={`${counters.newItems}`} tone="amber" sub="Sin gestionar" />
        <MetricCard label="En proceso" value={`${counters.inProgress}`} tone="cyan" sub="Operadores asignados" />
        <MetricCard label="Resueltas hoy" value={`${counters.resolved}`} tone="emerald" sub="Validacion cerrada" />
      </div>

      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_auto]">
          <input
            className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="Buscar alerta por ID, zona o camara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={status}
            onChange={(e) => setStatus(e.target.value as AlertStatus | "Todas")}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={level}
            onChange={(e) => setLevel(e.target.value as AlertLevel | "Todas")}
          >
            {LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Exportar reporte
          </button>
        </div>

      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div>
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Cola priorizada</h3>
              <p className="mt-1 text-xs text-slate-400">Solo lo necesario para identificar y abrir una accion.</p>
            </div>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              {filtered.length} alertas visibles
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {isLoading ? (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                Cargando alertas...
              </p>
            ) : filtered.length ? (
              filtered.map((alert, index) => {
                const active = alert.id === selectedId;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setSelectedId(alert.id)}
                    style={{ animationDelay: `${index * 70}ms` }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "alert-card alert-card-active border-cyan-300/45 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                        : "alert-card border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <LevelTag level={alert.level} />
                          <StatusTag status={alert.status} />
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                            {alert.id}
                          </span>
                        </div>
                        <p className="text-base font-bold text-slate-100">{alert.title}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300">
                        {alert.time}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-300">{alert.zone}</p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                        {alert.assignee}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(alert.id);
                          }}
                          className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                        >
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkflowId(alert.id);
                          }}
                          className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                        >
                          Gestionar
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                No hay alertas con esos filtros.
              </p>
            )}
          </div>
        </article>
      </div>

      <AlertDetailModal alert={detailAlert} onClose={() => setDetailId(null)} onOpenWorkflow={(id) => setWorkflowId(id)} />
      <AlertWorkflowModal alert={workflowAlert} assignees={assignees} onClose={() => setWorkflowId(null)} onSaved={handleWorkflowSaved} />
    </section>
  );
}

function AlertDetailModal({
  alert,
  onClose,
  onOpenWorkflow,
}: {
  alert: AlertItem | null;
  onClose: () => void;
  onOpenWorkflow: (id: string) => void;
}) {
  if (!alert) return null;

  return (
    <div className="scrollbar-hidden fixed inset-0 z-[142] overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center py-6">
        <div className="modal-enter my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-300/25 bg-slate-900/95 shadow-[0_0_48px_rgba(34,211,238,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">Detalle de alerta</p>
            <h3 className="mt-1 text-2xl font-black text-white">{alert.title}</h3>
            <p className="mt-1 text-sm text-slate-300">
              {alert.id} - {alert.zone} - {alert.camera}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <div className="scrollbar-hidden max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="grid gap-5 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_25%_30%,rgba(56,189,248,0.35),transparent_45%),linear-gradient(120deg,rgba(15,23,42,0.96),rgba(8,47,73,0.86),rgba(6,95,70,0.8))] p-4">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="relative flex flex-wrap items-center gap-2">
                <LevelTag level={alert.level} />
                <StatusTag status={alert.status} />
              </div>
              <div className="relative mt-24 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Resumen</p>
                  <p className="mt-2 max-w-xl text-base font-semibold text-slate-100">{alert.summary}</p>
                </div>
                <span className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-slate-100">
                  {alert.time}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <DetailField label="Asignado" value={alert.assignee} />
              <DetailField label="IA" value={`${alert.confidence}%`} />
              <DetailField label="ETA" value={alert.eta} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Nota principal</p>
              <p className="mt-2 text-sm text-slate-200">{alert.notes}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Contexto rapido</p>
              <div className="mt-3 grid gap-2">
                <DetailRow label="Zona" value={alert.zone} />
                <DetailRow label="Estado" value={alert.status} />
                <DetailRow label="Camara" value={alert.camera} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Funciones</p>
              <div className="mt-3 grid gap-2">
                {alert.actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onOpenWorkflow(alert.id)}
                    className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2.5 text-left text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Ultima actividad</p>
              <p className="mt-2 text-sm text-slate-200">{alert.lastUpdate}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => onOpenWorkflow(alert.id)}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950"
              >
                Gestionar alerta
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}

function AlertWorkflowModal({
  alert,
  assignees,
  onClose,
  onSaved,
}: {
  alert: AlertItem | null;
  assignees: Array<{ name: string; uid: string | null }>;
  onClose: () => void;
  onSaved: (alert: AlertItem) => void;
}) {
  const [assignee, setAssignee] = useState(alert?.assigneeUid ?? "__none__");
  const [nextStatus, setNextStatus] = useState<AlertStatus>(alert?.status ?? "Nueva");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAssignee(alert?.assigneeUid ?? "__none__");
    setNextStatus(alert?.status ?? "Nueva");
    setNote("");
    setError("");
  }, [alert]);

  if (!alert) return null;

  async function handleSave() {
    try {
      setIsSaving(true);
      setError("");
      await saveAlertWorkflow({
        id: alert.id,
        assigneeUid: assignee === "__none__" ? null : assignee,
        status: nextStatus,
        note,
      });

      const selectedAssignee = assignees.find((item) => (item.uid ?? "__none__") === assignee);

      onSaved({
        ...alert,
        assignee: selectedAssignee?.name ?? "Sin asignar",
        assigneeUid: assignee === "__none__" ? null : assignee,
        status: nextStatus,
        notes: note || alert.notes,
        lastUpdate: "Hace 1 min",
      });
    } catch {
      setError("No fue posible guardar el flujo en PostgreSQL.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[143] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-cyan-300/25 bg-slate-900/95 shadow-[0_0_48px_rgba(34,211,238,0.18)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">Centro de flujo</p>
            <h3 className="mt-1 text-xl font-black text-white">Gestionar {alert.id}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <div className="grid gap-5 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <HighlightTile label="Titulo" value={alert.title} />
            <HighlightTile label="Severidad" value={alert.level} />
            <HighlightTile label="Ultimo evento" value={alert.lastUpdate} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Asignar responsable</span>
              <select
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                {assignees.map((item) => (
                  <option key={item.uid ?? "__none__"} value={item.uid ?? "__none__"}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Actualizar estado</span>
              <select
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as AlertStatus)}
              >
                {STATUS_OPTIONS.filter((item): item is AlertStatus => item !== "Todas").map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {alert.actions.map((action) => (
              <QuickActionButton
                key={action}
                label={action}
                onClick={() => undefined}
                tone={action === "Escalar" ? "rose" : action === "Cerrar" ? "emerald" : "cyan"}
              />
            ))}
          </div>

          <label className="grid gap-1">
            <span className="text-xs text-slate-300">Comentario operativo</span>
            <textarea
              className="min-h-28 rounded-2xl border border-cyan-300/20 bg-slate-900 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Registrar instruccion, evidencia o motivo del cambio..."
            />
          </label>

          <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Este modal concentra la operacion. La vista principal queda limpia y las acciones viven aqui.
          </p>

          {error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950"
            >
              {isSaving ? "Guardando..." : "Guardar flujo"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  tone: "rose" | "amber" | "cyan" | "emerald";
}) {
  const toneClass: Record<typeof tone, string> = {
    rose: "border-rose-300/25 bg-rose-400/10 text-rose-200",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-200",
    cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  };

  return (
    <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="truncate text-xs text-slate-400">{sub}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass[tone]}`}>Live</span>
      </div>
    </article>
  );
}

function LevelTag({ level }: { level: AlertLevel }) {
  const cls =
    level === "Critica"
      ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
      : level === "Alta"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : level === "Media"
          ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
          : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{level}</span>;
}

function StatusTag({ status }: { status: AlertStatus }) {
  const cls =
    status === "Nueva"
      ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
      : status === "En proceso"
        ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
        : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{status}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function HighlightTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function QuickActionButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "rose" | "cyan" | "emerald";
}) {
  const cls =
    tone === "rose"
      ? "border-rose-300/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
      : tone === "emerald"
        ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
        : "border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${cls}`}
    >
      {label}
    </button>
  );
}
