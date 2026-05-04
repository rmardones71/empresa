export function isPrivilegedRole(role) {
  return role === 'Super Admin' || role === 'Admin'
}

function toUtcIsoStart(dateStr) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function toUtcIsoEnd(dateStr) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T23:59:59.999Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function buildDateRangeParams({ dateFrom, dateTo }) {
  const from = toUtcIsoStart(dateFrom)
  const to = toUtcIsoEnd(dateTo)
  const params = {}
  if (from) params.dateFrom = from
  if (to) params.dateTo = to
  return params
}

export async function exportToXlsx({ fileName, sheetName, rows }) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, fileName)
}

export async function exportToPdf({ fileName, title, head, body }) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(title, 14, 14)

  autoTable(doc, {
    startY: 20,
    head: [head],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [43, 62, 80] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: 14, right: 14 },
  })

  doc.save(fileName)
}
