export function canExportExcelPdf(user) {
  if (user?.role === 'Super Admin') return true
  return !!user?.permissions?.['ui.export_excel_pdf']?.read
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

export async function exportToXlsx({ fileName, sheetName, rows, sheets = [] }) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const baseWorksheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, baseWorksheet, sheetName)
  sheets.forEach(({ sheetName: extraSheetName, rows: extraRows = [] }) => {
    const worksheet = XLSX.utils.json_to_sheet(extraRows)
    XLSX.utils.book_append_sheet(workbook, worksheet, extraSheetName)
  })
  XLSX.writeFile(workbook, fileName)
}

export async function exportToPdf({ fileName, title, head, body, logoDataUrl, metaRight }) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header (corporativo)
  const headerTop = 10
  const headerHeight = 16
  const leftX = 14
  const rightX = pageWidth - 14

  if (logoDataUrl) {
    try {
      // Logo compacto: mantener proporción visual en el header.
      const logoMaxW = 24
      const logoH = 10
      doc.addImage(logoDataUrl, 'PNG', leftX, headerTop + 2, logoMaxW, logoH)
    } catch {
      // Si el logo falla, igual exportamos.
    }
  }

  doc.setFontSize(15)
  doc.setTextColor(17, 24, 39)
  doc.text(title, logoDataUrl ? leftX + 28 : leftX, headerTop + 9)

  if (metaRight) {
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(String(metaRight), rightX, headerTop + 9, { align: 'right' })
  }

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.6)
  doc.line(leftX, headerTop + headerHeight, rightX, headerTop + headerHeight)

  autoTable(doc, {
    startY: headerTop + headerHeight + 6,
    head: [head],
    body,
    styles: { fontSize: 9, cellPadding: 2, textColor: [15, 23, 42] },
    headStyles: { fillColor: [15, 42, 74], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  doc.save(fileName)
}
