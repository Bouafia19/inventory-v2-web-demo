import { getTable, findById, insertRecord, updateRecord, persistStorage } from '../storage.js'
import { InventoryService } from './inventory.service.js'

export class PurchaseService {
  static async getPurchases() {
    const purchases = getTable('purchases')
    const vendors = getTable('vendors')

    return purchases.map(p => {
      const vend = vendors.find(v => v.id === p.vendor_id)
      return {
        ...p,
        vendor_name: vend?.raison || `Vendor #${p.vendor_id}`
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  static async getPurchase(id) {
    const numericId = Number(id)
    const purchase = findById('purchases', numericId)
    if (!purchase) return null

    const vendors = getTable('vendors')
    const vend = vendors.find(v => v.id === purchase.vendor_id)

    const allLines = getTable('purchase_lines')
    const products = getTable('products')
    const warehouses = getTable('warehouses')

    const lines = allLines
      .filter(l => l.purchase_id === numericId)
      .map(l => {
        const prod = products.find(p => p.id === l.product_id)
        const wh = warehouses.find(w => w.id === (l.warehouse_id || purchase.warehouse_id))
        return {
          ...l,
          warehouseId: l.warehouse_id || purchase.warehouse_id,
          product_name: prod?.name || '',
          product_code: prod?.code || '',
          warehouse_name: wh?.name || ''
        }
      })

    return {
      ...purchase,
      vendor_name: vend?.raison || '',
      lines
    }
  }

  static async getNextCode() {
    const purchases = getTable('purchases')
    const maxId = purchases.reduce((m, p) => (p.id > m ? p.id : m), 0)
    const nextId = maxId + 1
    return `P${String(nextId).padStart(5, '0')}`
  }

  static async createPurchase({
    code,
    date,
    vendorId,
    warehouseId,
    discount = 0,
    payment = 0,
    stamp = 0,
    lines,
    userId = null
  }) {
    if (!lines || lines.length === 0) {
      throw new Error('Purchase must have at least one line')
    }

    const vendors = getTable('vendors')
    const vendor = vendors.find(v => v.id === vendorId && !v.disabled)
    if (!vendor) throw new Error('Vendor not found')

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
    const rest = totalPrice - (payment || 0)
    const payed = rest <= 0

    const newPurchase = insertRecord('purchases', {
      code: code || await this.getNextCode(),
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      vendor_id: vendorId,
      warehouse_id: warehouseId || 1,
      total_untaxed: totalUntaxed,
      total_taxes: totalTaxes,
      discount: discount || 0,
      stamp: stamp || 0,
      total_price: totalPrice,
      payment: payment || 0,
      rest,
      payed,
      status: 'FINALIZED',
      created_by: userId
    })

    const purchaseId = newPurchase.id

    // Create lines and increment stock
    for (const cLine of computedLines) {
      insertRecord('purchase_lines', {
        purchase_id: purchaseId,
        ...cLine
      })

      await InventoryService.changeStock({
        productId: cLine.product_id,
        warehouseId: cLine.warehouse_id,
        delta: cLine.amount, // POSITIVE DELTA for purchase
        movementType: 'PURCHASE',
        userId,
        reason: `Purchase ${newPurchase.code}`,
        referenceType: 'PURCHASE',
        referenceId: purchaseId
      })
    }

    // Ledger charge
    if (totalPrice > 0) {
      insertRecord('vendor_payables_ledger', {
        vendor_id: vendorId,
        amount: totalPrice,
        type: 'CHARGE',
        reference_type: 'PURCHASE',
        reference_id: purchaseId,
        notes: `Purchase ${newPurchase.code} Total`,
        created_by: userId,
        created_at: newPurchase.date
      })
    }

    // Ledger payment
    if (payment > 0) {
      insertRecord('vendor_payables_ledger', {
        vendor_id: vendorId,
        amount: -payment,
        type: 'PAYMENT',
        reference_type: 'PURCHASE',
        reference_id: purchaseId,
        notes: `Initial Payment for Purchase ${newPurchase.code}`,
        created_by: userId,
        created_at: newPurchase.date
      })
    }

    return this.getPurchase(purchaseId)
  }

  static async editPurchase(id, data, userId = null) {
    await this.cancelPurchase(id, userId)
    return await this.createPurchase({ ...data, userId })
  }

  static async cancelPurchase(purchaseId, userId = null) {
    const numericId = Number(purchaseId)
    const purchase = findById('purchases', numericId)
    if (!purchase || purchase.status === 'CANCELLED') {
      throw new Error('Purchase does not exist or is already cancelled')
    }

    const debitNotes = getTable('debit_notes')
    const activeDn = debitNotes.find(dn => dn.purchase_id === numericId && dn.status === 'FINALIZED')
    if (activeDn) {
      throw new Error('Cannot cancel a purchase that has finalized debit notes')
    }

    updateRecord('purchases', numericId, { status: 'CANCELLED' })

    // Reverse payable
    if (purchase.total_price > 0) {
      insertRecord('vendor_payables_ledger', {
        vendor_id: purchase.vendor_id,
        amount: -purchase.total_price,
        type: 'CHARGE_CANCEL',
        reference_type: 'PURCHASE_CANCEL',
        reference_id: numericId,
        notes: `Cancelled Purchase ${purchase.code}`,
        created_by: userId
      })
    }

    // Reverse stock movements
    const purchaseLines = getTable('purchase_lines').filter(l => l.purchase_id === numericId)
    for (const line of purchaseLines) {
      await InventoryService.changeStock({
        productId: line.product_id,
        warehouseId: line.warehouse_id || purchase.warehouse_id || 1,
        delta: -line.amount,
        movementType: 'PURCHASE_CANCEL',
        userId,
        reason: `Cancelled Purchase ${purchase.code}`,
        referenceType: 'PURCHASE_CANCEL',
        referenceId: numericId
      })
    }

    return purchase
  }
}
