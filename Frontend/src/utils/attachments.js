const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

function parseAttachment(value) {
  if (value === null || value === undefined) return { url: '', fileName: '' }

  if (typeof value === 'object') {
    return {
      url: String(value.url || '').trim(),
      fileName: String(value.fileName || value.name || '').trim(),
    }
  }

  const raw = String(value).trim()
  if (!raw || raw === '-' || raw.toLowerCase() === 'null') return { url: '', fileName: '' }

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parseAttachment(parsed)
    if (parsed && typeof parsed === 'object') return parseAttachment(parsed)
  } catch {
    // Los registros existentes guardan normalmente una URL simple.
  }

  return { url: raw, fileName: '' }
}

function toAbsoluteUrl(url) {
  if (!url) return ''
  if (/^(https?:|blob:|data:)/i.test(url)) return url
  if (url.startsWith('//')) return `${window.location.protocol}${url}`
  if (/^www\./i.test(url)) return `https://${url}`

  const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
  const normalizedPath = url.startsWith('/') ? url : `/${url}`
  return new URL(normalizedPath, normalizedBase).toString()
}

export function getAttachmentUrl(value) {
  return toAbsoluteUrl(parseAttachment(value).url)
}

export function getAttachmentFileName(value) {
  const attachment = parseAttachment(value)
  if (attachment.fileName) return attachment.fileName

  try {
    const parsedUrl = new URL(getAttachmentUrl(value))
    const fileName = parsedUrl.pathname.split('/').filter(Boolean).pop()
    return fileName ? decodeURIComponent(fileName) : 'archivo'
  } catch {
    const rawName = attachment.url.split(/[?#]/)[0].split('/').filter(Boolean).pop()
    return rawName || 'archivo'
  }
}

function getContentDispositionFileName(header) {
  if (!header) return ''

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].trim())

  const plainMatch = header.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1]?.trim() || ''
}

function triggerBrowserDownload(url, fileName) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'archivo'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function downloadAttachment(value) {
  const url = getAttachmentUrl(value)
  if (!url) throw new Error('No hay archivo para descargar')

  const fallbackName = getAttachmentFileName(value)

  if (/^(blob:|data:)/i.test(url)) {
    triggerBrowserDownload(url, fallbackName)
    return
  }

  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const blob = await response.blob()
    const dispositionName = getContentDispositionFileName(
      response.headers.get('content-disposition'),
    )
    const objectUrl = URL.createObjectURL(blob)

    triggerBrowserDownload(objectUrl, dispositionName || fallbackName)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch (error) {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    throw new Error('No se pudo descargar el archivo')
  }
}
