import { useState, type MouseEvent } from "react";

export default function WelcomeOverlay({ onEnter }: { onEnter: () => void }) {
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  function handlePointerMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPointer({ x, y });
  }

  const irisOffsetX = ((pointer.x - 50) / 50) * 10;
  const irisOffsetY = ((pointer.y - 50) / 50) * 6;

  return (
    <>
      <style>{`
        @keyframes guardiaWelcomePulse {
          0%, 100% { opacity: 0.25; transform: scale(0.92); }
          50% { opacity: 0.55; transform: scale(1.06); }
        }

        @keyframes guardiaWelcomeSweep {
          0% { transform: translateX(-35%); opacity: 0; }
          15% { opacity: 0.5; }
          85% { opacity: 0.35; }
          100% { transform: translateX(135%); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[150] overflow-hidden bg-slate-950 px-4 py-8 text-slate-100"
        onMouseMove={handlePointerMove}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(420px circle at ${pointer.x}% ${pointer.y}%, rgba(56,189,248,0.22), transparent 56%)`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
          <div
            className="absolute inset-y-0 left-0 w-[34vw] min-w-[220px] bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent blur-sm"
            style={{ animation: "guardiaWelcomeSweep 7.5s linear infinite" }}
          />
        </div>

        <div className="relative mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
          <div className="w-full rounded-3xl border border-cyan-300/20 bg-slate-900/75 p-7 shadow-[0_0_45px_rgba(6,182,212,0.22)] backdrop-blur md:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">GuardIA Boot Sequence</p>
                <h1 className="mt-3 text-4xl font-black leading-tight text-white">
                  Bienvenido al centro de vigilancia inteligente
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
                  Supervisa amenazas, analiza eventos y coordina respuesta operativa con apoyo de IA en tiempo real.
                </p>

                <button
                  type="button"
                  onClick={onEnter}
                  className="mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110"
                >
                  Ingresar al sistema
                </button>
              </section>

              <section className="relative flex justify-center">
                <div
                  className="absolute h-56 w-56 rounded-full border border-cyan-300/25"
                  style={{ animation: "guardiaWelcomePulse 2.2s ease-in-out infinite" }}
                />
                <div className="relative h-36 w-72">
                  <svg
                    viewBox="0 0 260 130"
                    className="h-full w-full drop-shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 65C35 28 76 12 130 12C184 12 225 28 250 65C225 102 184 118 130 118C76 118 35 102 10 65Z"
                      fill="rgba(241,245,249,0.96)"
                      stroke="rgba(103,232,249,0.7)"
                      strokeWidth="3"
                    />
                    <path
                      d="M10 65C35 28 76 12 130 12C184 12 225 28 250 65"
                      stroke="rgba(8,47,73,0.5)"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10 65C35 102 76 118 130 118C184 118 225 102 250 65"
                      stroke="rgba(8,47,73,0.5)"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div
                    className="absolute left-1/2 top-1/2 h-16 w-16 rounded-full border border-cyan-500/70 bg-cyan-300 shadow-[0_0_26px_rgba(103,232,249,0.9)]"
                    style={{ transform: `translate(-50%, -50%) translate(${irisOffsetX}px, ${irisOffsetY}px)` }}
                  >
                    <div className="absolute inset-1 rounded-full border border-cyan-50/45" />
                    <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
                    <div className="absolute left-[62%] top-[34%] h-2 w-2 rounded-full bg-cyan-50/95" />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
