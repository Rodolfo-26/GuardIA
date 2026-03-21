import { useEffect, useMemo, useState } from "react";
import { fetchRecordings, type RecordingItem, type RecordingSeverity } from "../services/recordings";

const DATE_FILTERS = ["Hoy", "24h", "7 dias"] as const;

export default function GrabacionesPage() {
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState("Todas");
  const [event, setEvent] = useState("Todos");
  const [severity, setSeverity] = useState("Todas");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>("Hoy");
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchRecordings();
        if (!cancelled) {
          setItems(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar las grabaciones.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cameraOptions = useMemo(
    () => ["Todas", ...Array.from(new Set(items.map((recording) => recording.camera)))],
    [items],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    return items.filter((rec) => {
      const matchesQuery =
        !normalized ||
        rec.camera.toLowerCase().includes(normalized) ||
        rec.zone.toLowerCase().includes(normalized) ||
        rec.id.toLowerCase().includes(normalized) ||
        rec.title.toLowerCase().includes(normalized);

      const matchesCamera = camera === "Todas" || rec.camera === camera;
      const matchesEvent = event === "Todos" || rec.event === event;
      const matchesSeverity = severity === "Todas" || rec.severity === severity;

      const startedAtMs = new Date(rec.startedAt).getTime();
      const diff = now - startedAtMs;
      const matchesDate =
        dateFilter === "Hoy"
          ? startedAtMs >= startOfTodayMs
          : dateFilter === "24h"
            ? diff <= dayMs
            : diff <= dayMs * 7;

      return matchesQuery && matchesCamera && matchesEvent && matchesSeverity && matchesDate;
    });
  }, [camera, dateFilter, event, items, query, severity]);

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
  const totalSeconds = filtered.reduce((acc, clip) => acc + clip.durationSeconds, 0);
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));

  async function handlePrimaryAction() {
    if (!selected) return;

    try {
      if (selected.filePath.startsWith("http://") || selected.filePath.startsWith("https://")) {
        window.open(selected.filePath, "_blank", "noopener,noreferrer");
        setActionMessage("Clip abierto en una nueva pestana.");
        return;
      }

      await navigator.clipboard.writeText(selected.filePath);
      setActionMessage("Ruta del clip copiada al portapapeles.");
    } catch {
      setActionMessage("No fue posible abrir el clip, pero la grabacion sigue disponible.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.7fr_0.7fr_auto]">
          <input
            className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="Buscar por camara, zona, titulo o ID..."
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
            <option value="Objeto">Objeto</option>
            <option value="Biometria">Biometria</option>
            <option value="General">General</option>
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
            onClick={handlePrimaryAction}
            disabled={!selected}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Exportar clip
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

        {actionMessage && (
          <p className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
            {actionMessage}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-6 text-sm text-slate-300 backdrop-blur">
          Cargando grabaciones del sistema...
        </div>
      ) : (
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
                      onClick={() => {
                        setSelectedId(clip.id);
                        setActionMessage("");
                      }}
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
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400">{clip.event}</p>
                        {clip.flagged && (
                          <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                            Evidencia
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                  No hay grabaciones con los filtros actuales.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Clips detectados</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filtered.length ? (
                filtered.map((clip) => {
                  const isActive = clip.id === selectedId;
                  return (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(clip.id);
                        setActionMessage("");
                      }}
                      className={`overflow-hidden rounded-xl border text-left transition ${
                        isActive
                          ? "border-cyan-300/45 bg-cyan-400/10"
                          : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                      }`}
                    >
                      <div className="relative h-28 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.32),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(8,47,73,0.8),rgba(6,78,59,0.75))]">
                        <span className="absolute left-2 top-2 rounded-md border border-black/30 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-slate-100">
                          {clip.durationLabel}
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
                })
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300 sm:col-span-2">
                  Aun no hay clips listos para inspeccion.
                </p>
              )}
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
                  <DetailRow label="Titulo" value={selected.title} />
                  <DetailRow label="Camara" value={selected.camera} />
                  <DetailRow label="Zona" value={selected.zone} />
                  <DetailRow label="Evento" value={selected.event} />
                  <DetailRow label="Duracion" value={selected.durationLabel} />
                  <DetailRow label="Confianza IA" value={`${selected.confidence}%`} />
                  <DetailRow label="Estado" value={selected.statusLabel} />
                  <DetailRow label="Revision" value={selected.reviewed ? "Validado" : "Pendiente"} />
                  <DetailRow label="Ruta clip" value={selected.filePath} />
                  <DetailRow label="Motivo evidencia" value={selected.evidenceReason} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100/80 transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {selected.flagged ? "Evidencia vinculada" : "Sin evidencia"}
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
      )}
    </section>
  );
}

function SeverityTag({ value }: { value: RecordingSeverity }) {
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
      <span className="max-w-[60%] text-right text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}
