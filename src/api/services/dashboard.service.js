import { getTable } from '../storage.js'

export class DashboardService {
  static async getMetrics({ timeline = 'all' } = {}) {
    let startDate = null
    const now = new Date()
    if (timeline === '1_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    } else if (timeline === '6_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    } else if (timeline === '1_year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    }

    const startIso = startDate ? startDate.toISOString() : null

    // 1. Sales (Count & Total) - Only FINALIZED
    const sales = getTable('sales').filter(s => {
      if (s.status !== 'FINALIZED') return false
      if (startIso && s.date < startIso) return false
      return true
    })
    const salesTotal = sales.reduce((sum, s) => sum + (s.total_price || 0), 0)
    const salesCount = sales.length

    // 2. Purchases
    const purchases = getTable('purchases').filter(p => {
      if (p.status !== 'FINALIZED') return false
      if (startIso && p.date < startIso) return false
      return true
    })
    const purchaseCount = purchases.length

    // 3. Inventory
    const stock = getTable('product_stock')
    const stockQuantity = stock.reduce((sum, s) => sum + (s.quantity || 0), 0)

    const products = getTable('products')
    const productCount = products.length

    // 4. Customers & Vendors
    const customers = getTable('customers').filter(c => !c.disabled)
    const customerCount = customers.length

    const vendors = getTable('vendors').filter(v => !v.disabled)
    const vendorCount = vendors.length

    // 5. Receivables
    const customerLedger = getTable('customer_receivables_ledger')
    const receivables = customerLedger.reduce((sum, l) => sum + (l.amount || 0), 0)

    // 6. Payables
    const vendorLedger = getTable('vendor_payables_ledger')
    const payables = vendorLedger.reduce((sum, l) => sum + (l.amount || 0), 0)

    // 7. Sales Over Time (grouped by YYYY-MM-DD)
    const salesByDay = {}
    sales.forEach(s => {
      const day = s.date.split('T')[0]
      if (!salesByDay[day]) {
        salesByDay[day] = { date: day, total: 0, count: 0 }
      }
      salesByDay[day].total += s.total_price || 0
      salesByDay[day].count += 1
    })

    const salesOverTime = Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date))

    // 8. Top Products
    const finalizedSaleIds = new Set(sales.map(s => s.id))
    const saleLines = getTable('sale_lines').filter(l => finalizedSaleIds.has(l.sale_id))

    const productQtyMap = {}
    saleLines.forEach(l => {
      productQtyMap[l.product_id] = (productQtyMap[l.product_id] || 0) + (l.amount || 0)
    })

    const topProducts = Object.entries(productQtyMap)
      .map(([productId, quantity]) => {
        const p = products.find(prod => prod.id === Number(productId))
        return {
          productId: Number(productId),
          code: p?.code || '',
          name: p?.designation || p?.name || '',
          quantity
        }
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    return {
      metrics: {
        salesCount,
        salesTotal,
        purchaseCount,
        productCount,
        stockQuantity,
        customerCount,
        vendorCount,
        receivables,
        payables
      },
      salesOverTime,
      topProducts,
      filter: timeline
    }
  }
}
