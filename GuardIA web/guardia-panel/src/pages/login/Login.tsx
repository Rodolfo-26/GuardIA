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
  const {
    login,
    beginEmailSecondFactor,
    verifyEmailSecondFactor,
    sendResetPassword,
    logout,
    user,
    isAuthenticated,
    isAuthReady,
    isSecondFactorVerified,
  } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"credentials" | "otp" | "recovery">("credentials");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState<"idle" | "sent">("idle");
  const [otpDebugCode, setOtpDebugCode] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  function getSecondFactorPendingKey(uid: string) {
    return `guardia-email-2fa-pending:${uid}`;
  }

  const stepMeta = {
    credentials: {
      eyebrow: "Secure Access",
      title: "GuardIA Panel",
      description: "Inicia sesion para continuar con el monitoreo inteligente.",
      accent: "Acceso primario",
      progress: "34%",
    },
    recovery: {
      eyebrow: "Recovery Protocol",
      title: "Recuperar acceso",
      description: "Restablece tu contrasena desde un flujo guiado y seguro.",
      accent: "Recuperacion activa",
      progress: "68%",
    },
    otp: {
      eyebrow: "Second Factor",
      title: "Validacion por correo",
      description: "Confirma tu identidad con el codigo temporal enviado al correo registrado.",
      accent: "Verificacion final",
      progress: "100%",
    },
  }[step];

  useEffect(() => {
    const savedEmail = window.localStorage.getItem("guardia-remember-email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthReady && isAuthenticated && isSecondFactorVerified) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAuthReady, isSecondFactorVerified, navigate]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user) return;
    if (isSecondFactorVerified) return;

    const hasPendingChallenge =
      window.sessionStorage.getItem(getSecondFactorPendingKey(user.uid)) === "pending";

    if (hasPendingChallenge) {
      setStep("otp");
      return;
    }

    setStep("credentials");
    void logout();
  }, [isAuthenticated, isAuthReady, isSecondFactorVerified, logout, user]);

  useEffect(() => {
    if (!otpExpiresIn) return;
    const timer = window.setTimeout(() => setOtpExpiresIn((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpExpiresIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.ok) {
      if (rememberMe) {
        window.localStorage.setItem("guardia-remember-email", email.trim());
      } else {
        window.localStorage.removeItem("guardia-remember-email");
      }

      const otpResult = await beginEmailSecondFactor();
      setIsSubmitting(false);

      if (!otpResult.ok) {
        if (result.uid) {
          window.sessionStorage.removeItem(getSecondFactorPendingKey(result.uid));
        }
        setError(otpResult.message ?? "No se pudo enviar el codigo de verificacion.");
        return;
      }

      setOtpDebugCode(otpResult.debugCode ?? "");
      setOtpExpiresIn(otpResult.expiresInSeconds ?? 300);
      setInfo(otpResult.message ?? "Te enviamos un codigo al correo registrado.");
      setStep("otp");
    } else {
      setIsSubmitting(false);
      setError(result.message ?? "Credenciales incorrectas");
    }
  }

  async function handleForgotPassword() {
    setError("");
    setInfo("");
    setRecoveryStatus("idle");
    setStep("recovery");
  }

  async function handleSendRecovery(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);
    const result = await sendResetPassword(email);
    setIsSubmitting(false);
    if (result.ok) {
      setInfo(result.message ?? "Correo de recuperacion enviado.");
      setRecoveryStatus("sent");
      return;
    }
    setError(result.message ?? "No fue posible recuperar la cuenta.");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);
    const result = await verifyEmailSecondFactor(otpCode.trim());
    setIsSubmitting(false);
    if (result.ok) {
      const currentUser = user;
      if (currentUser) {
        window.sessionStorage.removeItem(getSecondFactorPendingKey(currentUser.uid));
      }
      navigate("/dashboard", { replace: true });
      return;
    }
    setError(result.message ?? "No se pudo validar el codigo.");
  }

  async function handleResendOtp() {
    setError("");
    setInfo("");
    setIsSubmitting(true);
    const result = await beginEmailSecondFactor();
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "No se pudo reenviar el codigo.");
      return;
    }
    setOtpDebugCode(result.debugCode ?? "");
    setOtpExpiresIn(result.expiresInSeconds ?? 300);
    setInfo(result.message ?? "Te enviamos un nuevo codigo.");
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * 100;
    const y = ((e.clientY - bounds.top) / bounds.height) * 100;

    setPointer({ x, y });
  }

  return (
    <div
      className="relative flex h-screen items-center overflow-hidden bg-slate-950 px-4 py-4 sm:px-6 lg:px-8"
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

        @keyframes guardiaPanelEnter {
          0% { opacity: 0; transform: translateY(10px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes guardiaProgressPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(34,211,238,0.18); }
          50% { box-shadow: 0 0 18px rgba(34,211,238,0.3); }
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
        <section
          className="relative z-30 mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-6 shadow-[0_20px_70px_rgba(8,47,73,0.6)] backdrop-blur md:p-7"
          style={{ animation: "guardiaPanelEnter 420ms ease-out" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">{stepMeta.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black text-white">{stepMeta.title}</h2>
            </div>
            <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-3 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
              <div className="h-6 w-6 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-300">{stepMeta.description}</p>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                {stepMeta.accent}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all duration-500"
                style={{
                  width: stepMeta.progress,
                  animation: "guardiaProgressPulse 2.8s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          <div className="relative overflow-hidden">
          {step === "credentials" ? (
          <form key="credentials" onSubmit={handleSubmit} className="grid gap-4 transition-all duration-300">
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
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/80 transition focus-within:border-cyan-300 focus-within:ring-2 focus-within:ring-cyan-400/30">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingresa tu contrasena"
                  className="w-full rounded-l-xl bg-transparent px-4 py-3 text-slate-100 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="mr-2 rounded-lg px-2.5 py-2 text-cyan-200 transition hover:bg-white/5 hover:text-white"
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  title={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPassword ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                      <path d="M3 3l18 18" strokeLinecap="round" />
                      <path
                        d="M10.6 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.5 5.4A10.9 10.9 0 0 1 12 5c5.2 0 8.7 4.4 9.7 6-.5.9-1.7 2.6-3.7 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.2 6.2C3.9 7.7 2.5 9.8 2 11c1 1.6 4.5 6 10 6 1.4 0 2.6-.3 3.7-.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                      <path
                        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-950 text-cyan-400 focus:ring-cyan-400/40"
                />
                Recuérdame
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-semibold text-cyan-200 transition hover:text-white"
              >
                Olvide mi contrasena
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-center text-sm text-rose-200">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-200">
                {info}
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
          ) : step === "recovery" ? (
          <form key="recovery" onSubmit={handleSendRecovery} className="grid gap-4 transition-all duration-300">
            <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Recuperacion de acceso</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Enviaremos un enlace seguro para restablecer tu contrasena.
                  </p>
                </div>
                <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                  Cuenta protegida
                </span>
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Correo registrado
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

            {recoveryStatus === "sent" ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-200">Enlace enviado</p>
                <p className="mt-1 text-sm text-emerald-100/90">
                  Revisa tu bandeja de entrada y tambien spam. Cuando termines, vuelve para iniciar sesion.
                </p>
              </div>
            ) : null}

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-center text-sm text-rose-200">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-200">
                {info}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setRecoveryStatus("idle");
                  setError("");
                  setInfo("");
                }}
                className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Volver al acceso
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Enviando..." : "Enviar enlace seguro"}
              </button>
            </div>
          </form>
          ) : (
          <form key="otp" onSubmit={handleVerifyOtp} className="grid gap-4 transition-all duration-300">
            <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Segundo factor por correo</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  Expira en {Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, "0")}
                </span>
              </div>
              {otpDebugCode ? (
                <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  Debug: {otpDebugCode}
                </div>
              ) : null}
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Codigo de acceso
              </span>
              <input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-center text-sm text-rose-200">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-200">
                {info}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    window.sessionStorage.removeItem(getSecondFactorPendingKey(user.uid));
                  }
                  void logout();
                  setStep("credentials");
                  setOtpCode("");
                  setError("");
                  setInfo("");
                }}
                disabled={isSubmitting}
                className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting}
                className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Reenviar codigo
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Verificando..." : "Validar acceso"}
            </button>
          </form>
          )}
          </div>
        </section>
      </div>
    </div>
  );
}




