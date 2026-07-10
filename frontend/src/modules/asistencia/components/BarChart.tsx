import { useState } from 'react'

export interface BarChartDatum {
  label: string
  value: number
}

interface BarChartProps {
  data: BarChartDatum[]
  height?: number
  valueFormatter?: (v: number) => string
  emptyMessage?: string
}

const PAD_L = 34
const PAD_R = 12
const PAD_T = 16
const PAD_B = 34
const BAR_MAX_THICKNESS = 24
const BAR_GAP = 2

function niceMax(max: number): number {
  if (max <= 0) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const normalized = max / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

/** Gráfica de barras de una sola serie (sin librería externa). Sigue el skill
 * dataviz: una sola tonalidad (primary), barras finas con extremo redondeado,
 * separación entre barras, ejes recesivos, tooltip al pasar el mouse/foco. */
export function BarChart({ data, height = 260, valueFormatter, emptyMessage = 'Sin datos' }: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-500"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  const width = 720
  const innerW = width - PAD_L - PAD_R
  const innerH = height - PAD_T - PAD_B
  const maxVal = niceMax(Math.max(...data.map((d) => d.value)))
  const slot = innerW / data.length
  const barW = Math.min(BAR_MAX_THICKNESS, slot - BAR_GAP)
  const y = (v: number) => PAD_T + innerH - (v / maxVal) * innerH
  const fmt = valueFormatter ?? ((v: number) => String(v))

  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal)

  // Etiquetas del eje X: si hay muchas categorías, se muestran cada N para no amontonarse.
  const labelEvery = Math.max(1, Math.ceil(data.length / 12))

  const active = activeIndex != null ? data[activeIndex] : null

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        {gridTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={width - PAD_R}
              y1={y(t)}
              y2={y(t)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={PAD_L - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500" fontSize={10}>
              {fmt(Math.round(t))}
            </text>
          </g>
        ))}
        <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={PAD_T + innerH} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={PAD_L} x2={width - PAD_R} y1={PAD_T + innerH} y2={PAD_T + innerH} stroke="#cbd5e1" strokeWidth={1} />

        {data.map((d, i) => {
          const x = PAD_L + i * slot + (slot - barW) / 2
          const barY = y(d.value)
          const barH = Math.max(0, PAD_T + innerH - barY)
          const isActive = activeIndex === i
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={barY}
                width={barW}
                height={barH}
                rx={4}
                className={isActive ? 'fill-primary-700' : 'fill-primary-600'}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${fmt(d.value)}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex((cur) => (cur === i ? null : cur))}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex((cur) => (cur === i ? null : cur))}
              />
              {i % labelEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={PAD_T + innerH + 16}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize={10}
                >
                  {d.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {active && (
        <div className="pointer-events-none absolute left-2 top-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm">
          <span className="text-slate-500">{active.label}: </span>
          <span className="font-semibold text-slate-900">{fmt(active.value)}</span>
        </div>
      )}
    </div>
  )
}
