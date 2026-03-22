import { useEffect, useMemo, useState } from "react";
import { fetchResidents, type ResidentRecord, type ResidentStatus } from "../services/residents";

function StatusChip({ value }: { value: ResidentStatus }) {
  const cls =
    value === "Activo"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
      : value === "Moroso"
        ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
        : value === "Visitante"
          ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
          : "border-slate-500/30 bg-slate-400/10 text-slate-300";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{value}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export default function ResidentsPage() {
  const [items, setItems] = useState<ResidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResidentStatus | "Todos">("Todos");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchResidents();
        if (!cancelled) setItems(response);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar los residentes.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((resident) => {
      const matchesQuery =
        !normalized ||
        resident.fullName.toLowerCase().includes(normalized) ||
        resident.email.toLowerCase().includes(normalized) ||
        resident.unit.toLowerCase().includes(normalized) ||
        resident.phone.toLowerCase().includes(normalized);

      const matchesStatus = statusFilter === "Todos" || resident.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;
  const counters = useMemo(
    () =>
      items.reduce(
        (acc, resident) => {
          if (resident.status === "Activo") acc.active += 1;
          if (resident.status === "Moroso") acc.debt += 1;
          if (resident.status === "Visitante") acc.visits += 1;
          return acc;
        },
        { active: 0, debt: 0, visits: 0 },
      ),
    [items],
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">Residentes activos</p>
          <p className="mt-3 text-3xl font-black text-white">{counters.active}</p>
        </article>
        <article className="rounded-2xl border border-rose-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.16em] text-rose-200/80">Morosos</p>
          <p className="mt-3 text-3xl font-black text-white">{counters.debt}</p>
        </article>
        <article className="rounded-2xl border border-amber-300/20 bg-slate-900/70 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Visitantes registrados</p>
          <p className="mt-3 text-3xl font-black text-white">{counters.visits}</p>
        </article>
      </div>

      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto]">
          <input
            className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="Buscar por nombre, correo, telefono o unidad..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <select
            className="rounded-xl border border-cyan-300/20 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ResidentStatus | "Todos")}
          >
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Moroso">Moroso</option>
            <option value="Visitante">Visitante</option>
          </select>

          <div className="inline-flex items-center justify-center rounded-xl border border-cyan-300/20 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-cyan-100">
            {filtered.length} registros
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-6 text-sm text-slate-300 backdrop-blur">
          Cargando residentes de la comunidad...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Padron de residentes</h3>
            <div className="mt-4 space-y-2">
              {filtered.length ? (
                filtered.map((resident) => {
                  const isActive = resident.id === selectedId;
                  return (
                    <button
                      key={resident.id}
                      type="button"
                      onClick={() => setSelectedId(resident.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isActive
                          ? "border-cyan-300/45 bg-cyan-400/10"
                          : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">{resident.fullName}</p>
                        <StatusChip value={resident.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{resident.unit}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">{resident.phone}</p>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                  No hay residentes con esos filtros.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-4 backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">Ficha residente</h3>

            {selected ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-cyan-300/20 bg-[radial-gradient(circle_at_25%_30%,rgba(56,189,248,0.25),transparent_45%),linear-gradient(120deg,rgba(15,23,42,0.96),rgba(8,47,73,0.86),rgba(6,95,70,0.8))] p-4">
                  <p className="text-xl font-black text-white">{selected.fullName}</p>
                  <p className="mt-1 text-sm text-slate-200">{selected.community}</p>
                </div>

                <div className="grid gap-2">
                  <DetailRow label="Estado" value={selected.status} />
                  <DetailRow label="Unidad" value={selected.unit} />
                  <DetailRow label="Correo" value={selected.email} />
                  <DetailRow label="Telefono" value={selected.phone} />
                  <DetailRow label="Referencia" value={selected.accessReference} />
                  <DetailRow label="Notas" value={selected.notes} />
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                No hay residente seleccionado.
              </p>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
