// 어드민 위젯 — 서버 컴포넌트로 렌더 가능한 순수 프레젠테이션.
// 차트는 의존성 없이 경량 SVG 로 구현 (docs/06 색 토큰 사용).
// DECISION: Recharts 대신 인라인 SVG (번들·의존성 최소화, 디자인 토큰 직접 적용).

const ACCENTS = ["accent", "blue", "green", "ink"] as const;
type Accent = (typeof ACCENTS)[number];

const ACCENT_BG: Record<Accent, string> = {
  accent: "bg-accent",
  blue: "bg-blue",
  green: "bg-green",
  ink: "bg-ink",
};

export function StatCard({
  label,
  value,
  sub,
  accentIndex = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accentIndex?: number;
}) {
  const accent = ACCENTS[accentIndex % ACCENTS.length];
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-pill ${ACCENT_BG[accent]}`}
          aria-hidden
        />
        <p className="text-xs font-medium uppercase tracking-wide text-faint">
          {label}
        </p>
      </div>
      <p className="tabular mt-2 text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function MiniBars({
  data,
  title,
}: {
  data: { date: string; count: number }[];
  title: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 100;
  const H = 36;
  const gap = 2;
  const barW = (W - gap * (data.length - 1)) / Math.max(1, data.length);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-faint">
        {title}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 h-24 w-full"
        preserveAspectRatio="none"
        role="img"
      >
        {data.map((d, i) => {
          const h = (d.count / max) * (H - 2);
          const x = i * (barW + gap);
          return (
            <rect
              key={d.date}
              x={x}
              y={H - h}
              width={barW}
              height={h}
              rx={1}
              fill="var(--accent)"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-faint">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-card">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-faint">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-border last:border-0">
              {r.map((cell, ci) => (
                <td key={ci} className="tabular px-4 py-3 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
