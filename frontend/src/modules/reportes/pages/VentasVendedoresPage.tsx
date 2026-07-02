import { useEffect, useMemo, useState } from 'react'
import { PageLoading } from '@/shared/components'
import { useVentasVendedores } from '../hooks/useReportes'
import { useVentasVendedorPedidos } from '../hooks/useReportes'
import { useTopClientesProductosAcumulado } from '../hooks/useTopAcumulado'
import { reportesService } from '../services/reportes.service'

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCOP(valuePesos: number): string {
  return copFormatter.format(valuePesos || 0)
}

function formatCOPAxisMillions(valuePesos: number): string {
  const m = (valuePesos || 0) / 1_000_000
  return `${m.toFixed(0)} M`
}

function cumulative(values: number[]): number[] {
  let acc = 0
  return values.map((v) => {
    acc += v || 0
    return acc
  })
}

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
}

function colorForIndex(i: number): string {
  const palette = [
    '#0ea5e9', // sky
    '#22c55e', // green
    '#f97316', // orange
    '#a855f7', // purple
    '#ef4444', // red
    '#14b8a6', // teal
    '#eab308', // amber
    '#6366f1', // indigo
  ]
  return palette[i % palette.length]
}

type Serie = { key: string; label: string; values: number[]; color: string }

type VendorSummary = {
  usuario_id: number
  nombre: string
  total_mes: number
}

export function VentasVendedoresPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [acumYear, setAcumYear] = useState(now.getFullYear())
  const [acumMonths, setAcumMonths] = useState<number[]>([now.getMonth() + 1])
  const [isPrinting, setIsPrinting] = useState(false)
  const [activeVendorId, setActiveVendorId] = useState<number | null>(null)
  const [pinnedVendorId, setPinnedVendorId] = useState<number | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useVentasVendedores({ year, month })
  const {
    data: topAcum,
    isLoading: loadingTopAcum,
    error: errorTopAcum,
    refetch: refetchTopAcum,
    isFetching: fetchingTopAcum,
  } = useTopClientesProductosAcumulado({ year: acumYear, months: acumMonths })

  const series: Serie[] = useMemo(() => {
    if (!data) return []
    const base = data.series || []
    return base.map((s, idx) => ({
      ...s,
      values: cumulative(s.values || []),
      color: s.key === 'total' ? '#0f172a' : colorForIndex(idx - 1),
    }))
  }, [data])

  const activeVendor = useMemo(() => {
    if (!data || activeVendorId == null) return null
    return data.vendedores.find((v) => v.usuario_id === activeVendorId) || null
  }, [data, activeVendorId])

  const detailsVendorId = pinnedVendorId ?? activeVendorId
  const { data: vendorPedidos, isFetching: fetchingVendorPedidos } = useVentasVendedorPedidos({
    year,
    month,
    usuarioId: detailsVendorId,
  })

  useEffect(() => {
    setActiveVendorId(null)
    setPinnedVendorId(null)
  }, [year, month])

  const colorByKey = useMemo(() => {
    const map: Record<string, string> = {}
    series.forEach((s) => {
      map[s.key] = s.color
    })
    return map
  }, [series])

  const openVendor = (vendor: VendorSummary) => {
    setActiveVendorId(vendor.usuario_id)
  }

  const togglePinnedVendor = (vendor: VendorSummary) => {
    setPinnedVendorId((current) => {
      if (current === vendor.usuario_id) {
        setActiveVendorId(null)
        return null
      }
      setActiveVendorId(vendor.usuario_id)
      return vendor.usuario_id
    })
  }

  const closeVendor = () => {
    setPinnedVendorId(null)
    setActiveVendorId(null)
  }

  const maxY = useMemo(() => {
    if (!series.length) return 0
    let m = 0
    for (const s of series) {
      for (const v of s.values) m = Math.max(m, v || 0)
    }
    return m
  }, [series])

  const chart = useMemo(() => {
    if (!data || data.days.length === 0) return null
    const w = 860
    const h = 340
    const padL = 46
    const padR = 16
    const padT = 12
    const padB = 34
    const innerW = w - padL - padR
    const innerH = h - padT - padB
    const days = data.days
    const n = days.length
    const yMax = maxY || 1

    const x = (idx: number) => padL + (idx / Math.max(1, n - 1)) * innerW
    const y = (val: number) => padT + (1 - val / yMax) * innerH

    const gridLines = 4
    const yTicks = Array.from({ length: gridLines + 1 }, (_, i) => (yMax * i) / gridLines)

    const dayLabelEvery = n >= 28 ? 4 : n >= 20 ? 3 : 2

    const polylineFor = (values: number[]) => {
      return values
        .map((v, idx) => `${x(idx).toFixed(2)},${y(v || 0).toFixed(2)}`)
        .join(' ')
    }

    const areaPathFor = (values: number[]) => {
      const pts = values.map((v, idx) => `${x(idx).toFixed(2)},${y(v || 0).toFixed(2)}`).join(' ')
      const x0 = x(0).toFixed(2)
      const xN = x(n - 1).toFixed(2)
      const yBase = (padT + innerH).toFixed(2)
      return `M ${x0} ${yBase} L ${pts} L ${xN} ${yBase} Z`
    }

    return (
      <div className="h-[360px] w-full">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full rounded-lg border border-slate-200 bg-white"
        >
          {/* grid + y labels */}
          {yTicks.map((t) => {
            const yy = y(t)
            return (
              <g key={t}>
                <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {formatCOPAxisMillions(t)}
                </text>
              </g>
            )
          })}

          {/* x labels */}
          {days.map((d, idx) => {
            if (idx % dayLabelEvery !== 0 && idx !== n - 1) return null
            return (
              <text key={d} x={x(idx)} y={h - 12} textAnchor="middle" fontSize="10" fill="#64748b">
                {d}
              </text>
            )
          })}

          {/* areas (shaded) */}
          {series.map((s) => (
            <path
              key={`${s.key}-area`}
              d={areaPathFor(s.values)}
              fill={s.color}
              opacity={s.key === 'total' ? 0.10 : 0.06}
            />
          ))}

          {/* lines */}
          {series.map((s) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={s.key === 'total' ? 3 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={polylineFor(s.values)}
              opacity={s.key === 'total' ? 0.95 : 0.85}
            />
          ))}
        </svg>
      </div>
    )
  }, [data, series, maxY])

  const handlePrint = async () => {
    if (!data || isPrinting || acumMonths.length === 0) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

    const fmtInt = (n: number) => (n || 0).toLocaleString('es-CO')
    const fmtQty = (n: number) => (n || 0).toLocaleString('es-CO')

    setIsPrinting(true)

    try {
      const topAcumFull = await reportesService.topClientesProductosAcumuladoCompleto({
        year: acumYear,
        months: acumMonths,
      })

      const headerLines = [
        'REPORTE ACUMULADO (solo texto)',
        `Generado: ${new Date().toLocaleString('es-CO')}`,
        `Año: ${topAcumFull.year}`,
        `Meses: ${topAcumFull.months.join(', ')}`,
        '',
      ]

      const clientesLines = [
        `CLIENTES (total: ${fmtInt(topAcumFull.top_clientes.length)})`,
        ...topAcumFull.top_clientes.map((c, idx) => `${idx + 1}. ${c.nombre} — ${formatCOP(c.total)}`),
        '',
      ]

      const productosLines = [
        `PRODUCTOS (total: ${fmtInt(topAcumFull.top_productos.length)})`,
        ...topAcumFull.top_productos.map((p, idx) => {
          const mat = p.material ? ` (${p.material})` : ''
          return `${idx + 1}. ${p.referencia}${mat} — ${fmtQty(p.cantidad)}`
        }),
        '',
      ]

      const text = [...headerLines, ...clientesLines, ...productosLines].join('\n')

      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Reporte</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 11px; color: #0f172a; }
      pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(text)}</pre>
  </body>
</html>`

      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 150)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gráficas</h1>
          <p className="text-sm text-slate-600">
            Ventas por vendedor (solo pedidos en estado <span className="font-medium">enviado</span>).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="block text-xs font-medium uppercase text-slate-500">Año</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
              className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-slate-500">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2020, m - 1, 1).toLocaleDateString('es-CO', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            disabled={isFetching}
          >
            {isFetching ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>
  
      {isLoading ? (
        <PageLoading />
      ) : error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Error al cargar reporte'}
        </div>
      ) : !data ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No hay datos.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Ventas acumuladas por día — {monthLabel(data.year, data.month)}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  Promedio días de envío:{' '}
                  <span className="font-semibold">
                    {data.avg_dias_envio != null ? `${data.avg_dias_envio.toFixed(1)} días` : 'N/D'}
                  </span>
                </div>
                <div className="text-sm text-slate-700">
                  Total mes:{' '}
                  <span className="font-semibold">{formatCOP(data.total_mes)}</span>
                </div>
              </div>
            </div>
            {chart}
            <p className="text-xs text-slate-500">
              Eje Y en millones de pesos colombianos (COP). Resumen en COP completo.
            </p>
          </div>
  
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Resumen por vendedor</h3>
            <p className="mt-1 text-xs text-slate-500">Pasa el mouse o haz clic para ver sus pedidos enviados del mes.</p>
            <div className="relative mt-3">
              <div className="space-y-2 md:pr-[392px]">
                {data.vendedores.length === 0 ? (
                  <p className="text-sm text-slate-600">Sin ventas en el mes.</p>
                ) : (
                  data.vendedores.map((v) => {
                    const isActive = (activeVendorId ?? pinnedVendorId) === v.usuario_id
                    return (
                      <button
                        key={v.usuario_id}
                        type="button"
                        onMouseEnter={() => openVendor(v)}
                        onMouseLeave={() => {
                          if (pinnedVendorId !== v.usuario_id) {
                            setActiveVendorId(null)
                          }
                        }}
                        onFocus={() => openVendor(v)}
                        onClick={() => togglePinnedVendor(v)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                          isActive ? 'border-primary-300 bg-primary-50 shadow-sm' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: colorByKey[String(v.usuario_id)] || '#94a3b8' }}
                              title="Color en la gráfica"
                            />
                            <span className="truncate">{v.nombre}</span>
                          </div>
                          <div className="whitespace-nowrap text-sm font-semibold text-slate-900">
                            {formatCOP(v.total_mes)}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                          <span>{v.usuario_id === pinnedVendorId ? 'Fijado' : 'Ver pedidos del mes'}</span>
                          <span>Haz clic para fijar</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {activeVendor && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-2xl md:absolute md:right-0 md:top-0 md:mt-0 md:w-[372px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Pedidos enviados</p>
                      <h4 className="mt-1 text-base font-semibold">{activeVendor.nombre}</h4>
                      <p className="text-sm text-slate-300">
                        {vendorPedidos?.cantidad_pedidos ?? 0} pedidos en {monthLabel(year, month)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeVendor}
                      className="rounded-full border border-white/15 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-white/10 px-3 py-2">
                      <div className="text-[11px] uppercase text-slate-300">Total vendido</div>
                      <div className="mt-1 font-semibold">
                        {fetchingVendorPedidos ? '...' : formatCOP(vendorPedidos?.total_vendido || 0)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/10 px-3 py-2">
                      <div className="text-[11px] uppercase text-slate-300">Pedidos</div>
                      <div className="mt-1 font-semibold">{vendorPedidos?.cantidad_pedidos ?? 0}</div>
                    </div>
                  </div>

                  <div className="mt-4 max-h-[340px] overflow-auto pr-1">
                    {fetchingVendorPedidos ? (
                      <div className="rounded-xl bg-white/5 px-3 py-4 text-sm text-slate-300">
                        Cargando pedidos...
                      </div>
                    ) : !vendorPedidos || vendorPedidos.pedidos.length === 0 ? (
                      <div className="rounded-xl bg-white/5 px-3 py-4 text-sm text-slate-300">
                        No hay pedidos enviados para este vendedor en el mes.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vendorPedidos.pedidos.map((pedido) => (
                          <div key={pedido.pedido_id} className="rounded-xl border border-white/10 bg-white/8 px-3 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold">{pedido.numero_pedido}</div>
                                <div className="text-xs text-slate-300">{pedido.cliente}</div>
                              </div>
                              <div className="text-right text-sm font-semibold">
                                {formatCOP(pedido.total)}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                              <span>
                                {pedido.fecha_envio
                                  ? new Date(pedido.fecha_envio).toLocaleDateString('es-CO', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Sin fecha'}
                              </span>
                              {pedido.observaciones ? (
                                <span className="truncate max-w-[180px]" title={pedido.observaciones}>
                                  {pedido.observaciones}
                                </span>
                              ) : (
                                <span>Sin observaciones</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <div className="text-xs font-medium uppercase text-slate-500">Total</div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorByKey.total || '#0f172a' }}
                  title="Color en la gráfica"
                />
                <div className="text-sm font-semibold text-slate-900">{formatCOP(data.total_mes)}</div>
              </div>
            </div>
          </div>
  
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Top clientes del mes</h3>
              <p className="mt-1 text-xs text-slate-500">Solo pedidos enviados</p>
              <div className="mt-3 space-y-1">
                {data.top_clientes.length === 0 ? (
                  <p className="text-sm text-slate-600">Sin clientes con ventas en el mes.</p>
                ) : (
                  data.top_clientes.slice(0, 15).map((c, idx) => (
                    <div
                      key={c.cliente_id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-slate-500">#{idx + 1}</span>
                        <span className="truncate text-sm text-slate-900" title={c.nombre}>
                          {c.nombre}
                        </span>
                      </div>
                      <div className="whitespace-nowrap text-xs font-medium text-slate-700">
                        {formatCOP(c.total_mes)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
  
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Top productos del mes</h3>
              <p className="mt-1 text-xs text-slate-500">Cantidad fabricada (pedidos enviados)</p>
              <div className="mt-3 space-y-1">
                {data.top_productos.length === 0 ? (
                  <p className="text-sm text-slate-600">Sin productos en pedidos enviados.</p>
                ) : (
                  data.top_productos.slice(0, 15).map((p, idx) => (
                    <div
                      key={p.producto_id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-1.5"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-slate-500">#{idx + 1}</span>
                          <span className="truncate text-sm text-slate-900" title={p.referencia}>
                            {p.referencia}
                          </span>
                        </div>
                        {p.material && (
                          <span className="truncate text-[11px] text-slate-500" title={p.material}>
                            {p.material}
                          </span>
                        )}
                      </div>
                      <div className="whitespace-nowrap text-xs font-medium text-slate-700">
                        {p.cantidad.toLocaleString('es-CO')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
  
          {/* Sección de reporte acumulado */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Top acumulado clientes y productos</h3>
                <p className="mt-1 text-xs text-slate-500">Acumulado sobre los meses seleccionados.</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-xs font-medium uppercase text-slate-500">Año</label>
                  <input
                    type="number"
                    value={acumYear}
                    onChange={(e) => setAcumYear(parseInt(e.target.value, 10) || acumYear)}
                    className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const active = acumMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setAcumMonths((prev) =>
                            prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
                          )
                        }
                        className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-primary-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
                      >
                        {new Date(2020, m - 1, 1).toLocaleDateString('es-CO', { month: 'short' })}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => refetchTopAcum()}
                  disabled={fetchingTopAcum || acumMonths.length === 0}
                  className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {fetchingTopAcum ? 'Generando...' : 'Generar reporte'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!data || isPrinting}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isPrinting ? 'Generando PDF...' : 'Imprimir / PDF'}
                </button>
              </div>
            </div>
  
            {loadingTopAcum ? (
              <div className="mt-3 text-sm text-slate-600">Cargando...</div>
            ) : errorTopAcum ? (
              <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{errorTopAcum.message}</div>
            ) : !topAcum || topAcum.months.length === 0 ? (
              <div className="mt-3 text-sm text-slate-500">Seleccione meses y genere reporte.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Clientes Acumulados */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-600">Top Clientes</h4>
                  <div className="mt-2 space-y-1">
                    {topAcum.top_clientes.slice(0, 15).map((c, idx) => (
                      <div key={c.cliente_id} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1 text-xs">
                        <span className="truncate">#{idx + 1} {c.nombre}</span>
                        <span className="font-medium">{formatCOP(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Productos Acumulados */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-600">Top Productos</h4>
                  <div className="mt-2 space-y-1">
                    {topAcum.top_productos.slice(0, 15).map((p, idx) => (
                      <div key={p.producto_id} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1 text-xs">
                        <span className="truncate">#{idx + 1} {p.referencia}</span>
                        <span className="font-medium">{p.cantidad.toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
  
          {/* El PDF se genera en una ventana nueva (solo texto) */}
        </div>
      )}
    </div>
  );
}
