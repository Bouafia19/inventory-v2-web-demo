import { getTable, findById, insertRecord, updateRecord, deleteRecord } from '../storage.js'

export class CustomerService {
  static async getCustomers() {
    const customers = getTable('customers').filter(c => !c.disabled)
    const ledger = getTable('customer_receivables_ledger')

    return customers.map(cust => {
      const custEntries = ledger.filter(l => l.customer_id === cust.id)
      const balance = custEntries.reduce((sum, l) => sum + (l.amount || 0), 0)
      
      const totalCharges = custEntries
        .filter(l => ['CHARGE', 'PAYMENT_CORRECTION'].includes(l.type))
        .reduce((sum, l) => sum + (l.amount || 0), 0)

      const totalPayments = custEntries
        .filter(l => ['PAYMENT', 'CHARGE_CANCEL'].includes(l.type))
        .reduce((sum, l) => sum + Math.abs(l.amount || 0), 0)

      const totalRefunds = custEntries
        .filter(l => l.type === 'REFUND')
        .reduce((sum, l) => sum + Math.abs(l.amount || 0), 0)

      return {
        ...cust,
        balance,
        total_charges: totalCharges,
        total_payments: totalPayments,
        total_refunds: totalRefunds
      }
    }).sort((a, b) => (a.raison || '').localeCompare(b.raison || ''))
  }

  static async getCustomer(id) {
    const cust = findById('customers', id)
    if (!cust || cust.disabled) return null
    return cust
  }

  static async createCustomer(data) {
    return insertRecord('customers', {
      ...data,
      disabled: false
    })
  }

  static async updateCustomer(id, data) {
    return updateRecord('customers', id, data)
  }

  static async deleteCustomer(id) {
    return updateRecord('customers', id, { disabled: true })
  }

  // --- Receivables Ledger ---

  static async getReceivableBalance(customerId) {
    const numericId = Number(customerId)
    const ledger = getTable('customer_receivables_ledger')
    return ledger
      .filter(l => l.customer_id === numericId)
      .reduce((sum, l) => sum + (l.amount || 0), 0)
  }

  static async getLedger(customerId) {
    const numericId = Number(customerId)
    const ledger = getTable('customer_receivables_ledger')
    return ledger
      .filter(l => l.customer_id === numericId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async settleReceivable(customerId, amount, notes = '', userId = null) {
    const numericId = Number(customerId)
    const numAmount = Number(amount)
    if (numAmount <= 0) {
      throw new Error('Settlement amount must be greater than zero')
    }

    const customer = await this.getCustomer(numericId)
    if (!customer) throw new Error('Customer not found')

    const balance = await this.getReceivableBalance(numericId)
    if (numAmount > balance) {
      throw new Error('Payment amount cannot exceed the outstanding balance (overpayments are not currently supported by the business rules)')
    }

    insertRecord('customer_receivables_ledger', {
      customer_id: numericId,
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
