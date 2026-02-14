import { useMemo, useState } from "react";
import CameraRegistrationModal, {
  type CameraRecord,
} from "./components/CameraRegistrationModal";
import CameraDetailsModal from "./components/CameraDetailsModal";

const INITIAL_CAMERAS: CameraRecord[] = [
  {
    id: "cam-01",
    name: "Acceso Norte",
    zone: "Perimetro A",
    status: "online",
    protocol: "RTSP",
    resolution: "1080p",
    streamUrl: "rtsp://10.0.1.20/live",
    aiProfiles: ["Deteccion de intrusos", "Zona prohibida"],
    retentionDays: 30,
  },
  {
    id: "cam-02",
    name: "Patio Logistico",
    zone: "Bodega externa",
    status: "warning",
    protocol: "ONVIF",
    resolution: "4K",
    streamUrl: "rtsp://10.0.1.32/live",
    aiProfiles: ["Deteccion de vehiculos", "Conteo de personas"],
    retentionDays: 45,
  },
  {
    id: "cam-03",
    name: "Pasillo central",
    zone: "Interior nivel 1",
    status: "offline",
    protocol: "RTSP",
    resolution: "720p",
    streamUrl: "rtsp://10.0.1.41/live",
    aiProfiles: ["Reconocimiento facial"],
    retentionDays: 15,
  },
];

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRecord[]>(INITIAL_CAMERAS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CameraRecord["status"]>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CameraRecord | null>(null);
  const [detailsCamera, setDetailsCamera] = useState<CameraRecord | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cameras.filter((cam) => {
      const matchesStatus = statusFilter === "all" || cam.status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalized) return true;
      return (
        cam.name.toLowerCase().includes(normalized) ||
        cam.zone.toLowerCase().includes(normalized) ||
        cam.protocol.toLowerCase().includes(normalized)
      );
    });
  }, [cameras, query, statusFilter]);

  const metrics = useMemo(() => {
    const online = cameras.filter((cam) => cam.status === "online").length;
    const warning = cameras.filter((cam) => cam.status === "warning").length;
    const offline = cameras.filter((cam) => cam.status === "offline").length;
    return { total: cameras.length, online, warning, offline };
  }, [cameras]);

  function openCreateModal() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditModal(cam: CameraRecord) {
    setEditing(cam);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function openDetailsModal(cam: CameraRecord) {
    setDetailsCamera(cam);
  }

  function closeDetailsModal() {
    setDetailsCamera(null);
  }

  function handleSave(
    draft: Omit<CameraRecord, "id" | "status">,
    existingId?: string,
  ) {
    setCameras((prev) => {
      if (existingId) {
        return prev.map((cam) =>
          cam.id === existingId ? { ...cam, ...draft, status: "online" } : cam,
        );
      }

      const next: CameraRecord = {
        id: `cam-${String(prev.length + 1).padStart(2, "0")}`,
        status: "online",
        ...draft,
      };
      return [next, ...prev];
    });

    closeModal();
  }

  return (
    <section className="space-y-5">
      <style>{`
        @keyframes camerasRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes camerasGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(34,211,238,0); }
          50% { box-shadow: 0 0 24px rgba(34,211,238,0.14); }
        }
      `}</style>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Camaras registradas" value={metrics.total} tone="cyan" delay={0} />
        <MetricCard label="Operativas" value={metrics.online} tone="emerald" delay={60} />
        <MetricCard label="En advertencia" value={metrics.warning} tone="amber" delay={120} />
        <MetricCard label="Sin conexion" value={metrics.offline} tone="rose" delay={180} />
      </div>

      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-slate-400">Estado:</span>
            {[
              { label: "Todos", value: "all" },
              { label: "Online", value: "online" },
              { label: "Warning", value: "warning" },
              { label: "Offline", value: "offline" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatusFilter(item.value as typeof statusFilter)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === item.value
                    ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                    : "border-white/15 bg-white/5 text-slate-300 hover:border-cyan-300/30"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, zona o protocolo..."
            className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300 sm:max-w-md"
          />
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110"
          >
            Registrar camara
          </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {filtered.map((cam, index) => (
            <article
              key={cam.id}
              className="rounded-2xl border border-cyan-300/15 bg-slate-950/65 p-4 transition hover:-translate-y-0.5"
              style={{
                animation: `camerasRise 320ms ease-out ${index * 75}ms both, camerasGlow 3.4s ease-in-out ${index * 120}ms infinite`,
              }}
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">{cam.name}</p>
                  <p className="text-xs text-slate-400">{cam.zone}</p>
                </div>
                <StatusBadge status={cam.status} />
              </header>

              <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
                <InfoPill label="Protocolo" value={cam.protocol} />
                <InfoPill label="Resolucion" value={cam.resolution} />
                <InfoPill label="Retencion" value={`${cam.retentionDays} dias`} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 font-semibold text-cyan-100">
                  {cam.aiProfiles.length} perfiles IA
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-slate-300">
                  {cam.zone}
                </span>
              </div>

              <footer className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">Informacion detallada en modal</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openDetailsModal(cam)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                  >
                    Detalles
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(cam)}
                    className="rounded-lg border border-cyan-300/25 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10"
                  >
                    Configurar
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>

      {modalOpen && (
        <CameraRegistrationModal
          key={editing?.id ?? "new-camera"}
          initial={editing}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      <CameraDetailsModal
        camera={detailsCamera}
        onClose={closeDetailsModal}
        onConfigure={(camera) => {
          closeDetailsModal();
          openEditModal(camera);
        }}
      />
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
  delay,
}: {
  label: string;
  value: number;
  tone: "cyan" | "emerald" | "amber" | "rose";
  delay: number;
}) {
  const tones: Record<typeof tone, string> = {
    cyan: "text-cyan-200 border-cyan-300/20 bg-cyan-400/10",
    emerald: "text-emerald-200 border-emerald-300/20 bg-emerald-400/10",
    amber: "text-amber-200 border-amber-300/20 bg-amber-400/10",
    rose: "text-rose-200 border-rose-300/20 bg-rose-400/10",
  };

  return (
    <article
      className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur"
      style={{ animation: `camerasRise 320ms ease-out ${delay}ms both` }}
    >
      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-3xl font-black text-white">{value}</p>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
          Live
        </span>
      </div>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/70 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CameraRecord["status"] }) {
  if (status === "online") {
    return (
      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
        Online
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
        Warning
      </span>
    );
  }
  return (
    <span className="rounded-full border border-rose-300/30 bg-rose-400/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
      Offline
    </span>
  );
}
