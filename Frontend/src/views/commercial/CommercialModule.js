import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CForm,
  CFormCheck,
  CFormFeedback,
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
import { useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import {
  cilAddressBook,
  cilBadge,
  cilBriefcase,
  cilBuilding,
  cilCalendar,
  cilCheckCircle,
  cilCloudDownload,
  cilContact,
  cilCreditCard,
  cilDescription,
  cilDollar,
  cilEnvelopeClosed,
  cilExternalLink,
  cilFile,
  cilFolder,
  cilGlobeAlt,
  cilHome,
  cilIndustry,
  cilLink,
  cilList,
  cilHistory,
  cilLocationPin,
  cilMap,
  cilMoney,
  cilNotes,
  cilPaperclip,
  cilPencil,
  cilPhone,
  cilPlus,
  cilSearch,
  cilSettings,
  cilShieldAlt,
  cilStorage,
  cilTag,
  cilTags,
  cilTask,
  cilTrash,
  cilUser,
  cilX,
  cilZoom,
} from '@coreui/icons'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import ExportModal from 'src/components/ExportModal'
import GridPaginationBar from 'src/components/GridPaginationBar'
import MacDateInput from 'src/components/MacDateInput'
import SortableTableHeader from 'src/components/SortableTableHeader'
import { buildDateRangeParams, exportToPdf, exportToXlsx, canExportExcelPdf } from 'src/utils/export'
import { runOnEnter } from 'src/utils/gridKeyboard'
import { scheduleFocusFirstField, handleEnterToNextField } from 'src/utils/formNavigation'
import { chileRegions, getCiudadesByRegion, getComunasByCity } from './chileLocations'
import { auditFields, getFieldLabel, resourceOrder, resources } from './commercialConfig'
import { formatRut, getRutStatus } from './rutChile'
import { commercialPermissionKey, hasPermission, isSecurityAdmin } from 'src/utils/permissions'

const masterResourceKeys = new Set([
  'categorias',
  'tipo_contactos',
  'estado_contactos',
  'estado_vitales',
  'estados_ctr',
  'tipo_servicios',
  'tipo_tarifas',
  'frecuencias',
])

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

const normalizeSearchQuery = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120)

const amountFields = new Set(['tarifa_fija', 'tarifa_variable'])

const normalizeAmountInput = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.replace(/\$/g, '').replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
}

const formatCurrencyAmount = (value, divisa = 'Peso') => {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(normalizeAmountInput(value))
  if (!Number.isFinite(number)) return String(value)
  if (divisa === 'UF') {
    return number.toLocaleString('es-CL', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  }
  return `$${Math.round(number).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
}

const formatAmountForInput = (value, divisa = 'Peso') => {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(normalizeAmountInput(value))
  if (!Number.isFinite(number)) return String(value)
  if (divisa === 'UF') {
    return number.toLocaleString('es-CL', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  }
  return `$${Math.round(number).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
}

const normalizeAmountForSave = (value, divisa = 'Peso') => {
  const number = Number(normalizeAmountInput(value))
  if (!Number.isFinite(number)) return null
  return divisa === 'UF' ? Number(number.toFixed(4)) : Math.round(number)
}

const acceptedDocumentTypes =
  '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,text/plain'

const uploadDocumentFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve(null)
    const maxBytes = 8 * 1024 * 1024
    if (file.size > maxBytes) {
      reject(new Error('El archivo no puede superar 8 MB'))
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await api.post('/api/commercial/uploads', {
          fileName: file.name,
          mimeType: file.type,
          dataUrl: reader.result,
        })
        resolve(res.data)
      } catch (error) {
        reject(new Error(error.response?.data?.message || 'No se pudo subir el archivo'))
      }
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })

const formIconMap = {
  addressBook: cilAddressBook,
  badge: cilBadge,
  briefcase: cilBriefcase,
  building: cilBuilding,
  calendar: cilCalendar,
  check: cilCheckCircle,
  contact: cilContact,
  creditCard: cilCreditCard,
  description: cilDescription,
  dollar: cilDollar,
  email: cilEnvelopeClosed,
  file: cilFile,
  folder: cilFolder,
  globe: cilGlobeAlt,
  home: cilHome,
  industry: cilIndustry,
  link: cilLink,
  list: cilList,
  location: cilLocationPin,
  map: cilMap,
  money: cilMoney,
  notes: cilNotes,
  paperclip: cilPaperclip,
  phone: cilPhone,
  settings: cilSettings,
  shield: cilShieldAlt,
  storage: cilStorage,
  tag: cilTag,
  tags: cilTags,
  task: cilTask,
  user: cilUser,
}

const fieldIconMap = {
  rut: cilBadge,
  rut_empresa: cilBuilding,
  razon_social: cilBuilding,
  nombre_fantasia: cilTag,
  giro: cilIndustry,
  rubro: cilTags,
  direccion: cilHome,
  region: cilMap,
  comuna: cilLocationPin,
  sitio_web: cilGlobeAlt,
  id_categoria: cilTags,
  id_tipo_contacto: cilAddressBook,
  id_estado_contacto: cilCheckCircle,
  nombre: cilUser,
  cargo: cilBriefcase,
  area: cilBuilding,
  email: cilEnvelopeClosed,
  telefono: cilPhone,
  rol: cilShieldAlt,
  autoriza_comunicaciones: cilCheckCircle,
  estado: cilCheckCircle,
  id_estado_vital: cilTask,
  id_estado_ctr: cilCheckCircle,
  titulo: cilDescription,
  fecha_firma: cilCalendar,
  fecha_inicio: cilCalendar,
  fecha_termino: cilCalendar,
  fecha_facturacion: cilCalendar,
  medio_pago: cilCreditCard,
  reajustable: cilDollar,
  multa: cilMoney,
  requiere_oc: cilTask,
  requiere_orden_compra: cilTask,
  activo: cilCheckCircle,
  id_contrato: cilDescription,
  contrato_empresa_id: cilDescription,
  id_tipo_servicio: cilSettings,
  id_tipo_tarifa: cilMoney,
  id_frecuencia: cilCalendar,
  fecha_inicio_ciclo_facturacion: cilCalendar,
  divisa: cilMoney,
  tarifa_fija: cilDollar,
  tarifa_variable: cilDollar,
  moneda_fijo: cilMoney,
  moneda_variable: cilMoney,
  unidad_variable: cilList,
  iva: cilCheckCircle,
  id_contacto: cilContact,
  texto: cilNotes,
  adjuntos: cilPaperclip,
  relato: cilNotes,
  tipo_documento: cilFile,
  descripcion: cilNotes,
  version: cilStorage,
  responsable: cilUser,
  archivo: cilLink,
  fecha_carga: cilCalendar,
  usuario_creacion: cilUser,
  fecha_creacion: cilCalendar,
  fecha_actualizacion: cilHistory,
  categoria: cilTags,
  tipo: cilAddressBook,
  estado_contacto: cilCheckCircle,
  estado_vital: cilTask,
  estado_ctr: cilCheckCircle,
  tipo_servicio: cilSettings,
  tipo_tarifa: cilMoney,
  frecuencia: cilCalendar,
}

const getFieldIcon = (field) => fieldIconMap[field.name] || formIconMap[field.icon] || cilList

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatFieldValue = (fieldName, value) => {
  if (fieldName === 'activo') return value ? 'Activo' : 'Inactivo'
  if (['fecha_creacion', 'fecha_actualizacion', 'fecha_cambio'].includes(fieldName)) {
    return formatDateTime(value)
  }
  return formatValue(value)
}

const renderListValue = (fieldName, value, row = {}) => {
  if (fieldName === 'activo') {
    return (
      <span className={`macos-status-pill ${value ? 'is-active' : 'is-inactive'}`}>
        {value ? 'Activo' : 'Inactivo'}
      </span>
    )
  }
  if (['adjuntos', 'archivo'].includes(fieldName)) {
    if (!value) return '-'
    return (
      <CButton
        as="a"
        href={String(value)}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        color="secondary"
        variant="outline"
        onClick={(event) => event.stopPropagation()}
      >
        <CIcon icon={cilCloudDownload} className="me-1" />
        Bajar
      </CButton>
    )
  }
  if (amountFields.has(fieldName)) return formatCurrencyAmount(value, row.divisa)
  return formatFieldValue(fieldName, value)
}

const formatExportValue = (fieldName, value, row = {}) => {
  if (fieldName === 'activo') return value ? 'Activo' : 'Inactivo'
  if (amountFields.has(fieldName)) return formatCurrencyAmount(value, row.divisa)
  return formatFieldValue(fieldName, value)
}

const CommercialModule = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const resourceKey = location.pathname.split('/').filter(Boolean).pop()
  const config = resources[resourceKey]
  const user = useSelector((s) => s.auth.user)
  const moduleKey = commercialPermissionKey(resourceKey)
  const canCreate = hasPermission(user, moduleKey, 'create')
  const canRead = hasPermission(user, moduleKey, 'read')
  const canWrite = hasPermission(user, moduleKey, 'write')
  const canDelete = hasPermission(user, moduleKey, 'delete')
  const canHardDelete = resourceKey === 'contratos_empresa' ? canDelete && isSecurityAdmin(user?.role) : canDelete
  const canExport = canExportExcelPdf(user)
  const columnsStorageKey = `crm_commercial_${resourceKey}_grid_columns_v1`

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
  const [changeLogs, setChangeLogs] = useState([])
  const [loadingLog, setLoadingLog] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({})
  const [exporting, setExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('xlsx')

  const formModalRef = useRef(null)

  useEffect(() => {
    if (modalMode !== 'form') return undefined
    return scheduleFocusFirstField(() => formModalRef.current)
  }, [modalMode, current])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const listFields = useMemo(
    () =>
      config
        ? [
            ...config.listFields,
            ...(config.audit === false ? [] : auditFields.map((field) => field.name)),
          ]
        : [],
    [config],
  )
  const columns = useMemo(
    () => [
      ...listFields.map((field) => ({ key: field, label: getFieldLabel(config, field) })),
      { key: 'actions', label: 'Acciones', sortable: false },
    ],
    [config, listFields],
  )

  const defaultVisibleColumns = useMemo(
    () =>
      columns.reduce((acc, column) => {
        acc[column.key] = true
        return acc
      }, {}),
    [columns],
  )

  const getRecordId = (row) => {
    const value = row?.[config.idField]
    if (Array.isArray(value)) return value[0] ?? ''
    return value ?? ''
  }

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
      setChangeLogs([])
      setCurrent(null)
      setModalMode(null)
      try {
        const raw = window.localStorage.getItem(`crm_commercial_${resourceKey}_grid_columns_v1`)
        setVisibleColumns(raw ? { ...defaultVisibleColumns, ...JSON.parse(raw) } : defaultVisibleColumns)
      } catch (error) {
        setVisibleColumns(defaultVisibleColumns)
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [config, defaultVisibleColumns, resourceKey])

  const loadLookups = async () => {
    const res = await api.get('/api/commercial/lookups')
    setLookups(res.data || {})
  }

  const load = async ({ pageOverride, qOverride } = {}) => {
    setLoading(true)
    try {
      const searchText = normalizeSearchQuery(qOverride ?? q)
      const res = await api.get(`/api/commercial/${config.endpoint}`, {
        params: {
          page: pageOverride ?? page,
          pageSize,
          q: searchText,
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

  const setColumnVisible = (key, value) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: value }
      try {
        window.localStorage.setItem(columnsStorageKey, JSON.stringify(next))
      } catch (error) {
        // ignore
      }
      return next
    })
  }

  const isColumnVisible = (key) => visibleColumns[key] !== false

  const getVisibleExportColumns = () => columns.filter((column) => column.key !== 'actions' && isColumnVisible(column.key))

  const fetchAllRecords = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    const pageSizeAll = 100
    const dateParams = allRecords
      ? {}
      : buildDateRangeParams({ dateFrom: dateFromOverride, dateTo: dateToOverride })
    const all = []
    let pageAll = 1
    while (true) {
      const res = await api.get(`/api/commercial/${config.endpoint}`, {
        params: {
          page: pageAll,
          pageSize: pageSizeAll,
          q: normalizeSearchQuery(q),
          sortBy,
          sortDir,
          ...dateParams,
        },
      })
      const batch = res.data.items || []
      all.push(...batch)
      if (all.length >= Number(res.data.total || 0) || batch.length < pageSizeAll) break
      pageAll += 1
    }
    return all
  }

  const exportExcel = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    setExporting(true)
    try {
      const exportColumns = getVisibleExportColumns()
      const all = await fetchAllRecords({ allRecords, dateFromOverride, dateToOverride })
      const rows = all.map((row) =>
        exportColumns.reduce((acc, column) => {
          acc[column.label] = formatExportValue(column.key, row[column.key], row)
          return acc
        }, {}),
      )
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToXlsx({
        fileName: `${config.endpoint}_${dateTag}.xlsx`,
        sheetName: config.title.slice(0, 31),
        rows,
      })
    } catch (error) {
      toast.error(error?.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const exportPdf = async ({ allRecords, dateFromOverride, dateToOverride } = {}) => {
    setExporting(true)
    try {
      const exportColumns = getVisibleExportColumns()
      const all = await fetchAllRecords({ allRecords, dateFromOverride, dateToOverride })
      const head = exportColumns.map((column) => column.label)
      const body = all.map((row) =>
        exportColumns.map((column) => String(formatExportValue(column.key, row[column.key], row) ?? '')),
      )
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToPdf({
        fileName: `${config.endpoint}_${dateTag}.pdf`,
        title: config.title,
        head,
        body,
      })
    } catch (error) {
      toast.error(error?.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const openExport = (format) => {
    if (!canExport) return
    setExportFormat(format)
    setExportModalOpen(true)
  }

  const confirmExport = async ({ allRecords, dateFrom, dateTo, format }) => {
    if (format === 'pdf') {
      await exportPdf({ allRecords, dateFromOverride: dateFrom, dateToOverride: dateTo })
    } else {
      await exportExcel({ allRecords, dateFromOverride: dateFrom, dateToOverride: dateTo })
    }
    setExportModalOpen(false)
  }

  useEffect(() => {
    if (!config || !canRead) return undefined
    const timeoutId = window.setTimeout(() => {
      load().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey, page, pageSize, sortBy, sortDir])

  useEffect(() => {
    if (!config || !canRead) return undefined
    const timeoutId = window.setTimeout(() => {
      loadLookups().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey])

  useEffect(() => {
    if (!config || !canRead) return undefined
    const recordId = searchParams.get('open')
    if (!recordId) return undefined
    const mode = searchParams.get('mode') || 'edit'
    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await api.get(
          `/api/commercial/${config.endpoint}/${encodeURIComponent(recordId)}`,
        )
        if (cancelled) return
        const row = res.data
        setCurrent(row)
        if (mode === 'detail' || !canWrite) {
          setModalMode('detail')
        } else {
          const next = emptyFromConfig(config)
          for (const field of config.fields.filter((item) => !item.readOnly)) {
            next[field.name] = normalizeDateValue(row[field.name], field.type)
          }
          setFormData(next)
          setModalMode('form')
        }
        setSearchParams({}, { replace: true })
      } catch (error) {
        toast.error(error.response?.data?.message || 'No se pudo abrir el mantenedor')
      }
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey, searchParams])

  if (!config) return <Navigate to="/commercial/empresas" replace />

  const closeModal = () => {
    setModalMode(null)
    setCurrent(null)
    setFormData(emptyFromConfig(config))
  }

  const openCreate = () => {
    if (!canCreate) return
    setCurrent(null)
    setFormData(emptyFromConfig(config))
    setModalMode('form')
  }

  const openEdit = (row) => {
    if (!canWrite) return
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

  const openChangeLog = async (row) => {
    const recordId = getRecordId(row)
    setCurrent(row)
    setChangeLogs([])
    setLoadingLog(true)
    setModalMode('changeLog')
    try {
      const res = await api.get(
        `/api/commercial/logs/${config.endpoint}/${encodeURIComponent(recordId)}`,
      )
      setChangeLogs(res.data.items || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo cargar el log de cambios')
    } finally {
      setLoadingLog(false)
    }
  }

  const openFunctionalForm = (row) => {
    const recordId = getRecordId(row)
    if (!recordId) return
    navigate(`/contratos-empresa?open=${encodeURIComponent(recordId)}`)
  }

  const onSearch = () => {
    const searchText = normalizeSearchQuery(q)
    setQ(searchText)
    setPage(1)
    load({ pageOverride: 1, qOverride: searchText }).catch(() => {})
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
      ...(field === 'region' ? { ciudad: '', comuna: '' } : {}),
      ...(field === 'ciudad' ? { comuna: '' } : {}),
      ...(field === 'divisa'
        ? {
            tarifa_fija:
              prev.tarifa_fija === '' || prev.tarifa_fija == null
                ? prev.tarifa_fija
                : formatAmountForInput(prev.tarifa_fija, value),
            tarifa_variable:
              prev.tarifa_variable === '' || prev.tarifa_variable == null
                ? prev.tarifa_variable
                : formatAmountForInput(prev.tarifa_variable, value),
          }
        : {}),
    }))
  }

  const buildSubmitData = () => {
    const payload = { ...formData }
    if (resourceKey === 'lineas') {
      payload.divisa = payload.divisa || 'Peso'
      for (const field of amountFields) {
        if (payload[field] === '' || payload[field] == null) continue
        payload[field] = normalizeAmountForSave(payload[field], payload.divisa)
      }
    }
    return payload
  }

  const validate = () => {
    const missing = config.required.filter((field) => {
      const value = formData[field]
      return value === undefined || value === null || value === ''
    })

    const invalidRutFields = config.fields
      .filter((field) => field.type === 'chile-rut')
      .filter(
        (field) => getRutStatus(formData[field.name], { required: field.required }) === 'invalid',
      )

    if (!missing.length && !invalidRutFields.length) return true

    if (missing.length) {
      toast.error(
        `Completa campos obligatorios: ${missing.map((field) => getFieldLabel(config, field)).join(', ')}`,
      )
    }

    if (invalidRutFields.length) {
      toast.error(
        `Corrige RUT invalido: ${invalidRutFields.map((field) => field.label).join(', ')}`,
      )
    }

    return false
  }

  const submit = async () => {
    if (current && !canWrite) return
    if (!current && !canCreate) return
    if (!validate()) return
    setSaving(true)
    try {
      const currentId = getRecordId(current)
      if (currentId) {
        await api.put(
          `/api/commercial/${config.endpoint}/${encodeURIComponent(currentId)}`,
          buildSubmitData(),
        )
        toast.success(`${config.singular} actualizado`)
      } else {
        await api.post(`/api/commercial/${config.endpoint}`, buildSubmitData())
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
    if (!canHardDelete) return
    const recordId = getRecordId(row)
    const label = row[config.displayField] || recordId
    const isContractMaintainer = resourceKey === 'contratos_empresa'
    if (!window.confirm(`Seguro que deseas eliminar "${label}"?`)) return
    try {
      if (isContractMaintainer) {
        await api.delete(`/api/contratos-empresa/${encodeURIComponent(recordId)}`)
      } else {
        await api.delete(`/api/commercial/${config.endpoint}/${encodeURIComponent(recordId)}`)
      }
      toast.success(`${config.singular} eliminado`)
      await loadLookups()
      await load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar')
    }
  }

  const getFormSections = () => {
    const visibleFields = config.fields.filter((field) => !field.readOnly)
    const fieldsByName = new Map(visibleFields.map((field) => [field.name, field]))
    const usedFields = new Set()

    const configuredSections = (config.formSections || [])
      .map((section) => {
        const fields = section.fields
          .map((fieldName) => fieldsByName.get(fieldName))
          .filter(Boolean)
          .filter((field) => {
            usedFields.add(field.name)
            return true
          })

        return { ...section, fields }
      })
      .filter((section) => section.fields.length > 0)

    const remainingFields = visibleFields.filter((field) => !usedFields.has(field.name))
    if (remainingFields.length) {
      configuredSections.push({
        title: 'Datos generales',
        icon: 'settings',
        fields: remainingFields,
      })
    }

    return configuredSections.length
      ? configuredSections
      : [{ title: 'Datos generales', icon: 'settings', fields: visibleFields }]
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
      const regionValue = formData.region
      const cityField = field.dependsOn || 'ciudad'
      const cityValue = formData[cityField]
      const comunas = getComunasByCity(regionValue, cityValue)
      const options = value && !comunas.includes(value) ? [value, ...comunas] : comunas

      return (
        <CFormSelect
          value={value ?? ''}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
          disabled={!regionValue || !cityValue}
        >
          <option value="">
            {cityValue ? 'Seleccione comuna...' : 'Seleccione ciudad primero'}
          </option>
          {options.map((comuna) => (
            <option key={comuna} value={comuna}>
              {comuna}
            </option>
          ))}
        </CFormSelect>
      )
    }

    if (field.type === 'chile-city') {
      const regionValue = formData[field.dependsOn || 'region']
      const ciudades = getCiudadesByRegion(regionValue)
      const options = value && !ciudades.includes(value) ? [value, ...ciudades] : ciudades

      return (
        <CFormSelect
          value={value ?? ''}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
          disabled={!regionValue}
        >
          <option value="">
            {regionValue ? 'Seleccione ciudad...' : 'Seleccione region primero'}
          </option>
          {options.map((ciudad) => (
            <option key={ciudad} value={ciudad}>
              {ciudad}
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

    if (field.type === 'static-select') {
      return (
        <CFormSelect
          value={value ?? field.defaultValue ?? ''}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
          disabled={disabled}
        >
          <option value="">Seleccione...</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </CFormSelect>
      )
    }

    if (field.type === 'chile-rut') {
      const rutStatus = getRutStatus(value, { required: field.required })

      return (
        <>
          <CFormInput
            type="text"
            value={value ?? ''}
            onBlur={(event) => {
              if (getRutStatus(event.target.value, { required: field.required }) === 'valid') {
                setField(field.name, formatRut(event.target.value))
              }
            }}
            onChange={(event) => setField(field.name, event.target.value)}
            required={field.required}
            disabled={disabled}
            valid={rutStatus === 'valid'}
            invalid={rutStatus === 'invalid'}
            placeholder="12.345.678-9"
          />
          {rutStatus === 'valid' && <CFormFeedback valid>RUT OK</CFormFeedback>}
          {rutStatus === 'invalid' && <CFormFeedback invalid>RUT chileno invalido</CFormFeedback>}
        </>
      )
    }

    if (field.type === 'boolean') {
      return (
        <CFormSwitch
          className="boolean-switch-field"
          checked={!!value}
          onChange={(event) => setField(field.name, event.target.checked)}
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

    if (field.type === 'currency-amount') {
      const divisa = formData.divisa || 'Peso'
      return (
        <CFormInput
          type="text"
          inputMode={divisa === 'UF' ? 'decimal' : 'numeric'}
          value={value ?? ''}
          onBlur={(event) => setField(field.name, formatAmountForInput(event.target.value, divisa))}
          onChange={(event) => setField(field.name, event.target.value)}
          required={field.required}
          disabled={disabled}
          placeholder={divisa === 'UF' ? '0,0000' : '$0'}
        />
      )
    }

    if (field.type === 'date') {
      return (
        <MacDateInput
          value={value ?? ''}
          onChange={(nextValue) => setField(field.name, nextValue)}
          disabled={disabled}
        />
      )
    }

    if (field.type === 'datetime-local') {
      return (
        <MacDateInput
          mode="datetime-local"
          value={value ?? ''}
          onChange={(nextValue) => setField(field.name, nextValue)}
          disabled={disabled}
        />
      )
    }

    if (field.type === 'file-upload') {
      const inputId = `${resourceKey}-${field.name}-upload`
      return (
        <div className="mac-file-upload">
          <input
            id={inputId}
            className="mac-file-upload-input"
            type="file"
            accept={acceptedDocumentTypes}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              try {
                const uploaded = await uploadDocumentFile(file)
                if (uploaded?.url) setField(field.name, uploaded.url)
                toast.success('Archivo cargado')
              } catch (error) {
                toast.error(error.message)
              } finally {
                event.target.value = ''
              }
            }}
            disabled={disabled || saving}
          />
          <div className="mac-file-upload-row">
            <label className="mac-file-upload-button" htmlFor={inputId}>
              Seleccionar archivo
            </label>
            <span className="mac-file-upload-caption">
              PDF, Word, Excel, imagen o TXT
            </span>
          </div>
          <div className="mac-file-upload-url">
            <CFormLabel className="commercial-field-label">
              <CIcon icon={cilLink} />
              <span>URL</span>
            </CFormLabel>
            <CFormInput
              type="url"
              placeholder="https://..."
              value={value ?? ''}
              onChange={(event) => setField(field.name, event.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
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

  const detailFields = [
    ...config.fields,
    ...(config.audit === false ? [] : auditFields),
  ].filter(
    (field) => !field.createOnly || current?.[field.name],
  )

  if (!canRead) {
    return <CAlert color="warning">No tienes permisos para leer este mantenedor.</CAlert>
  }

  const readableResourceOrder = resourceOrder.filter((key) =>
    hasPermission(user, commercialPermissionKey(key), 'read'),
  )

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center commercial-toolbar">
          <div className="d-flex align-items-center">
            <CIcon icon={cilBriefcase} className="me-2" />
            <span className="fw-semibold">{config.title}</span>
          </div>
          <div className="d-flex gap-2 flex-wrap justify-content-end">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline" className="grid-column-picker-toggle">
                Filtrar Columnas
              </CDropdownToggle>
              <CDropdownMenu style={{ minWidth: 260 }}>
                {columns
                  .filter((column) => column.key !== 'actions')
                  .map((column) => (
                    <CDropdownItem as="div" key={column.key} className="py-2">
                      <CFormCheck
                        label={column.label}
                        checked={isColumnVisible(column.key)}
                        onChange={(event) => setColumnVisible(column.key, event.target.checked)}
                      />
                    </CDropdownItem>
                  ))}
              </CDropdownMenu>
            </CDropdown>
            {canExport && (
              <>
                <CButton
                  className="commercial-export-button"
                  color="secondary"
                  variant="outline"
                  onClick={() => openExport('xlsx')}
                  disabled={exporting || loading}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  Exportar a Excel
                </CButton>
                <CButton
                  className="commercial-export-button"
                  color="secondary"
                  variant="outline"
                  onClick={() => openExport('pdf')}
                  disabled={exporting || loading}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  Exportar a PDF
                </CButton>
              </>
            )}
            {canCreate && (
              <CButton color="primary" onClick={openCreate}>
                <CIcon icon={cilPlus} className="me-1" />
                Nuevo
              </CButton>
            )}
          </div>
        </CCardHeader>
        <CCardBody>
          <div className="commercial-tabs mb-3">
            {readableResourceOrder.map((key) => (
              <Link
                key={key}
                className={`commercial-tab ${masterResourceKeys.has(key) ? 'master' : ''} ${
                  key === resourceKey ? 'active' : ''
                }`}
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
                disabled={loading}
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
                disabled={loading || !q}
              >
                <CIcon icon={cilX} className="me-1" />
                Limpiar
              </CButton>
            </CCol>
          </CRow>

          <div className={`macos-grid commercial-grid commercial-grid-${resourceKey}`}>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  {columns.map((column) => {
                    if (column.key !== 'actions' && !isColumnVisible(column.key)) return null
                    if (column.key === 'actions') {
                      return (
                        <SortableTableHeader
                          key={column.key}
                          column={column}
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                          className="actions-cell"
                        />
                      )
                    }
                    return (
                      <SortableTableHeader
                        key={column.key}
                        column={column}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    )
                  })}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.map((row, index) => (
                  <CTableRow key={`${resourceKey}-${getRecordId(row) || index}`}>
                    {listFields.map((field) =>
                      isColumnVisible(field) ? (
                        <CTableDataCell key={field}>
                          {renderListValue(field, row[field], row)}
                        </CTableDataCell>
                      ) : null,
                    )}
                    <CTableDataCell className="actions-cell">
                      <CButtonGroup size="sm">
                        {resourceKey === 'contratos_empresa' && (
                          <CButton
                            className="grid-action-open"
                            color="secondary"
                            variant="outline"
                            onClick={() => openFunctionalForm(row)}
                          >
                            <CIcon icon={cilExternalLink} />
                          </CButton>
                        )}
                        <CButton
                          className="grid-action-view"
                          color="secondary"
                          variant="outline"
                          onClick={() => openDetail(row)}
                        >
                          <CIcon icon={cilZoom} />
                        </CButton>
                        {canWrite && (
                          <CButton
                            className="grid-action-edit"
                            color="secondary"
                            variant="outline"
                            onClick={() => openEdit(row)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                        )}
                        <CButton
                          className="grid-action-history"
                          color="secondary"
                          variant="outline"
                          onClick={() => openChangeLog(row)}
                        >
                          <CIcon icon={cilHistory} />
                        </CButton>
                        {canHardDelete && (
                          <CButton color="danger" variant="outline" onClick={() => remove(row)}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        )}
                      </CButtonGroup>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {items.length === 0 && (
                  <CTableRow>
                    <CTableDataCell
                      colSpan={listFields.filter((field) => isColumnVisible(field)).length + 1}
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
          onKeyDownCapture={(event) => handleEnterToNextField(event, formModalRef.current)}
        >
          <CModalBody>
            <div ref={formModalRef} className="commercial-form-layout">
              {getFormSections().map((section) => {
                const sectionIcon = formIconMap[section.icon] || cilList

                return (
                  <section className="commercial-form-section" key={section.title}>
                    <div className="commercial-form-section-title">
                      <CIcon icon={sectionIcon} />
                      <span>{section.title}</span>
                    </div>
                    <CRow className="g-3">
                      {section.fields.map((field) => (
                        <CCol
                          md={['textarea', 'file-upload'].includes(field.type) ? 12 : 6}
                          key={field.name}
                        >
                          <div className="commercial-form-field">
                            <CFormLabel className="commercial-field-label">
                              <CIcon icon={getFieldIcon(field)} />
                              <span>
                                {field.label}
                                {field.required && <span className="text-danger"> *</span>}
                              </span>
                            </CFormLabel>
                            {renderField(field)}
                          </div>
                        </CCol>
                      ))}
                    </CRow>
                  </section>
                )
              })}
            </div>
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
                <strong>{formatValue(getRecordId(current))}</strong>
              </div>
              {detailFields.map((field) => (
                <div key={field.name}>
                  <span className="text-body-secondary">{field.label}</span>
                  <strong>
                    {amountFields.has(field.name)
                      ? formatCurrencyAmount(current[field.name], current.divisa)
                      : formatFieldValue(
                          field.name,
                          current[
                            field.lookup
                              ? field.label?.toLowerCase().replaceAll(' ', '_')
                              : field.name
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

      <CModal alignment="center" size="xl" visible={modalMode === 'changeLog'} onClose={closeModal}>
        <CModalHeader>
          <CModalTitle>Log de cambios {config.singular}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="macos-grid commercial-grid">
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableDataCell as="th">Fecha</CTableDataCell>
                  <CTableDataCell as="th">Accion</CTableDataCell>
                  <CTableDataCell as="th">Campo</CTableDataCell>
                  <CTableDataCell as="th">Valor anterior</CTableDataCell>
                  <CTableDataCell as="th">Valor nuevo</CTableDataCell>
                  <CTableDataCell as="th">Usuario</CTableDataCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {changeLogs.map((log) => (
                  <CTableRow key={log.id_log}>
                    <CTableDataCell>{formatDateTime(log.fecha_cambio)}</CTableDataCell>
                    <CTableDataCell>{formatValue(log.accion)}</CTableDataCell>
                    <CTableDataCell>{log.campo || 'Registro'}</CTableDataCell>
                    <CTableDataCell className="commercial-log-value">
                      {formatValue(log.valor_anterior)}
                    </CTableDataCell>
                    <CTableDataCell className="commercial-log-value">
                      {formatValue(log.valor_nuevo)}
                    </CTableDataCell>
                    <CTableDataCell>{formatValue(log.usuario)}</CTableDataCell>
                  </CTableRow>
                ))}
                {!loadingLog && changeLogs.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-body-secondary">
                      Sin cambios registrados
                    </CTableDataCell>
                  </CTableRow>
                )}
                {loadingLog && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-body-secondary">
                      Cargando log...
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeModal}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>

      <ExportModal
        visible={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onConfirm={confirmExport}
        submitting={exporting}
        format={exportFormat}
      />
    </>
  )
}

export default CommercialModule
