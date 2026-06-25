'use client';

// Gráficos en SVG puro, sin dependencias (la app es PWA de emergencia y el
// bundle ligero importa). Colores alineados con los tokens de globals.css.
// Theme-aware: el texto usa currentColor / var(--texto).

// Paleta categórica fija (suficiente para ~7 categorías).
export const CHART_COLORS = [
  '#15639f', // azul-600
  '#14b8a6', // teal-500
  '#f59e0b', // ambar
  '#0e4d80', // azul-700
  '#2dd4bf', // teal-400
  '#b45309', // ambar-d
  '#64748b', // slate-500
];

export interface Slice {
  label: string;
  value: number;
}

// ----------------------------------------------------------------
// Donut (torta con agujero) + leyenda. Para desgloses categóricos.
// ----------------------------------------------------------------
export function DonutChart({ data, title }: { data: Slice[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 180;
  const r = 70;
  const stroke = 28;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  if (total === 0) {
    return <p className="stats-empty">{title}: sin datos aún.</p>;
  }

  // Acumula offsets para colocar cada arco como segmento del stroke.
  let acc = 0;
  const arcs = data.map((d, i) => {
    const frac = d.value / total;
    const dash = frac * circ;
    const seg = (
      <circle
        key={d.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={CHART_COLORS[i % CHART_COLORS.length]}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-acc}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    acc += dash;
    return seg;
  });

  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="donut-wrap">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}
        >
          {arcs}
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="28"
            fontWeight="700"
            fill="var(--texto)"
          >
            {total}
          </text>
        </svg>
        <ul className="chart-legend">
          {data.map((d, i) => (
            <li key={d.label}>
              <span
                className="legend-dot"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="legend-label">{d.label}</span>
              <span className="legend-val">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export interface Series {
  label: string;
  color: string;
}

export interface BarRow {
  x: string; // etiqueta del eje X (ej. día)
  values: Record<string, number>; // por serie
}

// ----------------------------------------------------------------
// Barras verticales agrupadas. Para series temporales (ej. por día).
// Escala lineal simple; eje Y implícito por el max.
// ----------------------------------------------------------------
export function BarChart({
  rows,
  series,
  title,
}: {
  rows: BarRow[];
  series: Series[];
  title: string;
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => series.map((s) => r.values[s.label] ?? 0)),
  );
  const allZero = rows.every((r) => series.every((s) => (r.values[s.label] ?? 0) === 0));

  if (rows.length === 0 || allZero) {
    return <p className="stats-empty">{title}: sin datos aún.</p>;
  }

  const W = 720;
  const H = 220;
  const padB = 24; // espacio para etiquetas X
  const padT = 8;
  const plotH = H - padB - padT;
  const groupW = W / rows.length;
  const barW = Math.max(2, (groupW * 0.7) / series.length);

  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="bar-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title}. Máximo ${max} por día.`}
        >
          {rows.map((row, ri) => {
            const gx = ri * groupW + (groupW - barW * series.length) / 2;
            return series.map((s, si) => {
              const v = row.values[s.label] ?? 0;
              const h = (v / max) * plotH;
              return (
                <rect
                  key={`${ri}-${s.label}`}
                  x={gx + si * barW}
                  y={padT + plotH - h}
                  width={barW - 1}
                  height={h}
                  fill={s.color}
                  rx={1}
                >
                  <title>{`${row.x} · ${s.label}: ${v}`}</title>
                </rect>
              );
            });
          })}
        </svg>
        {/* Etiquetas X dispersas (primera, media, última) para no saturar. */}
        <div className="bar-xaxis" aria-hidden="true">
          <span>{rows[0]?.x}</span>
          <span>{rows[Math.floor(rows.length / 2)]?.x}</span>
          <span>{rows[rows.length - 1]?.x}</span>
        </div>
      </div>
      {series.length > 1 && (
        <ul className="chart-legend chart-legend-row">
          {series.map((s) => (
            <li key={s.label}>
              <span className="legend-dot" style={{ background: s.color }} aria-hidden="true" />
              <span className="legend-label">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
