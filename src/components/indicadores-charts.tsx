import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 };

export function ProdutosBarChart({ data }: { data: { nome: string; quantidade: number }[] }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis
          type="category"
          dataKey="nome"
          width={110}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 16) + "…" : v)}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="quantidade" fill="#f97316" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({
  data,
  colors,
}: {
  data: { status: string; valor: number }[];
  colors: Record<string, string>;
}) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="valor" nameKey="status" innerRadius={35} outerRadius={60}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={colors[entry.status] ?? "#71717a"} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
