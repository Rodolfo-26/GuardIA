const KPI = [
  { label: "Camaras activas", value: "24", trend: "+3 hoy", tone: "cyan" },
  { label: "Alertas IA", value: "07", trend: "2 criticas", tone: "rose" },
  { label: "Uptime", value: "99.98%", trend: "estable", tone: "emerald" },
  { label: "Latencia media", value: "118ms", trend: "optima", tone: "sky" },
] as const;

const ZONES = [
  { name: "Perimetro norte", risk: 72 },
  { name: "Accesos externos", risk: 45 },
  { name: "Zona de carga", risk: 61 },
  { name: "Pasillos internos", risk: 34 },
];

const EVENTS = [
  { time: "10:31", zone: "Acceso Norte", state: "Evento validado", level: "Alta" },
  { time: "10:24", zone: "Anden 03", state: "Movimiento detectado", level: "Media" },
  { time: "10:18", zone: "Bodega", state: "Camara reconectada", level: "Baja" },
  { time: "10:05", zone: "Perimetro", state: "Revision automatica", level: "Media" },
];

const TRAFFIC = [58, 64, 62, 71, 80, 77, 68, 61, 66, 72, 74, 63];

export default function Dashboard() {
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} trend={item.trend} tone={item.tone} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Threat Pulse</h3>
            <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
              Riesgo global 68%
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
                  background:
                    "conic-gradient(rgba(34,211,238,0.85) 0 244deg, rgba(15,23,42,0.35) 244deg 360deg)",
                  WebkitMask:
                    "radial-gradient(circle, transparent 56%, black 57%)",
                  mask: "radial-gradient(circle, transparent 56%, black 57%)",
                }}
              />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-3xl font-black text-cyan-100">68%</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Nivel IA</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-300/15 bg-slate-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Riesgo por zonas</p>
              <div className="mt-3 space-y-3">
                {ZONES.map((zone) => (
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
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Flujo de eventos (12m)</p>
            <div className="mt-2 flex h-20 items-end gap-1.5">
              {TRAFFIC.map((value, index) => (
                <div key={`bar-${index}`} className="flex-1 rounded-t-md bg-cyan-300/70" style={{ height: `${value}%` }} />
              ))}
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-5 backdrop-blur">
          <div className="absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent"
            style={{ animation: "pulseSweep 3.2s linear infinite" }}
          />

          <h3 className="relative text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Actividad reciente</h3>
          <div className="relative mt-4 space-y-3">
            {EVENTS.map((event) => (
              <div key={`${event.time}-${event.zone}`} className="rounded-xl border border-white/10 bg-slate-950/75 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{event.zone}</p>
                  <p className="text-xs text-slate-400">{event.time}</p>
                </div>
                <p className="mt-1 text-xs text-slate-300">{event.state}</p>
                <Priority level={event.level} />
              </div>
            ))}
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
    <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 shadow-[0_0_24px_rgba(8,47,73,0.45)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-3xl font-black text-white">{value}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass[tone]}`}>Live</span>
      </div>
      <p className="mt-2 text-xs text-slate-300">{trend}</p>
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
