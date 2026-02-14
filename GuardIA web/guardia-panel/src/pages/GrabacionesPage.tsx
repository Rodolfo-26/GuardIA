import { useEffect, useMemo, useState } from "react";

type Severity = "Alta" | "Media" | "Baja";
type EventType = "Intrusion" | "Movimiento" | "Rostro" | "Vehiculo";

type Recording = {
  id: string;
  camera: string;
  zone: string;
  timestamp: string;
  duration: string;
  event: EventType;
  severity: Severity;
  confidence: number;
  reviewed: boolean;
  flagged: boolean;
  range: "Hoy" | "24h" | "7 dias";
};

const RECORDINGS: Recording[] = [
  { id: "r-901", camera: "Entrada principal", zone: "Acceso Norte", timestamp: "11:42", duration: "00:47", event: "Intrusion", severity: "Alta", confidence: 94, reviewed: false, flagged: true, range: "Hoy" },
  { id: "r-902", camera: "Estacionamiento", zone: "Lote A", timestamp: "11:30", duration: "01:23", event: "Movimiento", severity: "Media", confidence: 82, reviewed: true, flagged: false, range: "Hoy" },
  { id: "r-903", camera: "Anden 03", zone: "Carga y descarga", timestamp: "11:12", duration: "00:31", event: "Vehiculo", severity: "Baja", confidence: 76, reviewed: true, flagged: false, range: "Hoy" },
  { id: "r-904", camera: "Bodega", zone: "Acceso trasero", timestamp: "10:58", duration: "02:04", event: "Rostro", severity: "Media", confidence: 88, reviewed: false, flagged: true, range: "24h" },
  { id: "r-905", camera: "Pasillo A", zone: "Zona interior", timestamp: "10:47", duration: "00:56", event: "Movimiento", severity: "Baja", confidence: 71, reviewed: false, flagged: false, range: "24h" },
  { id: "r-906", camera: "Perimetro Norte", zone: "Valla externa", timestamp: "10:19", duration: "01:12", event: "Intrusion", severity: "Alta", confidence: 91, reviewed: true, flagged: true, range: "7 dias" },
  { id: "r-907", camera: "Puerta lateral", zone: "Ingreso secundario", timestamp: "10:03", duration: "00:29", event: "Rostro", severity: "Media", confidence: 80, reviewed: false, flagged: false, range: "7 dias" },
];

const DATE_FILTERS = ["Hoy", "24h", "7 dias"] as const;

export default function GrabacionesPage() {
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState("Todas");
  const [event, setEvent] = useState("Todos");
  const [severity, setSeverity] = useState("Todas");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>("Hoy");
  const [selectedId, setSelectedId] = useState<string>(RECORDINGS[0]?.id ?? "");

  const cameraOptions = useMemo(
    () => ["Todas", ...Array.from(new Set(RECORDINGS.map((rec) => rec.camera)))],
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return RECORDINGS.filter((rec) => {
      const matchesQuery =
        !normalized ||
        rec.camera.toLowerCase().includes(normalized) ||
        rec.zone.toLowerCase().includes(normalized) ||
        rec.id.toLowerCase().includes(normalized);

      const matchesCamera = camera === "Todas" || rec.camera === camera;
      const matchesEvent = event === "Todos" || rec.event === event;
      const matchesSeverity = severity === "Todas" || rec.severity === severity;
      const matchesDate = dateFilter === "7 dias" ? true : rec.range === dateFilter;

      return matchesQuery && matchesCamera && matchesEvent && matchesSeverity && matchesDate;
    });
  }, [camera, dateFilter, event, query, severity]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((clip) => clip.id === selectedId) ?? null;
  const totalMinutes = filtered.reduce((acc, clip) => acc + Number(clip.duration.split(":")[0]), 0);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.7fr_0.7fr_auto]">
          <input
            className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="Buscar por camara, zona o ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
          >
            {cameraOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="Intrusion">Intrusion</option>
            <option value="Movimiento">Movimiento</option>
            <option value="Rostro">Rostro</option>
            <option value="Vehiculo">Vehiculo</option>
          </select>

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="Todas">Todas</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>

          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Exportar lote
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((item) => {
              const active = item === dateFilter;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDateFilter(item)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100"
                      : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-300/30"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            {filtered.length} clips, {totalMinutes} min
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr_1fr]">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Timeline</h3>
          <div className="mt-4 space-y-2">
            {filtered.length ? (
              filtered.map((clip) => {
                const isActive = clip.id === selectedId;
                return (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => setSelectedId(clip.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isActive
                        ? "border-cyan-300/45 bg-cyan-400/10"
                        : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{clip.timestamp}</p>
                      <SeverityTag value={clip.severity} />
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{clip.zone}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">{clip.event}</p>
                  </button>
                );
              })
            ) : (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                Sin resultados para los filtros actuales.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Clips detectados</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {filtered.map((clip) => {
              const isActive = clip.id === selectedId;
              return (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => setSelectedId(clip.id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    isActive
                      ? "border-cyan-300/45 bg-cyan-400/10"
                      : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                  }`}
                >
                  <div className="relative h-28 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.32),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(8,47,73,0.8),rgba(6,78,59,0.75))]">
                    <span className="absolute left-2 top-2 rounded-md border border-black/30 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-slate-100">
                      {clip.duration}
                    </span>
                    <span className="absolute bottom-2 right-2 rounded-md border border-cyan-300/30 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
                      IA {clip.confidence}%
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{clip.camera}</p>
                      <p className="text-xs text-slate-400">{clip.timestamp}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{clip.zone}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                        {clip.event}
                      </span>
                      {clip.flagged && (
                        <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                          Evidencia
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Detalle forense</h3>

          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="relative h-44 overflow-hidden rounded-xl border border-cyan-300/20 bg-[radial-gradient(circle_at_25%_30%,rgba(56,189,248,0.35),transparent_45%),linear-gradient(120deg,rgba(15,23,42,0.96),rgba(8,47,73,0.86),rgba(6,95,70,0.8))]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute bottom-2 left-2 rounded-md border border-black/30 bg-black/45 px-2 py-1 text-[11px] text-slate-100">
                  {selected.camera} • {selected.timestamp}
                </div>
              </div>

              <div className="grid gap-2">
                <DetailRow label="Clip ID" value={selected.id} />
                <DetailRow label="Camara" value={selected.camera} />
                <DetailRow label="Zona" value={selected.zone} />
                <DetailRow label="Evento" value={selected.event} />
                <DetailRow label="Duracion" value={selected.duration} />
                <DetailRow label="Confianza IA" value={`${selected.confidence}%`} />
                <DetailRow label="Revision" value={selected.reviewed ? "Validado" : "Pendiente"} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Descargar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  Marcar evidencia
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              No hay clip seleccionado.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

function SeverityTag({ value }: { value: Severity }) {
  const cls =
    value === "Alta"
      ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
      : value === "Media"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{value}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}
