import type { Camera } from "./VideoTile";
import CameraStream from "./CameraStream";

export default function CameraFullscreenModal({
  camera,
  isPlaying,
  onClose,
}: {
  camera: Camera | null;
  isPlaying: boolean;
  onClose: () => void;
}) {
  if (!camera) return null;

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm">
      <div className="h-[96vh] w-[98vw] rounded-2xl border border-cyan-300/25 bg-slate-900/95 p-4 shadow-[0_0_42px_rgba(34,211,238,0.22)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">Vision ampliada</p>
            <h3 className="text-xl font-black text-white">{camera.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <div className="relative h-[calc(96vh-7.5rem)] overflow-hidden rounded-xl border border-cyan-300/20 bg-slate-950">
          <CameraStream
            streamUrl={camera.streamUrl}
            isPlaying={isPlaying}
            offline={camera.status === "offline"}
            fit="cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(34,211,238,0.22),transparent_58%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(2,6,23,0.75))]" />
          <div className="absolute left-4 top-4 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            {camera.status === "offline" ? "Sin conexion" : isPlaying ? "Streaming en vivo" : "Pausa"}
          </div>
          <div className="absolute bottom-4 left-4 text-sm text-slate-200">
            {camera.location}  |  Latencia {camera.latencyMs}ms
          </div>
        </div>
      </div>
    </div>
  );
}
