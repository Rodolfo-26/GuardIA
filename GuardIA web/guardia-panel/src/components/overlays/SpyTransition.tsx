export default function SpyTransition() {
  const transitionMs = 1800;
  const sweepMs = 1700;
  const pulseMs = 2200;
  const pingMs = 1400;
  const barsMs = 900;
  const tickCount = 12;

  return (
    <>
      <style>{`
        @keyframes scanOverlay {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes lockPulse {
          0%, 100% { transform: scale(0.92); opacity: 0.25; }
          50% { transform: scale(1.04); opacity: 0.7; }
        }

        @keyframes radarPing {
          0% { transform: scale(0.15); opacity: 0.7; }
          85% { opacity: 0.2; }
          100% { transform: scale(1); opacity: 0; }
        }

        @keyframes radarCounterSpin {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes orbitSignal {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes bars {
          0%, 100% { transform: scaleY(0.35); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        @keyframes labelFloat {
          0%, 100% { transform: translate(-50%, 0px); opacity: 0.82; }
          50% { transform: translate(-50%, 3px); opacity: 1; }
        }

        @keyframes chargeTrack {
          from { stroke-dashoffset: 678.58; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <div
        className="pointer-events-none fixed inset-0 z-[120] grid place-items-center bg-slate-950/85 backdrop-blur-sm"
        style={{ animation: `scanOverlay ${transitionMs}ms ease-out forwards` }}
        aria-hidden="true"
      >
        <div className="relative h-[390px] w-[350px]">
          <div
            className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20"
            style={{ animation: `lockPulse ${pulseMs}ms ease-in-out infinite` }}
          />

          <svg
            viewBox="0 0 240 240"
            className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-[53%] -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="none"
              stroke="rgba(34,211,238,0.35)"
              strokeWidth="6"
            />
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="none"
              stroke="rgba(34,211,238,0.12)"
              strokeWidth="12"
            />
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="none"
              stroke="rgba(34,211,238,0.95)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="678.58"
              strokeDashoffset="678.58"
              style={{ animation: `chargeTrack ${transitionMs}ms linear forwards` }}
            />
          </svg>

          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/35 bg-slate-900/85 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
            <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2 bg-cyan-200/20" />
            <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-cyan-200/20" />
            <div className="absolute inset-4 rounded-full border border-cyan-200/20" />
            <div className="absolute inset-10 rounded-full border border-cyan-200/20" />
            <div
              className="absolute inset-2 rounded-full border border-dashed border-cyan-300/20"
              style={{ animation: "radarCounterSpin 5.5s linear infinite" }}
            />

            {Array.from({ length: tickCount }).map((_, index) => (
              <span
                key={`tick-${index}`}
                className="absolute left-1/2 top-1/2 h-2.5 w-[2px] rounded-full bg-cyan-200/35"
                style={{
                  transform: `translate(-50%, -50%) rotate(${index * (360 / tickCount)}deg) translateY(-106px)`,
                }}
              />
            ))}

            <div
              className="absolute inset-0 origin-center"
              style={{ animation: `radarSweep ${sweepMs}ms linear infinite` }}
            >
              <div className="absolute left-1/2 top-1/2 h-[46%] w-[2px] -translate-x-1/2 -translate-y-full bg-cyan-300/90 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              <div className="absolute left-1/2 top-[6.5%] h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.95)]" />
            </div>

            <div
              className="absolute inset-0"
              style={{ animation: "orbitSignal 3.8s linear infinite" }}
            >
              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.95)]" style={{ transform: "translate(-50%, -94px)" }} />
            </div>

            <div className="absolute left-[68%] top-[36%] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.95)]" />
            <div className="absolute left-[67.2%] top-[35.2%] h-5 w-5 rounded-full border border-emerald-300/70" style={{ animation: `radarPing ${pingMs}ms ease-out infinite` }} />
            <div className="absolute left-[34%] top-[62%] h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
            <div className="absolute left-[33.2%] top-[61.2%] h-5 w-5 rounded-full border border-cyan-300/70" style={{ animation: `radarPing ${pingMs}ms ease-out 0.4s infinite` }} />
            <div className="absolute left-[57%] top-[74%] h-2 w-2 rounded-full bg-emerald-200 shadow-[0_0_10px_rgba(167,243,208,0.9)]" />
            <div className="absolute left-[56.3%] top-[73.3%] h-4 w-4 rounded-full border border-emerald-200/70" style={{ animation: `radarPing ${pingMs}ms ease-out 0.8s infinite` }} />

            <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/70 bg-cyan-300/30" />
          </div>

          <div className="absolute left-1/2 top-[322px] flex -translate-x-1/2 items-end gap-1">
            <span className="h-2 w-1 rounded-full bg-cyan-300/80" style={{ animation: `bars ${barsMs}ms ease-in-out infinite` }} />
            <span className="h-3 w-1 rounded-full bg-cyan-300/80" style={{ animation: `bars ${barsMs}ms ease-in-out 0.12s infinite` }} />
            <span className="h-4 w-1 rounded-full bg-cyan-300/80" style={{ animation: `bars ${barsMs}ms ease-in-out 0.24s infinite` }} />
            <span className="h-3 w-1 rounded-full bg-cyan-300/80" style={{ animation: `bars ${barsMs}ms ease-in-out 0.36s infinite` }} />
            <span className="h-2 w-1 rounded-full bg-cyan-300/80" style={{ animation: `bars ${barsMs}ms ease-in-out 0.48s infinite` }} />
          </div>

          <p
            className="absolute left-1/2 top-[356px] text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200/90"
            style={{ animation: `labelFloat ${barsMs}ms ease-in-out infinite` }}
          >
            Adquiriendo objetivo
          </p>
        </div>
      </div>
    </>
  );
}
