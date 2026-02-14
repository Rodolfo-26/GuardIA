import { useMemo, useState } from "react";
import CameraConfigModal from "./components/CameraConfigModal";
import CameraFullscreenModal from "./components/CameraFullscreenModal";
import VideoTile from "./components/VideoTile";
import type { Camera } from "./components/VideoTile";

const INITIAL_CAMERAS: Camera[] = [
  {
    id: "c1",
    name: "Entrada principal",
    location: "Puerta frontal",
    status: "live",
    latencyMs: 120,
    lastSeen: "11:06",
    recording: true,
    sensitivity: 64,
  },
  {
    id: "c2",
    name: "Estacionamiento",
    location: "Area de vehiculos",
    status: "live",
    latencyMs: 108,
    lastSeen: "11:08",
    recording: true,
    sensitivity: 70,
  },
  {
    id: "c3",
    name: "Pasillo A",
    location: "Zona interior",
    status: "live",
    latencyMs: 134,
    lastSeen: "11:07",
    recording: false,
    sensitivity: 55,
  },
  {
    id: "c4",
    name: "Bodega",
    location: "Acceso trasero",
    status: "offline",
    latencyMs: 0,
    lastSeen: "10:42",
    recording: false,
    sensitivity: 48,
  },
];

export default function Monitoreo() {
  const [query, setQuery] = useState("");
  const [cameras, setCameras] = useState<Camera[]>(INITIAL_CAMERAS);
  const [playing, setPlaying] = useState<Record<string, boolean>>({
    c1: true,
    c2: true,
    c3: true,
    c4: false,
  });
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cameras;
    return cameras.filter(
      (cam) =>
        cam.name.toLowerCase().includes(normalized) ||
        cam.location.toLowerCase().includes(normalized),
    );
  }, [cameras, query]);

  const fullscreenCamera = cameras.find((cam) => cam.id === fullscreenId) ?? null;
  const configCamera = cameras.find((cam) => cam.id === configId) ?? null;

  function handleRefresh() {
    setCameras((prev) =>
      prev.map((cam) => {
        if (cam.status === "offline") return cam;
        const nextLatency = Math.max(80, Math.min(220, cam.latencyMs + Math.floor(Math.random() * 30 - 15)));
        return { ...cam, latencyMs: nextLatency };
      }),
    );
  }

  function handleTogglePlay(cameraId: string) {
    const target = cameras.find((cam) => cam.id === cameraId);
    if (!target || target.status === "offline") return;
    setPlaying((prev) => ({ ...prev, [cameraId]: !prev[cameraId] }));
  }

  function handleSaveConfig(patch: Pick<Camera, "recording" | "sensitivity" | "status">) {
    if (!configId) return;

    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === configId
          ? {
              ...cam,
              ...patch,
              latencyMs: patch.status === "offline" ? 0 : Math.max(95, cam.latencyMs || 110),
              lastSeen: patch.status === "offline" ? "Ahora" : cam.lastSeen,
            }
          : cam,
      ),
    );

    if (patch.status === "offline") {
      setPlaying((prev) => ({ ...prev, [configId]: false }));
    }

    setConfigId(null);
  }

  return (
    <>
      <style>{`
        @keyframes monitoringReveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes monitoringSweep {
          0% { transform: translateX(-35%); opacity: 0; }
          20% { opacity: 0.45; }
          100% { transform: translateX(140%); opacity: 0; }
        }
      `}</style>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="w-full rounded-xl border border-cyan-300/20 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 sm:w-80"
          placeholder="Buscar camara..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          type="button"
          onClick={handleRefresh}
        >
          Refrescar
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((cam, index) => (
          <div
            key={cam.id}
            className="relative overflow-hidden rounded-2xl"
            style={{ animation: `monitoringReveal 340ms ease-out ${index * 80}ms both` }}
          >
            <div
              className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent"
              style={{ animation: "monitoringSweep 4.2s linear infinite" }}
            />
            <VideoTile
              cam={cam}
              isPlaying={Boolean(playing[cam.id])}
              onTogglePlay={() => handleTogglePlay(cam.id)}
              onOpenFullscreen={() => setFullscreenId(cam.id)}
              onOpenConfig={() => setConfigId(cam.id)}
            />
          </div>
        ))}
      </section>

      <CameraFullscreenModal
        camera={fullscreenCamera}
        isPlaying={fullscreenCamera ? Boolean(playing[fullscreenCamera.id]) : false}
        onClose={() => setFullscreenId(null)}
      />

      <CameraConfigModal
        camera={configCamera}
        onClose={() => setConfigId(null)}
        onSave={handleSaveConfig}
      />
    </>
  );
}
