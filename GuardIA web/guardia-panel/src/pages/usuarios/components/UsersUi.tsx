import type { AppUserStatus } from "../../../services/users";

export function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "amber" | "rose" | "cyan";
}) {
  const toneClass: Record<typeof tone, string> = {
    emerald: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-200",
    rose: "border-rose-300/25 bg-rose-400/10 text-rose-200",
    cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
  };

  return (
    <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="truncate text-xs text-slate-400">{sub}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass[tone]}`}>Live</span>
      </div>
    </article>
  );
}

export function StatusTag({ status }: { status: AppUserStatus }) {
  const cls =
    status === "Activo"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
      : status === "Inactivo"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : "border-rose-300/30 bg-rose-400/10 text-rose-200";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{status}</span>;
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export function formatAuditAction(action: string) {
  if (action === "create_user") return "Creacion de usuario";
  if (action === "update_role") return "Cambio de rol";
  if (action === "update_status") return "Cambio de estado";
  if (action === "close_sessions") return "Cierre de sesiones";
  return action;
}
