import React, { useEffect, useMemo, useState } from 'react'
import { CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import OpportunityFormModal from './OpportunityFormModal'

const KanbanColumn = ({ stage, items, onDropCard, onEdit }) => {
  return (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="kanban-dot" style={{ background: stage.ColorHex || '#94a3b8' }} />
            <div className="fw-semibold">{stage.StageName}</div>
          </div>
          <CBadge color="secondary">{items.length}</CBadge>
        </div>
      </div>
      <div
        className="kanban-col-body"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const opportunityId = Number(e.dataTransfer.getData('opportunityId') || 0)
          if (opportunityId) onDropCard(opportunityId, stage.StageId)
        }}
      >
        {items.map((o) => (
          <div
            key={o.OpportunityId}
            className="kanban-card"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('opportunityId', String(o.OpportunityId))
            }}
            onDoubleClick={() => onEdit(o)}
          >
            <div className="kanban-card-title">{o.Title}</div>
            <div className="kanban-card-sub">
              {o.CompanyName || '-'} · {o.AssignedUsername || 'Sin asignar'}
            </div>
            <div className="kanban-card-meta">
              <span>${o.EstimatedValue ?? '-'}</span>
              <span>{o.ProbabilityPercent != null ? `${o.ProbabilityPercent}%` : '-'}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-body-secondary small">Sin oportunidades</div>}
      </div>
    </div>
  )
}

const OpportunitiesKanban = () => {
  const toast = useToast()
  const [stages, setStages] = useState([])
  const [itemsByStage, setItemsByStage] = useState({})
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/opportunities/kanban')
      setStages(res.data.stages)
      setItemsByStage(res.data.itemsByStage)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar Kanban')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const stageItems = useMemo(() => {
    const map = new Map()
    for (const s of stages) {
      map.set(s.StageId, itemsByStage[s.StageId] || [])
    }
    return map
  }, [stages, itemsByStage])

  const moveStage = async (opportunityId, stageId) => {
    try {
      await api.patch(`/api/opportunities/${opportunityId}/move-stage`, { stageId })
      toast.success('Etapa actualizada')
      load().catch(() => {})
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo mover la oportunidad')
    }
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (o) => {
    setEditing(o)
    setModalOpen(true)
  }

  const onSaved = async () => {
    setModalOpen(false)
    await load()
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>Tubo de Negocios (Kanban)</div>
        <CButton color="primary" onClick={openCreate} disabled={loading}>
          <CIcon icon={cilPlus} className="me-1" /> Nueva oportunidad
        </CButton>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol>
            <div className="kanban-board">
              {stages.map((s) => (
                <KanbanColumn
                  key={s.StageId}
                  stage={s}
                  items={stageItems.get(s.StageId) || []}
                  onDropCard={moveStage}
                  onEdit={openEdit}
                />
              ))}
            </div>
          </CCol>
        </CRow>
      </CCardBody>

      <OpportunityFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        stages={stages}
        initialValues={editing}
      />
    </CCard>
  )
}

export default OpportunitiesKanban

