import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBriefcase, cilPencil, cilPlus, cilSearch, cilTrash, cilZoom } from '@coreui/icons'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import GridPaginationBar from 'src/components/GridPaginationBar'
import SortableTableHeader from 'src/components/SortableTableHeader'
import { runOnEnter } from 'src/utils/gridKeyboard'
import { chileRegions, getComunasByRegion } from './chileLocations'
import { getFieldLabel, resourceOrder, resources } from './commercialConfig'

const emptyFromConfig = (config) =>
  config.fields
    .filter((field) => !field.readOnly)
    .reduce((acc, field) => {
      acc[field.name] = field.defaultValue ?? (field.type === 'boolean' ? false : '')
      return acc
    }, {})

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  return String(value)
}

const normalizeDateValue = (value, type) => {
  if (!value) return ''
  if (type === 'datetime-local') return String(value).slice(0, 16)
  if (type === 'date') return String(value).slice(0, 10)
  return value
}

const CommercialModule = () => {
  const location = useLocation()
  const toast = useToast()
  const resourceKey = location.pathname.split('/').filter(Boolean).pop()
  const config = resources[resourceKey]

  const [items, setItems] = useState([])
  const [lookups, setLookups] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState(config?.defaultSort || '')
  const [sortDir, setSortDir] = useState('asc')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalMode, setModalMode] = useState(null)
  const [current, setCurrent] = useState(null)
  const [formData, setFormData] = useState(config ? emptyFromConfig(config) : {})

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  useEffect(() => {
    if (!config) return undefined
    const timeoutId = window.setTimeout(() => {
      setSortBy(config.defaultSort)
      setSortDir('asc')
      setPage(1)
      setQ('')
      setItems([])
      setTotal(0)
      setFormData(emptyFromConfig(config))
      setCurrent(null)
      setModalMode(null)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [config, resourceKey])

  const loadLookups = async () => {
    const res = await api.get('/api/commercial/lookups')
    setLookups(res.data || {})
  }

  const load = async ({ pageOverride, qOverride } = {}) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/commercial/${config.endpoint}`, {
        params: {
          page: pageOverride ?? page,
          pageSize,
          q: qOverride ?? q,
          sortBy,
          sortDir,
        },
      })
      setItems(res.data.items || [])
      setTotal(Number(res.data.total || 0))
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron cargar registros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!config) return undefined
    const timeoutId = window.setTimeout(() => {
      load().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey, page, pageSize, sortBy, sortDir])

  useEffect(() => {
    if (!config) return undefined
    const timeoutId = window.setTimeout(() => {
      loadLookups().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey])

  if (!config) return <Navigate to="/commercial/empresas" replace />

  const closeModal = () => {
    setModalMode(null)
    setCurrent(null)
    setFormData(emptyFromConfig(config))
  }

  const openCreate = () => {
    setCurrent(null)
    setFormData(emptyFromConfig(config))
    setModalMode('form')
  }

  const openEdit = (row) => {
    setCurrent(row)
    const next = emptyFromConfig(config)
    for (const field of config.fields.filter((item) => !item.readOnly)) {
      next[field.name] = normalizeDateValue(row[field.name], field.type)
    }
    setFormData(next)
    setModalMode('form')
  }

  const openDetail = (row) => {
    setCurrent(row)
    setModalMode('detail')
  }

  const onSearch = () => {
    setPage(1)
    load({ pageOverride: 1 }).catch(() => {})
  }

  const handleSort = (key) => {
    const nextDir = sortBy === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortBy(key)
    setSortDir(nextDir)
    setPage(1)
  }

  const setField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'region' ? { comuna: '' } : {}),
    }))
  }

  const validate = () => {
    const missing = config.required.filter((field) => {
      const value = formData[field]
      return value === undefined || value === null || value === ''
    })
    if (!missing.length) return true
    toast.error(
      `Completa campos obligatorios: ${missing.map((field) => getFieldLabel(config, field)).join(', ')}`,
    )
    return false
  }

  const submit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (current?.[config.idField]) {
        await api.put(
          `/api/commercial/${config.endpoint}/${encodeURIComponent(current[config.idField])}`,
          formData,
        )
        toast.success(`${config.singular} actualizado`)
      } else {
        await api.post(`/api/commercial/${config.endpoint}`, formData)
        toast.success(`${config.singular} creado`)
      }
      closeModal()
      await loadLookups()
      await load()
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    const label = row[config.displayField] || row[config.idField]
    if (!window.confirm(`Seguro que deseas eliminar "${label}"?`)) return
    try {
      await api.delete(
        `/api/commercial/${config.endpoint}/${encodeURIComponent(row[config.idField])}`,
      )
      toast.success(`${config.singular} eliminado`)
      await loadLookups()
      await load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar')
    }
  }

  const renderField = (field) => {
    const value = formData[field.name]
    const disabled = !!current && field.createOnly

    if (field.type === 'chile-region') {
      const regionNames = chileRegions.map((item) => item.region)
      const options = value && !regionNames.includes(value) ? [value, ...regionNames] : regionNames

      return (
        <CFormSelect
          value={value ?? ''}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
          disabled={disabled}
        >
          <option value="">Seleccione region...</option>
          {options.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </CFormSelect>
      )
    }

    if (field.type === 'chile-comuna') {
      const parentField = field.dependsOn || 'region'
      const parentValue = formData[parentField]
      const comunas = getComunasByRegion(parentValue)
      const options = value && !comunas.includes(value) ? [value, ...comunas] : comunas

      return (
        <CFormSelect
          value={value ?? ''}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
          disabled={!parentValue}
        >
          <option value="">
            {parentValue ? 'Seleccione comuna...' : 'Seleccione region primero'}
          </option>
          {options.map((comuna) => (
            <option key={comuna} value={comuna}>
              {comuna}
            </option>
          ))}
        </CFormSelect>
      )
    }

    if (field.type === 'select') {
      return (
        <CFormSelect
          value={value ?? ''}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
          disabled={disabled}
        >
          <option value="">Seleccione...</option>
          {(lookups[field.lookup] || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </CFormSelect>
      )
    }

    if (field.type === 'boolean') {
      return (
        <CFormSwitch
          className="boolean-switch-field"
          checked={!!value}
          onChange={(event) => setField(field.name, event.target.checked)}
          label={field.label}
        />
      )
    }

    if (field.type === 'textarea') {
      return (
        <CFormTextarea
          rows={3}
          value={value ?? ''}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
        />
      )
    }

    return (
      <CFormInput
        type={field.type}
        value={value ?? ''}
        onChange={(event) => setField(field.name, event.target.value)}
        required={field.required}
        disabled={disabled}
      />
    )
  }

  const detailFields = config.fields.filter((field) => !field.createOnly || current?.[field.name])

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center commercial-toolbar">
          <div className="d-flex align-items-center">
            <CIcon icon={cilBriefcase} className="me-2" />
            <span className="fw-semibold">{config.title}</span>
          </div>
          <CButton color="primary" onClick={openCreate}>
            <CIcon icon={cilPlus} className="me-1" />
            Nuevo
          </CButton>
        </CCardHeader>
        <CCardBody>
          <div className="commercial-tabs mb-3">
            {resourceOrder.map((key) => (
              <Link
                key={key}
                className={`commercial-tab ${key === resourceKey ? 'active' : ''}`}
                to={`/commercial/${key}`}
              >
                {resources[key].title}
              </Link>
            ))}
          </div>

          <CRow className="g-2 mb-3">
            <CCol md={8}>
              <CFormInput
                placeholder={`Buscar en ${config.title.toLowerCase()}`}
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={runOnEnter(onSearch)}
              />
            </CCol>
            <CCol md={4} className="d-flex gap-2">
              <CButton
                className="flex-grow-1"
                color="secondary"
                variant="outline"
                onClick={onSearch}
                disabled={loading}
              >
                <CIcon icon={cilSearch} className="me-1" />
                {loading ? 'Buscando...' : 'Buscar'}
              </CButton>
              <CButton
                className="flex-grow-1"
                color="secondary"
                variant="outline"
                onClick={() => {
                  setQ('')
                  setPage(1)
                  load({ pageOverride: 1, qOverride: '' }).catch(() => {})
                }}
                disabled={loading}
              >
                Todo
              </CButton>
            </CCol>
          </CRow>

          <div className="macos-grid commercial-grid">
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  {config.listFields.map((field) => (
                    <SortableTableHeader
                      key={field}
                      column={{ key: field, label: getFieldLabel(config, field) }}
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  ))}
                  <SortableTableHeader
                    column={{ key: 'actions', label: 'Acciones', sortable: false }}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="actions-cell"
                  />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.map((row) => (
                  <CTableRow key={row[config.idField]}>
                    {config.listFields.map((field) => (
                      <CTableDataCell key={field}>{formatValue(row[field])}</CTableDataCell>
                    ))}
                    <CTableDataCell className="actions-cell">
                      <CButtonGroup size="sm">
                        <CButton
                          color="secondary"
                          variant="outline"
                          onClick={() => openDetail(row)}
                        >
                          <CIcon icon={cilZoom} />
                        </CButton>
                        <CButton color="secondary" variant="outline" onClick={() => openEdit(row)}>
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton color="danger" variant="outline" onClick={() => remove(row)}>
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CButtonGroup>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {items.length === 0 && (
                  <CTableRow>
                    <CTableDataCell
                      colSpan={config.listFields.length + 1}
                      className="text-center text-body-secondary"
                    >
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>

          <GridPaginationBar
            total={total}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            disabled={loading}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(Number(next))
              setPage(1)
            }}
          />
        </CCardBody>
      </CCard>

      <CModal
        alignment="center"
        size="lg"
        visible={modalMode === 'form'}
        onClose={closeModal}
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>
            {current ? `Editar ${config.singular}` : `Crear ${config.singular}`}
          </CModalTitle>
        </CModalHeader>
        <CForm
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <CModalBody>
            <CRow className="g-3">
              {config.fields
                .filter((field) => !field.readOnly)
                .map((field) => (
                  <CCol md={field.type === 'textarea' ? 12 : 6} key={field.name}>
                    {field.type !== 'boolean' && (
                      <CFormLabel>
                        {field.label}
                        {field.required && <span className="text-danger"> *</span>}
                      </CFormLabel>
                    )}
                    {renderField(field)}
                  </CCol>
                ))}
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={closeModal} disabled={saving}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal alignment="center" size="lg" visible={modalMode === 'detail'} onClose={closeModal}>
        <CModalHeader>
          <CModalTitle>Detalle {config.singular}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {current && (
            <div className="commercial-detail-grid">
              <div>
                <span className="text-body-secondary">ID</span>
                <strong>{formatValue(current[config.idField])}</strong>
              </div>
              {detailFields.map((field) => (
                <div key={field.name}>
                  <span className="text-body-secondary">{field.label}</span>
                  <strong>
                    {formatValue(
                      current[
                        field.lookup ? field.label?.toLowerCase().replaceAll(' ', '_') : field.name
                      ] ?? current[field.name],
                    )}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeModal}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default CommercialModule
