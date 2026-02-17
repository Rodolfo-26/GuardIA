import { useState } from "react";
import type { AppUserRole, AppUserStatus } from "../../../services/users";

export default function CreateUserModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: {
    fullName: string;
    email: string;
    password: string;
    role: AppUserRole;
    status: AppUserStatus;
    site: string;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<AppUserRole>("Operador");
  const [status, setStatus] = useState<AppUserStatus>("Activo");
  const [site, setSite] = useState("Sede Principal");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    setIsSaving(true);
    try {
      await onCreate({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        status,
        site: site.trim(),
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const message =
        raw.includes("permission-denied") || raw.includes("PERMISSION_DENIED")
          ? "No tienes permisos para crear usuarios. Requiere rol Admin."
          : raw.includes("already-exists") || raw.includes("email-already-in-use")
            ? "Ese correo ya existe en Firebase Auth."
            : raw || "No se pudo registrar el usuario.";
      setError(message);
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-cyan-300/25 bg-slate-900/95 shadow-[0_0_48px_rgba(34,211,238,0.2)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">User Registry</p>
            <h3 className="mt-1 text-xl font-black text-white">Registrar nuevo usuario</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Nombre completo</span>
              <input
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre y apellido"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Correo</span>
              <input
                type="email"
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@guardia.com"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Rol</span>
              <select
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={role}
                onChange={(e) => setRole(e.target.value as AppUserRole)}
              >
                <option value="Operador">Operador</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Admin">Admin</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Estado</span>
              <select
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={status}
                onChange={(e) => setStatus(e.target.value as AppUserStatus)}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Contrasena inicial</span>
              <input
                type="password"
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-slate-300">Confirmar contrasena</span>
              <input
                type="password"
                className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contrasena"
                required
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs text-slate-300">Sede/Zona</span>
            <input
              className="rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Sede Principal"
              required
            />
          </label>

          <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Este registro crea la cuenta en Firebase Auth y su perfil operativo en Firestore.
          </p>

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
              disabled={isSaving}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Guardando..." : "Registrar usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
