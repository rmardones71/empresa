import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CWidgetStatsA } from '@coreui/react'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'

const OpportunitiesDashboard = () => {
  const toast = useToast()
  const [data, setData] = useState(null)

  useEffect(() => {
    api
      .get('/api/opportunities/dashboard')
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.response?.data?.message || 'No se pudo cargar dashboard'))
  }, [])

  return (
    <CCard>
      <CCardHeader>Dashboard Comercial</CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={6} lg={4}>
            <CWidgetStatsA color="primary" value={`${data?.total ?? '-'}`} title="Total oportunidades" />
          </CCol>
          <CCol md={6} lg={4}>
            <CWidgetStatsA
              color="info"
              value={data?.totalProjected != null ? `$${Number(data.totalProjected).toLocaleString()}` : '-'}
              title="Monto proyectado"
            />
          </CCol>
        </CRow>

        <div className="mt-4 macos-grid">
          <table className="table">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Cantidad</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {(data?.byStage || []).map((s) => (
                <tr key={s.StageId}>
                  <td>
                    <span className="kanban-dot me-2" style={{ background: s.ColorHex || '#94a3b8' }} />
                    {s.StageName}
                  </td>
                  <td>{s.CountItems}</td>
                  <td>${Number(s.SumValue || 0).toLocaleString()}</td>
                </tr>
              ))}
              {!data && (
                <tr>
                  <td colSpan={3} className="text-body-secondary">
                    Cargando...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default OpportunitiesDashboard

