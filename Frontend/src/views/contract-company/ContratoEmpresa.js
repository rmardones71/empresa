import React, { useEffect, useMemo, useState } from 'react'
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
  cilBriefcase,
  cilBuilding,
  cilCalendar,
  cilCheckCircle,
  cilDescription,
  cilFile,
  cilList,
  cilMoney,
  cilNotes,
  cilPencil,
  cilPlus,
  cilSave,
  cilSearch,
  cilTrash,
  cilX,
} from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from 'src/services/api'
import { useToast } from 'src/components/ToastProvider'
import GridPaginationBar from 'src/components/GridPaginationBar'
import SortableTableHeader from 'src/components/SortableTableHeader'
import { runOnEnter } from 'src/utils/gridKeyboard'
import { hasPermission } from 'src/utils/permissions'
import logoUcm from 'src/assets/images/brand/logo-ucm.png'
import { formatRut, getRutStatus } from 'src/views/commercial/rutChile'
import { chileRegions, getComunasByRegion } from 'src/views/commercial/chileLocations'

const moduleKey = 'commercial.contratos_empresa'

const emptyForm = {
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
  region: '',
  comuna: '',
  sitio_web: '',
}

const emptyLineaForm = {
  id_contrato: '',
  titulo: '',
  id_tipo_servicio: '',
  id_tipo_tarifa: '',
  id_frecuencia: '',
  fecha_inicio: '',
  fecha_inicio_ciclo_facturacion: '',
  tarifa_fija: '',
  moneda_fijo: '',
  tarifa_variable: '',
  moneda_variable: '',
  unidad_variable: '',
  iva: true,
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
      ['tarifa_fija', 'Fija'],
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

function normalizeLookupText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

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

  const selectOption = (item) => {
    onChange(String(item.id))
    setQuery(item.label || '')
    setIsOpen(false)
  }

  return (
    <div className="contract-field contract-searchable-field">
      <CFormLabel>
        <CIcon icon={icon} />
        <span>
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
      </CFormLabel>
      <div className="contract-lookup">
        <CFormInput
          value={isOpen ? query : selectedOption?.label || query}
          onFocus={() => {
            setQuery('')
            setIsOpen(true)
          }}
          onClick={() => {
            setQuery('')
            setIsOpen(true)
          }}
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

const ContratoEmpresa = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const canCreate = hasPermission(user, moduleKey, 'create')
  const canRead = hasPermission(user, moduleKey, 'read')
  const canWrite = hasPermission(user, moduleKey, 'write')
  const canDelete = hasPermission(user, moduleKey, 'delete')
  const canCreateEmpresa = hasPermission(user, 'commercial.empresas', 'create')
  const canCreateLinea = hasPermission(user, 'commercial.lineas', 'create')

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('desc')
  const [lookups, setLookups] = useState({})
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [related, setRelated] = useState({ lineas: [], casos: [], documentos: [] })
  const [selectedRelated, setSelectedRelated] = useState({ lineas: '', casos: '', documentos: '' })
  const [showEmpresaModal, setShowEmpresaModal] = useState(false)
  const [empresaForm, setEmpresaForm] = useState(emptyEmpresaForm)
  const [empresaSaving, setEmpresaSaving] = useState(false)
  const [showLineaModal, setShowLineaModal] = useState(false)
  const [lineaForm, setLineaForm] = useState(emptyLineaForm)
  const [lineaSaving, setLineaSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const empresaRutStatus = useMemo(
    () => getRutStatus(empresaForm.rut, { required: true }),
    [empresaForm.rut],
  )
  const comunasEmpresa = useMemo(() => getComunasByRegion(empresaForm.region), [empresaForm.region])

  const loadLookups = async () => {
    const res = await api.get('/api/contratos-empresa/lookups')
    const data = res.data || {}
    setLookups(data)
    return data
  }

  const loadList = async ({ pageOverride, qOverride } = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/api/contratos-empresa', {
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
      toast.error(error.response?.data?.message || 'No se pudieron cargar contratos empresa')
    } finally {
      setLoading(false)
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
        if (contacto?.rut_empresa) next.rut_empresa = String(contacto.rut_empresa)
        if (contacto?.id_tipo_contacto) next.id_tipo_contacto = String(contacto.id_tipo_contacto)
        if (contacto?.id_estado_contacto)
          next.id_estado_contacto = String(contacto.id_estado_contacto)
      }
      return next
    })
  }

  const resetForm = () => {
    setCurrent(null)
    setForm(emptyForm)
    setRelated({ lineas: [], casos: [], documentos: [] })
    setSelectedRelated({ lineas: '', casos: '', documentos: '' })
  }

  const openEmpresaModal = (suggestedName = '') => {
    if (!canCreateEmpresa) return
    const suggested = suggestedName.trim()
    setEmpresaForm({
      ...emptyEmpresaForm,
      razon_social: suggested,
      nombre_fantasia: suggested,
      id_categoria: form.id_categoria || '',
    })
    setShowEmpresaModal(true)
  }

  const openLineaModal = () => {
    if (!canCreateLinea) return
    setLineaForm({
      ...emptyLineaForm,
      titulo: form.titulo ? `Linea ${form.titulo}` : '',
      id_tipo_servicio: form.id_tipo_servicio || '',
      id_tipo_tarifa: form.id_tipo_tarifa || '',
      id_frecuencia: form.id_frecuencia || '',
      fecha_inicio: form.fecha_inicio || '',
    })
    setShowLineaModal(true)
  }

  const setLineaField = (field, value) => {
    setLineaForm((prev) => ({ ...prev, [field]: value }))
  }

  const setEmpresaField = (field, value) => {
    setEmpresaForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'rut') next.rut = formatRut(value)
      if (field === 'region' && prev.region !== value) next.comuna = ''
      return next
    })
  }

  const createEmpresa = async () => {
    if (!empresaForm.rut || !empresaForm.razon_social || !empresaForm.id_categoria) {
      toast.error('Completa RUT, razon social y categoria para crear la empresa')
      return
    }
    if (empresaRutStatus === 'invalid') {
      toast.error('El RUT de la empresa no es valido')
      return
    }

    setEmpresaSaving(true)
    try {
      const payload = {
        ...empresaForm,
        rut: formatRut(empresaForm.rut),
      }
      const res = await api.post('/api/commercial/empresas', payload)
      const createdRut = String(res.data?.rut || payload.rut)
      const freshLookups = await loadLookups()
      setField('rut_empresa', createdRut, freshLookups)
      setShowEmpresaModal(false)
      toast.success('Empresa creada y seleccionada en el contrato')
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo crear la empresa')
    } finally {
      setEmpresaSaving(false)
    }
  }

  const createLinea = async () => {
    const requiredLineaFields = [
      'id_contrato',
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
      const res = await api.post('/api/commercial/lineas', lineaForm)
      const createdId = res.data?.id_linea
      const freshLookups = await loadLookups()
      let refreshedRow = res.data

      if (createdId) {
        refreshedRow = await fetchMaintainerRow('lineas', createdId)
      }

      if (current?.id && createdId) {
        const association = await api.post(`/api/contratos-empresa/${current.id}/lineas`, {
          id: createdId,
        })
        setCurrent(association.data)
        setRelated({
          lineas: association.data.lineas || [],
          casos: association.data.casos || [],
          documentos: association.data.documentos || [],
        })
      } else if (createdId) {
        setRelated((prev) => ({
          ...prev,
          lineas: prev.lineas.some((item) => String(item.id_linea) === String(createdId))
            ? prev.lineas
            : [...prev.lineas, refreshedRow],
        }))
      }

      setSelectedRelated((prev) => ({ ...prev, lineas: '' }))
      setLineaForm(emptyLineaForm)
      setShowLineaModal(false)
      setLookups(freshLookups)
      toast.success('Linea creada y agregada al contrato')
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo crear la linea')
    } finally {
      setLineaSaving(false)
    }
  }

  const loadRecord = async (id) => {
    try {
      const res = await api.get(`/api/contratos-empresa/${id}`)
      const data = res.data
      setCurrent(data)
      setForm({
        rut_empresa: data.rut_empresa || '',
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
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo abrir contrato empresa')
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

  const submit = async () => {
    if (!validate()) return
    if (current?.id && !canWrite) return
    if (!current?.id && !canCreate) return
    setSaving(true)
    try {
      if (current?.id) {
        const res = await api.put(`/api/contratos-empresa/${current.id}`, buildPayload())
        setCurrent(res.data)
        toast.success('Contrato empresa actualizado')
      } else {
        const res = await api.post('/api/contratos-empresa', buildPayload())
        setCurrent(res.data)
        toast.success('Contrato empresa creado')
      }
      await loadList()
    } catch (error) {
      const data = error.response?.data
      toast.error(data?.errors?.[0]?.message || data?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async () => {
    if (!current?.id || !canDelete) return
    if (!window.confirm(`Seguro que deseas desactivar "${current.titulo}"?`)) return
    try {
      await api.delete(`/api/contratos-empresa/${current.id}`)
      toast.success('Contrato empresa desactivado')
      resetForm()
      await loadList()
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo desactivar')
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
        setCurrent(res.data)
        setRelated({
          lineas: res.data.lineas || [],
          casos: res.data.casos || [],
          documentos: res.data.documentos || [],
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
        setCurrent(res.data)
        setRelated({
          lineas: res.data.lineas || [],
          casos: res.data.casos || [],
          documentos: res.data.documentos || [],
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
    const config = relatedConfig[type]
    navigate(`${config.route}?open=${encodeURIComponent(row[config.idField])}&mode=edit`)
  }

  const handleSort = (key) => {
    const nextDir = sortBy === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortBy(key)
    setSortDir(nextDir)
    setPage(1)
  }

  const onSearch = () => {
    setPage(1)
    loadList({ pageOverride: 1 }).catch(() => {})
  }

  const renderRelatedSection = (type) => {
    const config = relatedConfig[type]
    const rows = related[type] || []
    return (
      <ContractSection title={config.title} icon={config.icon}>
        <div className="contract-related-toolbar">
          <SearchableLookupField
            label={config.title}
            icon={config.icon}
            value={selectedRelated[type]}
            options={lookups[config.lookup] || []}
            onChange={(value) => setSelectedRelated((prev) => ({ ...prev, [type]: value }))}
            disabled={saving || (!current?.id && !canCreate) || (current?.id && !canWrite)}
            placeholder={`Escribe para buscar ${config.title.toLowerCase()}...`}
          />
          <CButton
            color="primary"
            onClick={() => (type === 'lineas' ? openLineaModal() : addRelated(type))}
            disabled={
              saving ||
              (!current?.id && !canCreate) ||
              (current?.id && !canWrite) ||
              (type === 'lineas' && !canCreateLinea)
            }
          >
            <CIcon icon={cilPlus} className="me-1" />
            Agregar
          </CButton>
        </div>
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
                  onClick={() => openMaintainer(type, row)}
                >
                  {config.columns.map(([field]) => (
                    <CTableDataCell key={field}>{formatValue(row[field])}</CTableDataCell>
                  ))}
                  <CTableDataCell onClick={(event) => event.stopPropagation()}>
                    <CButtonGroup size="sm">
                      <CButton
                        color="secondary"
                        variant="outline"
                        onClick={() => openMaintainer(type, row)}
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        onClick={() => removeRelated(type, row)}
                        disabled={
                          saving || (!current?.id && !canCreate) || (current?.id && !canWrite)
                        }
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

  if (!canRead) {
    return <CAlert color="warning">No tienes permisos para leer Contrato Empresa.</CAlert>
  }

  return (
    <div className="contract-company-page">
      <div className="contract-company-shell">
        <div className="contract-company-topbar">
          <img src={logoUcm} alt="UCM" />
          <div className="contract-company-search">
            <CIcon icon={cilSearch} />
            <CFormInput
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={runOnEnter(onSearch)}
            />
          </div>
          <span className="contract-company-user">
            {user?.firstName || user?.username || 'Usuario'}
          </span>
        </div>

        <CCard className="contract-company-list-card">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <CIcon icon={cilBriefcase} className="me-2" />
              <span>Contrato Empresa</span>
            </div>
            <div className="d-flex gap-2">
              <CButton color="secondary" variant="outline" onClick={onSearch} disabled={loading}>
                <CIcon icon={cilSearch} className="me-1" />
                Buscar
              </CButton>
              {canCreate && (
                <CButton color="primary" onClick={resetForm}>
                  <CIcon icon={cilPlus} className="me-1" />
                  Nuevo
                </CButton>
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            <div className="macos-grid contract-company-list-grid">
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    {[
                      { key: 'id', label: 'ID' },
                      { key: 'titulo', label: 'Titulo' },
                      { key: 'empresa', label: 'Empresa' },
                      { key: 'estado_ctr', label: 'Estado' },
                      { key: 'fecha_inicio', label: 'Inicio' },
                      { key: 'updated_at', label: 'Actualizado' },
                    ].map((column) => (
                      <SortableTableHeader
                        key={column.key}
                        column={column}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    ))}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {items.map((item) => (
                    <CTableRow
                      key={item.id}
                      onClick={() => loadRecord(item.id)}
                      className="contract-related-row"
                    >
                      <CTableDataCell>{item.id}</CTableDataCell>
                      <CTableDataCell>{item.titulo}</CTableDataCell>
                      <CTableDataCell>{item.empresa}</CTableDataCell>
                      <CTableDataCell>{item.estado_ctr}</CTableDataCell>
                      <CTableDataCell>{formatDate(item.fecha_inicio)}</CTableDataCell>
                      <CTableDataCell>{formatDateTime(item.updated_at)}</CTableDataCell>
                    </CTableRow>
                  ))}
                  {items.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="text-center text-body-secondary">
                        Sin contratos empresa registrados
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

        <CForm
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
              <CCol md={3}>
                <SearchableLookupField
                  label="Estado contrato"
                  icon={cilCheckCircle}
                  value={form.id_estado_ctr}
                  options={lookups.estados_ctr || []}
                  onChange={(value) => setField('id_estado_ctr', value)}
                  required
                  disabled={saving}
                  placeholder="Escribe para buscar estado..."
                />
              </CCol>
              <CCol md={3}>
                <div className="contract-field readonly">
                  <CFormLabel>
                    <CIcon icon={cilCalendar} />
                    Fecha creacion
                  </CFormLabel>
                  <strong>{formatDateTime(current?.created_at)}</strong>
                </div>
              </CCol>
              <CCol md={3}>
                <div className="contract-field readonly">
                  <CFormLabel>
                    <CIcon icon={cilCalendar} />
                    Fecha actualizacion
                  </CFormLabel>
                  <strong>{formatDateTime(current?.updated_at)}</strong>
                </div>
              </CCol>
              <CCol md={3}>
                <div className="contract-field readonly">
                  <CFormLabel>
                    <CIcon icon={cilAddressBook} />
                    Usuario
                  </CFormLabel>
                  <strong>{current?.usuario_modificador || current?.usuario_creador || '-'}</strong>
                </div>
              </CCol>
            </CRow>
          </ContractSection>

          <div className="contract-company-form-grid">
            <ContractSection title="Datos Empresa" icon={cilBuilding}>
              <CRow className="g-3">
                <CCol md={6}>
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
                  />
                </CCol>
                <CCol md={6}>
                  <SearchableLookupField
                    label="Categoria"
                    icon={cilBriefcase}
                    value={form.id_categoria}
                    options={lookups.categorias || []}
                    onChange={(value) => setField('id_categoria', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar categoria..."
                  />
                </CCol>
                <CCol md={6}>
                  <SearchableLookupField
                    label="Tipo de servicio"
                    icon={cilList}
                    value={form.id_tipo_servicio}
                    options={lookups.tipo_servicios || []}
                    onChange={(value) => setField('id_tipo_servicio', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar tipo de servicio..."
                  />
                </CCol>
                <CCol md={6}>
                  <SearchableLookupField
                    label="Estado vital"
                    icon={cilCheckCircle}
                    value={form.id_estado_vital}
                    options={lookups.estado_vitales || []}
                    onChange={(value) => setField('id_estado_vital', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar estado vital..."
                  />
                </CCol>
              </CRow>
            </ContractSection>

            <ContractSection title="Datos Contrato" icon={cilDescription}>
              <CRow className="g-3">
                <CCol md={12}>
                  <div className="contract-field">
                    <CFormLabel>
                      <CIcon icon={cilDescription} />
                      Titulo <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      value={form.titulo}
                      onChange={(event) => setField('titulo', event.target.value)}
                    />
                  </div>
                </CCol>
                {[
                  ['fecha_firma', 'Fecha firma'],
                  ['fecha_inicio', 'Fecha inicio'],
                  ['fecha_termino', 'Fecha termino'],
                  ['fecha_facturacion', 'Fecha facturacion'],
                ].map(([field, label]) => (
                  <CCol md={6} key={field}>
                    <div className="contract-field">
                      <CFormLabel>
                        <CIcon icon={cilCalendar} />
                        {label}
                      </CFormLabel>
                      <CFormInput
                        type="date"
                        value={form[field]}
                        onChange={(event) => setField(field, event.target.value)}
                      />
                    </div>
                  </CCol>
                ))}
                <CCol md={6}>
                  <div className="contract-field">
                    <CFormLabel>
                      <CIcon icon={cilMoney} />
                      Medio de pago
                    </CFormLabel>
                    <CFormInput
                      value={form.medio_pago}
                      onChange={(event) => setField('medio_pago', event.target.value)}
                    />
                  </div>
                </CCol>
                <CCol md={6}>
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
                  </div>
                </CCol>
                <CCol md={6}>
                  <SearchableLookupField
                    label="Frecuencia de facturacion"
                    icon={cilCalendar}
                    value={form.id_frecuencia}
                    options={lookups.frecuencias || []}
                    onChange={(value) => setField('id_frecuencia', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar frecuencia..."
                  />
                </CCol>
                <CCol md={6}>
                  <SearchableLookupField
                    label="Tipo de tarifa"
                    icon={cilMoney}
                    value={form.id_tipo_tarifa}
                    options={lookups.tipo_tarifas || []}
                    onChange={(value) => setField('id_tipo_tarifa', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar tipo de tarifa..."
                  />
                </CCol>
                <CCol md={6}>
                  <CFormSwitch
                    className="boolean-switch-field"
                    label="Reajustable"
                    checked={!!form.reajustable}
                    onChange={(event) => setField('reajustable', event.target.checked)}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormSwitch
                    className="boolean-switch-field"
                    label="Requiere orden de compra"
                    checked={!!form.requiere_orden_compra}
                    onChange={(event) => setField('requiere_orden_compra', event.target.checked)}
                  />
                </CCol>
              </CRow>
            </ContractSection>

            <ContractSection title="Datos Contacto" icon={cilAddressBook}>
              <CRow className="g-3">
                <CCol md={12}>
                  <SearchableLookupField
                    label="Contacto"
                    icon={cilAddressBook}
                    value={form.id_contacto}
                    options={lookups.contactos || []}
                    onChange={(value) => setField('id_contacto', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar contacto..."
                  />
                </CCol>
                <CCol md={6}>
                  <SearchableLookupField
                    label="Tipo contacto"
                    icon={cilAddressBook}
                    value={form.id_tipo_contacto}
                    options={lookups.tipo_contactos || []}
                    onChange={(value) => setField('id_tipo_contacto', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar tipo de contacto..."
                  />
                </CCol>
                <CCol md={6}>
                  <SearchableLookupField
                    label="Estado contacto"
                    icon={cilCheckCircle}
                    value={form.id_estado_contacto}
                    options={lookups.estado_contactos || []}
                    onChange={(value) => setField('id_estado_contacto', value)}
                    required
                    disabled={saving}
                    placeholder="Escribe para buscar estado de contacto..."
                  />
                </CCol>
              </CRow>
            </ContractSection>
          </div>

          {renderRelatedSection('lineas')}
          {renderRelatedSection('casos')}
          {renderRelatedSection('documentos')}

          <div className="contract-company-actions">
            <CButton color="secondary" variant="outline" onClick={resetForm} disabled={saving}>
              <CIcon icon={cilX} className="me-1" />
              Cancelar
            </CButton>
            {current?.id && canDelete && (
              <CButton color="danger" variant="outline" onClick={deactivate} disabled={saving}>
                <CIcon icon={cilTrash} className="me-1" />
                Desactivar
              </CButton>
            )}
            {(current?.id ? canWrite : canCreate) && (
              <CButton color="primary" type="submit" disabled={saving}>
                <CIcon icon={cilSave} className="me-1" />
                {saving ? 'Guardando...' : 'Guardar contrato'}
              </CButton>
            )}
          </div>
        </CForm>

        <CModal
          visible={showLineaModal}
          onClose={() => !lineaSaving && setShowLineaModal(false)}
          alignment="center"
          size="lg"
        >
          <CModalHeader closeButton={!lineaSaving}>
            <CModalTitle>Crear linea</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="commercial-form-layout contract-company-create-line">
              <section className="commercial-form-section">
                <div className="commercial-form-section-title">
                  <CIcon icon={cilList} />
                  <span>Contrato y servicio</span>
                </div>
                <CRow className="g-3">
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>
                          Contrato <span className="text-danger">*</span>
                        </span>
                      </CFormLabel>
                      <CFormSelect
                        value={lineaForm.id_contrato}
                        onChange={(event) => setLineaField('id_contrato', event.target.value)}
                        disabled={lineaSaving}
                      >
                        <option value="">Seleccione...</option>
                        {(lookups.contratos || []).map((item) => (
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
                        onChange={(event) =>
                          setLineaField('id_tipo_servicio', event.target.value)
                        }
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
                      <CFormInput
                        type="date"
                        value={lineaForm.fecha_inicio}
                        onChange={(event) => setLineaField('fecha_inicio', event.target.value)}
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
                      <CFormInput
                        type="date"
                        value={lineaForm.fecha_inicio_ciclo_facturacion}
                        onChange={(event) =>
                          setLineaField('fecha_inicio_ciclo_facturacion', event.target.value)
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
                  {[
                    ['tarifa_fija', 'Tarifa fija', 'number'],
                    ['moneda_fijo', 'Moneda fijo', 'text'],
                    ['tarifa_variable', 'Tarifa variable', 'number'],
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
                          type={type}
                          value={lineaForm[field]}
                          onChange={(event) => setLineaField(field, event.target.value)}
                          disabled={lineaSaving}
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
              onClick={() => setShowLineaModal(false)}
              disabled={lineaSaving}
            >
              Cancelar
            </CButton>
            <CButton color="primary" onClick={createLinea} disabled={lineaSaving}>
              <CIcon icon={cilSave} className="me-1" />
              {lineaSaving ? 'Guardando...' : 'Guardar linea'}
            </CButton>
          </CModalFooter>
        </CModal>

        <CModal
          visible={showEmpresaModal}
          onClose={() => !empresaSaving && setShowEmpresaModal(false)}
          alignment="center"
          size="lg"
        >
          <CModalHeader closeButton={!empresaSaving}>
            <CModalTitle>Crear empresa</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="commercial-form-layout contract-company-create-company">
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
                        value={empresaForm.rut}
                        onChange={(event) => setEmpresaField('rut', event.target.value)}
                        placeholder="12.345.678-5"
                        disabled={empresaSaving}
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
                        {empresaRutStatus === 'valid'
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
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilDescription} />
                        <span>Nombre fantasia</span>
                      </CFormLabel>
                      <CFormInput
                        value={empresaForm.nombre_fantasia}
                        onChange={(event) =>
                          setEmpresaField('nombre_fantasia', event.target.value)
                        }
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
                  <CCol md={6}>
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
                  <CCol md={6}>
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
                  <CCol md={6}>
                    <div className="commercial-form-field">
                      <CFormLabel className="commercial-field-label">
                        <CIcon icon={cilList} />
                        <span>Comuna</span>
                      </CFormLabel>
                      <CFormSelect
                        value={empresaForm.comuna}
                        onChange={(event) => setEmpresaField('comuna', event.target.value)}
                        disabled={empresaSaving || !empresaForm.region}
                      >
                        <option value="">Seleccione...</option>
                        {comunasEmpresa.map((comuna) => (
                          <option key={comuna} value={comuna}>
                            {comuna}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={12}>
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
              onClick={() => setShowEmpresaModal(false)}
              disabled={empresaSaving}
            >
              Cancelar
            </CButton>
            <CButton color="primary" onClick={createEmpresa} disabled={empresaSaving}>
              {empresaSaving ? 'Guardando...' : 'Guardar empresa'}
            </CButton>
          </CModalFooter>
        </CModal>
      </div>
    </div>
  )
}

export default ContratoEmpresa
