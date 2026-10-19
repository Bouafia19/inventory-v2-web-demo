import './setup.js'
import { describe, it, expect, beforeEach } from 'vitest'
import { setupBrowserApi } from '../src/api/index.js'
import { initStorage, resetDemoData, getTable } from '../src/api/storage.js'
import { AuthService, UserService } from '../src/api/services/auth.service.js'
import { MasterDataService } from '../src/api/services/masterData.service.js'
import { ProductService } from '../src/api/services/product.service.js'
import { InventoryService } from '../src/api/services/inventory.service.js'
import { CustomerService } from '../src/api/services/customer.service.js'
import { VendorService } from '../src/api/services/vendor.service.js'
import { SaleService } from '../src/api/services/sale.service.js'
import { PurchaseService } from '../src/api/services/purchase.service.js'
import { CreditNoteService } from '../src/api/services/creditNote.service.js'
import { DebitNoteService } from '../src/api/services/debitNote.service.js'
import { TransferService } from '../src/api/services/transfer.service.js'
import { DashboardService } from '../src/api/services/dashboard.service.js'
import { PosService } from '../src/api/services/pos.service.js'
import { DocumentService } from '../src/api/services/document.service.js'

describe('Inventory V2 Web Demo — Complete Architecture & Business Logic Test Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    setupBrowserApi()
  })

  describe('1. Storage & Preloaded Demo Dataset', () => {
    it('initializes rich sample dataset on first load', async () => {
      const products = await ProductService.getProducts()
      expect(products.length).toBe(20)

      const warehouses = await MasterDataService.getWarehouses()
      expect(warehouses.length).toBe(3)

      const customers = await CustomerService.getCustomers()
      expect(customers.length).toBe(4)

      const vendors = await VendorService.getVendors()
      expect(vendors.length).toBe(4)

      const sales = await SaleService.getSales()
      expect(sales.length).toBeGreaterThanOrEqual(3)
    })

    it('persists changes and resets cleanly on demand', async () => {
      await MasterDataService.createBrand({ name: 'Asus' })
      let brands = await MasterDataService.getBrands()
      expect(brands.some(b => b.name === 'Asus')).toBe(true)

      // Reset
      resetDemoData()
      brands = await MasterDataService.getBrands()
      expect(brands.some(b => b.name === 'Asus')).toBe(false)
    })
  })

  describe('2. Authentication & RBAC', () => {
    it('authenticates admin with full permissions', async () => {
      const res = await AuthService.login('admin', 'admin')
      expect(res.token).toBeDefined()
      expect(res.user.username).toBe('admin')
      expect(res.user.role).toBe('Admin')
      expect(res.user.permissions).toContain('sales:view')
      expect(res.user.permissions).toContain('pos:access')
    })

    it('authenticates cashier with restricted POS permissions', async () => {
      const res = await AuthService.login('cashier', 'cashier')
      expect(res.user.role).toBe('Cashier')
      expect(res.user.permissions).toContain('pos:sell')
      expect(res.user.permissions).not.toContain('settings:update')
    })

    it('rejects invalid credentials', async () => {
      await expect(AuthService.login('unknown', 'wrong')).rejects.toThrow()
    })
  })

  describe('3. Products & Master Data', () => {
    it('aggregates total stock correctly for products', async () => {
      const products = await ProductService.getProducts()
      const laptop = products.find(p => p.code === 'ELEC-001')
      expect(laptop).toBeDefined()
      // Initial stock: WH1=12, WH2=7, WH3=2 => 21 total
      expect(laptop.stock_quantity).toBe(21)
      expect(laptop.family_name).toBe('Electronics')
      expect(laptop.brand_name).toBe('Dell')
    })

    it('enforces unique SKU code on creation', async () => {
      await expect(ProductService.createProduct({
        code: 'ELEC-001',
        name: 'Duplicate Laptop'
      })).rejects.toThrow(/unique/)
    })
  })

  describe('4. Inventory Valuations & Movements', () => {
    it('calculates inventory valuation metrics correctly', async () => {
      const valuation = await InventoryService.getInventoryValuation()
      expect(valuation.totalProducts).toBe(20)
      expect(valuation.totalStock).toBeGreaterThan(0)
      expect(valuation.totalCostValuation).toBeGreaterThan(0)
      expect(valuation.totalRetailValuation).toBeGreaterThan(valuation.totalCostValuation)
      expect(valuation.potentialProfit).toBe(valuation.totalRetailValuation - valuation.totalCostValuation)
    })

    it('prevents stock decrement below zero', async () => {
      await expect(InventoryService.changeStock({
        productId: 1,
        warehouseId: 1,
        delta: -9999
      })).rejects.toThrow(/Insufficient stock/)
    })

    it('logs stock movement in ledger on adjustment', async () => {
      await InventoryService.changeStock({
        productId: 1,
        warehouseId: 1,
        delta: 5,
        movementType: 'ADJUSTMENT',
        reason: 'Restocking'
      })
      const movements = await InventoryService.getMovements({ productId: 1 })
      expect(movements[0].movement_type).toBe('ADJUSTMENT')
      expect(movements[0].quantity_delta).toBe(5)
    })
  })

  describe('5. Sales Workflow & Atomic Accounting', () => {
    it('atomically creates sale, decrements stock across warehouses, and updates receivables', async () => {
      const beforeStockWH1 = (await InventoryService.getStockForProduct(1)).find(s => s.warehouse_id === 1).quantity
      const beforeStockWH2 = (await InventoryService.getStockForProduct(3)).find(s => s.warehouse_id === 2).quantity
      const beforeBalance = await CustomerService.getReceivableBalance(1)

      const sale = await SaleService.createSale({
        code: 'S-TEST-001',
        customerId: 1,
        discount: 100000, // 1,000 DA
        payment: 5000000, // 50,000 DA paid
        stamp: 2500,
        lines: [
          { productId: 1, warehouseId: 1, amount: 2, price: 15000000, taxPercent: 19 },
          { productId: 3, warehouseId: 2, amount: 4, price: 250000, taxPercent: 19 }
        ]
      })

      expect(sale.id).toBeDefined()
      // Line 1 untaxed: 2 * 15,000,000 = 30,000,000. Taxes (19%): 5,700,000
      // Line 2 untaxed: 4 * 250,000 = 1,000,000. Taxes (19%): 190,000
      // Total untaxed: 31,000,000. Total taxes: 5,890,000
      // Total price: (31,000,000 + 5,890,000) - 100,000 + 2,500 = 36,792,500
      expect(sale.total_untaxed).toBe(31000000)
      expect(sale.total_taxes).toBe(5890000)
      expect(sale.total_price).toBe(36792500)
      expect(sale.payment).toBe(5000000)
      expect(sale.rest).toBe(36792500 - 5000000)
      expect(sale.payed).toBe(false)

      // Stock checks
      const afterStockWH1 = (await InventoryService.getStockForProduct(1)).find(s => s.warehouse_id === 1).quantity
      const afterStockWH2 = (await InventoryService.getStockForProduct(3)).find(s => s.warehouse_id === 2).quantity
      expect(afterStockWH1).toBe(beforeStockWH1 - 2)
      expect(afterStockWH2).toBe(beforeStockWH2 - 4)

      // Customer balance increased by rest
      const afterBalance = await CustomerService.getReceivableBalance(1)
      expect(afterBalance).toBe(beforeBalance + (36792500 - 5000000))
    })

    it('cancels sale cleanly and reverses stock and receivables', async () => {
      const sale = await SaleService.createSale({
        code: 'S-CANCEL-001',
        customerId: 2,
        payment: 1000000,
        lines: [{ productId: 4, warehouseId: 1, amount: 2, price: 900000, taxPercent: 19 }]
      })

      const stockBeforeCancel = (await InventoryService.getStockForProduct(4)).find(s => s.warehouse_id === 1).quantity
      await SaleService.cancelSale(sale.id)

      const stockAfterCancel = (await InventoryService.getStockForProduct(4)).find(s => s.warehouse_id === 1).quantity
      expect(stockAfterCancel).toBe(stockBeforeCancel + 2)

      const cancelledSale = await SaleService.getSale(sale.id)
      expect(cancelledSale.status).toBe('CANCELLED')
    })
  })

  describe('6. Purchases Workflow', () => {
    it('creates purchase, increases stock, and updates supplier payables', async () => {
      const beforeStock = (await InventoryService.getStockForProduct(16)).find(s => s.warehouse_id === 1).quantity
      const beforePayable = await VendorService.getPayableBalance(1)

      const purchase = await PurchaseService.createPurchase({
        code: 'P-TEST-001',
        vendorId: 1,
        warehouseId: 1,
        payment: 200000,
        lines: [{ productId: 16, warehouseId: 1, amount: 20, price: 50000, taxPercent: 19 }]
      })

      expect(purchase.id).toBeDefined()
      const afterStock = (await InventoryService.getStockForProduct(16)).find(s => s.warehouse_id === 1).quantity
      expect(afterStock).toBe(beforeStock + 20)

      const afterPayable = await VendorService.getPayableBalance(1)
      expect(afterPayable).toBe(beforePayable + purchase.total_price - 200000)
    })
  })

  describe('7. Warehouse Transfers', () => {
    it('transfers stock atomically between warehouses', async () => {
      const beforeSrc = (await InventoryService.getStockForProduct(1)).find(s => s.warehouse_id === 1).quantity
      const beforeDst = (await InventoryService.getStockForProduct(1)).find(s => s.warehouse_id === 2).quantity

      const transfer = await TransferService.createTransfer({
        sourceWarehouseId: 1,
        destinationWarehouseId: 2,
        lines: [{ productId: 1, quantity: 3 }]
      })

      expect(transfer.code).toBeDefined()
      const afterSrc = (await InventoryService.getStockForProduct(1)).find(s => s.warehouse_id === 1).quantity
      const afterDst = (await InventoryService.getStockForProduct(1)).find(s => s.warehouse_id === 2).quantity

      expect(afterSrc).toBe(beforeSrc - 3)
      expect(afterDst).toBe(beforeDst + 3)
    })

    it('rejects transfer when source and destination are identical', async () => {
      await expect(TransferService.createTransfer({
        sourceWarehouseId: 1,
        destinationWarehouseId: 1,
        lines: [{ productId: 1, quantity: 1 }]
      })).rejects.toThrow(/different/)
    })
  })

  describe('8. Credit Notes & Debit Notes', () => {
    it('creates credit note for returned items and restores inventory', async () => {
      const sale = await SaleService.getSale(1)
      const saleLine = sale.lines[0]
      const beforeStock = (await InventoryService.getStockForProduct(saleLine.product_id)).find(s => s.warehouse_id === saleLine.warehouse_id).quantity

      const cn = await CreditNoteService.createCreditNote({
        saleId: sale.id,
        lines: [{ saleLineId: saleLine.id, amount: 1 }]
      })

      expect(cn.code).toMatch(/^C\d{5}$/)
      const afterStock = (await InventoryService.getStockForProduct(saleLine.product_id)).find(s => s.warehouse_id === saleLine.warehouse_id).quantity
      expect(afterStock).toBe(beforeStock + 1)
    })

    it('creates debit note for supplier returns and decreases inventory', async () => {
      const purchase = await PurchaseService.getPurchase(1)
      const purchaseLine = purchase.lines[0]
      const beforeStock = (await InventoryService.getStockForProduct(purchaseLine.product_id)).find(s => s.warehouse_id === purchaseLine.warehouseId).quantity

      const dn = await DebitNoteService.createDebitNote({
        purchaseId: purchase.id,
        lines: [{ purchaseLineId: purchaseLine.id, amount: 2 }]
      })

      expect(dn.code).toMatch(/^D\d{5}$/)
      const afterStock = (await InventoryService.getStockForProduct(purchaseLine.product_id)).find(s => s.warehouse_id === purchaseLine.warehouseId).quantity
      expect(afterStock).toBe(beforeStock - 2)
    })
  })

  describe('9. Point of Sale (POS)', () => {
    it('manages register sessions and completes cash sales', async () => {
      const session = await PosService.openRegister(1, 1, 1000000, 'Opening shift')
      expect(session.status).toBe('OPEN')
      expect(session.opening_cash).toBe(1000000)

      const sale = await PosService.completeSale(session.id, 1, {
        customerId: 4,
        paymentMethod: 'cash',
        payment: 250000,
        lines: [{ productId: 3, warehouseId: 1, amount: 1, price: 250000, taxPercent: 0 }]
      })

      expect(sale.id).toBeDefined()
      const activeSession = await PosService.getActiveSession(1)
      expect(activeSession.expected_cash).toBe(1000000 + 250000)

      const closed = await PosService.closeRegister(session.id, 1250000, 1)
      expect(closed.status).toBe('CLOSED')
      expect(closed.difference).toBe(0)
    })
  })

  describe('10. Documents & Receipts Generation', () => {
    it('generates compliant invoice HTML with legal number in words', async () => {
      const res = await DocumentService.generatePdfBuffer({ type: 'invoice', id: 1 })
      expect(res.base64).toBeDefined()
      expect(res.html).toContain('F A C T U R E')
      expect(res.html).toContain('Next Inventory')
      expect(res.html).toContain('dinars')
    })

    it('generates 80mm thermal receipt', async () => {
      const res = await DocumentService.generateReceiptPdfBuffer(1)
      expect(res.base64).toBeDefined()
      expect(res.html).toContain('Ticket N°')
      expect(res.html).toContain('NET A PAYER')
    })

    it('generates product barcode label', async () => {
      const res = await DocumentService.generateBarcodeLabel({ productId: 1, format: '50x25' })
      expect(res.base64).toBeDefined()
      expect(res.html).toContain('Laptop Pro 15')
    })
  })

  describe('11. Dashboard Metrics', () => {
    it('recalculates live business KPIs from transaction ledgers', async () => {
      const data = await DashboardService.getMetrics({ timeline: 'all' })
      expect(data.metrics.salesCount).toBeGreaterThan(0)
      expect(data.metrics.salesTotal).toBeGreaterThan(0)
      expect(data.metrics.productCount).toBe(20)
      expect(data.salesOverTime.length).toBeGreaterThan(0)
      expect(data.topProducts.length).toBeGreaterThan(0)
    })
  })

  describe('12. Window API Contract Fidelity', () => {
    it('wraps all API calls in { success: true, data }', async () => {
      const ping = await window.api.ping()
      expect(ping).toEqual({ success: true, data: 'pong' })

      const products = await window.api.getProducts()
      expect(products.success).toBe(true)
      expect(Array.isArray(products.data)).toBe(true)

      const metrics = await window.api.getDashboardMetrics()
      expect(metrics.success).toBe(true)
      expect(metrics.data.metrics).toBeDefined()
    })
  })
})
