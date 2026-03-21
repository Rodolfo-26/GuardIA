import { useEffect, useMemo, useState } from "react";
import { fetchCameras, type CameraRecord } from "../services/cameras";
import CameraConfigModal from "./components/CameraConfigModal";
import CameraFullscreenModal from "./components/CameraFullscreenModal";
import VideoTile from "./components/VideoTile";
import type { Camera } from "./components/VideoTile";

function toMonitoringCamera(camera: CameraRecord): Camera {
  const offline = camera.status === "offline";

  return {
    id: camera.id,
    name: camera.name,
    location: camera.zone,
    status: offline ? "offline" : "live",
    latencyMs: offline ? 0 : 90 + Math.min(130, camera.aiProfiles.length * 12 + camera.retentionDays),
    lastSeen: offline ? "Sin conexion" : "Activo",
    recording: camera.retentionDays > 0,
    sensitivity: Math.max(35, Math.min(95, 45 + camera.aiProfiles.length * 10)),
    streamUrl: camera.streamUrl,
  };
}

export default function Monitoreo() {
  const [query, setQuery] = useState("");
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCameras() {
    try {
      const items = await fetchCameras();
      const mapped = items.map(toMonitoringCamera);
      setCameras(mapped);
      setPlaying((prev) => {
        const next: Record<string, boolean> = {};
        mapped.forEach((camera) => {
          next[camera.id] = prev[camera.id] ?? camera.status !== "offline";
        });
        return next;
      });
      setError("");
    } catch {
      setError("No fue posible cargar el monitoreo en tiempo real desde la API.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCameras();
  }, []);

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
    setIsLoading(true);
    void loadCameras();
  }

  function handleTogglePlay(cameraId: string) {
    const target = cameras.find((cam) => cam.id === cameraId);
    if (!target || target.status === "offline") return;
    setPlaying((prev) => ({ ...prev, [cameraId]: !prev[cameraId] }));
  }

  function handleSaveConfig(patch: Pick<Camera, "recording" | "sensitivity" | "status" | "streamUrl">) {
    if (!configId) return;

    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === configId
          ? {
              ...cam,
              ...patch,
              latencyMs: patch.status === "offline" ? 0 : Math.max(95, cam.latencyMs || 110),
              lastSeen: patch.status === "offline" ? "Sin conexion" : "Activo",
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

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-5 text-sm text-slate-300 backdrop-blur">
          Cargando mosaico de monitoreo...
        </div>
      ) : filtered.length ? (
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
      ) : (
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-5 text-sm text-slate-300 backdrop-blur">
          No hay camaras que coincidan con la busqueda actual.
        </div>
      )}

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
