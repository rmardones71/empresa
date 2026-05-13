const fs = require('fs')
const path = require('path')
const XLSX = require('../../Frontend/node_modules/xlsx')

const baseUrl = process.env.QA_API_BASE_URL || 'http://localhost:4001'
const login = process.env.QA_LOGIN || 'admin'
const password = process.env.QA_PASSWORD || '123456'

async function request(pathname, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const error = new Error(data?.message || `${method} ${pathname} failed`)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

function first(items, label) {
  const item = items?.[0]
  if (!item) throw new Error(`No hay datos para lookup: ${label}`)
  return item
}

async function main() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const results = []

  const health = await request('/api/health')
  results.push({ step: 'health', ok: health.ok, detail: health })

  const loginResult = await request('/api/auth/login', {
    method: 'POST',
    body: { login, password },
  })
  const token = loginResult.accessToken
  if (!token) throw new Error('Login no devolvio accessToken')
  results.push({
    step: 'login',
    ok: true,
    user: loginResult.user?.username,
    role: loginResult.user?.role,
  })

  const resources = [
    'empresas',
    'contactos',
    'contratos_empresa',
    'lineas',
    'casos',
    'documentos',
    'categorias',
    'tipo_contactos',
    'estado_contactos',
    'estado_vitales',
    'estados_ctr',
    'tipo_servicios',
    'tipo_tarifas',
    'frecuencias',
  ]

  for (const resource of resources) {
    // eslint-disable-next-line no-await-in-loop
    const data = await request(`/api/commercial/${resource}?page=1&pageSize=20`, { token })
    results.push({ step: `list:${resource}`, ok: true, total: data.total, count: data.items?.length || 0 })
  }

  const lookups = await request('/api/commercial/lookups', { token })
  const empresa = first(lookups.empresas, 'empresas')
  const categoria = first(lookups.categorias, 'categorias')
  const tipoServicio = first(lookups.tipo_servicios, 'tipo_servicios')
  const estadoVital = first(lookups.estado_vitales, 'estado_vitales')
  const estadoCtr = first(lookups.estados_ctr, 'estados_ctr')
  const frecuencia = first(lookups.frecuencias, 'frecuencias')
  const tipoTarifa = first(lookups.tipo_tarifas, 'tipo_tarifas')
  const contacto = first(lookups.contactos, 'contactos')
  const tipoContacto = lookups.tipo_contactos.find((item) => item.id === contacto.id_tipo_contacto) || first(lookups.tipo_contactos, 'tipo_contactos')
  const estadoContacto = lookups.estado_contactos.find((item) => item.id === contacto.id_estado_contacto) || first(lookups.estado_contactos, 'estado_contactos')

  const contractPayload = {
    rut_empresa: empresa.id,
    id_categoria: categoria.id,
    id_tipo_servicio: tipoServicio.id,
    id_estado_vital: estadoVital.id,
    id_estado_ctr: estadoCtr.id,
    titulo: `QA Contrato ${stamp}`,
    fecha_firma: '2026-05-11',
    fecha_inicio: '2026-05-12',
    fecha_termino: '2026-12-31',
    fecha_facturacion: '2026-06-01',
    medio_pago: 'QA transferencia',
    reajustable: true,
    multa: 12345,
    requiere_orden_compra: false,
    id_frecuencia: frecuencia.id,
    id_tipo_tarifa: tipoTarifa.id,
    id_contacto: contacto.id,
    id_tipo_contacto: tipoContacto.id,
    id_estado_contacto: estadoContacto.id,
  }
  const contract = await request('/api/commercial/contratos_empresa', {
    method: 'POST',
    token,
    body: contractPayload,
  })
  const contractId = contract.id
  results.push({ step: 'create:contrato', ok: true, id: contractId })

  const line = await request('/api/commercial/lineas', {
    method: 'POST',
    token,
    body: {
      contrato_empresa_id: contractId,
      id_tipo_servicio: tipoServicio.id,
      id_tipo_tarifa: tipoTarifa.id,
      id_frecuencia: frecuencia.id,
      titulo: `QA Linea ${stamp}`,
      fecha_inicio: '2026-05-12',
      fecha_inicio_ciclo_facturacion: '2026-06-01',
      divisa: 'Peso',
      tarifa_fija: 100000,
      tarifa_variable: 25000,
      moneda_fijo: 'CLP',
      moneda_variable: 'CLP',
      unidad_variable: 'evento',
      iva: true,
    },
  })
  results.push({ step: 'create:linea', ok: true, id: line.id_linea })

  const caso = await request('/api/commercial/casos', {
    method: 'POST',
    token,
    body: {
      id_contacto: contacto.id,
      contrato_empresa_id: contractId,
      titulo: `QA Caso ${stamp}`,
      texto: 'Caso creado durante QA automatizado.',
      relato: 'Validacion de ingreso de casos desde flujo comercial.',
      adjuntos: '',
    },
  })
  results.push({ step: 'create:caso', ok: true, id: caso.id_caso })

  const documento = await request('/api/commercial/documentos', {
    method: 'POST',
    token,
    body: {
      contrato_empresa_id: contractId,
      tipo_documento: 'QA',
      nombre: `QA Documento ${stamp}`,
      descripcion: 'Documento creado durante QA automatizado.',
      version: '1.0',
      responsable: 'QA',
      archivo: 'https://example.com/qa-documento.pdf',
      estado: 'Vigente',
    },
  })
  results.push({ step: 'create:documento', ok: true, id: documento.id_documento })

  const contractRead = await request(`/api/commercial/contratos_empresa/${contractId}`, { token })
  results.push({
    step: 'read:contrato_creado',
    ok: contractRead.id === contractId,
    id: contractRead.id,
    titulo: contractRead.titulo,
  })

  const search = encodeURIComponent(`QA Contrato ${stamp}`)
  const searchResult = await request(`/api/commercial/contratos_empresa?page=1&pageSize=20&q=${search}`, { token })
  results.push({
    step: 'search:contrato',
    ok: searchResult.total >= 1,
    total: searchResult.total,
  })

  const exportRows = searchResult.items.map((row) => ({
    Codigo: row.codigo_contrato_empresa,
    Titulo: row.titulo,
    Empresa: row.empresa,
    Estado: row.estado_ctr,
    Inicio: row.fecha_inicio,
  }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), 'Contratos QA')
  const exportPath = path.join(__dirname, '..', '.tmp', `qa-export-${stamp}.xlsx`)
  fs.mkdirSync(path.dirname(exportPath), { recursive: true })
  XLSX.writeFile(workbook, exportPath)
  const exportStats = fs.statSync(exportPath)
  results.push({
    step: 'export:xlsx',
    ok: exportStats.size > 0,
    file: exportPath,
    bytes: exportStats.size,
  })

  console.log(JSON.stringify({ ok: true, stamp, results }, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    status: error.status,
    message: error.message,
    data: error.data,
  }, null, 2))
  process.exit(1)
})
