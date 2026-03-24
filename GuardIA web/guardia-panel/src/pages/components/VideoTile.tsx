import Badge from "../../UI/Badge";
import IconButton from "../../UI/IconButton";
import CameraStream from "./CameraStream";

export type Camera = {
  id: string;
  name: string;
  location: string;
  streamUrl?: string;
  status: "live" | "offline";
  latencyMs: number;
  lastSeen: string;
  recording: boolean;
  sensitivity: number;
};

export default function VideoTile({
  cam,
  isPlaying,
  onTogglePlay,
  onOpenFullscreen,
  onOpenConfig,
  showConfigControl = true,
}: {
  cam: Camera;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenFullscreen: () => void;
  onOpenConfig: () => void;
  showConfigControl?: boolean;
}) {
  const offline = cam.status === "offline";

  return (
    <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 shadow-[0_0_24px_rgba(8,47,73,0.45)] backdrop-blur">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="font-extrabold text-slate-100">{cam.name}</div>
          <div className="mt-1 text-xs text-slate-400">{cam.location}</div>
        </div>
        <Badge status={cam.status} />
      </header>

      <div className="relative mt-3 h-44 overflow-hidden rounded-xl border border-cyan-300/15 bg-slate-950">
        <CameraStream streamUrl={cam.streamUrl} isPlaying={isPlaying} offline={offline} fit="cover" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(2,6,23,0.7))]" />
        {isPlaying && !offline && (
          <div className="absolute right-3 top-3 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold text-emerald-100">
            Reproduciendo
          </div>
        )}
        <div className="absolute bottom-3 left-3 text-xs text-slate-200/90">
          {offline ? "Sin senal" : isPlaying ? "Streaming activo" : "Stream en pausa"}
        </div>
      </div>

      <footer className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {offline ? `Ultima conexion: ${cam.lastSeen}` : `Latencia: ${cam.latencyMs}ms`}
        </div>

        <div className="flex gap-2">
          <IconButton
            title={isPlaying ? "Pausar" : "Reproducir"}
            onClick={onTogglePlay}
            disabled={offline}
            active={isPlaying && !offline}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </IconButton>
          <IconButton title="Pantalla completa" onClick={onOpenFullscreen} disabled={offline}>
            FULL
          </IconButton>
          {showConfigControl ? (
            <IconButton title="Configuracion" onClick={onOpenConfig}>
              CFG
            </IconButton>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
