import React, { useState } from 'react'
import {
  CButton,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilCloudDownload, cilList } from '@coreui/icons'

const ExportModal = ({ visible, onClose, onConfirm, submitting, format }) => {
  const [mode, setMode] = useState('all') // all | range
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const resetForm = () => {
    setMode('all')
    setDateFrom('')
    setDateTo('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const doConfirm = () => {
    const allRecords = mode === 'all'
    onConfirm({
      allRecords,
      dateFrom: allRecords ? '' : dateFrom,
      dateTo: allRecords ? '' : dateTo,
      format,
    })
    resetForm()
  }

  const title = format === 'pdf' ? 'Exportar a PDF' : 'Exportar a Excel'

  return (
    <CModal alignment="center" visible={visible} onClose={handleClose} backdrop="static">
      <CModalHeader>
        <CModalTitle className="fw-bold d-flex align-items-center gap-2">
          <CIcon icon={cilCloudDownload} />
          <span style={{ fontSize: 15 }}>{title}</span>
        </CModalTitle>
      </CModalHeader>
      <CForm
        onSubmit={(e) => {
          e.preventDefault()
          doConfirm()
        }}
      >
        <CModalBody className="export-modal-body">
          <div className="export-modal-section">
            <CFormLabel className="export-modal-label">
              <CIcon icon={cilList} />
              <span>Registros</span>
            </CFormLabel>
            <div className="export-mode-options">
              <CFormCheck
                type="radio"
                name="exportMode"
                label="Todos los registros"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
              />
              <CFormCheck
                type="radio"
                name="exportMode"
                label="Rango de fechas"
                checked={mode === 'range'}
                onChange={() => setMode('range')}
              />
            </div>
          </div>

          <div className="export-modal-section">
            <div className="export-date-grid">
              <div>
                <CFormLabel className="export-modal-label">
                  <CIcon icon={cilCalendar} />
                  <span>Fecha inicio</span>
                </CFormLabel>
                <CFormInput
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  disabled={mode !== 'range'}
                />
              </div>
              <div>
                <CFormLabel className="export-modal-label">
                  <CIcon icon={cilCalendar} />
                  <span>Fecha termino</span>
                </CFormLabel>
                <CFormInput
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  disabled={mode !== 'range'}
                />
              </div>
            </div>
            <div className="export-modal-help">
              Si seleccionas rango, se considera la fecha completa (00:00 a 23:59).
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? 'Exportando...' : 'Exportar'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default ExportModal
