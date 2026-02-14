export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <style>{`
        @keyframes placeholderPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.92); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }

        @keyframes placeholderSweep {
          0% { transform: translateX(-30%); opacity: 0; }
          25% { opacity: 0.45; }
          100% { transform: translateX(140%); opacity: 0; }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-6 text-slate-200 backdrop-blur">
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent"
          style={{ animation: "placeholderSweep 4.3s linear infinite" }}
        />
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">Modulo</p>
        <p className="mt-2 text-xl font-black text-white">{title}</p>
        <p className="mt-2 text-sm text-slate-300">Pantalla en construccion con estilo GuardIA.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-300" style={{ animation: "placeholderPulse 1.4s ease-in-out infinite" }} />
          Preparando modulos
        </div>
      </div>
    </>
  );
}
