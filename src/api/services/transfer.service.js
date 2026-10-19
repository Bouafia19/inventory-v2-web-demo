import { getTable, findById, insertRecord, persistStorage } from '../storage.js'
import { InventoryService } from './inventory.service.js'

export class TransferService {
  static async getNextCode() {
    const transfers = getTable('transfers')
    const maxId = transfers.reduce((m, t) => (t.id > m ? t.id : m), 0)
    const nextId = maxId + 1
    return `TR-${String(nextId).padStart(4, '0')}`
  }

  static async getTransfers() {
    const transfers = getTable('transfers')
    const warehouses = getTable('warehouses')

    return transfers.map(t => {
      const source = warehouses.find(w => w.id === t.source_warehouse_id)
      const dest = warehouses.find(w => w.id === t.destination_warehouse_id)
      return {
        ...t,
        source_warehouse_name: source?.name || '',
        destination_warehouse_name: dest?.name || ''
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async getTransfer(id) {
    const numericId = Number(id)
    const transfer = findById('transfers', numericId)
    if (!transfer) throw new Error('Transfer not found')

    const warehouses = getTable('warehouses')
    const source = warehouses.find(w => w.id === transfer.source_warehouse_id)
    const dest = warehouses.find(w => w.id === transfer.destination_warehouse_id)

    const allLines = getTable('transfer_lines')
    const products = getTable('products')

    const lines = allLines
      .filter(l => l.transfer_id === numericId)
      .map(l => {
        const prod = products.find(p => p.id === l.product_id)
        return {
          ...l,
          product_name: prod?.name || '',
          product_code: prod?.code || ''
        }
      })

    return {
      ...transfer,
      source_warehouse_name: source?.name || '',
      destination_warehouse_name: dest?.name || '',
      lines
    }
  }

  static async createTransfer(payload) {
    const {
      date,
      sourceWarehouseId,
      destinationWarehouseId,
      notes = '',
      lines,
      userId = null
    } = payload

    const srcId = Number(sourceWarehouseId)
    const destId = Number(destinationWarehouseId)

    if (srcId === destId) {
      throw new Error('Source and destination warehouses must be different')
    }
    if (!lines || lines.length === 0) {
      throw new Error('At least one product line is required')
    }

    // Merge duplicate product lines
    const normalizedLinesMap = new Map()
    for (const line of lines) {
      const q = Number(line.quantity)
      if (q <= 0) {
        throw new Error('Quantity must be greater than zero')
      }
      const pId = Number(line.productId)
      normalizedLinesMap.set(pId, (normalizedLinesMap.get(pId) || 0) + q)
    }

    const normalizedLines = Array.from(normalizedLinesMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity
    }))

    const code = await this.getNextCode()

    const transfer = insertRecord('transfers', {
      code,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      source_warehouse_id: srcId,
      destination_warehouse_id: destId,
      status: 'COMPLETED',
      notes,
      created_by: userId
    })

    const transferId = transfer.id

    for (const line of normalizedLines) {
      insertRecord('transfer_lines', {
        transfer_id: transferId,
        product_id: line.productId,
        quantity: line.quantity
      })

      // Decrease source
      await InventoryService.changeStock({
        productId: line.productId,
        warehouseId: srcId,
        delta: -line.quantity,
        movementType: 'TRANSFER_OUT',
        userId,
        reason: `Transfer ${code} OUT to WH ${destId}`,
        referenceType: 'TRANSFER',
        referenceId: transferId
      })

      // Increase destination
      await InventoryService.changeStock({
        productId: line.productId,
        warehouseId: destId,
        delta: line.quantity,
        movementType: 'TRANSFER_IN',
        userId,
        reason: `Transfer ${code} IN from WH ${srcId}`,
        referenceType: 'TRANSFER',
        referenceId: transferId
      })
    }

    return this.getTransfer(transferId)
  }
}
