import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const packets = [
  { left: "8%", top: "15%", delay: "0s", duration: "8.5s" },
  { left: "22%", top: "70%", delay: "1.2s", duration: "10s" },
  { left: "35%", top: "35%", delay: "0.6s", duration: "9.2s" },
  { left: "49%", top: "82%", delay: "2.1s", duration: "11s" },
  { left: "62%", top: "22%", delay: "1.8s", duration: "8.8s" },
  { left: "74%", top: "58%", delay: "0.9s", duration: "9.6s" },
  { left: "87%", top: "18%", delay: "2.4s", duration: "10.6s" },
  { left: "14%", top: "46%", delay: "1.4s", duration: "9.9s" },
  { left: "56%", top: "63%", delay: "0.3s", duration: "8.9s" },
  { left: "92%", top: "78%", delay: "1.9s", duration: "10.8s" },
];

export default function Login() {
  const { login, isAuthenticated, isAuthReady } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAuthReady, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.ok) {
      navigate("/dashboard");
    } else {
      setError(result.message ?? "Credenciales incorrectas");
    }
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * 100;
    const y = ((e.clientY - bounds.top) / bounds.height) * 100;

    setPointer({ x, y });
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 sm:px-6 lg:px-8"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPointer({ x: 50, y: 50 })}
    >
      <style>{`
        @keyframes guardiaScanX {
          0% { transform: translateX(-40vw); opacity: 0; }
          10% { opacity: 0.55; }
          50% { opacity: 0.35; }
          90% { opacity: 0.55; }
          100% { transform: translateX(140vw); opacity: 0; }
        }

        @keyframes guardiaScanY {
          0% { transform: translateY(-30%); opacity: 0; }
          18% { opacity: 0.35; }
          50% { opacity: 0.2; }
          82% { opacity: 0.35; }
          100% { transform: translateY(130%); opacity: 0; }
        }

        @keyframes guardiaGridShift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(34px, 34px, 0); }
        }

        @keyframes guardiaPulse {
          0%, 100% { transform: scale(0.85); opacity: 0.25; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }

        @keyframes guardiaOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes guardiaPacket {
          0% { transform: translateY(0px) scale(0.8); opacity: 0; }
          10% { opacity: 0.6; }
          50% { transform: translateY(-18px) scale(1); opacity: 0.8; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-30px) scale(0.72); opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),transparent_38%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.13),transparent_33%)]" />

        <div
          className="absolute inset-0 transition-[background] duration-200"
          style={{
            background: `radial-gradient(560px circle at ${pointer.x}% ${pointer.y}%, rgba(56,189,248,0.24), rgba(8,47,73,0.24) 35%, transparent 62%)`,
          }}
        />

        <div
          className="absolute h-72 w-72 rounded-full border border-cyan-300/30"
          style={{
            left: `calc(${pointer.x}% - 9rem)`,
            top: `calc(${pointer.y}% - 9rem)`,
            boxShadow: "0 0 45px rgba(34,211,238,0.22)",
            transition: "left 140ms linear, top 140ms linear",
          }}
        >
          <div
            className="absolute inset-2 rounded-full border border-emerald-300/20"
            style={{ animation: "guardiaOrbit 6s linear infinite" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300" />
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden">
          {packets.map((packet, index) => (
            <span
              key={`${packet.left}-${index}`}
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200"
              style={{
                left: packet.left,
                top: packet.top,
                animation: `guardiaPacket ${packet.duration} ease-in-out ${packet.delay} infinite`,
                boxShadow: "0 0 14px rgba(103,232,249,0.8)",
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-[34vw] min-w-[220px] bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent blur-sm"
            style={{ animation: "guardiaScanX 7.5s linear infinite" }}
          />
          <div
            className="absolute -top-1/4 inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-emerald-300/20 to-transparent blur-sm"
            style={{ animation: "guardiaScanY 9.2s linear infinite" }}
          />
        </div>

        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:34px_34px]"
          style={{ animation: "guardiaGridShift 14s linear infinite" }}
        />

        <div
          className="absolute right-[12%] top-[22%] h-2 w-2 rounded-full bg-cyan-300"
          style={{ animation: "guardiaPulse 2.5s ease-in-out infinite" }}
        />
        <div
          className="absolute left-[16%] bottom-[25%] h-2 w-2 rounded-full bg-emerald-300"
          style={{ animation: "guardiaPulse 3.1s ease-in-out infinite" }}
        />
      </div>

      <div className="relative z-20 mx-auto w-full max-w-6xl">
        <section className="relative z-30 mx-auto w-full max-w-md rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-7 shadow-[0_20px_70px_rgba(8,47,73,0.6)] backdrop-blur md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                Secure Access
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">GuardIA Panel</h2>
            </div>
            <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-3">
              <div className="h-6 w-6 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
            </div>
          </div>

          <p className="mb-6 text-sm text-slate-300">
            Inicia sesion para continuar con el monitoreo inteligente.
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Correo
              </span>
              <input
                type="email"
                placeholder="correo@empresa.com"
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Contrasena
              </span>
              <input
                type="password"
                placeholder="Ingresa tu contrasena"
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-center text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Validando..." : "Iniciar sesion segura"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}




