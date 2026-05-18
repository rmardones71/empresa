import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
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
import {
  cilAddressBook,
  cilBadge,
  cilBriefcase,
  cilBuilding,
  cilCalendar,
  cilCheckCircle,
  cilCloudDownload,
  cilContact,
  cilDescription,
  cilEnvelopeClosed,
  cilFile,
  cilLink,
  cilList,
  cilMoney,
  cilNotes,
  cilPencil,
  cilPhone,
  cilPlus,
  cilSave,
  cilSearch,
  cilTrash,
  cilX,
} from '@coreui/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import ExportModal from 'src/components/ExportModal'
import GridPaginationBar from 'src/components/GridPaginationBar'
import MacDateInput from 'src/components/MacDateInput'
import SortableTableHeader from 'src/components/SortableTableHeader'
import {
  buildDateRangeParams,
  exportToPdf,
  exportToXlsx,
  canExportExcelPdf,
} from 'src/utils/export'
import { hasPermission, isSecurityAdmin } from 'src/utils/permissions'
import { scheduleFocusFirstField, handleEnterToNextField } from 'src/utils/formNavigation'
import { downloadAttachment, getAttachmentUrl } from 'src/utils/attachments'
import logoUcm from 'src/assets/images/brand/logo-ucm.png'
import { formatRut, getRutStatus } from 'src/views/commercial/rutChile'
import {
  chileRegions,
  getCiudadesByRegion,
  getComunasByCity,
} from 'src/views/commercial/chileLocations'

const moduleKey = 'commercial.contratos_empresa'

const emptyForm = {
  codigo_contrato_empresa: '',
  rut_empresa: '',
  id_categoria: '',
  id_tipo_servicio: '',
  id_estado_vital: '',
  id_estado_ctr: '',
  titulo: '',
  fecha_firma: '',
  fecha_inicio: '',
  fecha_termino: '',
  fecha_facturacion: '',
  medio_pago: '',
  reajustable: false,
  multa: '',
  requiere_orden_compra: false,
  id_frecuencia: '',
  id_tipo_tarifa: '',
  id_contacto: '',
  id_tipo_contacto: '',
  id_estado_contacto: '',
}

const emptyEmpresaForm = {
  rut: '',
  razon_social: '',
  nombre_fantasia: '',
  giro: '',
  rubro: '',
  id_categoria: '',
  direccion: '',
  ciudad: '',
  region: '',
  comuna: '',
  sitio_web: '',
}

const emptyContactoForm = {
  id_tipo_contacto: '',
  id_estado_contacto: '',
  rut: '',
  nombre: '',
  cargo: '',
  email: '',
  telefono: '',
  canal_preferido: '',
  autoriza_comunicaciones: false,
}

const emptyLineaForm = {
  contrato_empresa_id: '',
  titulo: '',
  id_tipo_servicio: '',
  id_tipo_tarifa: '',
  id_frecuencia: '',
  fecha_inicio: '',
  fecha_inicio_ciclo_facturacion: '',
  divisa: 'Peso',
  tarifa_fija: '',
  moneda_fijo: '',
  tarifa_variable: '',
  moneda_variable: '',
  unidad_variable: '',
  iva: true,
}

const emptyCasoForm = {
  id_contacto: '',
  contrato_empresa_id: '',
  titulo: '',
  texto: '',
  relato: '',
  adjuntos: '',
}

const emptyDocumentoForm = {
  contrato_empresa_id: '',
  tipo_documento: '',
  nombre: '',
  descripcion: '',
  version: '',
  responsable: '',
  archivo: '',
  estado: '',
}

const requiredFields = [
  'rut_empresa',
  'id_categoria',
  'id_tipo_servicio',
  'id_estado_vital',
  'id_estado_ctr',
  'titulo',
  'id_frecuencia',
  'id_tipo_tarifa',
  'id_contacto',
  'id_tipo_contacto',
  'id_estado_contacto',
]

const contractFieldLayoutStorageKey = 'contract-company-field-layout'
const legacyFieldLayoutAliases = {
  company: {
    categoria: 'rut_empresa_detalle',
  },
}

const defaultContractFieldLayout = {
  company: ['empresa', 'rut_empresa_detalle'],
  contract: [
    'titulo',
    'tipo_servicio',
    'estado_vital',
    'fecha_firma',
    'fecha_inicio',
    'fecha_termino',
    'fecha_facturacion',
    'medio_pago',
    'multa',
    'frecuencia',
    'tipo_tarifa',
    'reajustable',
    'requiere_orden_compra',
  ],
  contact: ['contacto', 'telefono_contacto', 'email_contacto'],
}

function normalizeFieldLayout(layout = {}) {
  return Object.entries(defaultContractFieldLayout).reduce((acc, [section, defaults]) => {
    const aliases = legacyFieldLayoutAliases[section] || {}
    const saved = Array.isArray(layout[section])
      ? layout[section].map((field) => aliases[field] || field)
      : []
    const validSaved = saved.filter((field) => defaults.includes(field))
    const missing = defaults.filter((field) => !validSaved.includes(field))
    acc[section] = [...validSaved, ...missing]
    return acc
  }, {})
}

function readStoredFieldLayout() {
  try {
    return normalizeFieldLayout(
      JSON.parse(window.localStorage.getItem(contractFieldLayoutStorageKey) || '{}'),
    )
  } catch (error) {
    return defaultContractFieldLayout
  }
}

function moveFieldInSection(layout, section, fromField, toField) {
  if (!section || !fromField || !toField || fromField === toField) return layout
  const current = layout[section] || []
  const fromIndex = current.indexOf(fromField)
  const toIndex = current.indexOf(toField)
  if (fromIndex < 0 || toIndex < 0) return layout
  const next = [...current]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return { ...layout, [section]: next }
}

function normalizeRutForCompare(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s+/g, '')
}

function normalizeTextForSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreCompanyHeaderMatch(item, rawQuery) {
  const textQuery = normalizeTextForSearch(rawQuery)
  const rutQuery = normalizeRutForCompare(rawQuery)
  const razonSocial = normalizeTextForSearch(item?.razon_social)
  const nombreFantasia = normalizeTextForSearch(item?.nombre_fantasia)
  const rut = normalizeRutForCompare(item?.rut)

  let score = -1
  if (rutQuery && rut.includes(rutQuery)) score = Math.max(score, rut === rutQuery ? 600 : 500)
  if (textQuery && razonSocial.startsWith(textQuery)) score = Math.max(score, 400)
  else if (textQuery && razonSocial.includes(textQuery)) score = Math.max(score, 300)
  if (textQuery && nombreFantasia.startsWith(textQuery)) score = Math.max(score, 250)
  else if (textQuery && nombreFantasia.includes(textQuery)) score = Math.max(score, 200)

  return score
}

function filterCompanyHeaderMatches(items = [], rawQuery) {
  return [...items]
    .map((item) => ({ item, score: scoreCompanyHeaderMatch(item, rawQuery) }))
    .filter(({ score }) => score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.item?.razon_social || '').localeCompare(String(b.item?.razon_social || ''), 'es'),
    )
    .map(({ item }) => item)
}

const relatedConfig = {
  lineas: {
    title: 'Linea de Contrato',
    icon: cilList,
    lookup: 'lineas',
    idField: 'id_linea',
    selectedField: 'lineas',
    route: '/commercial/lineas',
    endpoint: 'lineas',
    columns: [
      ['titulo', 'Titulo'],
      ['contrato', 'Contrato'],
      ['tipo_servicio', 'Servicio'],
      ['tipo_tarifa', 'Tarifa'],
      ['frecuencia', 'Frecuencia'],
      ['divisa', 'Divisa'],
      ['tarifa_fija', 'Fija'],
      ['tarifa_variable', 'Variable'],
    ],
  },
  casos: {
    title: 'Generar Caso',
    icon: cilNotes,
    lookup: 'casos',
    idField: 'id_caso',
    selectedField: 'casos',
    route: '/commercial/casos',
    endpoint: 'casos',
    columns: [
      ['titulo', 'Titulo'],
      ['contacto', 'Contacto'],
      ['contrato', 'Contrato'],
      ['texto', 'Texto'],
      ['adjuntos', 'Archivo'],
    ],
  },
  documentos: {
    title: 'Documentos',
    icon: cilFile,
    lookup: 'documentos',
    idField: 'id_documento',
    selectedField: 'documentos',
    route: '/commercial/documentos',
    endpoint: 'documentos',
    columns: [
      ['nombre', 'Nombre'],
      ['tipo_documento', 'Tipo'],
      ['version', 'Version'],
      ['estado', 'Estado'],
      ['responsable', 'Responsable'],
      ['archivo', 'Archivo'],
    ],
  },
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).slice(0, 10)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  return String(value)
}

const contractExportColumns = [
  ['codigo_contrato_empresa', 'Codigo contrato'],
  ['titulo', 'Titulo'],
  ['rut_empresa', 'RUT empresa'],
  ['empresa', 'Empresa'],
  ['contacto', 'Contacto'],
  ['estado_ctr', 'Estado contrato'],
  ['estado_vital', 'Estado vital'],
  ['tipo_servicio', 'Tipo servicio'],
  ['tipo_tarifa', 'Tipo tarifa'],
  ['frecuencia', 'Frecuencia'],
  ['fecha_inicio', 'Fecha inicio'],
  ['fecha_termino', 'Fecha termino'],
  ['medio_pago', 'Medio pago'],
  ['updated_at', 'Fecha actualizacion'],
]

const contractLineExportColumns = [
  ['codigo_contrato_empresa', 'Codigo contrato'],
  ['contrato', 'Contrato'],
  ['titulo', 'Titulo linea'],
  ['tipo_servicio', 'Servicio'],
  ['tipo_tarifa', 'Tarifa'],
  ['frecuencia', 'Frecuencia'],
  ['divisa', 'Divisa'],
  ['tarifa_fija', 'Tarifa fija'],
  ['tarifa_variable', 'Tarifa variable'],
  ['moneda_fijo', 'Moneda fijo'],
  ['moneda_variable', 'Moneda variable'],
]

const contractCaseExportColumns = [
  ['codigo_contrato_empresa', 'Codigo contrato'],
  ['contrato', 'Contrato'],
  ['titulo', 'Titulo caso'],
  ['contacto', 'Contacto'],
  ['texto', 'Texto'],
  ['relato', 'Relato'],
  ['adjuntos', 'Archivo'],
]

const contractDocumentExportColumns = [
  ['codigo_contrato_empresa', 'Codigo contrato'],
  ['contrato', 'Contrato'],
  ['nombre', 'Nombre'],
  ['tipo_documento', 'Tipo documento'],
  ['version', 'Version'],
  ['estado', 'Estado'],
  ['responsable', 'Responsable'],
  ['archivo', 'Archivo'],
]

function getLookupLabel(options = [], value) {
  const option = options.find((item) => String(item.id) === String(value))
  return option?.label || '-'
}

function normalizeSearchQuery(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

function getContractSearchBadge(item) {
  return item?.codigo_contrato_empresa || `#${item?.id || '-'}`
}

function normalizeAmountInput(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.replace(/\$/g, '').replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
}

function formatCurrencyAmount(value, divisa = 'Peso') {
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

function formatAmountForInput(value, divisa = 'Peso') {
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

function normalizeAmountForSave(value, divisa = 'Peso') {
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

function normalizeLookupText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getDefaultEstadoContrato(lookups = {}) {
  const borrador = (lookups.estados_ctr || []).find(
    (item) => normalizeLookupText(item.label) === 'borrador',
  )
  return borrador?.id ? String(borrador.id) : ''
}

function getDisplayUser(user = {}) {
  return (
    user.name ||
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    user.Username ||
    user.email ||
    user.Email ||
    'Usuario sistema'
  )
}

const LookupField = ({ label, icon, value, options, onChange, required, disabled }) => {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return options
    return options.filter((item) =>
      String(item.label || '')
        .toLowerCase()
        .includes(term),
    )
  }, [filter, options])

  return (
    <div className="contract-field">
      <CFormLabel>
        <CIcon icon={icon} />
        <span>
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
      </CFormLabel>
      <CFormInput
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Buscar..."
        disabled={disabled}
      />
      <CFormSelect
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">Seleccione...</option>
        {filtered.map((item) => (
          <option key={item.id} value={String(item.id)}>
            {item.label}
          </option>
        ))}
      </CFormSelect>
    </div>
  )
}

const SearchableLookupField = ({
  label,
  icon,
  value,
  options,
  onChange,
  required,
  disabled,
  placeholder = 'Buscar o seleccionar...',
  footerActionLabel,
  onFooterAction,
  selectedActionLabel,
  onSelectedAction,
  hideLabel = false,
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef(null)
  const skipNextFocusRef = useRef(false)

  const selectedOption = useMemo(
    () => options.find((item) => String(item.id) === String(value)) || null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const term = normalizeLookupText(query.trim())
    if (!term) return options
    return options.filter((item) => {
      const labelText = normalizeLookupText(item.label)
      const idText = normalizeLookupText(item.id)
      return labelText.includes(term) || idText.includes(term)
    })
  }, [options, query])

  const closeMenu = () => {
    setIsOpen(false)
    setQuery(selectedOption?.label || '')
  }

  const openMenu = () => {
    if (skipNextFocusRef.current) {
      skipNextFocusRef.current = false
      setIsOpen(false)
      setQuery(selectedOption?.label || '')
      return
    }
    setQuery('')
    setIsOpen(true)
  }

  const selectOption = (item) => {
    onChange(String(item.id))
    setQuery(item.label || '')
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) setQuery(selectedOption?.label || '')
  }, [isOpen, selectedOption])

  useEffect(() => {
    if (!value) return
    setIsOpen(false)
    setQuery(selectedOption?.label || '')
    inputRef.current?.blur()
  }, [value, selectedOption?.label])

  return (
    <div className="contract-field contract-searchable-field">
      {!hideLabel && (
        <CFormLabel>
          <CIcon icon={icon} />
          <span>
            {label}
            {required && <span className="text-danger"> *</span>}
          </span>
        </CFormLabel>
      )}
      <div className="contract-lookup">
        <CFormInput
          ref={inputRef}
          value={isOpen ? query : selectedOption?.label || query}
          onClick={openMenu}
          onChange={(event) => {
            const nextValue = event.target.value
            setQuery(nextValue)
            setIsOpen(true)
            if (!nextValue.trim()) onChange('')
          }}
          onBlur={() => {
            window.setTimeout(() => {
              closeMenu()
            }, 150)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeMenu()
            if (event.key === 'Enter' && filtered.length === 1) {
              event.preventDefault()
              selectOption(filtered[0])
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        {onSelectedAction && (
          <CButton
            type="button"
            color="light"
            className="contract-lookup-action"
            title={selectedActionLabel}
            disabled={disabled || !value}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              skipNextFocusRef.current = true
              closeMenu()
              inputRef.current?.blur()
              onSelectedAction(value)
            }}
          >
            <CIcon icon={cilSearch} />
          </CButton>
        )}
        {isOpen && !disabled && (
          <div className="contract-lookup-menu">
            <div className="contract-lookup-options">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`contract-lookup-option ${
                    String(item.id) === String(value) ? 'active' : ''
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(item)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.id}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="contract-lookup-empty">No se encontraron coincidencias</div>
              )}
            </div>
            {onFooterAction && (
              <button
                type="button"
                className="contract-lookup-footer"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsOpen(false)
                  onFooterAction(query)
                }}
              >
                <CIcon icon={cilPlus} />
                <span>{footerActionLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ContractSection = ({ title, icon, children, className = '' }) => (
  <section className={`contract-company-section ${className}`}>
    <div className="contract-company-section-title">
      <CIcon icon={icon} />
      <span>{title}</span>
    </div>
    {children}
  </section>
)

const ContractHeaderSearch = ({ disabled = false, onSelect, onSelectCompany }) => {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const requestRef = useRef(0)
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const lastQueryRef = useRef('')
  const selectingRef = useRef(false)
  const termRef = useRef('')

  const cleanTerm = normalizeSearchQuery(term)
  termRef.current = cleanTerm
  const canShowResults =
    open &&
    !!cleanTerm &&
    lastQueryRef.current === cleanTerm &&
    ['ready', 'empty', 'error'].includes(status)

  const clearPendingSearch = () => {
    if (!debounceRef.current) return
    window.clearTimeout(debounceRef.current)
    debounceRef.current = null
  }

  const resetSearch = ({ clearInput = false } = {}) => {
    clearPendingSearch()
    requestRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    lastQueryRef.current = ''
    setOpen(false)
    setResults([])
    setStatus('idle')
    setActiveIndex(-1)
    if (clearInput) {
      termRef.current = ''
      setTerm('')
    }
  }

  const executeSearch = async (rawQuery, { openResults = true } = {}) => {
    const query = normalizeSearchQuery(rawQuery)
    if (!query) {
      resetSearch()
      return []
    }
    if (selectingRef.current || termRef.current !== query) return []

    const requestId = requestRef.current + 1
    requestRef.current = requestId
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setOpen(false)
    setResults([])
    setActiveIndex(-1)

    try {
      const res = await api.get('/api/contratos-empresa', {
        signal: controller.signal,
        params: {
          page: 1,
          pageSize: 8,
          q: query,
          searchMode: 'header',
          sortBy: 'updated_at',
          sortDir: 'desc',
        },
      })
      if (requestRef.current !== requestId || selectingRef.current || termRef.current !== query) {
        return []
      }
      const nextResults = res.data.items || []
      let finalResults = nextResults
      if (!finalResults.length && onSelectCompany) {
        const companyRes = await api.get('/api/commercial/empresas', {
          signal: controller.signal,
          params: {
            page: 1,
            pageSize: 6,
            q: query,
            sortBy: 'rut',
            sortDir: 'asc',
          },
        })
        if (requestRef.current !== requestId || selectingRef.current || termRef.current !== query) {
          return []
        }
        const matchedCompanies = filterCompanyHeaderMatches(companyRes.data.items || [], query)
        finalResults = matchedCompanies.map((item) => ({
          ...item,
          id: `empresa:${item.rut}`,
          searchKind: 'company',
        }))
      }
      lastQueryRef.current = query
      setResults(finalResults)
      setStatus(finalResults.length ? 'ready' : 'empty')
      setActiveIndex(finalResults.length ? 0 : -1)
      setOpen(openResults)
      return finalResults
    } catch (error) {
      if (
        requestRef.current !== requestId ||
        termRef.current !== query ||
        error?.code === 'ERR_CANCELED'
      ) {
        return []
      }
      lastQueryRef.current = query
      setResults([])
      setStatus('error')
      setOpen(openResults)
      return []
    }
  }

  useEffect(() => {
    if (selectingRef.current || disabled) {
      resetSearch()
      return undefined
    }

    const query = normalizeSearchQuery(term)
    if (!query) {
      resetSearch()
      return undefined
    }

    clearPendingSearch()
    requestRef.current += 1
    abortRef.current?.abort()
    lastQueryRef.current = ''
    setOpen(false)
    setResults([])
    setStatus('idle')
    setActiveIndex(-1)

    const timeoutId = window.setTimeout(() => {
      debounceRef.current = null
      executeSearch(query).catch(() => {})
    }, 260)
    debounceRef.current = timeoutId

    return () => {
      if (debounceRef.current === timeoutId) debounceRef.current = null
      window.clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, disabled])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const selectResult = async (item) => {
    if ((!item?.id && !item?.rut) || selectingRef.current) return
    selectingRef.current = true
    clearPendingSearch()
    requestRef.current += 1
    abortRef.current?.abort()
    setOpen(false)
    setResults([])
    setStatus('idle')
    setActiveIndex(-1)
    try {
      if (item.searchKind === 'company') await onSelectCompany?.(item)
      else await onSelect?.(item)
    } finally {
      lastQueryRef.current = ''
      termRef.current = ''
      setTerm('')
      selectingRef.current = false
    }
  }

  const pickResult = (event, item) => {
    event.preventDefault()
    event.stopPropagation()
    selectResult(item)
  }

  const submitSearch = async () => {
    if (!cleanTerm || disabled) return
    clearPendingSearch()
    if (lastQueryRef.current === cleanTerm && results.length === 1) {
      await selectResult(results[0])
      return
    }
    const nextResults = await executeSearch(cleanTerm)
    if (nextResults.length === 1) await selectResult(nextResults[0])
  }

  const moveActive = (delta) => {
    if (!results.length) return
    setOpen(true)
    setActiveIndex((prev) => {
      const current = prev < 0 ? 0 : prev
      return Math.min(results.length - 1, Math.max(0, current + delta))
    })
  }

  return (
    <div className="contract-company-header-search" ref={containerRef}>
      <div className="contract-company-search">
        <CIcon icon={cilSearch} />
        <CFormInput
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            setOpen(false)
          }}
          onFocus={() => {
            if (lastQueryRef.current === cleanTerm && results.length) setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              moveActive(1)
              return
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              moveActive(-1)
              return
            }
            if (event.key === 'Escape') {
              setOpen(false)
              return
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              const selected = activeIndex >= 0 ? results[activeIndex] : null
              if (selected && lastQueryRef.current === cleanTerm) {
                selectResult(selected)
                return
              }
              submitSearch()
            }
          }}
          placeholder="Buscar por codigo contrato, RUT empresa o razon social..."
          disabled={disabled}
        />
        {term && (
          <CButton
            className="contract-header-button"
            type="button"
            onClick={() => resetSearch({ clearInput: true })}
            disabled={disabled}
          >
            <CIcon icon={cilX} />
          </CButton>
        )}
        <CButton
          className="contract-header-button contract-header-button-search"
          type="button"
          onClick={submitSearch}
          disabled={disabled}
        >
          <CIcon icon={cilSearch} />
        </CButton>
      </div>
      {canShowResults && (
        <div className="contract-search-results">
          {status === 'empty' && (
            <div className="contract-search-result">
              <span>0</span>
              <strong>Sin resultados</strong>
              <em>Prueba con otro texto</em>
            </div>
          )}
          {status === 'error' && (
            <div className="contract-search-result">
              <span>!</span>
              <strong>No se pudo buscar</strong>
              <em>Intenta nuevamente</em>
            </div>
          )}
          {results.slice(0, 6).map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={`contract-search-result ${activeIndex === index ? 'is-keyboard-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onPointerDown={(event) => pickResult(event, item)}
              onMouseDown={(event) => pickResult(event, item)}
              onClick={(event) => pickResult(event, item)}
            >
              <span>{item.searchKind === 'company' ? 'EMP' : getContractSearchBadge(item)}</span>
              <strong>{item.searchKind === 'company' ? item.razon_social : item.titulo}</strong>
              <em>
                {item.searchKind === 'company'
                  ? `${formatRut(item.rut)} · Empresa sin contrato`
                  : item.empresa}
              </em>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ContratoEmpresa = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useSelector((state) => state.auth.user)
  const canCreate = hasPermission(user, moduleKey, 'create')
  const canRead = hasPermission(user, moduleKey, 'read')
  const canWrite = hasPermission(user, moduleKey, 'write')
  const canDelete = hasPermission(user, moduleKey, 'delete')
  const canHardDelete = canDelete && isSecurityAdmin(user?.role)
  const canExport = canExportExcelPdf(user)
  const canReorderFields = isSecurityAdmin(user?.role)
  const canCreateEmpresa = hasPermission(user, 'commercial.empresas', 'create')
  const canCreateContacto = hasPermission(user, 'commercial.contactos', 'create')
  const canCreateLinea = hasPermission(user, 'commercial.lineas', 'create')
  const canWriteLinea = hasPermission(user, 'commercial.lineas', 'write')
  const canCreateCaso = hasPermission(user, 'commercial.casos', 'create')
  const canWriteCaso = hasPermission(user, 'commercial.casos', 'write')
  const canCreateDocumento = hasPermission(user, 'commercial.documentos', 'create')
  const canWriteDocumento = hasPermission(user, 'commercial.documentos', 'write')

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('desc')
  const [lookups, setLookups] = useState({})
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [related, setRelated] = useState({ lineas: [], casos: [], documentos: [] })
  const [selectedRelated, setSelectedRelated] = useState({ lineas: '', casos: '', documentos: '' })
  const [showEmpresaModal, setShowEmpresaModal] = useState(false)
  const [empresaForm, setEmpresaForm] = useState(emptyEmpresaForm)
  const [empresaEditingId, setEmpresaEditingId] = useState(null)
  const [empresaSaving, setEmpresaSaving] = useState(false)
  const [showContactoModal, setShowContactoModal] = useState(false)
  const [contactoForm, setContactoForm] = useState(emptyContactoForm)
  const [contactoEditingId, setContactoEditingId] = useState(null)
  const [contactoSaving, setContactoSaving] = useState(false)
  const [showLineaModal, setShowLineaModal] = useState(false)
  const [lineaForm, setLineaForm] = useState(emptyLineaForm)
  const [lineaEditingId, setLineaEditingId] = useState(null)
  const [lineaSaving, setLineaSaving] = useState(false)
  const [showCasoModal, setShowCasoModal] = useState(false)
  const [casoForm, setCasoForm] = useState(emptyCasoForm)
  const [casoEditingId, setCasoEditingId] = useState(null)
  const [casoSaving, setCasoSaving] = useState(false)
  const [showDocumentoModal, setShowDocumentoModal] = useState(false)
  const [documentoForm, setDocumentoForm] = useState(emptyDocumentoForm)
  const [documentoEditingId, setDocumentoEditingId] = useState(null)
  const [documentoSaving, setDocumentoSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [draftCreatedAt, setDraftCreatedAt] = useState(() => new Date().toISOString())
  const [fieldLayout, setFieldLayout] = useState(readStoredFieldLayout)
  const [draggingField, setDraggingField] = useState(null)
  const [loadingRecordId, setLoadingRecordId] = useState('')
  const reservedContractCodeRef = useRef('')
  const reserveRequestRef = useRef(0)
  const recordLoadRequestRef = useRef(0)
  const recordLoadingRef = useRef(false)
  const pendingUrlSyncRef = useRef('')
  const resettingRecordRef = useRef(false)
  const exportLogoRef = useRef(null)
  const empresaModalRef = useRef(null)
  const empresaRutInputRef = useRef(null)
  const contractTitleInputRef = useRef(null)
  const contactoModalRef = useRef(null)
  const lineaModalRef = useRef(null)
  const casoModalRef = useRef(null)
  const documentoModalRef = useRef(null)
  const openRecordId = searchParams.get('open')
  const currentIdRef = useRef('')
  const openRecordIdRef = useRef('')
  currentIdRef.current = current?.id ? String(current.id) : ''
  openRecordIdRef.current = openRecordId ? String(openRecordId) : ''

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const empresaRutStatus = useMemo(
    () => getRutStatus(empresaForm.rut, { required: true }),
    [empresaForm.rut],
  )
  const empresaRutDuplicate = useMemo(() => {
    if (empresaEditingId) return null
    if (empresaRutStatus !== 'valid') return null
    const rutNorm = normalizeRutForCompare(empresaForm.rut)
    if (!rutNorm) return null
    const match = (lookups.empresas || []).find(
      (item) => normalizeRutForCompare(item?.id) === rutNorm,
    )
    return match || null
  }, [empresaEditingId, empresaForm.rut, empresaRutStatus, lookups.empresas])
  const ciudadesEmpresa = useMemo(
    () => getCiudadesByRegion(empresaForm.region),
    [empresaForm.region],
  )
  const comunasEmpresa = useMemo(
    () => getComunasByCity(empresaForm.region, empresaForm.ciudad),
    [empresaForm.region, empresaForm.ciudad],
  )
  const contactoRutStatus = useMemo(
    () => getRutStatus(contactoForm.rut, { required: false }),
    [contactoForm.rut],
  )
  const contactoRutDuplicate = useMemo(() => {
    if (!contactoForm.rut) return null
    if (contactoRutStatus !== 'valid') return null
    const rutNorm = normalizeRutForCompare(contactoForm.rut)
    if (!rutNorm) return null
    const match = (lookups.contactos || []).find((item) => {
      if (!item?.rut) return false
      if (contactoEditingId && String(item.id) === String(contactoEditingId)) return false
      return normalizeRutForCompare(item.rut) === rutNorm
    })
    return match || null
  }, [contactoEditingId, contactoForm.rut, contactoRutStatus, lookups.contactos])
  const selectedEmpresa = useMemo(
    () => (lookups.empresas || []).find((item) => String(item.id) === String(form.rut_empresa)),
    [form.rut_empresa, lookups.empresas],
  )
  const selectedContacto = useMemo(
    () => (lookups.contactos || []).find((item) => String(item.id) === String(form.id_contacto)),
    [form.id_contacto, lookups.contactos],
  )

  useEffect(() => {
    window.localStorage.setItem(contractFieldLayoutStorageKey, JSON.stringify(fieldLayout))
  }, [fieldLayout])

  useEffect(() => {
    if (!showEmpresaModal) return undefined
    const cancel = scheduleFocusFirstField(() => empresaModalRef.current, {
      attempts: 60,
      intervalMs: 50,
    })

    // CoreUI modal activates a focus-trap after the enter transition.
    // Reinforce focus to the first real field once everything is mounted/visible.
    const timeoutId = window.setTimeout(() => {
      const container = empresaModalRef.current
      if (!container) return
      const active = document.activeElement
      if (active && container.contains(active)) return

      const rutInput = empresaRutInputRef.current
      if (rutInput && !rutInput.disabled) {
        try {
          rutInput.focus({ preventScroll: true })
          rutInput.select?.()
        } catch {
          // ignore
        }
      }
    }, 200)

    return () => {
      cancel?.()
      window.clearTimeout(timeoutId)
    }
  }, [showEmpresaModal, empresaEditingId])

  useEffect(() => {
    if (!showContactoModal) return undefined
    return scheduleFocusFirstField(() => contactoModalRef.current)
  }, [showContactoModal, contactoEditingId])

  useEffect(() => {
    if (!showLineaModal) return undefined
    return scheduleFocusFirstField(() => lineaModalRef.current)
  }, [showLineaModal, lineaEditingId])

  useEffect(() => {
    if (!showCasoModal) return undefined
    return scheduleFocusFirstField(() => casoModalRef.current)
  }, [showCasoModal, casoEditingId])

  useEffect(() => {
    if (!showDocumentoModal) return undefined
    return scheduleFocusFirstField(() => documentoModalRef.current)
  }, [showDocumentoModal, documentoEditingId])

  const scheduleFocusContractTitle = ({ attempts = 24, intervalMs = 50 } = {}) => {
    let cancelled = false
    let remaining = Math.max(1, Number(attempts) || 1)

    const tick = () => {
      if (cancelled) return
      const input = contractTitleInputRef.current
      if (input && !input.disabled && document.contains(input)) {
        try {
          input.focus({ preventScroll: true })
          input.select?.()
          return
        } catch {
          // ignore
        }
      }
      remaining -= 1
      if (remaining <= 0) return
      window.setTimeout(tick, intervalMs)
    }

    window.setTimeout(tick, 0)
    return () => {
      cancelled = true
    }
  }

  const loadLookups = async () => {
    const res = await api.get('/api/contratos-empresa/lookups')
    const data = res.data || {}
    setLookups(data)
    setForm((prev) => {
      if (current?.id || prev.id_estado_ctr) return prev
      const defaultEstado = getDefaultEstadoContrato(data)
      return defaultEstado ? { ...prev, id_estado_ctr: defaultEstado } : prev
    })
    return data
  }

  const loadList = async ({ pageOverride, qOverride } = {}) => {
    setLoading(true)
    try {
      const searchText = normalizeSearchQuery(qOverride ?? '')
      const res = await api.get('/api/contratos-empresa', {
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
      toast.error(error.response?.data?.message || 'No se pudieron cargar contratos empresa')
    } finally {
      setLoading(false)
    }
  }

  const releaseReservedContractCode = async (code = reservedContractCodeRef.current) => {
    const codeToRelease = code
    if (!codeToRelease) return
    if (reservedContractCodeRef.current === codeToRelease) reservedContractCodeRef.current = ''
    try {
      await api.post('/api/contratos-empresa/release-code', {
        codigo_contrato_empresa: codeToRelease,
      })
    } catch (error) {
      // La liberacion es preventiva; no bloquea el trabajo del usuario si falla.
    }
  }

  const reserveContractCode = async ({ force = false } = {}) => {
    if (!canCreate || recordLoadingRef.current || reservedContractCodeRef.current) {
      return
    }
    if (!force && (currentIdRef.current || openRecordIdRef.current)) return
    const requestId = reserveRequestRef.current + 1
    reserveRequestRef.current = requestId
    try {
      const res = await api.post('/api/contratos-empresa/reserve-code')
      const code = res.data?.codigo_contrato_empresa || ''
      if (!code) return
      if (
        reserveRequestRef.current !== requestId ||
        recordLoadingRef.current ||
        (!force && (currentIdRef.current || openRecordIdRef.current))
      ) {
        await releaseReservedContractCode(code)
        return
      }
      reservedContractCodeRef.current = code
      setForm((prev) => ({
        ...prev,
        codigo_contrato_empresa: code,
        id_estado_ctr: prev.id_estado_ctr || getDefaultEstadoContrato(lookups),
      }))
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo reservar codigo de contrato')
    }
  }

  useEffect(() => {
    if (!canRead) return undefined
    const timeoutId = window.setTimeout(() => {
      loadLookups().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [canRead])

  useEffect(() => {
    if (!canRead) return undefined
    const timeoutId = window.setTimeout(() => {
      loadList().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, page, pageSize, sortBy, sortDir])

  useEffect(() => {
    if (!canRead) return undefined
    const recordId = openRecordId
    if (resettingRecordRef.current) {
      if (!recordId) resettingRecordRef.current = false
      return undefined
    }
    if (loadingRecordId) {
      if (
        String(recordId || '') === loadingRecordId &&
        String(current?.id || '') === loadingRecordId
      ) {
        pendingUrlSyncRef.current = ''
        setLoadingRecordId('')
      }
      return undefined
    }
    if (!recordId || String(current?.id) === String(recordId)) return undefined
    if (pendingUrlSyncRef.current === String(recordId)) {
      pendingUrlSyncRef.current = ''
      if (String(current?.id) === String(recordId)) return undefined
    }
    const timeoutId = window.setTimeout(() => {
      loadRecord(recordId, { syncUrl: false })
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, openRecordId, current?.id, loadingRecordId])

  useEffect(() => {
    if (!canRead || !canCreate || current?.id || form.codigo_contrato_empresa) return undefined
    if (openRecordId) return undefined
    const timeoutId = window.setTimeout(() => {
      reserveContractCode()
    }, 0)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canRead,
    canCreate,
    current?.id,
    form.codigo_contrato_empresa,
    lookups.estados_ctr,
    openRecordId,
  ])

  useEffect(() => {
    if (!canCreate || current?.id || openRecordId) return undefined
    return scheduleFocusContractTitle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCreate, current?.id, openRecordId])

  useEffect(
    () => () => {
      const code = reservedContractCodeRef.current
      if (code) releaseReservedContractCode(code)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const setField = (field, value, sourceLookups = lookups) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'rut_empresa') {
        const empresa = (sourceLookups.empresas || []).find(
          (item) => String(item.id) === String(value),
        )
        if (empresa?.id_categoria) next.id_categoria = String(empresa.id_categoria)
      }
      if (field === 'id_contacto') {
        const contacto = (sourceLookups.contactos || []).find(
          (item) => String(item.id) === String(value),
        )
        if (contacto?.id_tipo_contacto) next.id_tipo_contacto = String(contacto.id_tipo_contacto)
        if (contacto?.id_estado_contacto)
          next.id_estado_contacto = String(contacto.id_estado_contacto)
      }
      return next
    })
  }

  const resetForm = async ({ reserve = true } = {}) => {
    const codeToRelease = reservedContractCodeRef.current
    resettingRecordRef.current = true
    recordLoadRequestRef.current += 1
    reserveRequestRef.current += 1
    recordLoadingRef.current = false
    pendingUrlSyncRef.current = ''
    setLoadingRecordId('')
    setLoading(false)
    setCurrent(null)
    setDraftCreatedAt(new Date().toISOString())
    setForm({
      ...emptyForm,
      id_estado_ctr: getDefaultEstadoContrato(lookups),
    })
    setRelated({ lineas: [], casos: [], documentos: [] })
    setSelectedRelated({ lineas: '', casos: '', documentos: '' })
    setSearchParams({}, { replace: true })
    scheduleFocusContractTitle()
    if (codeToRelease) releaseReservedContractCode(codeToRelease).catch(() => {})
    if (reserve) window.setTimeout(() => reserveContractCode({ force: true }), 0)
  }

  const selectCompanyForDraft = async (empresa) => {
    if (!empresa?.rut || !canCreate) return
    const effectiveLookups = await loadLookups()
    await resetForm()
    setField('rut_empresa', empresa.rut, effectiveLookups)
    if (empresa.id_categoria)
      setField('id_categoria', String(empresa.id_categoria), effectiveLookups)
    toast.info('Empresa cargada para un nuevo contrato')
  }

  const openEmpresaModal = (suggestedName = '') => {
    if (!canCreateEmpresa) return
    const suggested = suggestedName.trim()
    setEmpresaEditingId(null)
    setEmpresaForm({
      ...emptyEmpresaForm,
      razon_social: suggested,
      nombre_fantasia: suggested,
      id_categoria: form.id_categoria || '',
    })
    setShowEmpresaModal(true)
  }

  const openEmpresaEditModal = async (rut = form.rut_empresa) => {
    if (!rut) return
    setEmpresaSaving(true)
    try {
      const res = await api.get(`/api/commercial/empresas/${encodeURIComponent(rut)}`)
      const data = res.data || {}
      setEmpresaEditingId(rut)
      setEmpresaForm({
        ...emptyEmpresaForm,
        rut: data.rut || rut,
        razon_social: data.razon_social || '',
        nombre_fantasia: data.nombre_fantasia || '',
        giro: data.giro || '',
        rubro: data.rubro || '',
        id_categoria: data.id_categoria ? String(data.id_categoria) : '',
        direccion: data.direccion || '',
        ciudad: data.ciudad || '',
        region: data.region || '',
        comuna: data.comuna || '',
        sitio_web: data.sitio_web || '',
      })
      setShowEmpresaModal(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo abrir la empresa')
    } finally {
      setEmpresaSaving(false)
    }
  }

  const openContactoModal = (suggestedName = '') => {
    if (!canCreateContacto) return
    const suggested = suggestedName.trim()
    setContactoEditingId(null)
    setContactoForm({
      ...emptyContactoForm,
      id_tipo_contacto: form.id_tipo_contacto || '',
      id_estado_contacto: form.id_estado_contacto || '',
      nombre: suggested,
    })
    setShowContactoModal(true)
  }

  const openContactoEditModal = async (id = form.id_contacto) => {
    if (!id) return
    setContactoSaving(true)
    try {
      const res = await api.get(`/api/commercial/contactos/${encodeURIComponent(id)}`)
      const data = res.data || {}
      setContactoEditingId(id)
      setContactoForm({
        ...emptyContactoForm,
        id_tipo_contacto: data.id_tipo_contacto ? String(data.id_tipo_contacto) : '',
        id_estado_contacto: data.id_estado_contacto ? String(data.id_estado_contacto) : '',
        rut: data.rut || '',
        nombre: data.nombre || '',
        cargo: data.cargo || '',
        email: data.email || '',
        telefono: data.telefono || '',
        canal_preferido: data.canal_preferido || '',
        autoriza_comunicaciones: !!data.autoriza_comunicaciones,
      })
      setShowContactoModal(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo abrir el contacto')
    } finally {
      setContactoSaving(false)
    }
  }

  const normalizeLineaForm = (row = {}) => ({
    contrato_empresa_id: row.contrato_empresa_id
      ? String(row.contrato_empresa_id)
      : current?.id
        ? String(current.id)
        : '',
    titulo: row.titulo || '',
    id_tipo_servicio: row.id_tipo_servicio ? String(row.id_tipo_servicio) : '',
    id_tipo_tarifa: row.id_tipo_tarifa ? String(row.id_tipo_tarifa) : '',
    id_frecuencia: row.id_frecuencia ? String(row.id_frecuencia) : '',
    fecha_inicio: formatDate(row.fecha_inicio) === '-' ? '' : formatDate(row.fecha_inicio),
    fecha_inicio_ciclo_facturacion:
      formatDate(row.fecha_inicio_ciclo_facturacion) === '-'
        ? ''
        : formatDate(row.fecha_inicio_ciclo_facturacion),
    divisa: row.divisa || 'Peso',
    tarifa_fija: row.tarifa_fija ?? '',
    moneda_fijo: row.moneda_fijo || '',
    tarifa_variable: row.tarifa_variable ?? '',
    moneda_variable: row.moneda_variable || '',
    unidad_variable: row.unidad_variable || '',
    iva: row.iva === undefined || row.iva === null ? true : !!row.iva,
  })

  const openLineaModal = (suggestedTitle = '') => {
    if (!canCreateLinea) return
    const suggested = String(suggestedTitle || '').trim()
    const contratoId = current?.id || ''
    setLineaEditingId(null)
    setLineaForm({
      ...emptyLineaForm,
      contrato_empresa_id: contratoId ? String(contratoId) : '',
      titulo: suggested || (form.titulo ? `Linea ${form.titulo}` : ''),
      id_tipo_servicio: form.id_tipo_servicio || '',
      id_tipo_tarifa: form.id_tipo_tarifa || '',
      id_frecuencia: form.id_frecuencia || '',
      fecha_inicio: form.fecha_inicio || '',
      divisa: 'Peso',
    })
    setShowLineaModal(true)
  }

  const openLineaEditModal = async (row) => {
    if (!canWriteLinea) return
    const lineaId = row?.id_linea
    if (!lineaId) return
    setLineaSaving(true)
    try {
      const res = await api.get(`/api/commercial/lineas/${encodeURIComponent(lineaId)}`)
      setLineaEditingId(lineaId)
      setLineaForm(normalizeLineaForm(res.data))
      setShowLineaModal(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo abrir la linea')
    } finally {
      setLineaSaving(false)
    }
  }

  const normalizeCasoForm = (row = {}) => ({
    id_contacto: row.id_contacto ? String(row.id_contacto) : form.id_contacto || '',
    contrato_empresa_id: row.contrato_empresa_id
      ? String(row.contrato_empresa_id)
      : current?.id
        ? String(current.id)
        : '',
    titulo: row.titulo || '',
    texto: row.texto || '',
    relato: row.relato || '',
    adjuntos: row.adjuntos || '',
  })

  const openCasoModal = (suggestedTitle = '') => {
    if (!canCreateCaso) return
    const suggested = String(suggestedTitle || '').trim()
    setCasoEditingId(null)
    setCasoForm({
      ...emptyCasoForm,
      id_contacto: form.id_contacto || '',
      contrato_empresa_id: current?.id ? String(current.id) : '',
      titulo: suggested || (form.titulo ? `Caso ${form.titulo}` : ''),
    })
    setShowCasoModal(true)
  }

  const openCasoEditModal = async (row) => {
    if (!canWriteCaso) return
    const casoId = row?.id_caso
    if (!casoId) return
    setCasoSaving(true)
    try {
      const res = await api.get(`/api/commercial/casos/${encodeURIComponent(casoId)}`)
      setCasoEditingId(casoId)
      setCasoForm(normalizeCasoForm(res.data))
      setShowCasoModal(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo abrir el caso')
    } finally {
      setCasoSaving(false)
    }
  }

  const normalizeDocumentoForm = (row = {}) => ({
    contrato_empresa_id: row.contrato_empresa_id
      ? String(row.contrato_empresa_id)
      : current?.id
        ? String(current.id)
        : '',
    tipo_documento: row.tipo_documento || '',
    nombre: row.nombre || '',
    descripcion: row.descripcion || '',
    version: row.version || '',
    responsable: row.responsable || '',
    archivo: row.archivo || '',
    estado: row.estado || '',
  })

  const openDocumentoModal = (suggestedName = '') => {
    if (!canCreateDocumento) return
    const suggested = String(suggestedName || '').trim()
    setDocumentoEditingId(null)
    setDocumentoForm({
      ...emptyDocumentoForm,
      contrato_empresa_id: current?.id ? String(current.id) : '',
      nombre: suggested,
    })
    setShowDocumentoModal(true)
  }

  const openDocumentoEditModal = async (row) => {
    if (!canWriteDocumento) return
    const documentoId = row?.id_documento
    if (!documentoId) return
    setDocumentoSaving(true)
    try {
      const res = await api.get(`/api/commercial/documentos/${encodeURIComponent(documentoId)}`)
      setDocumentoEditingId(documentoId)
      setDocumentoForm(normalizeDocumentoForm(res.data))
      setShowDocumentoModal(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo abrir el documento')
    } finally {
      setDocumentoSaving(false)
    }
  }

  const setLineaField = (field, value) => {
    setLineaForm((prev) => ({
      ...prev,
      [field]: value,
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

  const closeLineaModal = () => {
    if (lineaSaving) return
    setShowLineaModal(false)
    setLineaEditingId(null)
    setLineaForm(emptyLineaForm)
  }

  const setCasoField = (field, value) => {
    setCasoForm((prev) => ({ ...prev, [field]: value }))
  }

  const closeCasoModal = () => {
    if (casoSaving) return
    setShowCasoModal(false)
    setCasoEditingId(null)
    setCasoForm(emptyCasoForm)
  }

  const setDocumentoField = (field, value) => {
    setDocumentoForm((prev) => ({ ...prev, [field]: value }))
  }

  const uploadContractFile = async (file, setter, field) => {
    if (!file) return
    try {
      const uploaded = await uploadDocumentFile(file)
      if (uploaded?.url) setter(field, uploaded.url)
      toast.success('Archivo cargado')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const downloadContractAttachment = (event, value) => {
    event.stopPropagation()
    event.preventDefault()
    downloadAttachment(value).catch((error) => {
      toast.error(error?.message || 'No se pudo descargar el archivo')
    })
  }

  const hydrateDocumentRows = async (rows = []) => {
    const documents = Array.isArray(rows) ? rows : []
    if (!documents.some((row) => row?.id_documento && !getAttachmentUrl(row.archivo))) {
      return documents
    }

    return Promise.all(
      documents.map(async (row) => {
        if (!row?.id_documento || getAttachmentUrl(row.archivo)) return row
        try {
          const res = await api.get(
            `/api/commercial/documentos/${encodeURIComponent(row.id_documento)}`,
          )
          return { ...row, archivo: res.data?.archivo || row.archivo || '' }
        } catch {
          return row
        }
      }),
    )
  }

  const hydrateRecordDocuments = async (data = {}) => {
    const documentos = await hydrateDocumentRows(data.documentos || [])
    return { ...data, documentos }
  }

  useEffect(() => {
    let cancelled = false
    const hasMissingFile = related.documentos.some(
      (row) => row?.id_documento && !getAttachmentUrl(row.archivo),
    )
    if (!hasMissingFile) return undefined

    hydrateDocumentRows(related.documentos).then((documentos) => {
      if (cancelled) return
      const changed = documentos.some(
        (row, index) => row.archivo !== related.documentos[index]?.archivo,
      )
      if (!changed) return
      setRelated((prev) => ({ ...prev, documentos }))
      setCurrent((prev) => (prev ? { ...prev, documentos } : prev))
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [related.documentos])

  const closeDocumentoModal = () => {
    if (documentoSaving) return
    setShowDocumentoModal(false)
    setDocumentoEditingId(null)
    setDocumentoForm(emptyDocumentoForm)
  }

  const setEmpresaField = (field, value) => {
    setEmpresaForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'rut') next.rut = formatRut(value)
      if (field === 'region' && prev.region !== value) {
        next.ciudad = ''
        next.comuna = ''
      }
      if (field === 'ciudad' && prev.ciudad !== value) next.comuna = ''
      return next
    })
  }

  const setContactoField = (field, value) => {
    setContactoForm((prev) => ({
      ...prev,
      [field]: field === 'rut' ? formatRut(value) : value,
    }))
  }

  const saveEmpresa = async () => {
    if (!empresaForm.rut || !empresaForm.razon_social || !empresaForm.id_categoria) {
      toast.error('Completa RUT, razon social y categoria para crear la empresa')
      return
    }
    if (empresaRutStatus === 'invalid') {
      toast.error('El RUT de la empresa no es valido')
      return
    }
    if (empresaRutDuplicate) {
      toast.error(`RUT empresa ya existe: ${empresaRutDuplicate.id}.`)
      return
    }

    setEmpresaSaving(true)
    try {
      const payload = {
        ...empresaForm,
        rut: formatRut(empresaForm.rut),
      }
      const res = empresaEditingId
        ? await api.put(`/api/commercial/empresas/${encodeURIComponent(empresaEditingId)}`, payload)
        : await api.post('/api/commercial/empresas', payload)
      const selectedRut = String(empresaEditingId || res.data?.rut || payload.rut)
      const freshLookups = await loadLookups()

      // Asegura que la empresa recien creada/actualizada exista en los lookups
      // para que el selector muestre el valor inmediatamente (sin requerir blur/click afuera).
      const fallbackEmpresa = {
        id: selectedRut,
        label: payload.razon_social || selectedRut,
        id_categoria: payload.id_categoria ? Number(payload.id_categoria) : undefined,
        giro: payload.giro || '',
        rubro: payload.rubro || '',
        direccion: payload.direccion || '',
        ciudad: payload.ciudad || '',
        comuna: payload.comuna || '',
      }

      const prevEmpresas = Array.isArray(freshLookups.empresas) ? freshLookups.empresas : []
      const idx = prevEmpresas.findIndex((item) => String(item.id) === String(selectedRut))
      const nextEmpresas = [...prevEmpresas]
      if (idx >= 0) nextEmpresas[idx] = { ...nextEmpresas[idx], ...fallbackEmpresa }
      else nextEmpresas.push(fallbackEmpresa)
      nextEmpresas.sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'es'))

      const effectiveLookups = { ...freshLookups, empresas: nextEmpresas }
      setLookups(effectiveLookups)
      setField('rut_empresa', selectedRut, effectiveLookups)
      setShowEmpresaModal(false)
      setEmpresaEditingId(null)
      toast.success(
        empresaEditingId
          ? 'Empresa actualizada en el contrato'
          : 'Empresa creada y seleccionada en el contrato',
      )
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo crear la empresa')
    } finally {
      setEmpresaSaving(false)
    }
  }

  const saveContacto = async () => {
    if (
      !contactoForm.id_tipo_contacto ||
      !contactoForm.id_estado_contacto ||
      !contactoForm.nombre
    ) {
      toast.error('Completa tipo, estado y nombre para guardar el contacto')
      return
    }
    if (contactoRutStatus === 'invalid') {
      toast.error('El RUT del contacto no es valido')
      return
    }
    if (contactoRutDuplicate) {
      toast.error(`RUT contacto ya existe: ${contactoRutDuplicate.rut}.`)
      return
    }

    setContactoSaving(true)
    try {
      const payload = {
        ...contactoForm,
        rut: contactoForm.rut ? formatRut(contactoForm.rut) : null,
        autoriza_comunicaciones: !!contactoForm.autoriza_comunicaciones,
      }
      const res = contactoEditingId
        ? await api.put(
            `/api/commercial/contactos/${encodeURIComponent(contactoEditingId)}`,
            payload,
          )
        : await api.post('/api/commercial/contactos', payload)
      const selectedId = String(contactoEditingId || res.data?.id_contacto || res.data?.id || '')
      const freshLookups = await loadLookups()

      const fallbackContacto = {
        id: selectedId,
        label: payload.nombre || `Contacto ${selectedId}`,
        id_tipo_contacto: payload.id_tipo_contacto ? Number(payload.id_tipo_contacto) : undefined,
        id_estado_contacto: payload.id_estado_contacto
          ? Number(payload.id_estado_contacto)
          : undefined,
        rut: payload.rut || '',
        email: payload.email || '',
        telefono: payload.telefono || '',
        autoriza_comunicaciones: !!payload.autoriza_comunicaciones,
      }

      const prevContactos = Array.isArray(freshLookups.contactos) ? freshLookups.contactos : []
      const idx = prevContactos.findIndex((item) => String(item.id) === String(selectedId))
      const nextContactos = [...prevContactos]
      if (idx >= 0) nextContactos[idx] = { ...nextContactos[idx], ...fallbackContacto }
      else nextContactos.push(fallbackContacto)
      nextContactos.sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'es'))

      const effectiveLookups = { ...freshLookups, contactos: nextContactos }
      setLookups(effectiveLookups)
      setField('id_contacto', selectedId, effectiveLookups)
      setShowContactoModal(false)
      setContactoEditingId(null)
      toast.success(
        contactoEditingId
          ? 'Contacto actualizado en el contrato'
          : 'Contacto creado y seleccionado en el contrato',
      )
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo crear el contacto')
    } finally {
      setContactoSaving(false)
    }
  }

  const saveLinea = async () => {
    const requiredLineaFields = [
      'contrato_empresa_id',
      'titulo',
      'id_tipo_servicio',
      'id_tipo_tarifa',
      'id_frecuencia',
    ]
    const missing = requiredLineaFields.filter((field) => !lineaForm[field])
    if (missing.length) {
      toast.error('Completa contrato, titulo, servicio, tarifa y frecuencia para crear la linea')
      return
    }

    setLineaSaving(true)
    try {
      const lineaPayload = {
        ...lineaForm,
        divisa: lineaForm.divisa || 'Peso',
        tarifa_fija:
          lineaForm.tarifa_fija === '' || lineaForm.tarifa_fija == null
            ? null
            : normalizeAmountForSave(lineaForm.tarifa_fija, lineaForm.divisa || 'Peso'),
        tarifa_variable:
          lineaForm.tarifa_variable === '' || lineaForm.tarifa_variable == null
            ? null
            : normalizeAmountForSave(lineaForm.tarifa_variable, lineaForm.divisa || 'Peso'),
      }
      const res = lineaEditingId
        ? await api.put(
            `/api/commercial/lineas/${encodeURIComponent(lineaEditingId)}`,
            lineaPayload,
          )
        : await api.post('/api/commercial/lineas', lineaPayload)
      const savedId = lineaEditingId || res.data?.id_linea
      const freshLookups = await loadLookups()
      let refreshedRow = res.data

      if (savedId) {
        refreshedRow = await fetchMaintainerRow('lineas', savedId)
      }

      if (current?.id && savedId && !lineaEditingId) {
        await api.post(`/api/contratos-empresa/${current.id}/lineas`, { id: savedId })
        await loadRecord(current.id)
      } else if (current?.id && savedId) {
        await loadRecord(current.id)
      } else if (savedId) {
        setRelated((prev) => ({
          ...prev,
          lineas: prev.lineas.some((item) => String(item.id_linea) === String(savedId))
            ? prev.lineas.map((item) =>
                String(item.id_linea) === String(savedId) ? refreshedRow : item,
              )
            : [...prev.lineas, refreshedRow],
        }))
      }

      setSelectedRelated((prev) => ({ ...prev, lineas: '' }))
      setLineaEditingId(null)
      setLineaForm(emptyLineaForm)
      setShowLineaModal(false)
      setLookups(freshLookups)
      toast.success(lineaEditingId ? 'Linea actualizada' : 'Linea creada y agregada al contrato')
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo guardar la linea')
    } finally {
      setLineaSaving(false)
    }
  }

  const saveCaso = async () => {
    const missing = ['id_contacto', 'contrato_empresa_id', 'titulo'].filter(
      (field) => !casoForm[field],
    )
    if (missing.length) {
      toast.error('Completa contacto, contrato y titulo para guardar el caso')
      return
    }

    setCasoSaving(true)
    try {
      const res = casoEditingId
        ? await api.put(`/api/commercial/casos/${encodeURIComponent(casoEditingId)}`, casoForm)
        : await api.post('/api/commercial/casos', casoForm)
      const savedId = casoEditingId || res.data?.id_caso
      const freshLookups = await loadLookups()

      if (current?.id && savedId && !casoEditingId) {
        await api.post(`/api/contratos-empresa/${current.id}/casos`, { id: savedId })
        await loadRecord(current.id)
      } else if (current?.id && savedId) {
        await loadRecord(current.id)
      } else if (savedId) {
        const refreshedRow = await fetchMaintainerRow('casos', savedId)
        setRelated((prev) => ({
          ...prev,
          casos: prev.casos.some((item) => String(item.id_caso) === String(savedId))
            ? prev.casos.map((item) =>
                String(item.id_caso) === String(savedId) ? refreshedRow : item,
              )
            : [...prev.casos, refreshedRow],
        }))
      }

      setSelectedRelated((prev) => ({ ...prev, casos: '' }))
      setCasoEditingId(null)
      setCasoForm(emptyCasoForm)
      setShowCasoModal(false)
      setLookups(freshLookups)
      toast.success(casoEditingId ? 'Caso actualizado' : 'Caso creado y agregado al contrato')
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo guardar el caso')
    } finally {
      setCasoSaving(false)
    }
  }

  const saveDocumento = async () => {
    const missing = ['contrato_empresa_id', 'nombre'].filter((field) => !documentoForm[field])
    if (missing.length) {
      toast.error('Completa contrato y nombre para guardar el documento')
      return
    }

    setDocumentoSaving(true)
    try {
      const res = documentoEditingId
        ? await api.put(
            `/api/commercial/documentos/${encodeURIComponent(documentoEditingId)}`,
            documentoForm,
          )
        : await api.post('/api/commercial/documentos', documentoForm)
      const savedId = documentoEditingId || res.data?.id_documento
      const freshLookups = await loadLookups()

      if (current?.id && savedId && !documentoEditingId) {
        await api.post(`/api/contratos-empresa/${current.id}/documentos`, { id: savedId })
        await loadRecord(current.id)
      } else if (current?.id && savedId) {
        await loadRecord(current.id)
      } else if (savedId) {
        const refreshedRow = await fetchMaintainerRow('documentos', savedId)
        setRelated((prev) => ({
          ...prev,
          documentos: prev.documentos.some((item) => String(item.id_documento) === String(savedId))
            ? prev.documentos.map((item) =>
                String(item.id_documento) === String(savedId) ? refreshedRow : item,
              )
            : [...prev.documentos, refreshedRow],
        }))
      }

      setSelectedRelated((prev) => ({ ...prev, documentos: '' }))
      setDocumentoEditingId(null)
      setDocumentoForm(emptyDocumentoForm)
      setShowDocumentoModal(false)
      setLookups(freshLookups)
      toast.success(
        documentoEditingId ? 'Documento actualizado' : 'Documento creado y agregado al contrato',
      )
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo guardar el documento')
    } finally {
      setDocumentoSaving(false)
    }
  }

  const loadRecord = async (id, { syncUrl = true } = {}) => {
    const recordId = String(id || '').trim()
    if (!recordId) return
    resettingRecordRef.current = false
    const requestId = recordLoadRequestRef.current + 1
    recordLoadRequestRef.current = requestId
    recordLoadingRef.current = true
    reserveRequestRef.current += 1
    setLoadingRecordId(recordId)
    setLoading(true)
    let keepLoadingRecordId = false
    try {
      const draftCode = reservedContractCodeRef.current
      if (draftCode) releaseReservedContractCode(draftCode).catch(() => {})
      const res = await api.get(`/api/contratos-empresa/${recordId}`)
      if (recordLoadRequestRef.current !== requestId) return
      const data = await hydrateRecordDocuments(res.data)
      if (recordLoadRequestRef.current !== requestId) return
      const nextId = String(data.id || recordId)
      setCurrent(data)
      setDraftCreatedAt(data.created_at || new Date().toISOString())
      setForm({
        rut_empresa: data.rut_empresa || '',
        codigo_contrato_empresa: data.codigo_contrato_empresa || '',
        id_categoria: data.id_categoria ? String(data.id_categoria) : '',
        id_tipo_servicio: data.id_tipo_servicio ? String(data.id_tipo_servicio) : '',
        id_estado_vital: data.id_estado_vital ? String(data.id_estado_vital) : '',
        id_estado_ctr: data.id_estado_ctr ? String(data.id_estado_ctr) : '',
        titulo: data.titulo || '',
        fecha_firma: formatDate(data.fecha_firma) === '-' ? '' : formatDate(data.fecha_firma),
        fecha_inicio: formatDate(data.fecha_inicio) === '-' ? '' : formatDate(data.fecha_inicio),
        fecha_termino: formatDate(data.fecha_termino) === '-' ? '' : formatDate(data.fecha_termino),
        fecha_facturacion:
          formatDate(data.fecha_facturacion) === '-' ? '' : formatDate(data.fecha_facturacion),
        medio_pago: data.medio_pago || '',
        reajustable: !!data.reajustable,
        multa: data.multa ?? '',
        requiere_orden_compra: !!data.requiere_orden_compra,
        id_frecuencia: data.id_frecuencia ? String(data.id_frecuencia) : '',
        id_tipo_tarifa: data.id_tipo_tarifa ? String(data.id_tipo_tarifa) : '',
        id_contacto: data.id_contacto ? String(data.id_contacto) : '',
        id_tipo_contacto: data.id_tipo_contacto ? String(data.id_tipo_contacto) : '',
        id_estado_contacto: data.id_estado_contacto ? String(data.id_estado_contacto) : '',
      })
      setRelated({
        lineas: data.lineas || [],
        casos: data.casos || [],
        documentos: data.documentos || [],
      })
      if (syncUrl && openRecordIdRef.current !== nextId) {
        keepLoadingRecordId = true
        pendingUrlSyncRef.current = nextId
        setSearchParams({ open: nextId }, { replace: true })
      }
    } catch (error) {
      if (recordLoadRequestRef.current !== requestId) return
      toast.error(error.response?.data?.message || 'No se pudo abrir contrato empresa')
    } finally {
      if (recordLoadRequestRef.current === requestId) {
        recordLoadingRef.current = false
        if (!keepLoadingRecordId) setLoadingRecordId('')
        setLoading(false)
      }
    }
  }

  const validate = () => {
    const missing = requiredFields.filter((field) => !form[field])
    if (!missing.length) return true
    toast.error('Completa los campos obligatorios antes de guardar')
    return false
  }

  const buildPayload = () => ({
    ...form,
    multa: form.multa === '' ? null : Number(form.multa),
    lineas: related.lineas.map((item) => item.id_linea),
    casos: related.casos.map((item) => item.id_caso),
    documentos: related.documentos.map((item) => item.id_documento),
  })

  const refreshReservedContractCode = async () => {
    const res = await api.post('/api/contratos-empresa/reserve-code')
    const code = res.data?.codigo_contrato_empresa || ''
    if (!code) return ''
    reservedContractCodeRef.current = code
    setForm((prev) => ({
      ...prev,
      codigo_contrato_empresa: code,
      id_estado_ctr: prev.id_estado_ctr || getDefaultEstadoContrato(lookups),
    }))
    return code
  }

  const submit = async () => {
    if (!validate()) return
    if (current?.id && !canWrite) return
    if (!current?.id && !canCreate) return
    setSaving(true)
    try {
      if (current?.id) {
        const res = await api.put(`/api/contratos-empresa/${current.id}`, buildPayload())
        setCurrent(res.data)
        setSearchParams({ open: String(res.data?.id || current.id) }, { replace: true })
        setForm((prev) => ({
          ...prev,
          codigo_contrato_empresa:
            res.data?.codigo_contrato_empresa || prev.codigo_contrato_empresa,
        }))
        toast.success('Contrato empresa actualizado')
      } else {
        let payload = buildPayload()
        let res
        try {
          res = await api.post('/api/contratos-empresa', payload)
        } catch (error) {
          const message = error.response?.data?.message || ''
          if (message !== 'Codigo de contrato no reservado o expirado') throw error
          const freshCode = await refreshReservedContractCode()
          payload = {
            ...buildPayload(),
            codigo_contrato_empresa: freshCode || payload.codigo_contrato_empresa,
          }
          res = await api.post('/api/contratos-empresa', payload)
        }
        reservedContractCodeRef.current = ''
        setCurrent(res.data)
        setSearchParams({ open: String(res.data?.id) }, { replace: true })
        setDraftCreatedAt(res.data?.created_at || draftCreatedAt)
        setForm((prev) => ({
          ...prev,
          codigo_contrato_empresa:
            res.data?.codigo_contrato_empresa || prev.codigo_contrato_empresa,
        }))
        toast.success('Contrato empresa creado')
      }
      const freshLookups = await loadLookups()
      setLookups(freshLookups)
      await loadList()
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async () => {
    if (!current?.id || !canHardDelete) return
    if (!window.confirm(`Seguro que deseas eliminar "${current.titulo}"?`)) return
    try {
      await api.delete(`/api/contratos-empresa/${current.id}`)
      toast.success('Contrato empresa eliminado')
      await resetForm()
      await loadList()
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar')
    }
  }

  const fetchMaintainerRow = async (type, id) => {
    const config = relatedConfig[type]
    try {
      const res = await api.get(`/api/commercial/${config.endpoint}/${encodeURIComponent(id)}`)
      return res.data
    } catch {
      const option = (lookups[config.lookup] || []).find((item) => String(item.id) === String(id))
      return { [config.idField]: Number(id), titulo: option?.label, nombre: option?.label }
    }
  }

  const addRelated = async (type) => {
    const config = relatedConfig[type]
    const selectedId = selectedRelated[type]
    if (!selectedId) return
    if (related[type].some((item) => String(item[config.idField]) === String(selectedId))) {
      toast.error('El registro ya esta asociado')
      return
    }

    if (current?.id) {
      try {
        const res = await api.post(`/api/contratos-empresa/${current.id}/${type}`, {
          id: selectedId,
        })
        const data = await hydrateRecordDocuments(res.data)
        setCurrent(data)
        setRelated({
          lineas: data.lineas || [],
          casos: data.casos || [],
          documentos: data.documentos || [],
        })
        setSelectedRelated((prev) => ({ ...prev, [type]: '' }))
        toast.success('Registro asociado')
      } catch (error) {
        toast.error(error.response?.data?.message || 'No se pudo asociar')
      }
      return
    }

    const row = await fetchMaintainerRow(type, selectedId)
    setRelated((prev) => ({ ...prev, [type]: [...prev[type], row] }))
    setSelectedRelated((prev) => ({ ...prev, [type]: '' }))
  }

  const removeRelated = async (type, row) => {
    const config = relatedConfig[type]
    const relatedId = row[config.idField]
    if (current?.id) {
      try {
        const res = await api.delete(`/api/contratos-empresa/${current.id}/${type}/${relatedId}`)
        const data = await hydrateRecordDocuments(res.data)
        setCurrent(data)
        setRelated({
          lineas: data.lineas || [],
          casos: data.casos || [],
          documentos: data.documentos || [],
        })
        toast.success('Relacion eliminada')
      } catch (error) {
        toast.error(error.response?.data?.message || 'No se pudo quitar relacion')
      }
      return
    }
    setRelated((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => String(item[config.idField]) !== String(relatedId)),
    }))
  }

  const openMaintainer = (type, row) => {
    if (type === 'lineas') {
      openLineaEditModal(row)
      return
    }
    if (type === 'casos') {
      openCasoEditModal(row)
      return
    }
    if (type === 'documentos') {
      openDocumentoEditModal(row)
      return
    }
    const config = relatedConfig[type]
    navigate(`${config.route}?open=${encodeURIComponent(row[config.idField])}&mode=edit`)
  }

  const openRelatedCreateModal = (type) => {
    if (type === 'lineas') {
      openLineaModal()
      return
    }
    if (type === 'casos') {
      openCasoModal()
      return
    }
    if (type === 'documentos') {
      openDocumentoModal()
    }
  }

  const canCreateRelated = (type) => {
    if (type === 'lineas') return canCreateLinea
    if (type === 'casos') return canCreateCaso
    if (type === 'documentos') return canCreateDocumento
    return canCreate
  }

  const canWriteRelated = (type) => {
    if (type === 'lineas') return canWriteLinea
    if (type === 'casos') return canWriteCaso
    if (type === 'documentos') return canWriteDocumento
    return canWrite
  }

  const hasPersistedContract = Boolean(current?.id || currentIdRef.current)

  const handleSort = (key) => {
    const nextDir = sortBy === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortBy(key)
    setSortDir(nextDir)
    setPage(1)
  }

  const fetchExportRows = async ({
    allRecords,
    currentRecord,
    dateFromOverride,
    dateToOverride,
  } = {}) => {
    if (currentRecord) {
      const currentId = current?.id || currentIdRef.current
      if (!currentId) return []
      const res = await api.get(`/api/contratos-empresa/${encodeURIComponent(currentId)}`)
      return res.data ? [res.data] : []
    }

    const dateParams = buildDateRangeParams({
      dateFrom: dateFromOverride,
      dateTo: dateToOverride,
    })
    if (!allRecords) {
      const res = await api.get('/api/contratos-empresa', {
        params: {
          page,
          pageSize,
          q: '',
          sortBy,
          sortDir,
          ...dateParams,
        },
      })
      return res.data.items || []
    }

    const all = []
    let pageAll = 1
    const pageSizeAll = 100
    while (true) {
      const res = await api.get('/api/contratos-empresa', {
        params: {
          page: pageAll,
          pageSize: pageSizeAll,
          q: '',
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

  const exportContractsExcel = async ({
    allRecords,
    currentRecord,
    dateFromOverride,
    dateToOverride,
  } = {}) => {
    setExporting(true)
    try {
      const rows = await fetchExportRows({
        allRecords,
        currentRecord,
        dateFromOverride,
        dateToOverride,
      })
      if (!rows.length) {
        toast.info(
          currentRecord
            ? 'No hay un contrato cargado en el formulario para exportar.'
            : 'No hay registros para exportar.',
        )
        return
      }
      const exportRows = rows.map((row) =>
        contractExportColumns.reduce((acc, [field, label]) => {
          acc[label] =
            field.startsWith('fecha') || field.endsWith('_at')
              ? formatDateTime(row[field])
              : formatValue(row[field])
          return acc
        }, {}),
      )
      const detailedRows = await Promise.all(
        rows
          .filter((row) => row?.id)
          .map(async (row) =>
            row?.lineas || row?.casos || row?.documentos
              ? row
              : (await api.get(`/api/contratos-empresa/${encodeURIComponent(row.id)}`)).data,
          ),
      )
      const lineRows = detailedRows.flatMap((row) =>
        (row?.lineas || []).map((linea) =>
          contractLineExportColumns.reduce((acc, [field, label]) => {
            const source = {
              codigo_contrato_empresa: row.codigo_contrato_empresa,
              contrato: row.titulo,
              ...linea,
            }
            acc[label] = ['tarifa_fija', 'tarifa_variable'].includes(field)
              ? formatCurrencyAmount(source[field], source.divisa)
              : formatValue(source[field])
            return acc
          }, {}),
        ),
      )
      const caseRows = detailedRows.flatMap((row) =>
        (row?.casos || []).map((caso) =>
          contractCaseExportColumns.reduce((acc, [field, label]) => {
            const source = {
              codigo_contrato_empresa: row.codigo_contrato_empresa,
              contrato: row.titulo,
              ...caso,
            }
            acc[label] =
              field === 'adjuntos'
                ? formatValue(getAttachmentUrl(source[field]) || source[field])
                : formatValue(source[field])
            return acc
          }, {}),
        ),
      )
      const documentRows = detailedRows.flatMap((row) =>
        (row?.documentos || []).map((documento) =>
          contractDocumentExportColumns.reduce((acc, [field, label]) => {
            const source = {
              codigo_contrato_empresa: row.codigo_contrato_empresa,
              contrato: row.titulo,
              ...documento,
            }
            acc[label] = formatValue(source[field])
            return acc
          }, {}),
        ),
      )
      const dateTag = new Date().toISOString().slice(0, 10)
      await exportToXlsx({
        fileName: `contratos_empresa_${dateTag}.xlsx`,
        sheetName: 'Contratos Empresa',
        rows: exportRows,
        sheets: [
          { sheetName: 'Lineas de Contrato', rows: lineRows },
          { sheetName: 'Casos', rows: caseRows },
          { sheetName: 'Documentos', rows: documentRows },
        ],
      })
    } catch (error) {
      toast.error(error?.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const exportContractsPdf = async ({
    allRecords,
    currentRecord,
    dateFromOverride,
    dateToOverride,
  } = {}) => {
    setExporting(true)
    try {
      const rows = await fetchExportRows({
        allRecords,
        currentRecord,
        dateFromOverride,
        dateToOverride,
      })
      if (!rows.length) {
        toast.info(
          currentRecord
            ? 'No hay un contrato cargado en el formulario para exportar.'
            : 'No hay registros para exportar.',
        )
        return
      }
      const head = contractExportColumns.map(([, label]) => label)
      const body = rows.map((row) =>
        contractExportColumns.map(([field]) =>
          String(
            field.startsWith('fecha') || field.endsWith('_at')
              ? formatDateTime(row[field])
              : formatValue(row[field]),
          ),
        ),
      )
      const dateTag = new Date().toISOString().slice(0, 10)
      if (!exportLogoRef.current) {
        try {
          const res = await fetch(logoUcm)
          const blob = await res.blob()
          exportLogoRef.current = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result || ''))
            reader.onerror = () => resolve('')
            reader.readAsDataURL(blob)
          })
        } catch {
          exportLogoRef.current = ''
        }
      }
      await exportToPdf({
        fileName: `contratos_empresa_${dateTag}.pdf`,
        title: 'Contratos Empresa',
        head,
        body,
        logoDataUrl: exportLogoRef.current || undefined,
        metaRight: `Fecha: ${dateTag}`,
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

  const confirmExport = async ({ allRecords, currentRecord, dateFrom, dateTo, format }) => {
    if (format === 'pdf') {
      await exportContractsPdf({
        allRecords,
        currentRecord,
        dateFromOverride: dateFrom,
        dateToOverride: dateTo,
      })
    } else {
      await exportContractsExcel({
        allRecords,
        currentRecord,
        dateFromOverride: dateFrom,
        dateToOverride: dateTo,
      })
    }
    setExportModalOpen(false)
  }

  const renderRelatedSection = (type) => {
    const config = relatedConfig[type]
    const rows = related[type] || []
    const relatedCanCreate = canCreateRelated(type)
    const relatedCanWrite = canWriteRelated(type)
    const canManageContractRelations =
      hasPersistedContract && (canWrite || canCreate || relatedCanCreate || relatedCanWrite)
    const showSaveHint = !hasPersistedContract
    return (
      <ContractSection title={config.title} icon={config.icon}>
        <div className="contract-related-toolbar">
          <CButton
            color="primary"
            onClick={() => openRelatedCreateModal(type)}
            disabled={
              saving || !canManageContractRelations || !hasPersistedContract || !relatedCanCreate
            }
            className="contract-related-add-button"
          >
            <CIcon icon={cilPlus} className="me-1" />
            +Agregar
          </CButton>
        </div>
        {showSaveHint && (
          <div className="contract-related-hint">
            Guarda el contrato para habilitar esta seccion.
          </div>
        )}
        <div className="macos-grid contract-related-grid">
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                {config.columns.map(([, label]) => (
                  <CTableDataCell as="th" key={label}>
                    {label}
                  </CTableDataCell>
                ))}
                <CTableDataCell as="th">Acciones</CTableDataCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rows.map((row) => (
                <CTableRow
                  key={`${type}-${row[config.idField]}`}
                  className="contract-related-row"
                  onClick={() => (!canWriteRelated(type) ? undefined : openMaintainer(type, row))}
                >
                  {config.columns.map(([field]) => (
                    <CTableDataCell key={field}>
                      {(type === 'casos' && field === 'adjuntos') ||
                      (type === 'documentos' && field === 'archivo') ? (
                        getAttachmentUrl(row[field]) ? (
                          <CButton
                            type="button"
                            size="sm"
                            color="secondary"
                            variant="outline"
                            onClick={(event) => downloadContractAttachment(event, row[field])}
                          >
                            <CIcon icon={cilCloudDownload} className="me-1" />
                            Bajar
                          </CButton>
                        ) : (
                          '-'
                        )
                      ) : type === 'lineas' &&
                        ['tarifa_fija', 'tarifa_variable'].includes(field) ? (
                        formatCurrencyAmount(row[field], row.divisa)
                      ) : (
                        formatValue(row[field])
                      )}
                    </CTableDataCell>
                  ))}
                  <CTableDataCell onClick={(event) => event.stopPropagation()}>
                    <CButtonGroup size="sm">
                      <CButton
                        color="secondary"
                        variant="outline"
                        onClick={() => openMaintainer(type, row)}
                        disabled={!relatedCanWrite}
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        onClick={() => removeRelated(type, row)}
                        disabled={saving || !hasPersistedContract || !canManageContractRelations}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CButtonGroup>
                  </CTableDataCell>
                </CTableRow>
              ))}
              {rows.length === 0 && (
                <CTableRow>
                  <CTableDataCell
                    colSpan={config.columns.length + 1}
                    className="text-center text-body-secondary"
                  >
                    Sin registros asociados
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>
      </ContractSection>
    )
  }

  const renderDraggableField = (section, field, content, { md = 6 } = {}) => (
    <CCol
      md={md}
      key={`${section}-${field}`}
      className={`contract-draggable-field ${
        canReorderFields && draggingField?.section === section && draggingField?.field === field
          ? 'is-dragging'
          : ''
      }`}
      onDragOver={(event) => {
        if (canReorderFields && draggingField?.section === section) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!canReorderFields) return
        event.preventDefault()
        if (draggingField?.section !== section) return
        setFieldLayout((prev) => moveFieldInSection(prev, section, draggingField.field, field))
        setDraggingField(null)
      }}
    >
      {canReorderFields && (
        <span
          className="contract-drag-handle"
          draggable
          title="Arrastrar campo"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            setDraggingField({ section, field })
          }}
          onDragEnd={() => setDraggingField(null)}
        >
          <span />
        </span>
      )}
      {content}
    </CCol>
  )

  const companyFieldRenderers = {
    empresa: () =>
      renderDraggableField(
        'company',
        'empresa',
        <SearchableLookupField
          label="Empresa"
          icon={cilBuilding}
          value={form.rut_empresa}
          options={lookups.empresas || []}
          onChange={(value) => setField('rut_empresa', value)}
          required
          disabled={saving}
          placeholder="Escribe para buscar empresa..."
          footerActionLabel={canCreateEmpresa ? 'Agregar empresa' : null}
          onFooterAction={canCreateEmpresa ? openEmpresaModal : undefined}
          selectedActionLabel="Abrir empresa seleccionada"
          onSelectedAction={openEmpresaEditModal}
        />,
      ),
    rut_empresa_detalle: () =>
      renderDraggableField(
        'company',
        'rut_empresa_detalle',
        <div className="contract-field readonly">
          <CFormLabel>
            <CIcon icon={cilBadge} />
            RUT empresa
          </CFormLabel>
          <strong>
            {formatValue(
              form.rut_empresa ? formatRut(selectedEmpresa?.id || form.rut_empresa) : '',
            )}
          </strong>
        </div>,
      ),
  }

  const contractFieldRenderers = {
    titulo: () =>
      renderDraggableField(
        'contract',
        'titulo',
        <div className="contract-field">
          <CFormLabel>
            <CIcon icon={cilDescription} />
            Titulo <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            ref={contractTitleInputRef}
            value={form.titulo}
            onChange={(event) => setField('titulo', event.target.value)}
          />
        </div>,
        { md: 12 },
      ),
    tipo_servicio: () =>
      renderDraggableField(
        'contract',
        'tipo_servicio',
        <SearchableLookupField
          label="Tipo de servicio"
          icon={cilList}
          value={form.id_tipo_servicio}
          options={lookups.tipo_servicios || []}
          onChange={(value) => setField('id_tipo_servicio', value)}
          required
          disabled={saving}
          placeholder="Escribe para buscar tipo de servicio..."
        />,
      ),
    estado_vital: () =>
      renderDraggableField(
        'contract',
        'estado_vital',
        <SearchableLookupField
          label="Estado vital"
          icon={cilCheckCircle}
          value={form.id_estado_vital}
          options={lookups.estado_vitales || []}
          onChange={(value) => setField('id_estado_vital', value)}
          required
          disabled={saving}
          placeholder="Escribe para buscar estado vital..."
        />,
      ),
    fecha_firma: () => renderDateField('fecha_firma', 'Fecha firma'),
    fecha_inicio: () => renderDateField('fecha_inicio', 'Fecha inicio'),
    fecha_termino: () => renderDateField('fecha_termino', 'Fecha termino'),
    fecha_facturacion: () => renderDateField('fecha_facturacion', 'Fecha facturacion'),
    medio_pago: () =>
      renderDraggableField(
        'contract',
        'medio_pago',
        <div className="contract-field">
          <CFormLabel>
            <CIcon icon={cilMoney} />
            Medio de pago
          </CFormLabel>
          <CFormInput
            value={form.medio_pago}
            onChange={(event) => setField('medio_pago', event.target.value)}
          />
        </div>,
      ),
    multa: () =>
      renderDraggableField(
        'contract',
        'multa',
        <div className="contract-field">
          <CFormLabel>
            <CIcon icon={cilMoney} />
            Multa
          </CFormLabel>
          <CFormInput
            type="number"
            value={form.multa}
            onChange={(event) => setField('multa', event.target.value)}
          />
        </div>,
      ),
    frecuencia: () =>
      renderDraggableField(
        'contract',
        'frecuencia',
        <SearchableLookupField
          label="Frecuencia de facturacion"
          icon={cilCalendar}
          value={form.id_frecuencia}
          options={lookups.frecuencias || []}
          onChange={(value) => setField('id_frecuencia', value)}
          required
          disabled={saving}
          placeholder="Escribe para buscar frecuencia..."
        />,
      ),
    tipo_tarifa: () =>
      renderDraggableField(
        'contract',
        'tipo_tarifa',
        <SearchableLookupField
          label="Tipo de tarifa"
          icon={cilMoney}
          value={form.id_tipo_tarifa}
          options={lookups.tipo_tarifas || []}
          onChange={(value) => setField('id_tipo_tarifa', value)}
          required
          disabled={saving}
          placeholder="Escribe para buscar tipo de tarifa..."
        />,
      ),
    reajustable: () =>
      renderDraggableField(
        'contract',
        'reajustable',
        <CFormSwitch
          className="boolean-switch-field"
          label="Reajustable"
          checked={!!form.reajustable}
          onChange={(event) => setField('reajustable', event.target.checked)}
        />,
      ),
    requiere_orden_compra: () =>
      renderDraggableField(
        'contract',
        'requiere_orden_compra',
        <CFormSwitch
          className="boolean-switch-field"
          label="Requiere orden de compra"
          checked={!!form.requiere_orden_compra}
          onChange={(event) => setField('requiere_orden_compra', event.target.checked)}
        />,
      ),
  }

  function renderDateField(field, label) {
    return renderDraggableField(
      'contract',
      field,
      <div className="contract-field">
        <CFormLabel>
          <CIcon icon={cilCalendar} />
          {label}
        </CFormLabel>
        <MacDateInput value={form[field]} onChange={(nextValue) => setField(field, nextValue)} />
      </div>,
    )
  }

  const contactFieldRenderers = {
    contacto: () =>
      renderDraggableField(
        'contact',
        'contacto',
        <SearchableLookupField
          label="Contacto"
          icon={cilAddressBook}
          value={form.id_contacto}
          options={lookups.contactos || []}
          onChange={(value) => setField('id_contacto', value)}
          required
          disabled={saving}
          placeholder="Escribe para buscar contacto..."
          footerActionLabel={canCreateContacto ? 'Agregar contacto' : null}
          onFooterAction={canCreateContacto ? openContactoModal : undefined}
          selectedActionLabel="Abrir contacto seleccionado"
          onSelectedAction={openContactoEditModal}
        />,
        { md: 12 },
      ),
    telefono_contacto: () =>
      renderDraggableField(
        'contact',
        'telefono_contacto',
        <div className="contract-field readonly">
          <CFormLabel>
            <CIcon icon={cilAddressBook} />
            Telefono
          </CFormLabel>
          <strong>{formatValue(selectedContacto?.telefono)}</strong>
        </div>,
      ),
    email_contacto: () =>
      renderDraggableField(
        'contact',
        'email_contacto',
        <div className="contract-field readonly">
          <CFormLabel>
            <CIcon icon={cilCheckCircle} />
            Email
          </CFormLabel>
          <strong>{formatValue(selectedContacto?.email)}</strong>
        </div>,
      ),
  }

  if (!canRead) {
    return <CAlert color="warning">No tienes permisos para leer Contratos.</CAlert>
  }

  return (
    <div className="contract-company-page">
      <div className="contract-company-shell">
        <div className="contract-company-topbar">
          <img src={logoUcm} alt="UCM" />
          <ContractHeaderSearch
            disabled={!canRead}
            onSelect={(item) => loadRecord(item.id)}
            onSelectCompany={canCreate ? selectCompanyForDraft : undefined}
          />
          <div className="contract-header-actions">
            {canExport && (
              <>
                <CButton
                  className="contract-header-button contract-header-button-export"
                  type="button"
                  onClick={() => openExport('xlsx')}
                  disabled={exporting || loading}
                >
                  <CIcon icon={cilCloudDownload} />
                  Exportar a Excel
                </CButton>
                <CButton
                  className="contract-header-button contract-header-button-export"
                  type="button"
                  onClick={() => openExport('pdf')}
                  disabled={exporting || loading}
                >
                  <CIcon icon={cilCloudDownload} />
                  Exportar a PDF
                </CButton>
              </>
            )}
            {canCreate && (
              <CButton
                className="contract-header-button contract-header-button-new"
                type="button"
                onClick={() => resetForm()}
              >
                <CIcon icon={cilPlus} />
                Nuevo
              </CButton>
            )}
            {(current?.id ? canWrite : canCreate) && (
              <CButton
                className="contract-header-button contract-header-button-edit"
                type="submit"
                form="contract-company-form"
                disabled={saving}
              >
                <CIcon icon={cilSave} />
                {saving ? 'Guardando...' : 'Guardar'}
              </CButton>
            )}
            {current?.id && canHardDelete && (
              <CButton
                className="contract-header-button contract-header-button-delete"
                type="button"
                onClick={deactivate}
                disabled={saving}
              >
                <CIcon icon={cilTrash} />
                Eliminar
              </CButton>
            )}
          </div>
        </div>

        <CForm
          id="contract-company-form"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <ContractSection
            title="Cabecera del contrato"
            icon={cilDescription}
            className="contract-header-section"
          >
            <CRow className="g-3">
              <CCol md={2}>
                <div className="contract-field readonly">
                  <CFormLabel>
                    <CIcon icon={cilDescription} />
                    Codigo contrato
                  </CFormLabel>
                  <strong>{form.codigo_contrato_empresa || 'Reservando codigo...'}</strong>
                </div>
              </CCol>
              <CCol md={2}>
                <div className="contract-field contract-header-field">
                  <CFormLabel>
                    <CIcon icon={cilCheckCircle} />
                    Estado contrato <span className="text-danger">*</span>
                  </CFormLabel>
                  <CFormSelect
                    value={form.id_estado_ctr}
                    onChange={(event) => setField('id_estado_ctr', event.target.value)}
                    required
                    disabled={saving}
                  >
                    <option value="">Seleccione...</option>
                    {(lookups.estados_ctr || []).map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={2}>
                <div className="contract-field readonly">
                  <CFormLabel>
                    <CIcon icon={cilCalendar} />
                    Fecha creacion
                  </CFormLabel>
                  <strong>{formatDateTime(current?.created_at || draftCreatedAt)}</strong>
                </div>
              </CCol>
              <CCol md={2}>
                <div className="contract-field readonly">
                  <CFormLabel>
                    <CIcon icon={cilCalendar} />
                    Fecha actualizacion
                  </CFormLabel>
                  <strong>{formatDateTime(current?.updated_at)}</strong>
                </div>
              </CCol>
              <CCol md={4}>
                <div className="contract-field readonly">
                  <CFormLabel>
                    <CIcon icon={cilAddressBook} />
                    Usuario
                  </CFormLabel>
                  <strong>
                    {current?.usuario_modificador ||
                      current?.usuario_creador ||
                      getDisplayUser(user)}
                  </strong>
                </div>
              </CCol>
            </CRow>
          </ContractSection>

          <div className="contract-company-form-grid">
            <ContractSection
              title="Datos Empresa"
              icon={cilBuilding}
              className="contract-company-section-company"
            >
              <CRow className="g-3">
                {fieldLayout.company.map((field) => companyFieldRenderers[field]?.())}
              </CRow>
            </ContractSection>

            <ContractSection
              title="Datos Contrato"
              icon={cilDescription}
              className="contract-company-section-contract"
            >
              <CRow className="g-3">
                {fieldLayout.contract.map((field) => contractFieldRenderers[field]?.())}
              </CRow>
            </ContractSection>

            <ContractSection
              title="Datos Contacto"
              icon={cilAddressBook}
              className="contract-company-section-contact"
            >
              <CRow className="g-3">
                {fieldLayout.contact.map((field) => contactFieldRenderers[field]?.())}
              </CRow>
            </ContractSection>
          </div>

          {renderRelatedSection('lineas')}
          {renderRelatedSection('casos')}
          {renderRelatedSection('documentos')}
        </CForm>

        <CModal visible={showLineaModal} onClose={closeLineaModal} alignment="center" size="lg">
          <CModalHeader closeButton={!lineaSaving}>
            <CModalTitle>{lineaEditingId ? 'Editar linea' : 'Crear linea'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div
              ref={lineaModalRef}
              className="commercial-form-layout contract-company-create-line"
              onKeyDownCapture={(event) => handleEnterToNextField(event, lineaModalRef.current)}
            >
              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilList} />
                  <span>Contrato y servicio</span>
                </div>
                <CRow className="g-3">
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>
                          Titulo <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormInput
                        value={lineaForm.titulo}
                        onChange={(event) => setLineaField('titulo', event.target.value)}
                        disabled={lineaSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBriefcase} />
                        <span>
                          Tipo servicio <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormSelect
                        value={lineaForm.id_tipo_servicio}
                        onChange={(event) => setLineaField('id_tipo_servicio', event.target.value)}
                        disabled={lineaSaving}
                      >
                        <option value="">Seleccione...</option>
                        {(lookups.tipo_servicios || []).map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilMoney} />
                        <span>
                          Tipo tarifa <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormSelect
                        value={lineaForm.id_tipo_tarifa}
                        onChange={(event) => setLineaField('id_tipo_tarifa', event.target.value)}
                        disabled={lineaSaving}
                      >
                        <option value="">Seleccione...</option>
                        {(lookups.tipo_tarifas || []).map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilCalendar} />
                        <span>
                          Frecuencia <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormSelect
                        value={lineaForm.id_frecuencia}
                        onChange={(event) => setLineaField('id_frecuencia', event.target.value)}
                        disabled={lineaSaving}
                      >
                        <option value="">Seleccione...</option>
                        {(lookups.frecuencias || []).map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilCalendar} />
                  <span>Ciclo de facturacion</span>
                </div>
                <CRow className="g-3">
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilCalendar} />
                        <span>Fecha inicio</span>
                      </CFormLabel>
                      <MacDateInput
                        value={lineaForm.fecha_inicio}
                        onChange={(nextValue) => setLineaField('fecha_inicio', nextValue)}
                        disabled={lineaSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilCalendar} />
                        <span>Inicio ciclo facturacion</span>
                      </CFormLabel>
                      <MacDateInput
                        value={lineaForm.fecha_inicio_ciclo_facturacion}
                        onChange={(nextValue) =>
                          setLineaField('fecha_inicio_ciclo_facturacion', nextValue)
                        }
                        disabled={lineaSaving}
                      />
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilMoney} />
                  <span>Tarifas</span>
                </div>
                <CRow className="g-3">
                  <CCol md={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilMoney} />
                        <span>Divisa</span>
                      </CFormLabel>
                      <CFormSelect
                        value={lineaForm.divisa || 'Peso'}
                        onChange={(event) => setLineaField('divisa', event.target.value)}
                        disabled={lineaSaving}
                      >
                        <option value="Peso">Peso</option>
                        <option value="UF">UF</option>
                      </CFormSelect>
                    </div>
                  </CCol>
                  {[
                    ['tarifa_fija', 'Tarifa fija'],
                    ['tarifa_variable', 'Tarifa variable'],
                    ['moneda_fijo', 'Moneda fijo', 'text'],
                    ['moneda_variable', 'Moneda variable', 'text'],
                    ['unidad_variable', 'Unidad variable', 'text'],
                  ].map(([field, label, type]) => (
                    <CCol md={4} key={field}>
                      <div className="commercial-form-field">
                        <CFormLabel className="commercial-field-label">
                          <CIcon icon={cilMoney} />
                          <span>{label}</span>
                        </CFormLabel>
                        <CFormInput
                          type={type || 'text'}
                          inputMode={
                            ['tarifa_fija', 'tarifa_variable'].includes(field) &&
                            lineaForm.divisa === 'UF'
                              ? 'decimal'
                              : ['tarifa_fija', 'tarifa_variable'].includes(field)
                                ? 'numeric'
                                : undefined
                          }
                          value={lineaForm[field]}
                          onBlur={(event) => {
                            if (['tarifa_fija', 'tarifa_variable'].includes(field)) {
                              setLineaField(
                                field,
                                formatAmountForInput(
                                  event.target.value,
                                  lineaForm.divisa || 'Peso',
                                ),
                              )
                            }
                          }}
                          onChange={(event) => setLineaField(field, event.target.value)}
                          disabled={lineaSaving}
                          placeholder={
                            ['tarifa_fija', 'tarifa_variable'].includes(field)
                              ? lineaForm.divisa === 'UF'
                                ? '0,0000'
                                : '$0'
                              : ''
                          }
                        />
                      </div>
                    </CCol>
                  ))}
                  <CCol md={4}>
                    <CFormSwitch
                      className="boolean-switch-field"
                      label="IVA"
                      checked={!!lineaForm.iva}
                      onChange={(event) => setLineaField('iva', event.target.checked)}
                      disabled={lineaSaving}
                    />
                  </CCol>
                </CRow>
              </section>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={closeLineaModal}
              disabled={lineaSaving}
            >
              Cancelar
            </CButton>
            <CButton color="primary" onClick={saveLinea} disabled={lineaSaving}>
              <CIcon icon={cilSave} className="me-1" />
              {lineaSaving ? 'Guardando...' : lineaEditingId ? 'Actualizar linea' : 'Guardar linea'}
            </CButton>
          </CModalFooter>
        </CModal>

        <CModal visible={showCasoModal} onClose={closeCasoModal} alignment="center" size="lg">
          <CModalHeader closeButton={!casoSaving}>
            <CModalTitle>{casoEditingId ? 'Editar caso' : 'Crear caso'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div
              ref={casoModalRef}
              className="commercial-form-layout contract-company-create-case"
              onKeyDownCapture={(event) => handleEnterToNextField(event, casoModalRef.current)}
            >
              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilAddressBook} />
                  <span>Relacion</span>
                </div>
                <CRow className="g-3">
                  <CCol md={12}>
                    <SearchableLookupField
                      label="Contacto"
                      icon={cilAddressBook}
                      value={casoForm.id_contacto}
                      options={lookups.contactos || []}
                      onChange={(value) => setCasoField('id_contacto', value)}
                      required
                      disabled={casoSaving}
                      placeholder="Escribe para buscar contacto..."
                    />
                  </CCol>
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>
                          Titulo <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormInput
                        value={casoForm.titulo}
                        onChange={(event) => setCasoField('titulo', event.target.value)}
                        disabled={casoSaving}
                      />
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilNotes} />
                  <span>Detalle del caso</span>
                </div>
                <CRow className="g-3">
                  {[
                    ['texto', 'Texto'],
                    ['relato', 'Relato'],
                  ].map(([field, label]) => (
                    <CCol md={12} key={field}>
                      <div className="commercial-form-field">
                        <CFormLabel className="commercial-field-label">
                          <CIcon icon={cilNotes} />
                          <span>{label}</span>
                        </CFormLabel>
                        <CFormTextarea
                          rows={3}
                          value={casoForm[field]}
                          onChange={(event) => setCasoField(field, event.target.value)}
                          disabled={casoSaving}
                        />
                      </div>
                    </CCol>
                  ))}
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilFile} />
                        <span>Archivo</span>
                      </CFormLabel>
                      <div className="mac-file-upload">
                        <input
                          id="caso-adjuntos-upload"
                          className="mac-file-upload-input"
                          type="file"
                          accept={acceptedDocumentTypes}
                          onChange={async (event) => {
                            await uploadContractFile(
                              event.target.files?.[0],
                              setCasoField,
                              'adjuntos',
                            )
                            event.target.value = ''
                          }}
                          disabled={casoSaving}
                        />
                        <div className="mac-file-upload-row">
                          <label className="mac-file-upload-button" htmlFor="caso-adjuntos-upload">
                            Seleccionar archivo
                          </label>
                          <span className="mac-file-upload-caption">
                            PDF, Word, Excel, imagen o TXT
                          </span>
                        </div>
                        <div className="mac-file-upload-url">
                          <CFormLabel className="commercial-field-label">
                            <CIcon icon={cilDescription} />
                            <span>URL</span>
                          </CFormLabel>
                          <CFormInput
                            type="url"
                            value={casoForm.adjuntos}
                            onChange={(event) => setCasoField('adjuntos', event.target.value)}
                            placeholder="https://..."
                            disabled={casoSaving}
                          />
                        </div>
                      </div>
                    </div>
                  </CCol>
                </CRow>
              </section>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={closeCasoModal}
              disabled={casoSaving}
            >
              Cancelar
            </CButton>
            <CButton color="primary" onClick={saveCaso} disabled={casoSaving}>
              <CIcon icon={cilSave} className="me-1" />
              {casoSaving ? 'Guardando...' : casoEditingId ? 'Actualizar caso' : 'Guardar caso'}
            </CButton>
          </CModalFooter>
        </CModal>

        <CModal
          visible={showDocumentoModal}
          onClose={closeDocumentoModal}
          alignment="center"
          size="lg"
        >
          <CModalHeader closeButton={!documentoSaving}>
            <CModalTitle>{documentoEditingId ? 'Editar documento' : 'Crear documento'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div
              ref={documentoModalRef}
              className="commercial-form-layout contract-company-create-document"
              onKeyDownCapture={(event) => handleEnterToNextField(event, documentoModalRef.current)}
            >
              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilFile} />
                  <span>Documento</span>
                </div>
                <CRow className="g-3">
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilFile} />
                        <span>Tipo documento</span>
                      </CFormLabel>
                      <CFormInput
                        value={documentoForm.tipo_documento}
                        onChange={(event) =>
                          setDocumentoField('tipo_documento', event.target.value)
                        }
                        disabled={documentoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>
                          Nombre <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormInput
                        value={documentoForm.nombre}
                        onChange={(event) => setDocumentoField('nombre', event.target.value)}
                        disabled={documentoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>Version</span>
                      </CFormLabel>
                      <CFormInput
                        value={documentoForm.version}
                        onChange={(event) => setDocumentoField('version', event.target.value)}
                        disabled={documentoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilCheckCircle} />
                        <span>Estado</span>
                      </CFormLabel>
                      <CFormInput
                        value={documentoForm.estado}
                        onChange={(event) => setDocumentoField('estado', event.target.value)}
                        disabled={documentoSaving}
                      />
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilBriefcase} />
                  <span>Gestion</span>
                </div>
                <CRow className="g-3">
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilAddressBook} />
                        <span>Responsable</span>
                      </CFormLabel>
                      <CFormInput
                        value={documentoForm.responsable}
                        onChange={(event) => setDocumentoField('responsable', event.target.value)}
                        disabled={documentoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilNotes} />
                        <span>Descripcion</span>
                      </CFormLabel>
                      <CFormTextarea
                        rows={3}
                        value={documentoForm.descripcion}
                        onChange={(event) => setDocumentoField('descripcion', event.target.value)}
                        disabled={documentoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilFile} />
                        <span>Archivo</span>
                      </CFormLabel>
                      <div className="mac-file-upload">
                        <input
                          id="documento-archivo-upload"
                          className="mac-file-upload-input"
                          type="file"
                          accept={acceptedDocumentTypes}
                          onChange={async (event) => {
                            await uploadContractFile(
                              event.target.files?.[0],
                              setDocumentoField,
                              'archivo',
                            )
                            event.target.value = ''
                          }}
                          disabled={documentoSaving}
                        />
                        <div className="mac-file-upload-row">
                          <label
                            className="mac-file-upload-button"
                            htmlFor="documento-archivo-upload"
                          >
                            Seleccionar archivo
                          </label>
                          <span className="mac-file-upload-caption">
                            PDF, Word, Excel, imagen o TXT
                          </span>
                        </div>
                        <div className="mac-file-upload-url">
                          <CFormLabel className="commercial-field-label">
                            <CIcon icon={cilDescription} />
                            <span>URL</span>
                          </CFormLabel>
                          <CFormInput
                            type="url"
                            value={documentoForm.archivo}
                            onChange={(event) => setDocumentoField('archivo', event.target.value)}
                            placeholder="https://..."
                            disabled={documentoSaving}
                          />
                        </div>
                      </div>
                    </div>
                  </CCol>
                </CRow>
              </section>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={closeDocumentoModal}
              disabled={documentoSaving}
            >
              Cancelar
            </CButton>
            <CButton color="primary" onClick={saveDocumento} disabled={documentoSaving}>
              <CIcon icon={cilSave} className="me-1" />
              {documentoSaving
                ? 'Guardando...'
                : documentoEditingId
                  ? 'Actualizar documento'
                  : 'Guardar documento'}
            </CButton>
          </CModalFooter>
        </CModal>

        <CModal
          visible={showContactoModal}
          onClose={() => {
            if (contactoSaving) return
            setShowContactoModal(false)
            setContactoEditingId(null)
          }}
          alignment="center"
          size="xl"
        >
          <CModalHeader closeButton={!contactoSaving}>
            <CModalTitle>{contactoEditingId ? 'Editar contacto' : 'Crear contacto'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div
              ref={contactoModalRef}
              className="commercial-form-layout contract-company-create-contact"
              onKeyDownCapture={(event) => handleEnterToNextField(event, contactoModalRef.current)}
            >
              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilAddressBook} />
                  <span>Tipo y estado</span>
                </div>
                <CRow className="g-3">
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilAddressBook} />
                        <span>
                          Tipo contacto <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormSelect
                        value={contactoForm.id_tipo_contacto}
                        onChange={(event) =>
                          setContactoField('id_tipo_contacto', event.target.value)
                        }
                        disabled={contactoSaving}
                      >
                        <option value="">Seleccione...</option>
                        {(lookups.tipo_contactos || []).map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilCheckCircle} />
                        <span>
                          Estado contacto <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormSelect
                        value={contactoForm.id_estado_contacto}
                        onChange={(event) =>
                          setContactoField('id_estado_contacto', event.target.value)
                        }
                        disabled={contactoSaving}
                      >
                        <option value="">Seleccione...</option>
                        {(lookups.estado_contactos || []).map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilContact} />
                  <span>Datos del contacto</span>
                </div>
                <CRow className="g-3">
                  <CCol md={8}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilAddressBook} />
                        <span>
                          Nombre <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormInput
                        value={contactoForm.nombre}
                        onChange={(event) => setContactoField('nombre', event.target.value)}
                        disabled={contactoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBadge} />
                        <span>RUT contacto</span>
                      </CFormLabel>
                      <CFormInput
                        value={contactoForm.rut}
                        onChange={(event) => setContactoField('rut', event.target.value)}
                        placeholder="12.345.678-9"
                        disabled={contactoSaving}
                        invalid={contactoRutStatus === 'invalid' || !!contactoRutDuplicate}
                        valid={contactoRutStatus === 'valid' && !contactoRutDuplicate}
                      />
                      <small
                        className={`contract-rut-hint ${
                          contactoRutStatus === 'valid'
                            ? 'is-valid'
                            : contactoRutStatus === 'invalid'
                              ? 'is-invalid'
                              : ''
                        }`}
                      >
                        {contactoRutDuplicate
                          ? `RUT duplicado: ${contactoRutDuplicate.rut}`
                          : contactoRutStatus === 'valid'
                            ? 'RUT valido'
                            : contactoRutStatus === 'invalid'
                              ? 'RUT invalido'
                              : 'Ingresa el RUT del contacto'}
                      </small>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBriefcase} />
                        <span>Cargo</span>
                      </CFormLabel>
                      <CFormInput
                        value={contactoForm.cargo}
                        onChange={(event) => setContactoField('cargo', event.target.value)}
                        disabled={contactoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilEnvelopeClosed} />
                        <span>Email</span>
                      </CFormLabel>
                      <CFormInput
                        type="email"
                        value={contactoForm.email}
                        onChange={(event) => setContactoField('email', event.target.value)}
                        placeholder="contacto@empresa.cl"
                        disabled={contactoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilPhone} />
                        <span>Telefono</span>
                      </CFormLabel>
                      <CFormInput
                        value={contactoForm.telefono}
                        onChange={(event) => setContactoField('telefono', event.target.value)}
                        placeholder="+56 9 1234 5678"
                        disabled={contactoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilList} />
                        <span>Canal preferido</span>
                      </CFormLabel>
                      <CFormInput
                        value={contactoForm.canal_preferido}
                        onChange={(event) =>
                          setContactoField('canal_preferido', event.target.value)
                        }
                        disabled={contactoSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={12}>
                    <CFormSwitch
                      className="boolean-switch-field boolean-switch-field-lg"
                      label="Autoriza comunicacion"
                      checked={!!contactoForm.autoriza_comunicaciones}
                      onChange={(event) =>
                        setContactoField('autoriza_comunicaciones', event.target.checked)
                      }
                      disabled={contactoSaving}
                    />
                  </CCol>
                </CRow>
              </section>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => {
                setShowContactoModal(false)
                setContactoEditingId(null)
              }}
              disabled={contactoSaving}
            >
              Cancelar
            </CButton>
            <CButton
              color="primary"
              onClick={saveContacto}
              disabled={contactoSaving || contactoRutStatus === 'invalid' || !!contactoRutDuplicate}
            >
              {contactoSaving ? 'Guardando...' : 'Guardar contacto'}
            </CButton>
          </CModalFooter>
        </CModal>

        <CModal
          visible={showEmpresaModal}
          onClose={() => {
            if (empresaSaving) return
            setShowEmpresaModal(false)
            setEmpresaEditingId(null)
          }}
          alignment="center"
          size="lg"
        >
          <CModalHeader closeButton={!empresaSaving}>
            <CModalTitle>{empresaEditingId ? 'Editar empresa' : 'Crear empresa'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div
              ref={empresaModalRef}
              className="commercial-form-layout contract-company-create-company"
              onKeyDownCapture={(event) => handleEnterToNextField(event, empresaModalRef.current)}
            >
              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilBuilding} />
                  <span>Identificacion</span>
                </div>
                <CRow className="g-3">
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBuilding} />
                        <span>
                          RUT empresa <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormInput
                        ref={empresaRutInputRef}
                        value={empresaForm.rut}
                        onChange={(event) => setEmpresaField('rut', event.target.value)}
                        placeholder="12.345.678-5"
                        autoFocus={showEmpresaModal && !empresaEditingId}
                        disabled={empresaSaving || !!empresaEditingId}
                        invalid={empresaRutStatus === 'invalid' || !!empresaRutDuplicate}
                        valid={empresaRutStatus === 'valid' && !empresaRutDuplicate}
                      />
                      <small
                        className={`contract-rut-hint ${
                          empresaRutStatus === 'valid'
                            ? 'is-valid'
                            : empresaRutStatus === 'invalid'
                              ? 'is-invalid'
                              : ''
                        }`}
                      >
                        {empresaRutDuplicate
                          ? `RUT duplicado: ${empresaRutDuplicate.id}`
                          : empresaRutStatus === 'valid'
                            ? 'RUT valido'
                            : empresaRutStatus === 'invalid'
                              ? 'RUT invalido'
                              : 'Ingresa el RUT de la empresa'}
                      </small>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBriefcase} />
                        <span>
                          Categoria <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormSelect
                        value={empresaForm.id_categoria}
                        onChange={(event) => setEmpresaField('id_categoria', event.target.value)}
                        required
                        disabled={empresaSaving}
                      >
                        <option value="">Seleccione...</option>
                        {(lookups.categorias || []).map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>
                          Razon social <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormInput
                        value={empresaForm.razon_social}
                        onChange={(event) => setEmpresaField('razon_social', event.target.value)}
                        disabled={empresaSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>Nombre fantasia</span>
                      </CFormLabel>
                      <CFormInput
                        value={empresaForm.nombre_fantasia}
                        onChange={(event) => setEmpresaField('nombre_fantasia', event.target.value)}
                        disabled={empresaSaving}
                      />
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilBriefcase} />
                  <span>Datos comerciales</span>
                </div>
                <CRow className="g-3">
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBriefcase} />
                        <span>Giro</span>
                      </CFormLabel>
                      <CFormInput
                        value={empresaForm.giro}
                        onChange={(event) => setEmpresaField('giro', event.target.value)}
                        disabled={empresaSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBriefcase} />
                        <span>Rubro</span>
                      </CFormLabel>
                      <CFormInput
                        value={empresaForm.rubro}
                        onChange={(event) => setEmpresaField('rubro', event.target.value)}
                        disabled={empresaSaving}
                      />
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilList} />
                  <span>Ubicacion y contacto</span>
                </div>
                <CRow className="g-3">
                  <CCol md={12}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilBuilding} />
                        <span>Direccion</span>
                      </CFormLabel>
                      <CFormInput
                        value={empresaForm.direccion}
                        onChange={(event) => setEmpresaField('direccion', event.target.value)}
                        disabled={empresaSaving}
                      />
                    </div>
                  </CCol>
                  <CCol md={6} xl={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilList} />
                        <span>Region</span>
                      </CFormLabel>
                      <CFormSelect
                        value={empresaForm.region}
                        onChange={(event) => setEmpresaField('region', event.target.value)}
                        disabled={empresaSaving}
                      >
                        <option value="">Seleccione...</option>
                        {chileRegions.map((item) => (
                          <option key={item.region} value={item.region}>
                            {item.region}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={6} xl={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilList} />
                        <span>Ciudad</span>
                      </CFormLabel>
                      <CFormSelect
                        value={empresaForm.ciudad}
                        onChange={(event) => setEmpresaField('ciudad', event.target.value)}
                        disabled={empresaSaving || !empresaForm.region}
                      >
                        <option value="">
                          {empresaForm.region ? 'Seleccione...' : 'Seleccione region primero'}
                        </option>
                        {ciudadesEmpresa.map((ciudad) => (
                          <option key={ciudad} value={ciudad}>
                            {ciudad}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={6} xl={4}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilList} />
                        <span>Comuna</span>
                      </CFormLabel>
                      <CFormSelect
                        value={empresaForm.comuna}
                        onChange={(event) => setEmpresaField('comuna', event.target.value)}
                        disabled={empresaSaving || !empresaForm.ciudad}
                      >
                        <option value="">
                          {empresaForm.ciudad ? 'Seleccione...' : 'Seleccione ciudad primero'}
                        </option>
                        {comunasEmpresa.map((comuna) => (
                          <option key={comuna} value={comuna}>
                            {comuna}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>Sitio web</span>
                      </CFormLabel>
                      <CFormInput
                        value={empresaForm.sitio_web}
                        onChange={(event) => setEmpresaField('sitio_web', event.target.value)}
                        placeholder="https://..."
                        disabled={empresaSaving}
                      />
                    </div>
                  </CCol>
                </CRow>
              </section>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => {
                setShowEmpresaModal(false)
                setEmpresaEditingId(null)
              }}
              disabled={empresaSaving}
            >
              Cancelar
            </CButton>
            <CButton
              color="primary"
              onClick={saveEmpresa}
              disabled={empresaSaving || (!!empresaRutDuplicate && !empresaEditingId)}
            >
              {empresaSaving ? 'Guardando...' : 'Guardar empresa'}
            </CButton>
          </CModalFooter>
        </CModal>
        <ExportModal
          visible={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          onConfirm={confirmExport}
          submitting={exporting}
          format={exportFormat}
          canExportCurrent={hasPersistedContract}
        />
      </div>
    </div>
  )
}

export default ContratoEmpresa
