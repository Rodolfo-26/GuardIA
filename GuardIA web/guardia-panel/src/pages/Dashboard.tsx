import { useEffect, useMemo, useState } from "react";
import { fetchAlerts, type AlertItem } from "../services/alerts";
import { fetchCameras, type CameraRecord } from "../services/cameras";
import { fetchUsersList, type AppUserRecord } from "../services/users";

type DashboardState = {
  alerts: AlertItem[];
  cameras: CameraRecord[];
  users: AppUserRecord[];
};

type ActivityItem = {
  id: string;
  zone: string;
  state: string;
  level: "Alta" | "Media" | "Baja";
  time: string;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardState>({
    alerts: [],
    cameras: [],
    users: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void Promise.all([fetchAlerts(), fetchCameras(), fetchUsersList()])
      .then(([alerts, cameras, users]) => {
        if (cancelled) return;
        setData({ alerts, cameras, users });
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setError("No fue posible cargar el resumen operativo desde la API.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const activeCameras = data.cameras.filter((camera) => camera.status === "online").length;
    const criticalAlerts = data.alerts.filter((alert) => alert.level === "Critica" && alert.status !== "Resuelta").length;
    const activeUsers = data.users.filter((user) => user.status === "Activo").length;
    const operationalAlerts = data.alerts.filter((alert) => alert.status === "En proceso").length;

    const uptime = data.cameras.length
      ? Math.round((activeCameras / data.cameras.length) * 10000) / 100
      : 0;

    const latency = data.alerts.length
      ? Math.round(data.alerts.reduce((acc, alert) => acc + alert.confidence, 0) / data.alerts.length)
      : 0;

    return [
      { label: "Camaras activas", value: String(activeCameras), trend: `${data.cameras.length} registradas`, tone: "cyan" as const },
      { label: "Alertas IA", value: String(criticalAlerts).padStart(2, "0"), trend: `${operationalAlerts} en proceso`, tone: "rose" as const },
      { label: "Usuarios activos", value: String(activeUsers), trend: `${data.users.length} cuentas`, tone: "emerald" as const },
      { label: "Confianza media", value: `${latency}%`, trend: `Uptime ${uptime}%`, tone: "sky" as const },
    ];
  }, [data]);

  const zones = useMemo(() => {
    const severityWeight: Record<AlertItem["level"], number> = {
      Critica: 100,
      Alta: 75,
      Media: 50,
      Baja: 25,
    };

    const zoneMap = new Map<string, number>();
    data.alerts.forEach((alert) => {
      const current = zoneMap.get(alert.zone) ?? 0;
      zoneMap.set(alert.zone, Math.max(current, severityWeight[alert.level]));
    });

    return Array.from(zoneMap.entries())
      .map(([name, risk]) => ({ name, risk }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 4);
  }, [data.alerts]);

  const globalRisk = useMemo(() => {
    if (!zones.length) return 0;
    return Math.round(zones.reduce((acc, zone) => acc + zone.risk, 0) / zones.length);
  }, [zones]);

  const traffic = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0];
    data.alerts.forEach((alert) => {
      if (alert.level === "Critica") buckets[5] += 1;
      else if (alert.level === "Alta") buckets[4] += 1;
      else if (alert.level === "Media") buckets[2] += 1;
      else buckets[1] += 1;
    });
    data.cameras.forEach((camera) => {
      if (camera.status === "warning") buckets[3] += 1;
      if (camera.status === "offline") buckets[0] += 1;
    });

    const max = Math.max(1, ...buckets);
    return buckets.map((value) => Math.max(18, Math.round((value / max) * 100)));
  }, [data.alerts, data.cameras]);

  const activity = useMemo<ActivityItem[]>(() => {
    const alertEvents: ActivityItem[] = data.alerts.slice(0, 4).map((alert) => ({
      id: alert.id,
      zone: alert.zone,
      state: alert.title,
      level: alert.level === "Critica" || alert.level === "Alta" ? "Alta" : alert.level === "Media" ? "Media" : "Baja",
      time: alert.time,
    }));

    const cameraEvents: ActivityItem[] = data.cameras
      .filter((camera) => camera.status !== "online")
      .slice(0, 2)
      .map((camera) => ({
        id: camera.id,
        zone: camera.zone,
        state: camera.status === "offline" ? "Camara sin conexion" : "Camara en advertencia",
        level: camera.status === "offline" ? ("Alta" as const) : ("Media" as const),
        time: camera.status === "offline" ? "Ahora" : "Reciente",
      }));

    return [...alertEvents, ...cameraEvents].slice(0, 4);
  }, [data.alerts, data.cameras]);

  return (
    <section className="space-y-5">
      <style>{`
        @keyframes pulseSweep {
          0% { transform: translateX(-35%); opacity: 0; }
          20% { opacity: 0.45; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        @keyframes softPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }
      `}</style>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} trend={item.trend} tone={item.tone} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Threat Pulse</h3>
            <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
              Riesgo global {globalRisk}%
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="relative mx-auto h-40 w-40">
              <div className="absolute inset-0 rounded-full border border-cyan-300/20" />
              <div className="absolute inset-2 rounded-full border border-cyan-300/20" />
              <div className="absolute inset-0 rounded-full" style={{ animation: "softPulse 2.2s ease-in-out infinite" }}>
                <div className="absolute inset-[22%] rounded-full bg-cyan-300/20" />
              </div>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(rgba(34,211,238,0.85) 0 ${Math.round((globalRisk / 100) * 360)}deg, rgba(15,23,42,0.35) ${Math.round((globalRisk / 100) * 360)}deg 360deg)`,
                  WebkitMask: "radial-gradient(circle, transparent 56%, black 57%)",
                  mask: "radial-gradient(circle, transparent 56%, black 57%)",
                }}
              />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-3xl font-black text-cyan-100">{globalRisk}%</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Nivel IA</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-300/15 bg-slate-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Riesgo por zonas</p>
              <div className="mt-3 space-y-3">
                {(zones.length ? zones : [{ name: "Sin eventos", risk: 0 }]).map((zone) => (
                  <div key={zone.name}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>{zone.name}</span>
                      <span>{zone.risk}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        style={{ width: `${zone.risk}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-cyan-300/15 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Flujo de eventos operativo</p>
            <div className="mt-2 flex h-20 items-end gap-1.5">
              {traffic.map((value, index) => (
                <div key={`bar-${index}`} className="flex-1 rounded-t-md bg-cyan-300/70" style={{ height: `${value}%` }} />
              ))}
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-5 backdrop-blur">
          <div
            className="absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent"
            style={{ animation: "pulseSweep 3.2s linear infinite" }}
          />

          <h3 className="relative text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Actividad reciente</h3>
          <div className="relative mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/75 p-3 text-sm text-slate-300">
                Cargando actividad...
              </div>
            ) : activity.length ? (
              activity.map((event) => (
                <div key={`${event.id}-${event.zone}`} className="rounded-xl border border-white/10 bg-slate-950/75 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{event.zone}</p>
                    <p className="text-xs text-slate-400">{event.time}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{event.state}</p>
                  <Priority level={event.level} />
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-slate-950/75 p-3 text-sm text-slate-300">
                Aun no hay eventos recientes para mostrar.
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: "cyan" | "rose" | "emerald" | "sky";
}) {
  const toneClass: Record<typeof tone, string> = {
    cyan: "text-cyan-200 border-cyan-300/25 bg-cyan-400/10",
    rose: "text-rose-200 border-rose-300/25 bg-rose-400/10",
    emerald: "text-emerald-200 border-emerald-300/25 bg-emerald-400/10",
    sky: "text-sky-200 border-sky-300/25 bg-sky-400/10",
  };

  return (
    <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 px-4 py-3 shadow-[0_0_24px_rgba(8,47,73,0.45)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="truncate text-xs text-slate-400">{trend}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass[tone]}`}>Live</span>
      </div>
    </article>
  );
}

function Priority({ level }: { level: "Alta" | "Media" | "Baja" }) {
  const cls =
    level === "Alta"
      ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
      : level === "Media"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";

  return <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{level}</span>;
}
