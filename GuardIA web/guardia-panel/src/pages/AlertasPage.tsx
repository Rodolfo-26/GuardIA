import { useEffect, useMemo, useState } from "react";

type AlertLevel = "Critica" | "Alta" | "Media" | "Baja";
type AlertStatus = "Nueva" | "En proceso" | "Resuelta";

type AlertItem = {
  id: string;
  title: string;
  zone: string;
  camera: string;
  time: string;
  level: AlertLevel;
  status: AlertStatus;
  confidence: number;
  assignee: string;
  notes: string;
};

const ALERTS: AlertItem[] = [
  {
    id: "AL-4301",
    title: "Ingreso no autorizado",
    zone: "Acceso Norte",
    camera: "Entrada principal",
    time: "11:42",
    level: "Critica",
    status: "Nueva",
    confidence: 94,
    assignee: "Sin asignar",
    notes: "Movimiento fuera de ventana horaria permitida.",
  },
  {
    id: "AL-4300",
    title: "Objeto abandonado",
    zone: "Anden 03",
    camera: "Carga y descarga",
    time: "11:31",
    level: "Alta",
    status: "En proceso",
    confidence: 86,
    assignee: "Operador 02",
    notes: "Objeto estatico detectado por mas de 3 minutos.",
  },
  {
    id: "AL-4299",
    title: "Rostro no reconocido",
    zone: "Ingreso secundario",
    camera: "Puerta lateral",
    time: "11:19",
    level: "Media",
    status: "En proceso",
    confidence: 81,
    assignee: "Operador 01",
    notes: "No coincide con lista de personal autorizado.",
  },
  {
    id: "AL-4298",
    title: "Movimiento en perimetro",
    zone: "Valla externa",
    camera: "Perimetro Norte",
    time: "10:58",
    level: "Alta",
    status: "Resuelta",
    confidence: 79,
    assignee: "Operador 03",
    notes: "Se confirma transito de mantenimiento autorizado.",
  },
  {
    id: "AL-4297",
    title: "Obstruccion de camara",
    zone: "Zona interior",
    camera: "Pasillo A",
    time: "10:41",
    level: "Baja",
    status: "Resuelta",
    confidence: 68,
    assignee: "Operador 01",
    notes: "Limpieza en lente, operacion normal restaurada.",
  },
];

export default function AlertasPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AlertStatus | "Todas">("Todas");
  const [level, setLevel] = useState<AlertLevel | "Todas">("Todas");
  const [selectedId, setSelectedId] = useState<string>(ALERTS[0]?.id ?? "");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return ALERTS.filter((alert) => {
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
  }, [level, query, status]);

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

  const counters = useMemo(() => {
    return ALERTS.reduce(
      (acc, alert) => {
        if (alert.level === "Critica") acc.critical += 1;
        if (alert.status === "Nueva") acc.newItems += 1;
        if (alert.status === "En proceso") acc.inProgress += 1;
        if (alert.status === "Resuelta") acc.resolved += 1;
        return acc;
      },
      { critical: 0, newItems: 0, inProgress: 0, resolved: 0 },
    );
  }, []);

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
            <option value="Todas">Todas</option>
            <option value="Nueva">Nueva</option>
            <option value="En proceso">En proceso</option>
            <option value="Resuelta">Resuelta</option>
          </select>

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={level}
            onChange={(e) => setLevel(e.target.value as AlertLevel | "Todas")}
          >
            <option value="Todas">Todas</option>
            <option value="Critica">Critica</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>

          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Exportar reporte
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.9fr]">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Cola de alertas</h3>
          <div className="mt-4 space-y-2">
            {filtered.length ? (
              filtered.map((alert) => {
                const active = alert.id === selectedId;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setSelectedId(alert.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-cyan-300/45 bg-cyan-400/10"
                        : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{alert.title}</p>
                      <span className="text-xs text-slate-400">{alert.time}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">
                      {alert.zone} • {alert.camera}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <LevelTag level={alert.level} />
                      <StatusTag status={alert.status} />
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

        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Detalle operativo</h3>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-cyan-300/20 bg-slate-950/70 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Incidente seleccionado</p>
                <p className="mt-2 text-lg font-black text-white">{selected.title}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {selected.zone} • {selected.camera} • {selected.time}
                </p>
              </div>

              <div className="grid gap-2">
                <DetailRow label="ID" value={selected.id} />
                <DetailRow label="Severidad" value={selected.level} />
                <DetailRow label="Estado" value={selected.status} />
                <DetailRow label="Confianza IA" value={`${selected.confidence}%`} />
                <DetailRow label="Asignado a" value={selected.assignee} />
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Notas IA</p>
                <p className="mt-2 text-sm text-slate-200">{selected.notes}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20"
                >
                  Escalar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  Marcar resuelta
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              Selecciona una alerta para ver detalles.
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Protocolos sugeridos</h3>
          <div className="mt-4 space-y-3">
            <ProtocolCard
              title="Protocolo P1 - Intrusion"
              subtitle="Bloqueo de acceso + notificacion inmediata"
              tone="rose"
            />
            <ProtocolCard
              title="Protocolo P2 - Verificacion"
              subtitle="Confirmar visual con segundo operador"
              tone="cyan"
            />
            <ProtocolCard
              title="Protocolo P3 - Registro"
              subtitle="Adjuntar evidencia y cerrar incidente"
              tone="emerald"
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">SLA actual</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
            </div>
            <p className="mt-2 text-xs text-slate-300">78% de alertas atendidas dentro del tiempo objetivo.</p>
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
  tone: "rose" | "amber" | "cyan" | "emerald";
}) {
  const toneClass: Record<typeof tone, string> = {
    rose: "border-rose-300/25 bg-rose-400/10 text-rose-200",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-200",
    cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
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

function ProtocolCard({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "rose" | "cyan" | "emerald";
}) {
  const cls =
    tone === "rose"
      ? "border-rose-300/25 bg-rose-400/10"
      : tone === "cyan"
        ? "border-cyan-300/25 bg-cyan-400/10"
        : "border-emerald-300/25 bg-emerald-400/10";

  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}
