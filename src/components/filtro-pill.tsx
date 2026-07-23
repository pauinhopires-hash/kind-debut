export function FiltroPill({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
        ativo
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-zinc-700 bg-zinc-900 text-gray-400 hover:border-orange-500/60"
      }`}
    >
      {label}
    </button>
  );
}
