import { getTable, findById, insertRecord, updateRecord, deleteRecord, persistStorage } from '../storage.js'
import { SaleService } from './sale.service.js'

export class PosService {
  static async getRegisters() {
    const registers = getTable('pos_registers')
    const warehouses = getTable('warehouses')

    return registers.map(r => {
      const wh = warehouses.find(w => w.id === (r.warehouse_id || 1))
      return {
        ...r,
        warehouse_id: r.warehouse_id || 1,
        warehouse_name: wh?.name || 'Main Warehouse',
        active: r.active !== undefined ? r.active : true
      }
    })
  }

  static async createRegister(data) {
    return insertRecord('pos_registers', {
      name: data.name,
      warehouse_id: data.warehouse_id || 1,
      active: data.active !== undefined ? data.active : true,
      status: 'CLOSED'
    })
  }

  static async getActiveSession(registerId, cashierId) {
    const sessions = getTable('pos_sessions')
    const regId = Number(registerId)
    return sessions.find(s => s.register_id === regId && s.status === 'OPEN') || null
  }

  static async openRegister(registerId, cashierId, openingCash, notes = '') {
    const regId = Number(registerId)
    const sessions = getTable('pos_sessions')
    const existing = sessions.find(s => s.register_id === regId && s.status === 'OPEN')
    if (existing) {
      throw new Error('Register is already open')
    }

    const newSession = insertRecord('pos_sessions', {
      register_id: regId,
      cashier_id: cashierId || 1,
      opening_cash: Number(openingCash) || 0,
      expected_cash: Number(openingCash) || 0,
      actual_cash: null,
      difference: 0,
      status: 'OPEN',
      opened_at: new Date().toISOString(),
      notes: notes || ''
    })

    updateRecord('pos_registers', regId, { status: 'OPEN' })
    return newSession
  }

  static async closeRegister(sessionId, actualCash, cashierId) {
    const sId = Number(sessionId)
    const session = findById('pos_sessions', sId)
    if (!session || session.status !== 'OPEN') {
      throw new Error('Session not found or already closed')
    }

    const actual = Number(actualCash) || 0
    const difference = actual - (session.expected_cash || 0)

    const updated = updateRecord('pos_sessions', sId, {
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      actual_cash: actual,
      difference
    })

    if (session.register_id) {
      updateRecord('pos_registers', session.register_id, { status: 'CLOSED' })
    }

    return updated
  }

  static async getHeldSales(sessionId) {
    const sId = Number(sessionId)
    const held = getTable('pos_held_sales')
    return held
      .filter(h => h.session_id === sId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async holdSale(sessionId, cashierId, customerId, reference, cartData) {
    const record = insertRecord('pos_held_sales', {
      session_id: Number(sessionId),
      cashier_id: cashierId || 1,
      customer_id: customerId || null,
      reference: reference || 'Held Order',
      cart_data: typeof cartData === 'string' ? cartData : JSON.stringify(cartData)
    })
    return record.id
  }

  static async deleteHeldSale(id) {
    deleteRecord('pos_held_sales', Number(id))
    return true
  }

  static async completeSale(sessionId, cashierId, salePayload) {
    const sId = Number(sessionId)
    const session = findById('pos_sessions', sId)
    if (!session || session.status !== 'OPEN') {
      throw new Error('POS Session is closed or invalid')
    }

    const sale = await SaleService.createSale({
      ...salePayload,
      posSessionId: sId,
      userId: cashierId
    })

    // Update expected cash in session
    let netCash = 0
    if (salePayload.payments && salePayload.payments.length > 0) {
      const cashReceived = salePayload.payments
        .filter(p => p.method === 'cash')
        .reduce((sum, p) => sum + p.amount, 0)
      const totalPaid = salePayload.payments.reduce((sum, p) => sum + p.amount, 0)
      const change = totalPaid > salePayload.payment ? totalPaid - salePayload.payment : 0
      netCash = cashReceived - change
    } else if (salePayload.paymentMethod === 'cash' && salePayload.payment > 0) {
      netCash = salePayload.payment
    }

    if (netCash !== 0) {
      updateRecord('pos_sessions', sId, {
        expected_cash: (session.expected_cash || 0) + netCash
      })
    }

    if (salePayload.heldSaleId) {
      try {
        deleteRecord('pos_held_sales', Number(salePayload.heldSaleId))
      } catch (e) {}
    }

    return sale
  }
}
