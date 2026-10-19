import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'
import { SaleService } from './sale.service.js'
import { PurchaseService } from './purchase.service.js'
import { CreditNoteService } from './creditNote.service.js'
import { DebitNoteService } from './debitNote.service.js'
import { CustomerService } from './customer.service.js'
import { VendorService } from './vendor.service.js'
import { ProductService } from './product.service.js'
import { SettingsService } from './settings.service.js'
import { formatAmountInWords } from '../utils/numberToWords.js'
import { getTable } from '../storage.js'

export class DocumentService {
  static formatMoney(cents) {
    const val = (cents || 0) / 100
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f|\u00a0/g, ' ') + ' DA'
  }

  static formatDate(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  static escapeHtml(str) {
    if (str === null || str === undefined) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  static async resolveDocumentData(type, id) {
    const validId = Number(id)
    let document = null
    let partner = null

    if (type === 'proforma' || type === 'saleOrder' || type === 'invoice' || type === 'sale') {
      document = await SaleService.getSale(validId)
      if (!document) throw new Error('Sale not found')
      partner = await CustomerService.getCustomer(document.customer_id) || {}
    } else if (type === 'purchaseOrder' || type === 'purchase') {
      document = await PurchaseService.getPurchase(validId)
      if (!document) throw new Error('Purchase not found')
      partner = await VendorService.getVendor(document.vendor_id) || {}
    } else if (type === 'creditNote') {
      document = await CreditNoteService.getCreditNote(validId)
      if (!document) throw new Error('Credit Note not found')
      partner = await CustomerService.getCustomer(document.customer_id) || {}
    } else if (type === 'debitNote') {
      document = await DebitNoteService.getDebitNote(validId)
      if (!document) throw new Error('Debit Note not found')
      partner = await VendorService.getVendor(document.vendor_id) || {}
    } else {
      throw new Error(`Unsupported document type: ${type}`)
    }

    const settings = await SettingsService.getSettings()
    return { type, document, partner, settings }
  }

  // --- HTML Layout Generator ---
  static async generateHtml({ type, document: doc, partner: p, settings: s, i18n }) {
    const e = this.escapeHtml
    const lines = Array.isArray(doc.lines) ? doc.lines : []
    const isRtl = i18n?.isRtl || false
    const dirHtml = isRtl ? 'dir="rtl"' : 'dir="ltr"'

    let titleText = 'F A C T U R E'
    let docNumberLabel = 'N° de facture'
    let partnerHeader = 'Client :'
    let legalPhrase = 'Arrêté la présente facture a la somme de :'

    if (type === 'proforma') {
      titleText = isRtl ? 'فاتورة شكلية' : 'F A C T U R E   P R O F O R M A'
      docNumberLabel = isRtl ? 'رقم الفاتورة الشكلية' : 'N° de proforma'
      partnerHeader = isRtl ? 'العميل :' : 'Client :'
      legalPhrase = isRtl ? 'حُررت هذه الفاتورة الشكلية بمبلغ قدره :' : 'Arrêté la présente facture proforma a la somme de :'
    } else if (type === 'saleOrder') {
      titleText = isRtl ? 'سند طلبية' : 'B O N   D E   C O M M A N D E'
      docNumberLabel = isRtl ? 'رقم الطلبية' : 'N° de commande'
      partnerHeader = isRtl ? 'العميل :' : 'Client :'
      legalPhrase = 'Arrêté le présent bon de commande a la somme de :'
    } else if (type === 'purchaseOrder' || type === 'purchase') {
      titleText = isRtl ? 'سند طلبية مورد' : 'B O N   D E   C O M M A N D E'
      docNumberLabel = isRtl ? 'رقم الطلبية' : 'N° de commande'
      partnerHeader = isRtl ? 'المورد :' : 'Fournisseur :'
      legalPhrase = 'Arrêté le présent bon de commande a la somme de :'
    } else if (type === 'creditNote') {
      titleText = isRtl ? 'سند إشعار دائن' : 'A V O I R'
      docNumberLabel = isRtl ? 'رقم الإشعار' : "N° d'avoir"
      partnerHeader = isRtl ? 'العميل :' : 'Client :'
      legalPhrase = "Arrêté le présent avoir a la somme de :"
    } else if (type === 'debitNote') {
      titleText = isRtl ? 'سند إشعار مدين' : 'B O N   D E   D É B I T'
      docNumberLabel = isRtl ? 'رقم الإشعار' : 'N° de débit'
      partnerHeader = isRtl ? 'المورد :' : 'Fournisseur :'
      legalPhrase = 'Arrêté le présent bon de débit a la somme de :'
    }

    if (i18n?.title && !isRtl) {
      titleText = e(i18n.title)
    }

    const companyName = s.company_name || 'Next Inventory SARL'
    const address = s.company_address || '12 Boulevard des Martyrs, Alger'
    const phone = s.company_phone || '+213 (0) 23 45 67 89'
    const email = s.company_email || 'contact@nextinventory.dz'
    const rc = s.rc || '16/00-1234567B16'
    const nis = s.nis || '00161601234567800001'
    const nif = s.nif || '001616012345678'
    const art = s.art || '16012345678'
    const rib = s.rib || '001 00123 0123456789 45'

    const partnerName = p.raison || p.name || 'Client Divers'
    const partnerStreet = [p.street, p.city, p.state].filter(Boolean).join(' ') || p.address || ''
    const partnerPhone = p.phone || p.mobile || ''
    const partnerTaxIds = p.tax_ids || ''

    const docCode = doc.code || ''
    const docDate = this.formatDate(doc.date || doc.created_at)

    const linesHtml = lines.map(line => {
      const qty = line.amount ?? line.quantity ?? 1
      const designation = line.product_name || line.designation || 'Article'
      const codePrefix = line.product_code ? `<span style="font-size: 8pt; color: #64748b; font-family: monospace;">[${e(line.product_code)}]</span> ` : ''
      const unitPrice = line.price ?? 0
      const totalLine = line.untaxed_amount ?? (qty * unitPrice)
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 10px;">${qty}</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px;">${codePrefix}<strong>${e(designation)}</strong></td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 7px 10px;">${this.formatMoney(unitPrice)}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 7px 10px; font-weight: 600;">${this.formatMoney(totalLine)}</td>
        </tr>
      `
    }).join('')

    const totalUntaxed = doc.total_untaxed ?? 0
    const totalTaxes = doc.total_taxes ?? 0
    const discount = doc.discount ?? 0
    const stamp = doc.stamp ?? 0
    const finalTotal = doc.total_price ?? (totalUntaxed + totalTaxes - discount + stamp)
    const paymentMethod = doc.payment_method || 'Virement / Espèces'
    const amountInWords = formatAmountInWords(finalTotal, isRtl ? 'ar' : 'fr')

    return `<!DOCTYPE html>
<html ${dirHtml}>
<head>
  <meta charset="UTF-8">
  <title>${e(titleText)} ${e(docCode)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Inter, Calibri, system-ui, sans-serif;
      font-size: 9.5pt;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .header-table td { vertical-align: top; border: none; padding: 0; }
    .company-title { font-size: 15pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 4px; }
    .company-sub { font-size: 8.5pt; color: #475569; line-height: 1.4; }
    .title-box {
      background: #1e3a8a;
      color: #ffffff;
      padding: 8px 18px;
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      border-radius: 4px;
      display: inline-block;
      text-align: center;
    }
    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
    }
    .lines-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
    .lines-table th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
    }
    .totals-table { width: 340px; margin-left: auto; border-collapse: collapse; margin-bottom: 20px; }
    .totals-table th, .totals-table td { padding: 6px 12px; border: 1px solid #e2e8f0; font-size: 9.5pt; }
    .totals-table th { background: #f8fafc; text-align: left; color: #475569; }
    .totals-table td { text-align: right; }
    .grand-total { background: #1e3a8a !important; color: #ffffff !important; font-weight: 800; font-size: 11pt !important; }
    .grand-total th, .grand-total td { background: #1e3a8a !important; color: #ffffff !important; }
    .words-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
      margin-top: 10px;
      font-size: 9pt;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 60%;">
        <div class="company-title">${e(companyName)}</div>
        <div class="company-sub">
          ${e(address)}<br/>
          Tél : ${e(phone)} | Email : ${e(email)}<br/>
          <strong>RC :</strong> ${e(rc)} &nbsp;|&nbsp; <strong>NIF :</strong> ${e(nif)}<br/>
          <strong>NIS :</strong> ${e(nis)} &nbsp;|&nbsp; <strong>ART :</strong> ${e(art)}<br/>
          ${rib ? `<strong>RIB :</strong> ${e(rib)}` : ''}
        </div>
      </td>
      <td style="width: 40%; text-align: right;">
        <div class="title-box">${e(titleText)}</div>
        <div style="margin-top: 10px; font-size: 10pt;">
          <strong>${e(docNumberLabel)} :</strong> <span style="font-family: monospace; font-weight: bold; font-size: 11pt; color: #2563eb;">${e(docCode)}</span><br/>
          <strong>Date :</strong> ${e(docDate)}
        </div>
      </td>
    </tr>
  </table>

  <div class="meta-card">
    <div style="font-weight: 700; color: #1e3a8a; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.05em; margin-bottom: 4px;">${e(partnerHeader)}</div>
    <div style="font-size: 11pt; font-weight: bold; color: #0f172a;">${e(partnerName)}</div>
    <div style="color: #475569; font-size: 9pt; margin-top: 2px;">
      ${partnerStreet ? `<div>${e(partnerStreet)}</div>` : ''}
      ${partnerPhone ? `<div>Tél : ${e(partnerPhone)}</div>` : ''}
      ${partnerTaxIds ? `<div style="font-family: monospace; font-size: 8.5pt;">${e(partnerTaxIds)}</div>` : ''}
    </div>
  </div>

  <table class="lines-table">
    <thead>
      <tr>
        <th style="width: 10%; text-align: center;">Qté</th>
        <th style="width: 50%; text-align: left;">Désignation</th>
        <th style="width: 20%; text-align: right;">Prix Unitaire HT</th>
        <th style="width: 20%; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <th>Total Brut HT</th>
      <td>${this.formatMoney(totalUntaxed)}</td>
    </tr>
    ${discount > 0 ? `
    <tr>
      <th>Remise</th>
      <td style="color: #dc2626;">-${this.formatMoney(discount)}</td>
    </tr>` : ''}
    <tr>
      <th>Total TVA</th>
      <td>${this.formatMoney(totalTaxes)}</td>
    </tr>
    ${stamp > 0 ? `
    <tr>
      <th>Droit de Timbre</th>
      <td>${this.formatMoney(stamp)}</td>
    </tr>` : ''}
    <tr class="grand-total">
      <th>Net à Payer (TTC)</th>
      <td>${this.formatMoney(finalTotal)}</td>
    </tr>
  </table>

  <div class="words-box">
    <div style="color: #64748b; font-size: 8pt; text-transform: uppercase; font-weight: 600;">${e(legalPhrase)}</div>
    <div style="font-weight: 700; font-size: 9.5pt; color: #1e293b; margin-top: 2px;">${e(amountInWords)}</div>
    <div style="margin-top: 6px; font-size: 8.5pt; color: #64748b;">
      Mode de règlement : <strong>${e(paymentMethod)}</strong>
    </div>
  </div>
</body>
</html>`
  }

  // --- PDF Generator using jsPDF ---
  static async generatePdfBuffer({ type, id, i18n }) {
    const resolved = await this.resolveDocumentData(type, id)
    const { document: doc, partner: p, settings: s } = resolved
    const html = await this.generateHtml({ ...resolved, i18n })

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Build vector layout in jsPDF
    const isRtl = i18n?.isRtl || false
    const companyName = s.company_name || 'Next Inventory SARL'
    const docCode = doc.code || ''
    const docDate = this.formatDate(doc.date || doc.created_at)
    const partnerName = p.raison || p.name || 'Client'
    const finalTotal = doc.total_price || 0

    // Header Colors
    pdf.setFillColor(30, 58, 138) // Navy #1E3A8A
    pdf.rect(14, 12, 182, 1.5, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(30, 58, 138)
    pdf.text(companyName, 14, 22)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(71, 85, 105)
    pdf.text(s.company_address || '12 Boulevard des Martyrs, Alger', 14, 27)
    pdf.text(`Tel: ${s.company_phone || ''} | Email: ${s.company_email || ''}`, 14, 31)
    pdf.text(`RC: ${s.rc || ''} | NIF: ${s.nif || ''} | NIS: ${s.nis || ''} | ART: ${s.art || ''}`, 14, 35)

    // Document Title Box
    const typeTitles = {
      invoice: 'FACTURE',
      proforma: 'FACTURE PROFORMA',
      saleOrder: 'BON DE COMMANDE',
      purchaseOrder: 'BON DE COMMANDE',
      purchase: 'BON DE COMMANDE',
      creditNote: 'AVOIR',
      debitNote: 'BON DE DEBIT'
    }
    const titleStr = typeTitles[type] || 'DOCUMENT'
    pdf.setFillColor(30, 58, 138)
    pdf.roundedRect(130, 16, 66, 12, 1.5, 1.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(255, 255, 255)
    pdf.text(titleStr, 163, 23.5, { align: 'center' })

    pdf.setFontSize(9)
    pdf.setTextColor(15, 23, 42)
    pdf.text(`N° : ${docCode}`, 196, 33, { align: 'right' })
    pdf.text(`Date : ${docDate}`, 196, 38, { align: 'right' })

    // Partner box
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(14, 43, 182, 22, 2, 2, 'FD')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(30, 58, 138)
    pdf.text(type.includes('purchase') || type === 'debitNote' ? 'FOURNISSEUR :' : 'CLIENT :', 18, 48)

    pdf.setFontSize(11)
    pdf.setTextColor(15, 23, 42)
    pdf.text(partnerName, 18, 54)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(71, 85, 105)
    const partnerAddr = [p.street, p.city].filter(Boolean).join(', ')
    pdf.text(partnerAddr || p.phone || '', 18, 59)
    if (p.tax_ids) pdf.text(p.tax_ids, 18, 63)

    // Table Header
    let y = 72
    pdf.setFillColor(241, 245, 249)
    pdf.rect(14, y, 182, 8, 'F')
    pdf.setDrawColor(203, 213, 225)
    pdf.rect(14, y, 182, 8, 'S')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(30, 41, 59)
    pdf.text('QTE', 20, y + 5.5)
    pdf.text('DESIGNATION', 42, y + 5.5)
    pdf.text('PRIX UNITAIRE HT', 140, y + 5.5, { align: 'right' })
    pdf.text('TOTAL HT', 190, y + 5.5, { align: 'right' })

    // Table Rows
    y += 8
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(15, 23, 42)

    const lines = doc.lines || []
    for (const l of lines) {
      if (y > 250) {
        pdf.addPage()
        y = 20
      }
      const qty = l.amount ?? l.quantity ?? 1
      const name = (l.product_name || l.designation || 'Article').substring(0, 55)
      const price = this.formatMoney(l.price || 0)
      const total = this.formatMoney(l.untaxed_amount || (qty * (l.price || 0)))

      pdf.rect(14, y, 182, 7, 'S')
      pdf.text(String(qty), 20, y + 5)
      pdf.text(name, 42, y + 5)
      pdf.text(price, 140, y + 5, { align: 'right' })
      pdf.text(total, 190, y + 5, { align: 'right' })
      y += 7
    }

    // Totals Box
    y += 6
    const totalBoxY = y
    pdf.setDrawColor(226, 232, 240)
    pdf.setFillColor(248, 250, 252)
    pdf.rect(120, totalBoxY, 76, 28, 'FD')

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(71, 85, 105)
    pdf.text('Total HT :', 124, totalBoxY + 6)
    pdf.text(this.formatMoney(doc.total_untaxed || 0), 192, totalBoxY + 6, { align: 'right' })

    pdf.text('Total TVA :', 124, totalBoxY + 12)
    pdf.text(this.formatMoney(doc.total_taxes || 0), 192, totalBoxY + 12, { align: 'right' })

    if (doc.discount) {
      pdf.text('Remise :', 124, totalBoxY + 18)
      pdf.text(`-${this.formatMoney(doc.discount)}`, 192, totalBoxY + 18, { align: 'right' })
    }

    // Grand Total
    pdf.setFillColor(30, 58, 138)
    pdf.rect(120, totalBoxY + 20, 76, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    pdf.setTextColor(255, 255, 255)
    pdf.text('NET A PAYER :', 124, totalBoxY + 25.5)
    pdf.text(this.formatMoney(finalTotal), 192, totalBoxY + 25.5, { align: 'right' })

    // Amount in Words
    const wordsY = totalBoxY + 34
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(71, 85, 105)
    pdf.text('Arrete la presente somme a :', 14, wordsY)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(15, 23, 42)
    pdf.text(formatAmountInWords(finalTotal, 'fr'), 14, wordsY + 5)

    // Base64 output
    const pdfDataUri = pdf.output('datauristring')
    const base64 = pdfDataUri.split(',')[1]

    return {
      base64,
      html,
      docCode
    }
  }

  // --- Thermal Receipt Generator (80mm) ---
  static async generateReceiptHtml(saleId) {
    const numericId = Number(saleId)
    const sale = await SaleService.getSale(numericId)
    if (!sale) throw new Error('Sale not found')

    const settings = await SettingsService.getSettings()
    const payments = getTable('sale_payments').filter(p => p.sale_id === numericId)
    const e = this.escapeHtml

    const linesHtml = (sale.lines || []).map(l => {
      const name = l.product_name || 'Article'
      const qty = l.amount || 1
      const price = (l.price / 100).toFixed(2)
      const sub = ((l.subtotal || l.untaxed_amount) / 100).toFixed(2)
      return `
        <tr>
          <td style="padding: 3px 0; font-size: 11px;">${e(name)}<br/><span style="color: #64748b;">${qty} x ${price}</span></td>
          <td style="text-align: right; padding: 3px 0; font-size: 11px; font-weight: bold;">${sub} DA</td>
        </tr>
      `
    }).join('')

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${e(sale.code)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace, system-ui;
      font-size: 11px;
      margin: 0;
      padding: 12px;
      width: 78mm;
      box-sizing: border-box;
      background: #ffffff;
      color: #000000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dashed { border-top: 1px dashed #000000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size: 15px;">${e(settings.company_name || 'NEXT INVENTORY')}</div>
    <div style="font-size: 10px; margin-top: 2px;">${e(settings.company_address || 'Alger, Algérie')}</div>
    <div style="font-size: 10px;">Tél: ${e(settings.company_phone || '')}</div>
    ${settings.nif ? `<div style="font-size: 9px;">NIF: ${e(settings.nif)} | RC: ${e(settings.rc || '')}</div>` : ''}
  </div>

  <div class="dashed"></div>

  <div class="row"><span>Ticket N°:</span><strong>${e(sale.code)}</strong></div>
  <div class="row"><span>Date:</span><span>${this.formatDate(sale.date)}</span></div>
  <div class="row"><span>Client:</span><span>${e(sale.customer_name || 'Client Passager')}</span></div>

  <div class="dashed"></div>

  <table>
    ${linesHtml}
  </table>

  <div class="dashed"></div>

  <div class="row"><span>Total HT:</span><span>${((sale.total_untaxed || 0) / 100).toFixed(2)} DA</span></div>
  <div class="row"><span>Total TVA:</span><span>${((sale.total_taxes || 0) / 100).toFixed(2)} DA</span></div>
  ${sale.discount > 0 ? `<div class="row"><span>Remise:</span><span>-${((sale.discount) / 100).toFixed(2)} DA</span></div>` : ''}
  <div class="row bold" style="font-size: 13px; margin: 4px 0;"><span>NET A PAYER:</span><span>${((sale.total_price || 0) / 100).toFixed(2)} DA</span></div>
  <div class="row"><span>Payé:</span><span>${((sale.payment || 0) / 100).toFixed(2)} DA</span></div>
  ${sale.rest > 0 ? `<div class="row" style="color: red;"><span>Reste:</span><span>${((sale.rest) / 100).toFixed(2)} DA</span></div>` : ''}

  <div class="dashed"></div>
  <div class="center" style="font-size: 10px; margin-top: 8px;">
    Merci de votre visite !<br/>
    Les articles vendus ne sont ni repris ni échangés.
  </div>
</body>
</html>`
  }

  static async generateReceiptPdfBuffer(saleId) {
    const numericId = Number(saleId)
    const sale = await SaleService.getSale(numericId)
    if (!sale) throw new Error('Sale not found')

    const html = await this.generateReceiptHtml(numericId)

    // Build 80mm jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    })

    const settings = await SettingsService.getSettings()

    pdf.setFont('courier', 'bold')
    pdf.setFontSize(13)
    pdf.text(settings.company_name || 'NEXT INVENTORY', 40, 10, { align: 'center' })

    pdf.setFont('courier', 'normal')
    pdf.setFontSize(8)
    pdf.text(settings.company_address || 'Alger, Algérie', 40, 15, { align: 'center' })
    pdf.text(`Tel: ${settings.company_phone || ''}`, 40, 19, { align: 'center' })

    pdf.setLineDashPattern([1, 1], 0)
    pdf.line(5, 22, 75, 22)

    pdf.text(`Ticket: ${sale.code}`, 5, 27)
    pdf.text(`Date: ${this.formatDate(sale.date)}`, 5, 31)
    pdf.text(`Client: ${(sale.customer_name || 'Passager').substring(0, 25)}`, 5, 35)

    pdf.line(5, 38, 75, 38)

    let y = 43
    const lines = sale.lines || []
    for (const l of lines) {
      const name = (l.product_name || 'Article').substring(0, 22)
      const qty = l.amount || 1
      const sub = ((l.subtotal || l.untaxed_amount) / 100).toFixed(2)

      pdf.text(name, 5, y)
      pdf.text(`${qty} x ${((l.price || 0) / 100).toFixed(2)}`, 5, y + 3.5)
      pdf.text(`${sub} DA`, 75, y + 3.5, { align: 'right' })
      y += 8
    }

    pdf.line(5, y, 75, y)
    y += 5

    pdf.setFont('courier', 'bold')
    pdf.setFontSize(10)
    pdf.text('TOTAL TTC :', 5, y)
    pdf.text(`${((sale.total_price || 0) / 100).toFixed(2)} DA`, 75, y, { align: 'right' })
    y += 5

    pdf.setFont('courier', 'normal')
    pdf.setFontSize(8)
    pdf.text(`Regle: ${((sale.payment || 0) / 100).toFixed(2)} DA`, 5, y)
    y += 6

    pdf.line(5, y, 75, y)
    y += 6

    pdf.setFontSize(7.5)
    pdf.text('Merci de votre visite !', 40, y, { align: 'center' })

    const pdfDataUri = pdf.output('datauristring')
    const base64 = pdfDataUri.split(',')[1]

    return {
      base64,
      html
    }
  }

  // --- Barcode Label Generator ---
  static async generateBarcodeLabel({ productId, format = '50x25', quantity = 1 }) {
    const products = getTable('products')
    const prod = products.find(p => p.id === Number(productId))
    if (!prod) throw new Error('Product not found')

    const barcodeValue = prod.barcode || prod.code
    const priceFormatted = (prod.salePrice / 100).toFixed(2) + ' DA'

    // Create a temporary canvas or SVG to generate base64 barcode image
    let barcodeSvg = ''
    if (typeof document !== 'undefined') {
      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        JsBarcode(svg, barcodeValue, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 12,
          height: 35,
          margin: 2
        })
        barcodeSvg = new XMLSerializer().serializeToString(svg)
      } catch (e) {
        // Fallback
      }
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: auto; margin: 0; }
    body { margin: 0; padding: 6px; font-family: system-ui, sans-serif; text-align: center; }
    .label {
      border: 1px solid #e2e8f0;
      padding: 6px;
      margin-bottom: 6px;
      display: inline-block;
      page-break-inside: avoid;
    }
    .prod-name { font-size: 11px; font-weight: bold; margin-bottom: 3px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .prod-price { font-size: 13px; font-weight: 800; color: #1e3a8a; margin-top: 3px; }
  </style>
</head>
<body>
  ${Array.from({ length: quantity || 1 }).map(() => `
    <div class="label">
      <div class="prod-name">${this.escapeHtml(prod.name)}</div>
      ${barcodeSvg ? `<div>${barcodeSvg}</div>` : `<div style="font-family: monospace; font-size: 13px; font-weight: bold; letter-spacing: 2px;">${barcodeValue}</div>`}
      <div class="prod-price">${priceFormatted}</div>
    </div>
  `).join('')}
</body>
</html>`

    // Generate jsPDF label
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [50, 30]
    })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text(prod.name.substring(0, 24), 25, 6, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.text(barcodeValue, 25, 16, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 58, 138)
    pdf.text(priceFormatted, 25, 24, { align: 'center' })

    const base64 = pdf.output('datauristring').split(',')[1]

    return {
      base64,
      html
    }
  }

  // --- Product List Catalog Generator ---
  static async generateProductListPdf(args = {}) {
    const products = await ProductService.getProducts()
    const settings = await SettingsService.getSettings()

    const pdf = new jsPDF({
      orientation: args.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(15)
    pdf.setTextColor(30, 58, 138)
    pdf.text(settings.company_name || 'Next Inventory', 14, 18)

    pdf.setFontSize(11)
    pdf.setTextColor(15, 23, 42)
    pdf.text('CATALOGUE & LISTE DES PRODUITS', 14, 25)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Date d'exportation : ${new Date().toLocaleDateString('fr-FR')}`, 14, 30)

    let y = 38
    pdf.setFillColor(241, 245, 249)
    pdf.rect(14, y, 182, 7, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(30, 41, 59)
    pdf.text('REF / CODE', 18, y + 5)
    pdf.text('DESIGNATION', 50, y + 5)
    pdf.text('CATEGORIE', 115, y + 5)
    pdf.text('STOCK', 155, y + 5, { align: 'right' })
    pdf.text('PRIX VENTE', 190, y + 5, { align: 'right' })

    y += 7
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(15, 23, 42)

    for (const p of products) {
      if (y > 275) {
        pdf.addPage()
        y = 20
      }
      pdf.setDrawColor(226, 232, 240)
      pdf.line(14, y + 6, 196, y + 6)

      pdf.text(p.code || '', 18, y + 4.5)
      pdf.text(p.name.substring(0, 35), 50, y + 4.5)
      pdf.text(p.family_name || '-', 115, y + 4.5)
      pdf.text(String(p.stock_quantity || 0), 155, y + 4.5, { align: 'right' })
      pdf.text(`${((p.salePrice || 0) / 100).toFixed(2)} DA`, 190, y + 4.5, { align: 'right' })
      y += 7
    }

    const base64 = pdf.output('datauristring').split(',')[1]
    return {
      base64,
      totalCount: products.length
    }
  }

  // --- Browser File Save Trigger ---
  static downloadFile(filename, content, mimeType = 'application/pdf') {
    let blob
    if (typeof content === 'string' && !content.startsWith('data:')) {
      const byteChars = atob(content)
      const byteNumbers = new Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i)
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
    } else if (content instanceof Blob) {
      blob = content
    } else {
      blob = new Blob([content], { type: mimeType })
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return { success: true, filePath: filename }
  }

  // --- Browser Print Dialog Trigger ---
  static printHtml(html) {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()

    iframe.contentWindow.focus()
    setTimeout(() => {
      iframe.contentWindow.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)

    return { success: true }
  }
}
