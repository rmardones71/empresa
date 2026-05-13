import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CCol, CProgress, CRow, CSpinner } from '@coreui/react'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import {
  cilArrowBottom,
  cilArrowTop,
  cilCalendar,
  cilChartPie,
  cilPeople,
  cilSpeedometer,
} from '@coreui/icons'

import api from 'src/services/api'

const userPalette = [
  { main: '#0f766e', soft: 'rgba(15, 118, 110, 0.16)' },
  { main: '#b45309', soft: 'rgba(180, 83, 9, 0.16)' },
  { main: '#2563eb', soft: 'rgba(37, 99, 235, 0.16)' },
  { main: '#be123c', soft: 'rgba(190, 18, 60, 0.15)' },
  { main: '#6d28d9', soft: 'rgba(109, 40, 217, 0.15)' },
  { main: '#0891b2', soft: 'rgba(8, 145, 178, 0.16)' },
  { main: '#4d7c0f', soft: 'rgba(77, 124, 15, 0.16)' },
  { main: '#c2410c', soft: 'rgba(194, 65, 12, 0.15)' },
  { main: '#4338ca', soft: 'rgba(67, 56, 202, 0.15)' },
  { main: '#0f4c81', soft: 'rgba(15, 76, 129, 0.14)' },
]

const numberFormatter = new Intl.NumberFormat('es-CL')

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0))
}

function formatWeekLabel(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return String(isoDate)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}`
}

function formatMonthLabel(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return String(isoDate)
  return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

function getUserColor(index) {
  return userPalette[index % userPalette.length]
}

function hexToRgba(hex, alpha = 1) {
  const normalized = String(hex || '').replace('#', '')
  if (normalized.length !== 6) return hex
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function makeBarGradient(context) {
  const color = getUserColor(context.dataIndex || 0)
  const { chart } = context
  const { chartArea, ctx } = chart
  if (!chartArea) return color.main

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, hexToRgba(color.main, 0.92))
  gradient.addColorStop(0.42, hexToRgba(color.main, 0.58))
  gradient.addColorStop(1, hexToRgba(color.main, 0.18))
  return gradient
}

function totalRows(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.total || 0), 0)
}

function lastValue(rows = []) {
  return Number(rows[rows.length - 1]?.total || 0)
}

function previousValue(rows = []) {
  return Number(rows[rows.length - 2]?.total || 0)
}

function percentageDelta(current, previous) {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

function initials(name = '') {
  const parts = String(name)
    .replace(/\([^)]*\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return 'SU'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const chartOptions = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: {
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: '#25324a',
        font: { size: 12, weight: 700 },
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: '#0b1220',
      borderColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      padding: 12,
      titleFont: { size: 12, weight: 800 },
      bodyFont: { size: 12, weight: 700 },
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: { color: '#667085', font: { size: 11, weight: 700 }, maxRotation: 0 },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: 'rgba(16, 24, 40, 0.08)' },
      ticks: { color: '#667085', precision: 0, font: { size: 11, weight: 700 } },
    },
  },
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({ byUser: [], weekly: [], monthly: [] })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    api
      .get('/api/contratos-empresa/metrics', { params: { weeks: 12, months: 12 } })
      .then((res) => {
        if (!alive) return
        const data = res.data || {}
        setMetrics({
          byUser: Array.isArray(data.byUser) ? data.byUser : [],
          weekly: Array.isArray(data.weekly) ? data.weekly : [],
          monthly: Array.isArray(data.monthly) ? data.monthly : [],
        })
      })
      .catch((e) => {
        if (!alive) return
        setError(e.response?.data?.message || 'No se pudieron cargar metricas')
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const byUserTop = useMemo(() => metrics.byUser.slice(0, 10), [metrics.byUser])
  const totalContracts = useMemo(() => totalRows(metrics.byUser), [metrics.byUser])
  const monthlyTotal = useMemo(() => totalRows(metrics.monthly), [metrics.monthly])
  const weeklyTotal = useMemo(() => totalRows(metrics.weekly), [metrics.weekly])
  const currentMonth = useMemo(() => lastValue(metrics.monthly), [metrics.monthly])
  const previousMonth = useMemo(() => previousValue(metrics.monthly), [metrics.monthly])
  const currentWeek = useMemo(() => lastValue(metrics.weekly), [metrics.weekly])
  const activeUsers = useMemo(
    () => metrics.byUser.filter((row) => Number(row.total || 0) > 0).length,
    [metrics.byUser],
  )
  const monthlyAverage = useMemo(
    () => (metrics.monthly.length ? Math.round(monthlyTotal / metrics.monthly.length) : 0),
    [metrics.monthly.length, monthlyTotal],
  )
  const monthDelta = percentageDelta(currentMonth, previousMonth)
  const bestUser = byUserTop[0]
  const maxUserTotal = Math.max(...byUserTop.map((row) => Number(row.total || 0)), 1)

  const userChartData = useMemo(
    () => ({
      labels: byUserTop.map((r) => r.usuario || '(Sin usuario)'),
      datasets: [
        {
          label: 'Contratos',
          backgroundColor: makeBarGradient,
          borderColor: byUserTop.map((_, index) => hexToRgba(getUserColor(index).main, 0.72)),
          borderRadius: 14,
          borderSkipped: false,
          borderWidth: 1,
          categoryPercentage: 0.68,
          data: byUserTop.map((r) => Number(r.total || 0)),
          hoverBackgroundColor: byUserTop.map((_, index) => getUserColor(index).main),
          maxBarThickness: 38,
        },
      ],
    }),
    [byUserTop],
  )

  const weeklyChartData = useMemo(
    () => ({
      labels: metrics.weekly.map((r) => formatWeekLabel(r.week_start)),
      datasets: [
        {
          label: 'Semanal',
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.12)',
          pointBackgroundColor: '#0f766e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          tension: 0.32,
          fill: true,
          data: metrics.weekly.map((r) => Number(r.total || 0)),
        },
      ],
    }),
    [metrics.weekly],
  )

  const monthlyChartData = useMemo(
    () => ({
      labels: metrics.monthly.map((r) => formatMonthLabel(r.month_start)),
      datasets: [
        {
          label: 'Mensual',
          borderColor: '#b45309',
          backgroundColor: 'rgba(180, 83, 9, 0.12)',
          pointBackgroundColor: '#b45309',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          tension: 0.28,
          fill: true,
          data: metrics.monthly.map((r) => Number(r.total || 0)),
        },
      ],
    }),
    [metrics.monthly],
  )

  if (loading) {
    return (
      <div className="dashboard-premium-loading">
        <CSpinner size="sm" />
        <span>Cargando dashboard ejecutivo...</span>
      </div>
    )
  }

  if (error) {
    return (
      <CAlert color="danger" className="dashboard-premium-alert">
        {error}
      </CAlert>
    )
  }

  return (
    <div className="dashboard-premium-page">
      <section className="dashboard-premium-hero">
        <div>
          <div className="dashboard-premium-eyebrow">Gestion comercial</div>
          <h1>Métricas del sistema</h1>
          <p>Vista consolidada de contratos por usuario, semanas y meses.</p>
        </div>
        <div className="dashboard-premium-hero-metric">
          <span>Cartera activa</span>
          <strong>{formatNumber(totalContracts)}</strong>
          <em>contratos empresa</em>
        </div>
      </section>

      <div className="dashboard-premium-kpis">
        <div className="dashboard-premium-kpi">
          <div className="dashboard-premium-kpi-icon is-emerald">
            <CIcon icon={cilChartPie} />
          </div>
          <span>Total contratos</span>
          <strong>{formatNumber(totalContracts)}</strong>
          <em>Registros activos</em>
        </div>
        <div className="dashboard-premium-kpi">
          <div className="dashboard-premium-kpi-icon is-gold">
            <CIcon icon={cilPeople} />
          </div>
          <span>Usuarios activos</span>
          <strong>{formatNumber(activeUsers)}</strong>
          <em>Con contratos asignados</em>
        </div>
        <div className="dashboard-premium-kpi">
          <div className="dashboard-premium-kpi-icon is-blue">
            <CIcon icon={cilCalendar} />
          </div>
          <span>Ultimo mes</span>
          <strong>{formatNumber(currentMonth)}</strong>
          <em className={monthDelta == null ? '' : monthDelta >= 0 ? 'is-positive' : 'is-negative'}>
            {monthDelta == null ? (
              'Sin comparativo'
            ) : (
              <>
                <CIcon icon={monthDelta >= 0 ? cilArrowTop : cilArrowBottom} />
                {Math.abs(monthDelta)}% vs mes anterior
              </>
            )}
          </em>
        </div>
        <div className="dashboard-premium-kpi">
          <div className="dashboard-premium-kpi-icon is-rose">
            <CIcon icon={cilSpeedometer} />
          </div>
          <span>Promedio mensual</span>
          <strong>{formatNumber(monthlyAverage)}</strong>
          <em>{formatNumber(weeklyTotal)} contratos en 12 semanas</em>
        </div>
      </div>

      <CRow className="g-3">
        <CCol xl={8}>
          <section className="dashboard-premium-panel">
            <div className="dashboard-premium-panel-header">
              <div>
                <span>Distribucion por ejecutivo</span>
                <h2>Contratos por usuario</h2>
              </div>
              <strong>{bestUser?.usuario || 'Sin usuarios'}</strong>
            </div>
            <div className="dashboard-premium-chart is-tall">
              <CChartBar
                data={userChartData}
                options={{
                  ...chartOptions,
                  plugins: { ...chartOptions.plugins, legend: { display: false } },
                }}
              />
            </div>
          </section>
        </CCol>

        <CCol xl={4}>
          <section className="dashboard-premium-panel dashboard-premium-ranking">
            <div className="dashboard-premium-panel-header">
              <div>
                <span>Ranking</span>
                <h2>Usuarios</h2>
              </div>
              <strong>{formatNumber(byUserTop.length)}</strong>
            </div>
            <div className="dashboard-premium-user-list">
              {byUserTop.map((row, index) => {
                const total = Number(row.total || 0)
                const color = getUserColor(index)
                return (
                  <div className="dashboard-premium-user" key={`${row.usuario}-${index}`}>
                    <div className="dashboard-premium-avatar" style={{ background: color.soft, color: color.main }}>
                      {initials(row.usuario)}
                    </div>
                    <div className="dashboard-premium-user-body">
                      <div className="dashboard-premium-user-top">
                        <strong>{row.usuario || '(Sin usuario)'}</strong>
                        <span>{formatNumber(total)}</span>
                      </div>
                      <CProgress
                        thin
                        value={(total / maxUserTotal) * 100}
                        className="dashboard-premium-progress"
                        style={{ '--dashboard-user-color': color.main }}
                      />
                    </div>
                  </div>
                )
              })}
              {!byUserTop.length && <div className="dashboard-premium-empty">Sin contratos por usuario</div>}
            </div>
          </section>
        </CCol>

        <CCol xl={6}>
          <section className="dashboard-premium-panel">
            <div className="dashboard-premium-panel-header">
              <div>
                <span>Ritmo operativo</span>
                <h2>Evolucion semanal</h2>
              </div>
              <strong>{formatNumber(currentWeek)}</strong>
            </div>
            <div className="dashboard-premium-chart">
              <CChartLine data={weeklyChartData} options={chartOptions} />
            </div>
          </section>
        </CCol>

        <CCol xl={6}>
          <section className="dashboard-premium-panel">
            <div className="dashboard-premium-panel-header">
              <div>
                <span>Tendencia ejecutiva</span>
                <h2>Evolucion mensual</h2>
              </div>
              <strong>{formatNumber(monthlyTotal)}</strong>
            </div>
            <div className="dashboard-premium-chart">
              <CChartLine data={monthlyChartData} options={chartOptions} />
            </div>
          </section>
        </CCol>
      </CRow>
    </div>
  )
}

export default Dashboard
