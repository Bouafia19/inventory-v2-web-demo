import { getTable, findById, insertRecord, updateRecord, persistStorage } from '../storage.js'
import { InventoryService } from './inventory.service.js'

export class SaleService {
  static async getSales(filters = {}) {
    const sales = getTable('sales')
    const customers = getTable('customers')

    let list = sales.map(s => {
      const cust = customers.find(c => c.id === s.customer_id)
      return {
        ...s,
        customer_name: cust?.raison || `Customer #${s.customer_id}`
      }
    })

    if (filters.startDate) {
      list = list.filter(s => s.date >= filters.startDate)
    }

    if (filters.endDate) {
      let end = filters.endDate
      if (end.length === 10) end += 'T23:59:59.999Z'
      list = list.filter(s => s.date <= end)
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(s =>
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q))
      )
    }

    if (filters.state) {
      list = list.filter(s => s.state === filters.state)
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  static async getSale(id) {
    const numericId = Number(id)
    const sale = findById('sales', numericId)
    if (!sale) return null

    const customers = getTable('customers')
    const cust = customers.find(c => c.id === sale.customer_id)

    const allLines = getTable('sale_lines')
    const products = getTable('products')
    const warehouses = getTable('warehouses')

    const lines = allLines
      .filter(l => l.sale_id === numericId)
      .map(l => {
        const prod = products.find(p => p.id === l.product_id)
        const wh = warehouses.find(w => w.id === l.warehouse_id)
        return {
          ...l,
          product_name: prod?.name || '',
          product_code: prod?.code || '',
          warehouse_name: wh?.name || ''
        }
      })

    return {
      ...sale,
      customer_name: cust?.raison || '',
      lines
    }
  }

  static async getNextCode() {
    const sales = getTable('sales')
    const maxId = sales.reduce((m, s) => (s.id > m ? s.id : m), 0)
    const nextId = maxId + 1
    return `S${String(nextId).padStart(5, '0')}`
  }

  static async createSale({
    code,
    date,
    customerId,
    warehouseId,
    discount = 0,
    payment = 0,
    stamp = 0,
    state = 'receipt',
    paymentMethod = 'cash',
    bank = null,
    payments = [],
    lines,
    userId = null,
    posSessionId = null
  }) {
    if (!lines || lines.length === 0) {
      throw new Error('Sale must have at least one line')
    }

    const customers = getTable('customers')
    const customer = customers.find(c => c.id === customerId && !c.disabled)
    if (!customer) throw new Error('Customer not found')

    const products = getTable('products')

    let totalUntaxed = 0
    let totalTaxes = 0
    const computedLines = []

    for (const line of lines) {
      if (line.amount <= 0) throw new Error('Line amount must be > 0')
      if (line.price < 0) throw new Error('Line price cannot be negative')

      const product = products.find(p => p.id === line.productId)
      if (!product) throw new Error(`Product ID ${line.productId} not found`)

      const untaxedAmount = Math.round(line.price * line.amount)
      const taxes = Math.round((untaxedAmount * (line.taxPercent || 0)) / 100)
      const subtotal = untaxedAmount + taxes

      totalUntaxed += untaxedAmount
      totalTaxes += taxes

      computedLines.push({
        product_id: line.productId,
        warehouse_id: line.warehouseId || warehouseId || 1,
        amount: line.amount,
        price: line.price,
        tax_percent: line.taxPercent || 0,
        untaxed_amount: untaxedAmount,
        taxes,
        subtotal
      })
    }

    const totalPrice = (totalUntaxed + totalTaxes) - (discount || 0) + (stamp || 0)
    const totalPaid = (payments && payments.length > 0)
      ? payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : (payment || 0)
    const rest = totalPrice - totalPaid
    const payed = rest <= 0

    const newSale = insertRecord('sales', {
      code: code || await this.getNextCode(),
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      customer_id: customerId,
      total_untaxed: totalUntaxed,
      total_taxes: totalTaxes,
      discount: discount || 0,
      stamp: stamp || 0,
      total_price: totalPrice,
      payment: totalPaid,
      rest,
      payed,
      state: state || 'receipt',
      payment_method: paymentMethod || 'cash',
      bank: bank || null,
      status: 'FINALIZED',
      pos_session_id: posSessionId || null,
      created_by: userId
    })

    const saleId = newSale.id

    // Create lines and decrease stock
    for (const cLine of computedLines) {
      insertRecord('sale_lines', {
        sale_id: saleId,
        ...cLine
      })

      await InventoryService.changeStock({
        productId: cLine.product_id,
        warehouseId: cLine.warehouse_id,
        delta: -cLine.amount,
        movementType: 'SALE',
        userId,
        reason: `Sale ${newSale.code}`,
        referenceType: 'SALE',
        referenceId: saleId
      })
    }

    // Ledger charge
    if (totalPrice > 0) {
      insertRecord('customer_receivables_ledger', {
        customer_id: customerId,
        amount: totalPrice,
        type: 'CHARGE',
        reference_type: 'SALE',
        reference_id: saleId,
        notes: `Sale ${newSale.code} Total`,
        created_by: userId,
        created_at: newSale.date
      })
    }

    // Ledger payments
    if (payments && payments.length > 0) {
      for (const p of payments) {
        if (p.amount > 0) {
          insertRecord('sale_payments', {
            sale_id: saleId,
            method: p.method || paymentMethod || 'cash',
            amount: p.amount,
            reference: p.reference || null
          })
          insertRecord('customer_receivables_ledger', {
            customer_id: customerId,
            amount: -p.amount,
            type: 'PAYMENT',
            reference_type: 'SALE',
            reference_id: saleId,
            notes: `Payment for Sale ${newSale.code} (${p.method || 'cash'})`,
            created_by: userId,
            created_at: newSale.date
          })
        }
      }
    } else if (totalPaid > 0) {
      insertRecord('sale_payments', {
        sale_id: saleId,
        method: paymentMethod || 'cash',
        amount: totalPaid,
        reference: null
      })
      insertRecord('customer_receivables_ledger', {
        customer_id: customerId,
        amount: -totalPaid,
        type: 'PAYMENT',
        reference_type: 'SALE',
        reference_id: saleId,
        notes: `Payment for Sale ${newSale.code}`,
        created_by: userId,
        created_at: newSale.date
      })
    }

    return this.getSale(saleId)
  }

  static async editSale(oldSaleId, data, userId = null) {
    await this.cancelSale(oldSaleId, userId)
    return await this.createSale({ ...data, userId })
  }

  static async cancelSale(saleId, userId = null) {
    const numericId = Number(saleId)
    const sale = findById('sales', numericId)
    if (!sale || sale.status === 'CANCELLED') {
      throw new Error('Sale does not exist or is already cancelled')
    }

    const creditNotes = getTable('credit_notes')
    const activeCn = creditNotes.find(cn => cn.sale_id === numericId && cn.status === 'FINALIZED')
    if (activeCn) {
      throw new Error('Cannot cancel a sale that has finalized credit notes')
    }

    updateRecord('sales', numericId, { status: 'CANCELLED' })

    // Reverse receivable
    if (sale.total_price > 0) {
      insertRecord('customer_receivables_ledger', {
        customer_id: sale.customer_id,
        amount: -sale.total_price,
        type: 'CHARGE_CANCEL',
        reference_type: 'SALE_CANCEL',
        reference_id: numericId,
        notes: `Cancelled Sale ${sale.code}`,
        created_by: userId
      })
    }

    // Reverse stock movements
    const saleLines = getTable('sale_lines').filter(l => l.sale_id === numericId)
    for (const line of saleLines) {
      await InventoryService.changeStock({
        productId: line.product_id,
        warehouseId: line.warehouse_id,
        delta: line.amount,
        movementType: 'SALE_CANCEL',
        userId,
        reason: `Cancelled Sale ${sale.code}`,
        referenceType: 'SALE_CANCEL',
        referenceId: numericId
      })
    }

    return sale
  }
}
