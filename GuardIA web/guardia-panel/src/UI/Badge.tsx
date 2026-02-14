export default function Badge({ status }: { status: "live" | "offline" }) {
  const cls =
    status === "live"
      ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-200"
      : "border-rose-300/35 bg-rose-400/10 text-rose-200";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-300" : "bg-rose-300"}`} />
      {status === "live" ? "EN VIVO" : "OFFLINE"}
    </span>
  );
}
