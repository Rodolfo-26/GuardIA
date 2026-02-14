export default function PanelTransition() {
  return (
    <>
      <style>{`
        @keyframes panelOverlayFade {
          0% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes panelWipe {
          0% { transform: scaleY(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scaleY(1); opacity: 0; }
        }

        @keyframes panelPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.96); }
          50% { opacity: 0.75; transform: scale(1.03); }
        }
      `}</style>

      <div
        className="pointer-events-none fixed inset-0 z-[115] overflow-hidden bg-slate-950/60 backdrop-blur-[2px]"
        style={{ animation: "panelOverlayFade 900ms ease-out forwards" }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex items-stretch">
          {Array.from({ length: 10 }).map((_, idx) => (
            <span
              key={`wipe-${idx}`}
              className="h-full flex-1 origin-top bg-gradient-to-b from-cyan-300/20 via-cyan-300/10 to-transparent"
              style={{ animation: `panelWipe 760ms ease-out ${idx * 45}ms forwards` }}
            />
          ))}
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
          <span style={{ animation: "panelPulse 720ms ease-in-out infinite" }}>
            Sincronizando modulo
          </span>
        </div>
      </div>
    </>
  );
}
