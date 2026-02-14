import type { ReactNode } from "react";

export default function IconButton({
  children,
  title,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold tracking-wide transition ${
        disabled
          ? "cursor-not-allowed border-slate-700/60 bg-slate-900/70 text-slate-500"
          : active
            ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
            : "border-cyan-300/20 bg-slate-950/85 text-cyan-100 hover:border-cyan-300/45 hover:bg-cyan-400/10"
      }`}
    >
      {children}
    </button>
  );
}
