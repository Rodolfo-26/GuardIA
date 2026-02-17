import { useState } from "react";
import type { Camera } from "./VideoTile";

export default function CameraConfigModal({
  camera,
  onClose,
  onSave,
}: {
  camera: Camera | null;
  onClose: () => void;
  onSave: (patch: Pick<Camera, "recording" | "sensitivity" | "status" | "streamUrl">) => void;
}) {
  const [recording, setRecording] = useState(camera?.recording ?? true);
  const [sensitivity, setSensitivity] = useState(camera?.sensitivity ?? 60);
  const [status, setStatus] = useState<Camera["status"]>(camera?.status ?? "live");
  const [streamUrl, setStreamUrl] = useState(camera?.streamUrl ?? "");

  if (!camera) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ recording, sensitivity, status, streamUrl: streamUrl.trim() });
  }

  return (
    <div className="fixed inset-0 z-[146] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-cyan-300/25 bg-slate-900/95 p-5 shadow-[0_0_42px_rgba(34,211,238,0.22)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">Config rapida</p>
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

        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
            Grabacion continua
            <input
              type="checkbox"
              checked={recording}
              onChange={(e) => setRecording(e.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <label className="grid gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-3">
            <span className="text-sm text-slate-200">Sensibilidad IA: {sensitivity}%</span>
            <input
              type="range"
              min={10}
              max={100}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
            />
          </label>

          <label className="grid gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-3">
            <span className="text-sm text-slate-200">Estado operativo</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Camera["status"])}
              className="rounded-lg border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="live">En vivo</option>
              <option value="offline">Offline</option>
            </select>
          </label>

          <label className="grid gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-3">
            <span className="text-sm text-slate-200">URL de stream</span>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="http://admin:admin@192.168.100.145:8081/video"
              className="rounded-lg border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>

        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
