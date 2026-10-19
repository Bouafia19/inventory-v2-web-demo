import { getTable, findById, insertRecord, persistStorage } from '../storage.js'
import { InventoryService } from './inventory.service.js'

export class CreditNoteService {
  static async getCreditNotes() {
    const creditNotes = getTable('credit_notes')
    const customers = getTable('customers')
    const sales = getTable('sales')

    return creditNotes.map(cn => {
      const cust = customers.find(c => c.id === cn.customer_id)
      const sale = sales.find(s => s.id === cn.sale_id)
      return {
        ...cn,
        customer_name: cust?.raison || '',
        sale_code: sale?.code || ''
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  static async getCreditNote(id) {
    const numericId = Number(id)
    const cn = findById('credit_notes', numericId)
    if (!cn) return null

    const customers = getTable('customers')
    const sales = getTable('sales')
    const cust = customers.find(c => c.id === cn.customer_id)
    const sale = sales.find(s => s.id === cn.sale_id)

    const allLines = getTable('credit_note_lines')
    const products = getTable('products')

    const lines = allLines
      .filter(l => l.credit_note_id === numericId)
      .map(l => {
        const prod = products.find(p => p.id === l.product_id)
        return {
          ...l,
          product_name: prod?.name || '',
          product_code: prod?.code || ''
        }
      })

    return {
      ...cn,
      customer_name: cust?.raison || '',
      sale_code: sale?.code || '',
      lines
    }
  }

  static async getNextCode() {
    const creditNotes = getTable('credit_notes')
    const maxId = creditNotes.reduce((m, c) => (c.id > m ? c.id : m), 0)
    const nextId = maxId + 1
    return `C${String(nextId).padStart(5, '0')}`
  }

  static async createCreditNote({ saleId, lines, date, userId = null }) {
    if (!lines || lines.length === 0) {
      throw new Error('Credit Note must have at least one line')
    }

    const numericSaleId = Number(saleId)
    const sales = getTable('sales')
    const sale = sales.find(s => s.id === numericSaleId)
    if (!sale) throw new Error('Sale not found')
    if (sale.status !== 'FINALIZED') throw new Error('Sale must be FINALIZED to issue a credit note')

    const allSaleLines = getTable('sale_lines').filter(l => l.sale_id === numericSaleId)
    const allCnLines = getTable('credit_note_lines')
    const creditNotes = getTable('credit_notes')
    const saleCns = creditNotes.filter(cn => cn.sale_id === numericSaleId).map(cn => cn.id)

    const returnsMap = {}
    allCnLines
      .filter(cnl => saleCns.includes(cnl.credit_note_id))
      .forEach(cnl => {
        returnsMap[cnl.sale_line_id] = (returnsMap[cnl.sale_line_id] || 0) + Number(cnl.amount)
      })

    let totalUntaxed = 0
    let totalTaxes = 0
    const processedLines = []

    for (const line of lines) {
      if (line.amount <= 0) throw new Error('Credit Note line amount must be greater than zero')

      const saleLine = allSaleLines.find(sl => sl.id === line.saleLineId)
      if (!saleLine) throw new Error(`Sale line ${line.saleLineId} does not exist for this sale`)

      const alreadyReturned = returnsMap[line.saleLineId] || 0
      const maxReturnable = saleLine.amount - alreadyReturned

      if (line.amount > maxReturnable + 0.001) {
        throw new Error(`Cannot return ${line.amount} for line ${line.saleLineId}. Max returnable is ${maxReturnable.toFixed(3)}`)
      }

      const untaxedAmount = Math.round(saleLine.price * line.amount)
      const taxes = Math.round((untaxedAmount * saleLine.tax_percent) / 100)
      const subtotal = untaxedAmount + taxes

      totalUntaxed += untaxedAmount
      totalTaxes += taxes

      processedLines.push({
        sale_line_id: saleLine.id,
        product_id: saleLine.product_id,
        warehouse_id: saleLine.warehouse_id || 1,
        amount: line.amount,
        price: saleLine.price,
        tax_percent: saleLine.tax_percent,
        untaxed_amount: untaxedAmount,
        taxes,
        subtotal
      })
    }

    const totalPrice = totalUntaxed + totalTaxes
    const code = await this.getNextCode()

    const newCn = insertRecord('credit_notes', {
      code,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      sale_id: numericSaleId,
      customer_id: sale.customer_id,
      total_untaxed: totalUntaxed,
      total_taxes: totalTaxes,
      total_price: totalPrice,
      status: 'FINALIZED',
      created_by: userId
    })

    const creditNoteId = newCn.id

    for (const pLine of processedLines) {
      insertRecord('credit_note_lines', {
        credit_note_id: creditNoteId,
        ...pLine
      })

      // Restore stock
      await InventoryService.changeStock({
        productId: pLine.product_id,
        warehouseId: pLine.warehouse_id,
        delta: pLine.amount, // Positive delta returns product to stock
        movementType: 'CREDIT_NOTE',
        userId,
        reason: `Credit Note ${code} for Sale ${sale.code}`,
        referenceType: 'CREDIT_NOTE',
        referenceId: creditNoteId
      })
    }

    // Reduce customer receivable
    if (totalPrice > 0) {
      insertRecord('customer_receivables_ledger', {
        customer_id: sale.customer_id,
        amount: -totalPrice,
        type: 'REFUND',
        reference_type: 'CREDIT_NOTE',
        reference_id: creditNoteId,
        notes: `Credit Note ${code} for Sale ${sale.code}`,
        created_by: userId,
        created_at: newCn.date
      })
    }

    return this.getCreditNote(creditNoteId)
  }
}
