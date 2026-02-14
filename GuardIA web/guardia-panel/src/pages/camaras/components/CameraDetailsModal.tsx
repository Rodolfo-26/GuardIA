import type { CameraRecord } from "./CameraRegistrationModal";

export default function CameraDetailsModal({
  camera,
  onClose,
  onConfigure,
}: {
  camera: CameraRecord | null;
  onClose: () => void;
  onConfigure: (camera: CameraRecord) => void;
}) {
  if (!camera) return null;

  return (
    <div className="fixed inset-0 z-[142] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-300/25 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">Detalle de camara</p>
            <h3 className="mt-1 text-2xl font-black text-white">{camera.name}</h3>
            <p className="text-sm text-slate-300">{camera.zone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailField label="Estado" value={camera.status.toUpperCase()} />
          <DetailField label="Protocolo" value={camera.protocol} />
          <DetailField label="Resolucion" value={camera.resolution} />
          <DetailField label="Retencion" value={`${camera.retentionDays} dias`} />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/65 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">URL de stream</p>
          <p className="mt-1 break-all text-xs text-slate-200">{camera.streamUrl}</p>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/65 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Perfiles IA</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {camera.aiProfiles.map((profile) => (
              <span
                key={profile}
                className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100"
              >
                {profile}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfigure(camera)}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950"
          >
            Configurar camara
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
