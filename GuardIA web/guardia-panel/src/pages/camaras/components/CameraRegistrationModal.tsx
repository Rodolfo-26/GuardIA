import { useState } from "react";
import type { CameraRecord } from "../../../services/cameras";

type CameraDraft = Omit<CameraRecord, "id" | "status">;

const AI_OPTIONS = [
  "Deteccion de intrusos",
  "Reconocimiento facial",
  "Conteo de personas",
  "Zona prohibida",
  "Deteccion de vehiculos",
];

const DEFAULT_DRAFT: CameraDraft = {
  name: "",
  zone: "",
  protocol: "RTSP",
  resolution: "1080p",
  streamUrl: "",
  aiProfiles: ["Deteccion de intrusos"],
  retentionDays: 30,
};

export default function CameraRegistrationModal({
  initial,
  onClose,
  onSave,
}: {
  initial: CameraRecord | null;
  onClose: () => void;
  onSave: (draft: CameraDraft, existingId?: string) => void;
}) {
  const [draft, setDraft] = useState<CameraDraft>(() => {
    if (!initial) return DEFAULT_DRAFT;
    return {
      name: initial.name,
      zone: initial.zone,
      protocol: initial.protocol,
      resolution: initial.resolution,
      streamUrl: initial.streamUrl,
      aiProfiles: initial.aiProfiles,
      retentionDays: initial.retentionDays,
    };
  });

  function toggleAIProfile(profile: string) {
    setDraft((prev) => {
      const has = prev.aiProfiles.includes(profile);
      if (has) {
        return { ...prev, aiProfiles: prev.aiProfiles.filter((item) => item !== profile) };
      }
      return { ...prev, aiProfiles: [...prev.aiProfiles, profile] };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(draft, initial?.id);
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-cyan-300/25 bg-slate-900/95 shadow-[0_0_48px_rgba(34,211,238,0.2)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">Camera Registry</p>
            <h3 className="mt-1 text-xl font-black text-white">
              {initial ? "Editar camara" : "Registrar nueva camara"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 p-6 lg:grid-cols-[1fr_0.82fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-cyan-300/15 bg-slate-950/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">Identidad</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Nombre</span>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                    placeholder="Camara acceso norte"
                    required
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Zona</span>
                  <input
                    value={draft.zone}
                    onChange={(e) => setDraft((prev) => ({ ...prev, zone: e.target.value }))}
                    className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                    placeholder="Perimetro A"
                    required
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-300/15 bg-slate-950/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">Red y stream</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Protocolo</span>
                  <select
                    value={draft.protocol}
                    onChange={(e) => setDraft((prev) => ({ ...prev, protocol: e.target.value as CameraDraft["protocol"] }))}
                    className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                  >
                    <option>RTSP</option>
                    <option>ONVIF</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Resolucion</span>
                  <select
                    value={draft.resolution}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, resolution: e.target.value as CameraDraft["resolution"] }))
                    }
                    className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                  >
                    <option>720p</option>
                    <option>1080p</option>
                    <option>4K</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Retencion (dias)</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={draft.retentionDays}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, retentionDays: Number(e.target.value) || 1 }))
                    }
                    className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                  />
                </label>
              </div>
              <label className="mt-3 grid gap-1">
                <span className="text-xs text-slate-300">URL de stream</span>
                <input
                  value={draft.streamUrl}
                  onChange={(e) => setDraft((prev) => ({ ...prev, streamUrl: e.target.value }))}
                  className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                  placeholder="rtsp://usuario:pass@ip:554/stream1"
                  required
                />
              </label>
            </section>

            <section className="rounded-2xl border border-cyan-300/15 bg-slate-950/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">Analitica IA</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {AI_OPTIONS.map((profile) => {
                  const active = draft.aiProfiles.includes(profile);
                  return (
                    <button
                      key={profile}
                      type="button"
                      onClick={() => toggleAIProfile(profile)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100"
                          : "border-white/15 bg-white/5 text-slate-300 hover:border-cyan-300/30"
                      }`}
                    >
                      {profile}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="rounded-2xl border border-cyan-300/15 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">Resumen operativo</p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Nombre</p>
                <p className="mt-1 font-semibold text-slate-100">{draft.name || "Sin definir"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Zona</p>
                <p className="mt-1 font-semibold text-slate-100">{draft.zone || "Sin definir"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Motor IA</p>
                <p className="mt-1 font-semibold text-slate-100">{draft.aiProfiles.length} perfiles activos</p>
              </div>
              <div className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-200">Estado estimado</p>
                <p className="mt-1 font-semibold text-emerald-100">
                  {draft.streamUrl ? "Lista para validacion" : "Pendiente de URL"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950"
              >
                Guardar camara
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
