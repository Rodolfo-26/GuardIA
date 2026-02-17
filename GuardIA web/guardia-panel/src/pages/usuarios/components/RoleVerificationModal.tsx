import { useState } from "react";
import type { AppUserRole } from "../../../services/users";

export default function RoleVerificationModal({
  targetName,
  nextRole,
  onClose,
  onConfirm,
}: {
  targetName: string;
  nextRole: AppUserRole;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar la operacion.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-cyan-300/25 bg-slate-900/95 shadow-[0_0_48px_rgba(34,211,238,0.2)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">Verificacion admin</p>
            <h3 className="mt-1 text-xl font-black text-white">Confirmar cambio de rol</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-6">
          <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Vas a cambiar el rol de <span className="font-semibold">{targetName}</span> a{" "}
            <span className="font-semibold">{nextRole}</span>. Ingresa tu contrasena para continuar.
          </p>

          <label className="grid gap-1">
            <span className="text-xs text-slate-300">Contrasena de administrador</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
              placeholder="Ingresa tu contrasena"
              required
            />
          </label>

          {error && <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Verificando..." : "Confirmar cambio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
