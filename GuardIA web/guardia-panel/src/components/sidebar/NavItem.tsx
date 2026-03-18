import { NavLink } from "react-router-dom";

export default function NavItem({
  label,
  to,
  compact = false,
}: {
  label: string;
  to: string;
  compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative block overflow-hidden rounded-xl font-semibold transition ${
          isActive
            ? "border border-cyan-300/35 bg-cyan-400/15 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            : "border border-transparent text-slate-300 hover:border-cyan-400/20 hover:bg-white/5 hover:text-white"
        } ${compact ? "px-2 py-3 text-center text-[11px]" : "px-3 py-2.5 text-sm"}`
      }
    >
      {({ isActive }) => (
        <>
          <span
            title={compact ? label : undefined}
            className={`relative z-10 block truncate ${compact ? "mx-auto w-fit text-center" : ""}`}
          >
            {compact ? label.charAt(0) : label}
          </span>
          <span
            className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-300 to-emerald-300 transition ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}
    </NavLink>
  );
}
