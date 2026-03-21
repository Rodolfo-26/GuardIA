import { useCallback, useEffect, useRef, useState } from "react";
import { fetchActivityLogs, type LogEntry } from "../services/activityLogs";

const CATEGORIES = [
  { value: "", label: "Todos" },
  { value: "AUTH", label: "Autenticación" },
  { value: "CRUD_USERS", label: "Usuarios" },
  { value: "CRUD_CAMERAS", label: "Cámaras" },
  { value: "CRUD_ALERTS", label: "Alertas" },
  { value: "HTTP_REQUEST", label: "HTTP" },
  { value: "SYSTEM", label: "Sistema" },
];

const CATEGORY_COLORS: Record<string, string> = {
  AUTH: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  CRUD_USERS: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  CRUD_CAMERAS: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  CRUD_ALERTS: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  HTTP_REQUEST: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  SYSTEM: "border-purple-400/30 bg-purple-400/10 text-purple-200",
};

const LEVEL_COLORS: Record<string, string> = {
  info: "text-cyan-300",
  warn: "text-amber-300",
  error: "text-rose-300",
};

const ACTION_ICONS: Record<string, string> = {
  login: "🔑",
  logout: "🚪",
  mfa_verified: "🛡️",
  login_failed: "⛔",
  create_user: "👤",
  update_role: "🔄",
  update_status: "📋",
  close_sessions: "🔒",
  create_camera: "📷",
  update_camera: "🔧",
  update_alert_workflow: "🚨",
  server_start: "🟢",
  server_shutdown: "🔴",
  unhandled_error: "💥",
};

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function timeAgo(seconds: number) {
  if (seconds < 5) return "justo ahora";
  if (seconds < 60) return `hace ${seconds}s`;
  return `hace ${Math.floor(seconds / 60)}m`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [logFilePath, setLogFilePath] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const intervalRef = useRef<number>(0);

  const loadLogs = useCallback(async () => {
    try {
      const response = await fetchActivityLogs({
        limit: 100,
        category: category || undefined,
      });
      setLogs(response.items);
      setTotal(response.total);
      setLogFilePath(response.file || "");
      setLastRefresh(Date.now());
      setSecondsSinceRefresh(0);
    } catch (err) {
      console.error("Error cargando logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    setIsLoading(true);
    void loadLogs();
    const id = window.setInterval(() => void loadLogs(), 10_000);
    intervalRef.current = id;
    return () => window.clearInterval(id);
  }, [loadLogs]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (lastRefresh) {
        setSecondsSinceRefresh(Math.floor((Date.now() - lastRefresh) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [lastRefresh]);

  return (
    <div className="space-y-5">
      {/* Info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/15 bg-slate-900/60 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-400/10">
            <span className="text-lg">📄</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Archivo de logs</p>
            <p className="text-xs font-mono text-slate-400 break-all">{logFilePath || "Sin archivo generado"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Actualizado {timeAgo(secondsSinceRefresh)}
          </div>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            {total} eventos totales
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition duration-200 ${
              category === cat.value
                ? "border border-cyan-300/40 bg-cyan-400/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Logs table */}
      <div className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-900/50 backdrop-blur">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-lg">Sin logs registrados</p>
            <p className="mt-1 text-sm">Realiza operaciones en el panel para generar eventos</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Header */}
            <div className="grid grid-cols-[140px_90px_100px_1fr_80px] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Fecha</span>
              <span>Nivel</span>
              <span>Categoría</span>
              <span>Mensaje</span>
              <span className="text-right">Detalles</span>
            </div>

            {/* Rows */}
            {logs.map((log, i) => (
              <div key={`${log.timestamp}-${i}`}>
                <div
                  className={`grid grid-cols-[140px_90px_100px_1fr_80px] gap-3 px-4 py-3 text-sm transition-colors duration-150 cursor-pointer ${
                    expandedRow === i
                      ? "bg-cyan-400/5"
                      : "hover:bg-white/[0.03]"
                  }`}
                  onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                >
                  <span className="font-mono text-xs text-slate-400">
                    {formatTimestamp(log.timestamp)}
                  </span>

                  <span className={`text-xs font-semibold uppercase ${LEVEL_COLORS[log.level] ?? "text-slate-300"}`}>
                    {log.level}
                  </span>

                  <span className={`inline-flex w-fit items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[log.category] ?? "border-slate-400/20 bg-slate-400/10 text-slate-300"}`}>
                    {log.category}
                  </span>

                  <span className="text-slate-200 truncate">
                    {ACTION_ICONS[log.action] ?? "📌"}{" "}
                    {log.message}
                  </span>

                  <span className="text-right text-xs text-slate-500">
                    {expandedRow === i ? "▲" : "▼"}
                  </span>
                </div>

                {expandedRow === i && (
                  <div className="border-t border-white/5 bg-slate-950/50 px-6 py-4">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Acción</p>
                        <p className="mt-0.5 text-xs font-mono text-cyan-200">{log.action}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Categoría</p>
                        <p className="mt-0.5 text-xs font-mono text-cyan-200">{log.category}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Nivel</p>
                        <p className="mt-0.5 text-xs font-mono text-cyan-200">{log.level}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Timestamp</p>
                        <p className="mt-0.5 text-xs font-mono text-cyan-200">{log.timestamp}</p>
                      </div>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Detalles (JSON)</p>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-xl border border-white/5 bg-slate-950/80 p-3 text-xs text-emerald-200 font-mono">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
