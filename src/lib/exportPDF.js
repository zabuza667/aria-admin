// Utilitaire export PDF pour Aria - utilise jsPDF via CDN (importé dynamiquement)

async function getJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve(window.jspdf.jsPDF)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// Couleurs Aria
const COLORS = {
  primary: [100, 112, 241],   // #6470f1
  dark:    [10, 11, 18],      // #0a0b12
  surface: [18, 20, 31],      // #12141f
  text:    [255, 255, 255],
  muted:   [150, 155, 190],
  green:   [16, 185, 129],
  yellow:  [245, 158, 11],
  red:     [239, 68, 68],
}

function statusColor(status) {
  if (status === 'paid')    return COLORS.green
  if (status === 'pending') return COLORS.yellow
  if (status === 'overdue') return COLORS.red
  return COLORS.muted
}

function statusLabel(status, isFr) {
  const map = {
    paid:    isFr ? 'Payée'      : 'Paid',
    pending: isFr ? 'En attente' : 'Pending',
    overdue: isFr ? 'En retard'  : 'Overdue',
  }
  return map[status] || status
}

function formatAmount(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(dateStr, isFr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')
}

// Header commun sur chaque page
function drawHeader(doc, title, subtitle, isFr) {
  const W = doc.internal.pageSize.getWidth()

  // Fond header
  doc.setFillColor(...COLORS.surface)
  doc.rect(0, 0, W, 42, 'F')

  // Bande accent gauche
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, 4, 42, 'F')

  // Logo A
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(14, 8, 24, 24, 4, 4, 'F')
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('A', 26, 24, { align: 'center' })

  // Titre
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text('Aria', 44, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text(isFr ? 'Assistant Administratif IA' : 'AI Administrative Assistant', 44, 28)

  // Titre du rapport
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(title, W - 14, 18, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text(subtitle, W - 14, 28, { align: 'right' })
}

// Footer commun
function drawFooter(doc, pageNum, totalPages, isFr) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  doc.setFillColor(...COLORS.surface)
  doc.rect(0, H - 14, W, 14, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text('Aria — ' + (isFr ? 'Généré le ' : 'Generated on ') + new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US'), 10, H - 5)
  doc.text(`${pageNum} / ${totalPages}`, W - 10, H - 5, { align: 'right' })
}

// ─── EXPORT FACTURES ───────────────────────────────────────────────
export async function exportInvoicesPDF(invoices, expenses, isFr) {
  const JsPDF = await getJsPDF()
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const totalRevenue  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending  = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalOverdue  = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  const today = new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US')
  drawHeader(doc, isFr ? 'Rapport Financier' : 'Financial Report', today, isFr)

  let y = 52

  // ── Résumé stats ──
  doc.setFillColor(18, 20, 31)
  doc.roundedRect(10, y, W - 20, 36, 4, 4, 'F')

  const cols = [
    { label: isFr ? 'CA Encaissé' : 'Revenue',  value: formatAmount(totalRevenue),  color: COLORS.green },
    { label: isFr ? 'En attente'  : 'Pending',   value: formatAmount(totalPending),  color: COLORS.yellow },
    { label: isFr ? 'En retard'   : 'Overdue',   value: formatAmount(totalOverdue),  color: COLORS.red },
    { label: isFr ? 'Dépenses'    : 'Expenses',  value: formatAmount(totalExpenses), color: COLORS.muted },
  ]
  const colW = (W - 20) / 4
  cols.forEach((col, i) => {
    const cx = 10 + colW * i + colW / 2
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.muted)
    doc.text(col.label, cx, y + 12, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...col.color)
    doc.text(col.value, cx, y + 24, { align: 'center' })
  })

  y += 46

  // ── Tableau factures ──
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(isFr ? 'Factures' : 'Invoices', 10, y)
  y += 6

  // En-tête tableau
  const headers = isFr
    ? ['N°', 'Client', 'Catégorie', 'Date', 'Échéance', 'Montant', 'Statut']
    : ['No.', 'Client', 'Category', 'Date', 'Due Date', 'Amount', 'Status']
  const colWidths = [22, 45, 28, 22, 22, 28, 22]
  let cx = 10

  doc.setFillColor(...COLORS.primary)
  doc.rect(10, y, W - 20, 7, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  headers.forEach((h, i) => {
    doc.text(h, cx + 2, y + 5)
    cx += colWidths[i]
  })
  y += 7

  // Lignes
  invoices.forEach((inv, idx) => {
    if (y > 260) {
      drawFooter(doc, doc.internal.getNumberOfPages(), '...', isFr)
      doc.addPage()
      drawHeader(doc, isFr ? 'Rapport Financier' : 'Financial Report', today, isFr)
      y = 52
    }

    doc.setFillColor(idx % 2 === 0 ? 14 : 18, idx % 2 === 0 ? 16 : 20, idx % 2 === 0 ? 24 : 31)
    doc.rect(10, y, W - 20, 7, 'F')

    const row = [
      inv.number || ('FAC-' + inv.id),
      inv.client,
      inv.category || '-',
      formatDate(inv.date, isFr),
      formatDate(inv.due, isFr),
      formatAmount(inv.amount),
      statusLabel(inv.status, isFr),
    ]
    cx = 10
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    row.forEach((cell, i) => {
      if (i === 6) {
        doc.setTextColor(...statusColor(inv.status))
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setTextColor(...COLORS.text)
        doc.setFont('helvetica', 'normal')
      }
      const text = String(cell).substring(0, i === 1 ? 22 : 18)
      doc.text(text, cx + 2, y + 5)
      cx += colWidths[i]
    })
    y += 7
  })

  y += 10

  // ── Tableau dépenses ──
  if (y > 230) {
    drawFooter(doc, 1, 2, isFr)
    doc.addPage()
    drawHeader(doc, isFr ? 'Rapport Financier' : 'Financial Report', today, isFr)
    y = 52
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(isFr ? 'Dépenses' : 'Expenses', 10, y)
  y += 6

  const expHeaders = isFr ? ['Description', 'Catégorie', 'Date', 'Montant', 'Statut'] : ['Description', 'Category', 'Date', 'Amount', 'Status']
  const expColW = [60, 35, 28, 32, 24]
  cx = 10

  doc.setFillColor(...COLORS.primary)
  doc.rect(10, y, W - 20, 7, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  expHeaders.forEach((h, i) => { doc.text(h, cx + 2, y + 5); cx += expColW[i] })
  y += 7

  expenses.forEach((exp, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 14 : 18, idx % 2 === 0 ? 16 : 20, idx % 2 === 0 ? 24 : 31)
    doc.rect(10, y, W - 20, 7, 'F')
    const row = [exp.desc, exp.category || '-', formatDate(exp.date, isFr), formatAmount(exp.amount), statusLabel(exp.status, isFr)]
    cx = 10
    doc.setFontSize(7)
    row.forEach((cell, i) => {
      if (i === 4) { doc.setTextColor(...statusColor(exp.status)); doc.setFont('helvetica', 'bold') }
      else { doc.setTextColor(...COLORS.text); doc.setFont('helvetica', 'normal') }
      doc.text(String(cell).substring(0, 30), cx + 2, y + 5)
      cx += expColW[i]
    })
    y += 7
  })

  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, p, totalPages, isFr)
  }

  doc.save(`aria-rapport-financier-${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─── EXPORT UNE FACTURE INDIVIDUELLE ───────────────────────────────
export async function exportSingleInvoicePDF(invoice, companyInfo = {}, isFr) {
  const JsPDF = await getJsPDF()
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  drawHeader(doc, isFr ? 'Facture' : 'Invoice', invoice.number || ('FAC-' + invoice.id), isFr)

  let y = 52

  // Infos facture + client côte à côte
  doc.setFillColor(18, 20, 31)
  doc.roundedRect(10, y, (W - 26) / 2, 40, 4, 4, 'F')
  doc.roundedRect(10 + (W - 26) / 2 + 6, y, (W - 26) / 2, 40, 4, 4, 'F')

  // Bloc gauche - infos facture
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(isFr ? 'INFORMATIONS FACTURE' : 'INVOICE DETAILS', 16, y + 10)

  const leftRows = [
    [isFr ? 'Numéro' : 'Number', invoice.number || ('FAC-' + invoice.id)],
    [isFr ? 'Date' : 'Date', formatDate(invoice.date, isFr)],
    [isFr ? 'Échéance' : 'Due date', formatDate(invoice.due, isFr)],
    [isFr ? 'Catégorie' : 'Category', invoice.category || '-'],
  ]
  leftRows.forEach(([label, val], i) => {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.muted)
    doc.text(label, 16, y + 17 + i * 7)
    doc.setTextColor(...COLORS.text)
    doc.setFont('helvetica', 'bold')
    doc.text(val, 55, y + 17 + i * 7)
  })

  // Bloc droit - client
  const rx = 10 + (W - 26) / 2 + 12
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(isFr ? 'CLIENT' : 'CLIENT', rx, y + 10)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(invoice.client || '-', rx, y + 20)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text(isFr ? 'Référence client' : 'Client reference', rx, y + 30)

  y += 50

  // Tableau articles
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(isFr ? 'Détail de la facture' : 'Invoice details', 10, y)
  y += 6

  const items = invoice.items || [{ desc: invoice.category || 'Prestation', qty: 1, price: invoice.amount }]
  const iHeaders = isFr ? ['Description', 'Qté', 'Prix unitaire', 'Total'] : ['Description', 'Qty', 'Unit price', 'Total']
  const iColW = [90, 20, 35, 34]
  cx = 10

  doc.setFillColor(...COLORS.primary)
  doc.rect(10, y, W - 20, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  iHeaders.forEach((h, i) => { doc.text(h, cx + 3, y + 5.5); cx += iColW[i] })
  y += 8

  let subtotal = 0
  items.forEach((item, idx) => {
    const total = (item.qty || 1) * (item.price || 0)
    subtotal += total

    doc.setFillColor(idx % 2 === 0 ? 14 : 18, idx % 2 === 0 ? 16 : 20, idx % 2 === 0 ? 24 : 31)
    doc.rect(10, y, W - 20, 8, 'F')

    cx = 10
    const row = [item.desc || '-', String(item.qty || 1), formatAmount(item.price || 0), formatAmount(total)]
    doc.setFontSize(8)
    row.forEach((cell, i) => {
      doc.setTextColor(...COLORS.text)
      doc.setFont('helvetica', i === 3 ? 'bold' : 'normal')
      doc.text(String(cell).substring(0, 40), cx + 3, y + 5.5)
      cx += iColW[i]
    })
    y += 8
  })

  y += 6

  // Total
  const tva = subtotal * 0.2
  const ttc = subtotal + tva

  doc.setFillColor(18, 20, 31)
  doc.roundedRect(W - 80, y, 70, 36, 4, 4, 'F')

  const totals = [
    [isFr ? 'Sous-total HT' : 'Subtotal', formatAmount(subtotal)],
    [isFr ? 'TVA (20%)' : 'VAT (20%)', formatAmount(tva)],
  ]
  totals.forEach(([label, val], i) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.muted)
    doc.text(label, W - 76, y + 9 + i * 9)
    doc.setTextColor(...COLORS.text)
    doc.text(val, W - 14, y + 9 + i * 9, { align: 'right' })
  })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(isFr ? 'TOTAL TTC' : 'TOTAL', W - 76, y + 30)
  doc.text(formatAmount(ttc), W - 14, y + 30, { align: 'right' })

  // Statut badge
  y += 46
  doc.setFillColor(...statusColor(invoice.status), 30)
  doc.roundedRect(10, y, 50, 10, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...statusColor(invoice.status))
  doc.text(statusLabel(invoice.status, isFr).toUpperCase(), 35, y + 7, { align: 'center' })

  drawFooter(doc, 1, 1, isFr)
  doc.save(`aria-facture-${invoice.number || invoice.id}-${new Date().toISOString().split('T')[0]}.pdf`)
}
