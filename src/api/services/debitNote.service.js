import { getTable, findById, insertRecord, persistStorage } from '../storage.js'
import { InventoryService } from './inventory.service.js'

export class DebitNoteService {
  static async getDebitNotes() {
    const debitNotes = getTable('debit_notes')
    const vendors = getTable('vendors')
    const purchases = getTable('purchases')

    return debitNotes.map(dn => {
      const vend = vendors.find(v => v.id === dn.vendor_id)
      const pur = purchases.find(p => p.id === dn.purchase_id)
      return {
        ...dn,
        vendor_name: vend?.raison || '',
        purchase_code: pur?.code || ''
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  static async getDebitNote(id) {
    const numericId = Number(id)
    const dn = findById('debit_notes', numericId)
    if (!dn) return null

    const vendors = getTable('vendors')
    const purchases = getTable('purchases')
    const vend = vendors.find(v => v.id === dn.vendor_id)
    const pur = purchases.find(p => p.id === dn.purchase_id)

    const allLines = getTable('debit_note_lines')
    const products = getTable('products')

    const lines = allLines
      .filter(l => l.debit_note_id === numericId)
      .map(l => {
        const prod = products.find(p => p.id === l.product_id)
        return {
          ...l,
          product_name: prod?.name || '',
          product_code: prod?.code || ''
        }
      })

    return {
      ...dn,
      vendor_name: vend?.raison || '',
      purchase_code: pur?.code || '',
      lines
    }
  }

  static async getNextCode() {
    const debitNotes = getTable('debit_notes')
    const maxId = debitNotes.reduce((m, d) => (d.id > m ? d.id : m), 0)
    const nextId = maxId + 1
    return `D${String(nextId).padStart(5, '0')}`
  }

  static async createDebitNote({ purchaseId, lines, date, userId = null }) {
    if (!lines || lines.length === 0) {
      throw new Error('Debit Note must have at least one line')
    }

    const numericPurchaseId = Number(purchaseId)
    const purchases = getTable('purchases')
    const purchase = purchases.find(p => p.id === numericPurchaseId)
    if (!purchase) throw new Error('Purchase not found')
    if (purchase.status !== 'FINALIZED') throw new Error('Purchase must be FINALIZED to issue a debit note')

    const allPurchaseLines = getTable('purchase_lines').filter(l => l.purchase_id === numericPurchaseId)
    const allDnLines = getTable('debit_note_lines')
    const debitNotes = getTable('debit_notes')
    const purchaseDns = debitNotes.filter(dn => dn.purchase_id === numericPurchaseId).map(dn => dn.id)

    const returnsMap = {}
    allDnLines
      .filter(dnl => purchaseDns.includes(dnl.debit_note_id))
      .forEach(dnl => {
        returnsMap[dnl.purchase_line_id] = (returnsMap[dnl.purchase_line_id] || 0) + Number(dnl.amount)
      })

    let totalUntaxed = 0
    let totalTaxes = 0
    const processedLines = []

    for (const line of lines) {
      if (line.amount <= 0) throw new Error('Debit Note line amount must be greater than zero')

      const purchaseLine = allPurchaseLines.find(pl => pl.id === line.purchaseLineId)
      if (!purchaseLine) throw new Error(`Purchase line ${line.purchaseLineId} does not exist for this purchase`)

      const alreadyReturned = returnsMap[line.purchaseLineId] || 0
      const maxReturnable = purchaseLine.amount - alreadyReturned

      if (line.amount > maxReturnable + 0.001) {
        throw new Error(`Cannot return ${line.amount} for line ${line.purchaseLineId}. Max returnable is ${maxReturnable.toFixed(3)}`)
      }

      const untaxedAmount = Math.round(purchaseLine.price * line.amount)
      const taxes = Math.round((untaxedAmount * purchaseLine.tax_percent) / 100)
      const subtotal = untaxedAmount + taxes

      totalUntaxed += untaxedAmount
      totalTaxes += taxes

      processedLines.push({
        purchase_line_id: purchaseLine.id,
        product_id: purchaseLine.product_id,
        warehouse_id: purchaseLine.warehouse_id || purchase.warehouse_id || 1,
        amount: line.amount,
        price: purchaseLine.price,
        tax_percent: purchaseLine.tax_percent,
        untaxed_amount: untaxedAmount,
        taxes,
        subtotal
      })
    }

    const totalPrice = totalUntaxed + totalTaxes
    const code = await this.getNextCode()

    const newDn = insertRecord('debit_notes', {
      code,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      purchase_id: numericPurchaseId,
      vendor_id: purchase.vendor_id,
      total_untaxed: totalUntaxed,
      total_taxes: totalTaxes,
      total_price: totalPrice,
      status: 'FINALIZED',
      created_by: userId
    })

    const debitNoteId = newDn.id

    for (const pLine of processedLines) {
      insertRecord('debit_note_lines', {
        debit_note_id: debitNoteId,
        ...pLine
      })

      // Reduce stock (return to vendor)
      await InventoryService.changeStock({
        productId: pLine.product_id,
        warehouseId: pLine.warehouse_id,
        delta: -pLine.amount,
        movementType: 'DEBIT_NOTE',
        userId,
        reason: `Debit Note ${code} for Purchase ${purchase.code}`,
        referenceType: 'DEBIT_NOTE',
        referenceId: debitNoteId
      })
    }

    // Reduce vendor payable
    if (totalPrice > 0) {
      insertRecord('vendor_payables_ledger', {
        vendor_id: purchase.vendor_id,
        amount: -totalPrice,
        type: 'REFUND',
        reference_type: 'DEBIT_NOTE',
        reference_id: debitNoteId,
        notes: `Debit Note ${code} for Purchase ${purchase.code}`,
        created_by: userId,
        created_at: newDn.date
      })
    }

    return this.getDebitNote(debitNoteId)
  }
}
