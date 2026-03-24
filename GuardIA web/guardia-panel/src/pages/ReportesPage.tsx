import { useEffect, useMemo, useState } from "react";
import { fetchReports, type ReportPriority, type ReportRecord, type ReportStatus } from "../services/reports";

const STATUS_OPTIONS: Array<ReportStatus | "Todos"> = ["Todos", "Enviado", "En revision", "Cerrado", "Cancelado"];
const PRIORITY_OPTIONS: Array<ReportPriority | "Todas"> = ["Todas", "Alta", "Media", "Baja"];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ReportesPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReportStatus | "Todos">("Todos");
  const [priority, setPriority] = useState<ReportPriority | "Todas">("Todas");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    void fetchReports()
      .then((items) => {
        setReports(items);
        setError("");
      })
      .catch(() => setError("No fue posible cargar los reportes desde la API."))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesQuery =
        !normalized ||
        report.id.toLowerCase().includes(normalized) ||
        report.type.toLowerCase().includes(normalized) ||
        report.createdByName.toLowerCase().includes(normalized) ||
        report.location.toLowerCase().includes(normalized) ||
        report.description.toLowerCase().includes(normalized);

      const matchesStatus = status === "Todos" || report.status === status;
      const matchesPriority = priority === "Todas" || report.priority === priority;

      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [priority, query, reports, status]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    if (!filtered.some((report) => report.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((report) => report.id === selectedId) ?? null;

  const metrics = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        if (report.status === "Enviado") acc.sent += 1;
        if (report.status === "En revision") acc.inReview += 1;
        if (report.priority === "Alta") acc.highPriority += 1;
        if (report.status === "Cerrado") acc.closed += 1;
        return acc;
      },
      { sent: 0, inReview: 0, highPriority: 0, closed: 0 },
    );
  }, [reports]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Reportes enviados" value={metrics.sent} tone="cyan" sub="Recibidos por el sistema" />
        <MetricCard label="En revision" value={metrics.inReview} tone="amber" sub="Pendientes de atencion" />
        <MetricCard label="Alta prioridad" value={metrics.highPriority} tone="rose" sub="Escalado recomendado" />
        <MetricCard label="Cerrados" value={metrics.closed} tone="emerald" sub="Atencion concluida" />
      </div>

      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tipo, operador, ubicacion, descripcion o ID..."
            className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus | "Todos")}
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ReportPriority | "Todas")}
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100">
            {filtered.length} registros
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Bandeja de reportes</h3>
              <p className="mt-1 text-xs text-slate-400">Incidentes enviados por operadores y consolidados por comunidad.</p>
            </div>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              Flujo operativo
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {isLoading ? (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                Cargando reportes...
              </p>
            ) : filtered.length ? (
              filtered.map((report) => {
                const active = report.id === selectedId;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedId(report.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-cyan-300/45 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                        : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityTag priority={report.priority} />
                          <StatusTag status={report.status} />
                        </div>
                        <p className="mt-2 text-base font-bold text-slate-100">{toTitleCase(report.type)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-cyan-200/80">{report.location}</p>
                        <p className="mt-1 text-sm text-slate-300">{truncate(report.description, 110)}</p>
                      </div>

                      <div className="text-right text-xs text-slate-400">
                        <p>{formatDateTime(report.createdAt)}</p>
                        <p className="mt-1 text-slate-500">{report.id.slice(0, 8)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                        {report.createdByName}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{report.role}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                No hay reportes con esos filtros.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Detalle del reporte</h3>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityTag priority={selected.priority} />
                  <StatusTag status={selected.status} />
                </div>
                <p className="mt-3 text-xl font-black text-white">{toTitleCase(selected.type)}</p>
                <p className="mt-2 text-sm text-slate-300">{selected.description}</p>
              </div>

              <div className="grid gap-3">
                <DetailRow label="Operador" value={selected.createdByName} />
                <DetailRow label="Rol" value={selected.role} />
                <DetailRow label="Ubicacion" value={selected.location} />
                <DetailRow label="Creado" value={formatDateTime(selected.createdAt)} />
                <DetailRow label="Actualizado" value={formatDateTime(selected.updatedAt)} />
                <DetailRow label="ID" value={selected.id} />
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              No hay reporte seleccionado.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: "cyan" | "amber" | "rose" | "emerald";
  sub: string;
}) {
  const toneClass: Record<typeof tone, string> = {
    cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-200",
    rose: "border-rose-300/25 bg-rose-400/10 text-rose-200",
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

function PriorityTag({ priority }: { priority: ReportPriority }) {
  const cls =
    priority === "Alta"
      ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
      : priority === "Media"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{priority}</span>;
}

function StatusTag({ status }: { status: ReportStatus }) {
  const cls =
    status === "Enviado"
      ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
      : status === "En revision"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : status === "Cerrado"
          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
          : "border-slate-300/20 bg-slate-400/10 text-slate-200";

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

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
