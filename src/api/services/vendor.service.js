import { getTable, findById, insertRecord, updateRecord, deleteRecord } from '../storage.js'

export class VendorService {
  static async getVendors() {
    const vendors = getTable('vendors').filter(v => !v.disabled)
    const ledger = getTable('vendor_payables_ledger')

    return vendors.map(vend => {
      const vendEntries = ledger.filter(l => l.vendor_id === vend.id)
      const balance = vendEntries.reduce((sum, l) => sum + (l.amount || 0), 0)

      const totalCharges = vendEntries
        .filter(l => ['CHARGE', 'PAYMENT_CORRECTION'].includes(l.type))
        .reduce((sum, l) => sum + (l.amount || 0), 0)

      const totalPayments = vendEntries
        .filter(l => l.type === 'PAYMENT')
        .reduce((sum, l) => sum + Math.abs(l.amount || 0), 0)

      const totalRefunds = vendEntries
        .filter(l => ['REFUND', 'CHARGE_CANCEL'].includes(l.type))
        .reduce((sum, l) => sum + Math.abs(l.amount || 0), 0)

      return {
        ...vend,
        balance,
        total_charges: totalCharges,
        total_payments: totalPayments,
        total_refunds: totalRefunds
      }
    }).sort((a, b) => (a.raison || '').localeCompare(b.raison || ''))
  }

  static async getVendor(id) {
    const vend = findById('vendors', id)
    if (!vend || vend.disabled) return null
    return vend
  }

  static async createVendor(data) {
    return insertRecord('vendors', {
      ...data,
      disabled: false
    })
  }

  static async updateVendor(id, data) {
    return updateRecord('vendors', id, data)
  }

  static async deleteVendor(id) {
    return updateRecord('vendors', id, { disabled: true })
  }

  // --- Payable Ledger Methods ---

  static async getPayableBalance(vendorId) {
    const numericId = Number(vendorId)
    const ledger = getTable('vendor_payables_ledger')
    return ledger
      .filter(l => l.vendor_id === numericId)
      .reduce((sum, l) => sum + (l.amount || 0), 0)
  }

  static async getPayables(vendorId) {
    const numericId = Number(vendorId)
    const ledger = getTable('vendor_payables_ledger')
    return ledger
      .filter(l => l.vendor_id === numericId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async settlePayable(vendorId, amount, notes = '', userId = null) {
    const numericId = Number(vendorId)
    const numAmount = Number(amount)
    if (numAmount <= 0) {
      throw new Error('Settlement amount must be greater than zero')
    }

    const vendor = await this.getVendor(numericId)
    if (!vendor) throw new Error('Vendor not found')

    const balance = await this.getPayableBalance(numericId)
    if (numAmount > balance) {
      throw new Error('Payment amount cannot exceed the outstanding payable balance (overpayments are not currently supported by the business rules)')
    }

    insertRecord('vendor_payables_ledger', {
      vendor_id: numericId,
      amount: -numAmount, // Negative for settlement (reduces balance)
      type: 'PAYMENT',
      reference_type: 'SETTLEMENT',
      reference_id: null,
      notes: notes || 'Settlement',
      created_by: userId,
      created_at: new Date().toISOString()
    })

    return true
  }
}
