import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'

const OpportunityFormModal = ({ visible, onClose, onSaved, stages, initialValues }) => {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    companyName: '',
    estimatedValue: '',
    probabilityPercent: '',
    currentStageId: '',
  })

  const stageOptions = useMemo(() => stages || [], [stages])

  useEffect(() => {
    if (!visible) return
    setForm({
      title: initialValues?.Title || '',
      companyName: initialValues?.CompanyName || '',
      estimatedValue: initialValues?.EstimatedValue ?? '',
      probabilityPercent: initialValues?.ProbabilityPercent ?? '',
      currentStageId: String(initialValues?.CurrentStageId || stageOptions[0]?.StageId || ''),
    })
  }, [visible, initialValues, stageOptions])

  const isEdit = !!initialValues?.OpportunityId

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        title: form.title,
        companyName: form.companyName || null,
        estimatedValue: form.estimatedValue === '' ? null : Number(form.estimatedValue),
        probabilityPercent: form.probabilityPercent === '' ? null : Number(form.probabilityPercent),
        currentStageId: Number(form.currentStageId),
      }
      if (isEdit) {
        await api.put(`/api/opportunities/${initialValues.OpportunityId}`, payload)
        toast.success('Oportunidad actualizada')
      } else {
        await api.post('/api/opportunities', payload)
        toast.success('Oportunidad creada')
      }
      await onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{isEdit ? 'Editar oportunidad' : 'Nueva oportunidad'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={submit}>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Título</CFormLabel>
            <CFormInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="mb-3">
            <CFormLabel>Empresa</CFormLabel>
            <CFormInput value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div className="mb-3">
            <CFormLabel>Monto estimado</CFormLabel>
            <CFormInput
              inputMode="decimal"
              value={form.estimatedValue}
              onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Probabilidad (%)</CFormLabel>
            <CFormInput
              inputMode="numeric"
              value={form.probabilityPercent}
              onChange={(e) => setForm({ ...form, probabilityPercent: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Etapa</CFormLabel>
            <CFormSelect
              value={form.currentStageId}
              onChange={(e) => setForm({ ...form, currentStageId: e.target.value })}
              required
            >
              {stageOptions.map((s) => (
                <option key={s.StageId} value={String(s.StageId)}>
                  {s.StageName}
                </option>
              ))}
            </CFormSelect>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default OpportunityFormModal

