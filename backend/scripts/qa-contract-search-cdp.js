const fs = require('fs/promises')
const path = require('path')
const { spawn } = require('child_process')

const FRONTEND_URL = 'http://localhost:3000'
const FRONTEND_LOGIN_URL = `${FRONTEND_URL}/?qaRoute=login#/login`
const FRONTEND_CONTRACT_URL = `${FRONTEND_URL}/?qaRoute=contract#/contratos-empresa`
const API_URL = 'http://localhost:4000'
const REMOTE_DEBUG_PORT = 9222
const SEARCH_INPUT_SELECTOR = '.contract-company-search input'
const SEARCH_RESULT_SELECTOR = '.contract-search-results .contract-search-result'
const LOGIN_CREDENTIALS = {
  login: 'qa.user.dashboard.01',
  password: '123456',
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function pickChromePath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }
  throw new Error('No se encontro Chrome/Edge para ejecutar QA headless')
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}: ${text}`)
  }
  return text ? JSON.parse(text) : {}
}

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.id = 0
    this.pending = new Map()
    this.listeners = new Map()
    this.socket = null
  }

  async connect() {
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(this.wsUrl)
      this.socket = socket

      socket.addEventListener('open', () => resolve())
      socket.addEventListener('error', (error) => reject(error))
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data)
        if (message.id && this.pending.has(message.id)) {
          const { resolve: done, reject: fail } = this.pending.get(message.id)
          this.pending.delete(message.id)
          if (message.error) fail(new Error(message.error.message || JSON.stringify(message.error)))
          else done(message.result || {})
          return
        }
        if (message.method && this.listeners.has(message.method)) {
          for (const handler of this.listeners.get(message.method)) handler(message.params || {})
        }
      })
    })
  }

  on(method, handler) {
    const current = this.listeners.get(method) || []
    current.push(handler)
    this.listeners.set(method, current)
  }

  async send(method, params = {}) {
    const id = ++this.id
    const payload = JSON.stringify({ id, method, params })
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(payload)
    })
  }

  async close() {
    if (!this.socket) return
    await new Promise((resolve) => {
      this.socket.addEventListener('close', () => resolve(), { once: true })
      this.socket.close()
    })
  }
}

async function launchHeadlessChrome() {
  const chromePath = await pickChromePath()
  const profileDir = path.join(process.cwd(), '.tmp', 'qa-contract-search-browser')
  await fs.rm(profileDir, { recursive: true, force: true })
  await fs.mkdir(profileDir, { recursive: true })

  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${REMOTE_DEBUG_PORT}`,
      `--user-data-dir=${profileDir}`,
      '--window-size=1600,1400',
      'about:blank',
    ],
    {
      stdio: 'ignore',
      detached: false,
    },
  )

  let lastError = null
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const version = await fetchJson(`http://127.0.0.1:${REMOTE_DEBUG_PORT}/json/version`)
      const targets = await fetchJson(`http://127.0.0.1:${REMOTE_DEBUG_PORT}/json/list`)
      const page = targets.find((item) => item.type === 'page')
      if (version.Browser && page?.webSocketDebuggerUrl) {
        return { chrome, pageWsUrl: page.webSocketDebuggerUrl, profileDir }
      }
    } catch (error) {
      lastError = error
      await sleep(250)
    }
  }

  chrome.kill('SIGKILL')
  throw lastError || new Error('No fue posible abrir Chrome headless')
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  return result.result?.value
}

function js(value) {
  return JSON.stringify(value)
}

async function waitFor(client, label, predicateExpression, timeoutMs = 8000, intervalMs = 100) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const ok = await evaluate(client, predicateExpression)
    if (ok) return true
    await sleep(intervalMs)
  }
  throw new Error(`Timeout esperando ${label}`)
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url })
  await waitFor(
    client,
    `navegacion a ${url}`,
    'document.readyState === "complete" && !!document.body',
    12000,
  )
}

async function loginByApi() {
  const payload = await fetchJson(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(LOGIN_CREDENTIALS),
  })
  if (payload.requires2fa) throw new Error('El usuario QA requiere 2FA; no es apto para QA automatizado')
  if (payload.user?.tempPassword) throw new Error('El usuario QA expira con cambio de contrasena')
  return payload
}

async function seedSessionIntoLocalStorage(client, session) {
  await navigate(client, FRONTEND_LOGIN_URL)
  await evaluate(
    client,
    `
      (() => {
        localStorage.setItem(
          'crm_oportunidades_auth',
          ${js(
            JSON.stringify({
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              user: session.user,
            }),
          )}
        )
        return true
      })()
    `,
  )
}

async function bootstrapContractPage(client, session) {
  await seedSessionIntoLocalStorage(client, session)
  await navigate(client, FRONTEND_CONTRACT_URL)
  await waitFor(
    client,
    'input del buscador',
    `!!document.querySelector(${js(SEARCH_INPUT_SELECTOR)})`,
    12000,
  )
  await installPageProbe(client)
}

async function installPageProbe(client) {
  await evaluate(
    client,
    `
      (() => {
        const getSearchInput = () => document.querySelector(${js(SEARCH_INPUT_SELECTOR)})
        const getSearchCodes = () =>
          Array.from(document.querySelectorAll(${js(SEARCH_RESULT_SELECTOR)})).map((node) => ({
            code: node.querySelector('span')?.textContent?.trim() || '',
            title: node.querySelector('strong')?.textContent?.trim() || '',
            company: node.querySelector('em')?.textContent?.trim() || '',
          }))

        const getLoadedCode = () => {
          const field = Array.from(document.querySelectorAll('.contract-header-section .contract-field')).find((node) => {
            const label = node.querySelector('label')?.textContent || ''
            return label.toLowerCase().includes('codigo contrato')
          })
          return field?.querySelector('strong')?.textContent?.trim() || ''
        }

        const getContractTitle = () => {
          const field = Array.from(document.querySelectorAll('.contract-company-section-contract .contract-field')).find((node) => {
            const label = node.querySelector('label')?.textContent || ''
            return label.toLowerCase().includes('titulo')
          })
          return field?.querySelector('input')?.value?.trim() || ''
        }

        const buildSnapshot = () => ({
          open: !!document.querySelector('.contract-search-results'),
          codes: getSearchCodes(),
          loadedCode: getLoadedCode(),
          title: getContractTitle(),
          hash: window.location.hash,
          inputValue: getSearchInput()?.value || '',
        })

        const state = window.__contractQaProbe || {
          events: [],
          observer: null,
          lastSignature: '',
          lastLoadedCode: '',
        }

        if (state.observer) state.observer.disconnect()

        const pushEvent = (type) => {
          const snap = buildSnapshot()
          state.events.push({
            type,
            at: performance.now(),
            open: snap.open,
            loadedCode: snap.loadedCode,
            hash: snap.hash,
            resultCodes: snap.codes.map((item) => item.code),
            inputValue: snap.inputValue,
          })
        }

        const updateState = (type = 'mutation') => {
          const snap = buildSnapshot()
          const signature = JSON.stringify({
            open: snap.open,
            codes: snap.codes.map((item) => item.code),
            loadedCode: snap.loadedCode,
            hash: snap.hash,
            inputValue: snap.inputValue,
          })
          if (signature === state.lastSignature) return
          state.lastSignature = signature
          pushEvent(type)
        }

        state.events = []
        state.lastSignature = ''
        state.lastLoadedCode = ''
        state.observer = new MutationObserver(() => updateState('mutation'))
        state.observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        })

        window.__contractQaProbe = state
        window.__contractQaSnapshot = buildSnapshot
        window.__contractQaReset = () => {
          state.events = []
          state.lastSignature = ''
          updateState('reset')
        }
        window.__contractQaEvents = () => state.events.slice()
        updateState('install')
        return true
      })()
    `,
  )
}

async function pageSnapshot(client) {
  return evaluate(client, 'window.__contractQaSnapshot ? window.__contractQaSnapshot() : null')
}

async function resetProbe(client) {
  await evaluate(client, 'window.__contractQaReset && window.__contractQaReset()')
}

async function probeEvents(client) {
  return evaluate(client, 'window.__contractQaEvents ? window.__contractQaEvents() : []')
}

async function setSearchValue(client, value) {
  return evaluate(
    client,
    `
      (() => {
        const input = document.querySelector(${js(SEARCH_INPUT_SELECTOR)})
        if (!input) return { ok: false, reason: 'search-input-not-found' }
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(input, ${js(value)})
        input.dispatchEvent(new Event('input', { bubbles: true }))
        return { ok: true, value: input.value }
      })()
    `,
  )
}

async function clearSearch(client) {
  await setSearchValue(client, '')
  await sleep(100)
}

async function typeSearch(client, value, charDelayMs = 70) {
  await clearSearch(client)
  let current = ''
  for (const char of value) {
    current += char
    await setSearchValue(client, current)
    await sleep(charDelayMs)
  }
}

async function waitForSearchIdle(client, timeoutMs = 5000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const snap = await pageSnapshot(client)
    const hasLoading = snap?.inputValue && snap?.open === false
    if (!hasLoading) {
      await sleep(300)
      return pageSnapshot(client)
    }
    await sleep(120)
  }
  return pageSnapshot(client)
}

async function clickResultByCode(client, code) {
  const result = await evaluate(
    client,
    `
      (() => {
        const nodes = Array.from(document.querySelectorAll(${js(SEARCH_RESULT_SELECTOR)}))
        const target = nodes.find((node) => (node.querySelector('span')?.textContent || '').trim() === ${js(code)})
        if (!target) return { ok: false }
        const eventNames = ['pointerdown', 'mousedown', 'click']
        for (const eventName of eventNames) {
          const ctor = eventName === 'pointerdown' ? PointerEvent : MouseEvent
          target.dispatchEvent(new ctor(eventName, { bubbles: true, cancelable: true, button: 0, buttons: 1 }))
        }
        return { ok: true }
      })()
    `,
  )
  if (!result?.ok) throw new Error(`No se encontro resultado ${code} para hacer click`)
}

async function fetchContractsFromApi(session) {
  const response = await fetchJson(
    `${API_URL}/api/contratos-empresa?page=1&pageSize=12&sortBy=updated_at&sortDir=desc`,
    {
      headers: {
        authorization: `Bearer ${session.accessToken}`,
      },
    },
  )
  return response.items || []
}

function normalizeRut(value) {
  return String(value || '')
    .replace(/\./g, '')
    .replace(/-/g, '')
    .trim()
}

function buildCases(targetA, targetB) {
  const partialCodeA = targetA.codigo_contrato_empresa.slice(-4)
  const partialCodeB = targetB.codigo_contrato_empresa.slice(-4)
  const partialEmpresaA = targetA.empresa.slice(0, Math.min(12, targetA.empresa.length)).toLowerCase()
  const partialEmpresaB = targetB.empresa.slice(0, Math.min(10, targetB.empresa.length)).toUpperCase()

  return [
    {
      id: 'code_exact_a',
      label: 'Codigo exacto A',
      query: targetA.codigo_contrato_empresa,
      expectedCode: targetA.codigo_contrato_empresa,
    },
    {
      id: 'code_partial_b',
      label: 'Codigo parcial B',
      query: partialCodeB,
      expectedCode: targetB.codigo_contrato_empresa,
    },
    {
      id: 'rut_formatted_a',
      label: 'RUT con puntos A',
      query: targetA.rut_empresa,
      expectedCode: targetA.codigo_contrato_empresa,
    },
    {
      id: 'rut_plain_b',
      label: 'RUT sin puntos B',
      query: normalizeRut(targetB.rut_empresa),
      expectedCode: targetB.codigo_contrato_empresa,
    },
    {
      id: 'empresa_exact_a',
      label: 'Razon social exacta A',
      query: targetA.empresa,
      expectedCode: targetA.codigo_contrato_empresa,
    },
    {
      id: 'empresa_partial_b',
      label: 'Razon social parcial B',
      query: partialEmpresaB,
      expectedCode: targetB.codigo_contrato_empresa,
    },
    {
      id: 'mixed_partial_a',
      label: 'Parcial mixto A',
      query: `contrato ${partialCodeA}`,
      expectedCode: targetA.codigo_contrato_empresa,
    },
    {
      id: 'empty',
      label: 'Busqueda vacia',
      query: '',
      expectedCode: null,
    },
    {
      id: 'not_found',
      label: 'Sin resultados',
      query: 'zzzz-no-existe-qa',
      expectedCode: null,
    },
    {
      id: 'rapid_switch',
      label: 'Cambio rapido A->B',
      query: `${partialCodeA}${partialEmpresaA.slice(0, 2)}`,
      expectedCode: null,
      custom: 'rapidSwitch',
      targetA,
      targetB,
    },
  ]
}

function summarizeEvents(events = []) {
  let openTransitions = 0
  let closeTransitions = 0
  let resultMutations = 0
  let lastOpen = null
  for (const event of events) {
    if (typeof event.open === 'boolean' && event.open !== lastOpen) {
      if (event.open) openTransitions += 1
      else closeTransitions += 1
      lastOpen = event.open
    }
    if (event.type === 'mutation' && (event.resultCodes || []).length) resultMutations += 1
  }
  return { openTransitions, closeTransitions, resultMutations }
}

function summarizeRequests(requests = []) {
  return requests.reduce(
    (summary, request) => {
      const method = String(request?.method || '').toUpperCase()
      const url = String(request?.url || '')
      if (method === 'OPTIONS') {
        summary.preflight += 1
        return summary
      }
      if (url.includes('/api/contratos-empresa?')) summary.search += 1
      else if (/\/api\/contratos-empresa\/\d+/.test(url)) summary.detail += 1
      return summary
    },
    { search: 0, detail: 0, preflight: 0 },
  )
}

async function runStandardCase(client, networkUrls, testCase) {
  await resetProbe(client)
  networkUrls.length = 0

  if (!testCase.query) {
    await clearSearch(client)
    await sleep(500)
    const snap = await pageSnapshot(client)
    return {
      id: testCase.id,
      label: testCase.label,
      query: testCase.query,
      resultCount: snap?.codes?.length || 0,
      loadedCode: snap?.loadedCode || '',
      open: !!snap?.open,
      events: await probeEvents(client),
      requests: [...networkUrls],
      pass: !snap?.open && !snap?.codes?.length,
      note: 'Busqueda vacia debe cerrar la lista y no disparar resultados',
    }
  }

  await typeSearch(client, testCase.query)
  let snap = await waitForSearchIdle(client)
  const visibleCodes = snap?.codes?.map((item) => item.code) || []

  if (!testCase.expectedCode) {
    const isEmptyStateRow =
      !!snap?.open && visibleCodes.length === 1 && visibleCodes[0] === '0'
    return {
      id: testCase.id,
      label: testCase.label,
      query: testCase.query,
      resultCount: visibleCodes.length,
      visibleCodes,
      loadedCode: snap?.loadedCode || '',
      open: !!snap?.open,
      events: await probeEvents(client),
      requests: [...networkUrls],
      pass: visibleCodes.length === 0 || isEmptyStateRow,
      note: 'No debe cargar contrato y debe mostrar estado vacio o cerrar resultados',
    }
  }

  const targetCode = visibleCodes.includes(testCase.expectedCode)
    ? testCase.expectedCode
    : visibleCodes[0]
  if (!targetCode) {
    return {
      id: testCase.id,
      label: testCase.label,
      query: testCase.query,
      resultCount: visibleCodes.length,
      visibleCodes,
      loadedCode: snap?.loadedCode || '',
      open: !!snap?.open,
      events: await probeEvents(client),
      requests: [...networkUrls],
      pass: false,
      note: 'El buscador no mostro resultados seleccionables',
    }
  }

  await clickResultByCode(client, targetCode)
  let loadError = null
  try {
    await waitFor(
      client,
      `carga del contrato ${targetCode}`,
      `
        (() => {
          const snap = window.__contractQaSnapshot ? window.__contractQaSnapshot() : null
          return !!snap && snap.loadedCode === ${js(targetCode)} && snap.hash.includes('open=')
        })()
      `,
      10000,
      120,
    )
  } catch (error) {
    loadError = error
  }
  await sleep(600)
  snap = await pageSnapshot(client)
  const events = await probeEvents(client)

  return {
    id: testCase.id,
    label: testCase.label,
    query: testCase.query,
    resultCount: visibleCodes.length,
    visibleCodes,
    loadedCode: snap?.loadedCode || '',
    title: snap?.title || '',
    hash: snap?.hash || '',
    open: !!snap?.open,
    events,
    requests: [...networkUrls],
    pass: snap?.loadedCode === targetCode && !snap?.open,
    note: loadError ? loadError.message : `Debe cargar ${targetCode} y cerrar la lista`,
  }
}

async function runRapidSwitchCase(client, networkUrls, testCase) {
  await resetProbe(client)
  networkUrls.length = 0

  await typeSearch(client, testCase.targetA.codigo_contrato_empresa.slice(-4))
  await sleep(90)
  await typeSearch(client, testCase.targetB.codigo_contrato_empresa.slice(-4), 35)
  await waitForSearchIdle(client)
  const beforeClick = await pageSnapshot(client)
  const targetCode = beforeClick?.codes?.find((item) => item.code === testCase.targetB.codigo_contrato_empresa)
    ?.code || beforeClick?.codes?.[0]?.code

  if (!targetCode) {
    return {
      id: testCase.id,
      label: testCase.label,
      query: `${testCase.targetA.codigo_contrato_empresa.slice(-4)} -> ${testCase.targetB.codigo_contrato_empresa.slice(-4)}`,
      pass: false,
      visibleCodes: beforeClick?.codes?.map((item) => item.code) || [],
      events: await probeEvents(client),
      requests: [...networkUrls],
      note: 'No hubo resultados luego del cambio rapido',
    }
  }

  await clickResultByCode(client, targetCode)
  let loadError = null
  try {
    await waitFor(
      client,
      `carga rapida ${targetCode}`,
      `
        (() => {
          const snap = window.__contractQaSnapshot ? window.__contractQaSnapshot() : null
          return !!snap && snap.loadedCode === ${js(targetCode)}
        })()
      `,
      10000,
      120,
    )
  } catch (error) {
    loadError = error
  }
  await sleep(700)
  const snap = await pageSnapshot(client)

  return {
    id: testCase.id,
    label: testCase.label,
    query: `${testCase.targetA.codigo_contrato_empresa.slice(-4)} -> ${testCase.targetB.codigo_contrato_empresa.slice(-4)}`,
    visibleCodes: beforeClick?.codes?.map((item) => item.code) || [],
    loadedCode: snap?.loadedCode || '',
    hash: snap?.hash || '',
    open: !!snap?.open,
    events: await probeEvents(client),
    requests: [...networkUrls],
    pass: snap?.loadedCode === targetCode && !snap?.open,
    note: loadError
      ? loadError.message
      : 'Al cambiar de criterio rapido no debe reabrirse la lista ni cargar el contrato anterior',
  }
}

async function main() {
  const { chrome, pageWsUrl } = await launchHeadlessChrome()
  const networkUrls = []
  let client = null

  try {
    const session = await loginByApi()
    const records = await fetchContractsFromApi(session)
    if (records.length < 2) throw new Error('Se necesitan al menos 2 contratos para correr QA de buscador')

    client = new CdpSession(pageWsUrl)
    await client.connect()
    client.on('Network.requestWillBeSent', (params) => {
      const url = params.request?.url || ''
      if (url.includes('/api/contratos-empresa')) {
        networkUrls.push({
          method: params.request?.method || '',
          url,
        })
      }
    })

    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Network.enable')

    await bootstrapContractPage(client, session)

    const [targetA, targetB] = records
    const qaCases = buildCases(targetA, targetB)
    const results = []

    for (const testCase of qaCases) {
      // eslint-disable-next-line no-await-in-loop
      const result =
        testCase.custom === 'rapidSwitch'
          ? // eslint-disable-next-line no-await-in-loop
            await runRapidSwitchCase(client, networkUrls, testCase)
          : // eslint-disable-next-line no-await-in-loop
            await runStandardCase(client, networkUrls, testCase)
      const eventSummary = summarizeEvents(result.events)
      const requestSummary = summarizeRequests(result.requests)
      results.push({
        ...result,
        eventSummary,
        requestSummary,
      })
    }

    const bugs = []
    for (const result of results) {
      if (!result.pass) bugs.push(`${result.id}: ${result.note}`)
      if (result.eventSummary?.openTransitions > 2 || result.eventSummary?.resultMutations > 4) {
        bugs.push(`${result.id}: parpadeo detectado (${JSON.stringify(result.eventSummary)})`)
      }
      if (result.requestSummary?.detail > 2) {
        bugs.push(`${result.id}: demasiadas cargas de detalle (${result.requestSummary.detail})`)
      }
    }

    const summary = {
      testedAt: new Date().toISOString(),
      targetA: {
        code: targetA.codigo_contrato_empresa,
        rut: targetA.rut_empresa,
        empresa: targetA.empresa,
      },
      targetB: {
        code: targetB.codigo_contrato_empresa,
        rut: targetB.rut_empresa,
        empresa: targetB.empresa,
      },
      results,
      bugs,
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 2))
  } finally {
    if (client) await client.close().catch(() => {})
    chrome.kill('SIGKILL')
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
