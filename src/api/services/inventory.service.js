import { getTable, findById, insertRecord, persistStorage } from '../storage.js'

export class InventoryService {
  static async getStockList() {
    const products = getTable('products')
    const warehouses = getTable('warehouses')
    const stock = getTable('product_stock')
    const families = getTable('families')

    const list = []
    for (const s of stock) {
      const prod = products.find(p => p.id === s.product_id)
      const wh = warehouses.find(w => w.id === s.warehouse_id)
      if (prod && wh) {
        const fam = families.find(f => f.id === prod.family_id)
        list.push({
          id: `${s.product_id}_${s.warehouse_id}`,
          product_id: s.product_id,
          warehouse_id: s.warehouse_id,
          quantity: s.quantity,
          product_name: prod.name,
          product_code: prod.code,
          barcode: prod.barcode,
          family_name: fam?.name || '',
          warehouse_name: wh.name,
          cost_price: prod.costPrice,
          sale_price: prod.salePrice,
          alert_quantity: prod.alertQuantity || 5
        })
      }
    }
    return list
  }

  static async getStockForProduct(productId) {
    const pId = Number(productId)
    const stock = getTable('product_stock')
    const warehouses = getTable('warehouses')
    return stock
      .filter(s => s.product_id === pId)
      .map(s => {
        const wh = warehouses.find(w => w.id === s.warehouse_id)
        return {
          ...s,
          warehouse_name: wh?.name || `WH ${s.warehouse_id}`
        }
      })
  }

  static async getInventoryValuation() {
    const products = getTable('products')
    const stock = getTable('product_stock')
    const warehouses = getTable('warehouses')

    let totalQuantity = 0
    let totalInventoryValue = 0
    let totalRetailValuation = 0
    const productSet = new Set()
    const warehouseSet = new Set()

    const valuationRows = stock.map(s => {
      const prod = products.find(p => p.id === s.product_id) || {}
      const wh = warehouses.find(w => w.id === s.warehouse_id) || {}
      const quantity = parseFloat(s.quantity) || 0
      const costPrice = parseInt(prod.costPrice || 0, 10)
      const salePrice = parseInt(prod.salePrice || 0, 10)
      const stockValue = Math.round(quantity * costPrice)
      const retailValue = Math.round(quantity * salePrice)

      totalQuantity += quantity
      totalInventoryValue += stockValue
      totalRetailValuation += retailValue
      productSet.add(s.product_id)
      warehouseSet.add(s.warehouse_id)

      return {
        product_id: s.product_id,
        warehouse_id: s.warehouse_id,
        productId: s.product_id,
        productName: prod.name || `Product #${s.product_id}`,
        product_name: prod.name || `Product #${s.product_id}`,
        product_code: prod.code || '',
        sku: prod.code || '',
        warehouseId: s.warehouse_id,
        warehouseName: wh.name || `Warehouse #${s.warehouse_id}`,
        warehouse_name: wh.name || `Warehouse #${s.warehouse_id}`,
        quantity,
        costPrice,
        cost_price: costPrice,
        salePrice,
        sale_price: salePrice,
        stockValue,
        stock_value: stockValue,
        alert_quantity: prod.alertQuantity || 5
      }
    })

    return {
      summary: {
        totalQuantity,
        totalInventoryValue,
        productCount: productSet.size,
        warehouseCount: warehouseSet.size
      },
      totalProducts: productSet.size,
      totalStock: totalQuantity,
      totalCostValuation: totalInventoryValue,
      totalRetailValuation,
      potentialProfit: totalRetailValuation - totalInventoryValue,
      rows: valuationRows
    }
  }

  static async getMovements(filters = {}) {
    const movements = getTable('stock_movements')
    const products = getTable('products')
    const warehouses = getTable('warehouses')

    let filtered = movements.map(m => {
      const prod = products.find(p => p.id === m.product_id)
      const wh = warehouses.find(w => w.id === m.warehouse_id)
      return {
        ...m,
        product_name: prod?.name || `Product #${m.product_id}`,
        product_code: prod?.code || '',
        warehouse_name: wh?.name || `Warehouse #${m.warehouse_id}`
      }
    })

    if (filters.productId) {
      filtered = filtered.filter(m => m.product_id === Number(filters.productId))
    }
    if (filters.warehouseId) {
      filtered = filtered.filter(m => m.warehouse_id === Number(filters.warehouseId))
    }
    if (filters.movementType) {
      filtered = filtered.filter(m => m.movement_type === filters.movementType)
    }
    if (filters.startDate) {
      filtered = filtered.filter(m => m.created_at >= filters.startDate)
    }
    if (filters.endDate) {
      filtered = filtered.filter(m => m.created_at <= filters.endDate)
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async changeStock({
    productId,
    warehouseId,
    delta,
    movementType = 'ADJUSTMENT',
    reason = '',
    referenceType = null,
    referenceId = null,
    userId = null
  }) {
    const pId = Number(productId)
    const wId = Number(warehouseId)
    const d = Number(delta)

    const stockTable = getTable('product_stock')
    let stockItem = stockTable.find(s => s.product_id === pId && s.warehouse_id === wId)

    if (!stockItem) {
      stockItem = { product_id: pId, warehouse_id: wId, quantity: 0 }
      stockTable.push(stockItem)
    }

    const currentQty = stockItem.quantity || 0
    const newQty = currentQty + d

    if (newQty < 0) {
      throw new Error(`Insufficient stock for Product ID ${pId} in Warehouse ID ${wId}. Available: ${currentQty}, Requested change: ${d}`)
    }

    stockItem.quantity = newQty

    // Create movement
    insertRecord('stock_movements', {
      product_id: pId,
      warehouse_id: wId,
      quantity_delta: d,
      movement_type: movementType,
      reference_type: referenceType,
      reference_id: referenceId,
      reason: reason || `Stock change: ${d}`,
      user_id: userId,
      created_at: new Date().toISOString()
    })

    persistStorage()
    return { success: true, newQuantity: newQty }
  }
}
