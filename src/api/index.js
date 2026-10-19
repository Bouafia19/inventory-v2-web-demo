import { initStorage, resetDemoData } from './storage.js'
import { AuthService, UserService } from './services/auth.service.js'
import { MasterDataService } from './services/masterData.service.js'
import { ProductService } from './services/product.service.js'
import { InventoryService } from './services/inventory.service.js'
import { CustomerService } from './services/customer.service.js'
import { VendorService } from './services/vendor.service.js'
import { SaleService } from './services/sale.service.js'
import { PurchaseService } from './services/purchase.service.js'
import { CreditNoteService } from './services/creditNote.service.js'
import { DebitNoteService } from './services/debitNote.service.js'
import { TransferService } from './services/transfer.service.js'
import { DashboardService } from './services/dashboard.service.js'
import { PosService } from './services/pos.service.js'
import { SettingsService } from './services/settings.service.js'
import { DocumentService } from './services/document.service.js'
import { ExcelService } from './services/excel.service.js'

function wrap(fn) {
  return async (...args) => {
    try {
      const data = await fn(...args)
      return { success: true, data }
    } catch (err) {
      console.error('API Error:', err)
      return { success: false, error: err?.message || String(err) }
    }
  }
}

// Image picker simulation using browser file reader
function pickImageAsDataUrl() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    document.body.appendChild(input)

    input.onchange = (e) => {
      const file = e.target.files[0]
      document.body.removeChild(input)
      if (!file) return resolve(null)

      const reader = new FileReader()
      reader.onload = (event) => {
        resolve(event.target.result)
      }
      reader.readAsDataURL(file)
    }

    input.click()
  })
}

export function setupBrowserApi() {
  initStorage()

  const api = {
    // --- System & Diagnostics ---
    ping: wrap(async () => 'pong'),
    resetDemoData: wrap(async () => {
      resetDemoData()
      return true
    }),

    // --- Users & Roles ---
    getUsers: wrap(() => UserService.getUsers()),
    createUser: wrap((payload) => UserService.createUser(payload)),
    updateUser: wrap((id, payload) => UserService.updateUser(id, payload)),
    resetPassword: wrap((id, password) => UserService.resetPassword(id, password)),
    changePassword: wrap((current, next) => UserService.changePassword(1, current, next)),
    getRoles: wrap(() => UserService.getRoles()),
    getRole: wrap((id) => UserService.getRole(id)),
    createRole: wrap((payload) => UserService.createRole(payload)),
    updateRole: wrap((id, payload) => UserService.updateRole(id, payload)),
    deleteRole: wrap((id) => UserService.deleteRole(id)),

    // --- Auth ---
    login: wrap((payload) => AuthService.login(payload.username, payload.password)),
    logout: wrap(() => AuthService.logout()),
    session: wrap(() => AuthService.getSession()),

    // --- Master Data ---
    getFamilies: wrap(() => MasterDataService.getFamilies()),
    createFamily: wrap((data) => MasterDataService.createFamily(data)),
    updateFamily: wrap((id, data) => MasterDataService.updateFamily(id, data)),
    deleteFamily: wrap((id) => MasterDataService.deleteFamily(id)),

    getUnits: wrap(() => MasterDataService.getUnits()),
    createUnit: wrap((data) => MasterDataService.createUnit(data)),
    updateUnit: wrap((id, data) => MasterDataService.updateUnit(id, data)),
    deleteUnit: wrap((id) => MasterDataService.deleteUnit(id)),

    getBrands: wrap(() => MasterDataService.getBrands()),
    createBrand: wrap((data) => MasterDataService.createBrand(data)),
    updateBrand: wrap((id, data) => MasterDataService.updateBrand(id, data)),
    deleteBrand: wrap((id) => MasterDataService.deleteBrand(id)),

    getWarehouses: wrap(() => MasterDataService.getWarehouses()),
    createWarehouse: wrap((data) => MasterDataService.createWarehouse(data)),
    updateWarehouse: wrap((id, data) => MasterDataService.updateWarehouse(id, data)),
    deleteWarehouse: wrap((id) => MasterDataService.deleteWarehouse(id)),

    getTaxes: wrap(() => MasterDataService.getTaxes()),
    createTax: wrap((data) => MasterDataService.createTax(data)),
    updateTax: wrap((id, data) => MasterDataService.updateTax(id, data)),
    deleteTax: wrap((id) => MasterDataService.deleteTax(id)),

    // --- Products ---
    getProducts: wrap(() => ProductService.getProducts()),
    createProduct: wrap((data) => ProductService.createProduct(data)),
    updateProduct: wrap((id, data) => ProductService.updateProduct(id, data)),
    deleteProduct: wrap((id) => ProductService.deleteProduct(id)),

    printProductLabel: wrap(async (args) => {
      const res = await DocumentService.generateBarcodeLabel(args)
      DocumentService.printHtml(res.html)
      return { success: true }
    }),
    getProductLabelPdf: wrap((args) => DocumentService.generateBarcodeLabel(args)),
    saveProductLabelPdf: wrap(async (args) => {
      const filename = `Label_${args.productId || 'item'}.pdf`
      return DocumentService.downloadFile(filename, args.base64, 'application/pdf')
    }),

    printProductList: wrap(async (args) => {
      const res = await DocumentService.generateProductListPdf(args)
      return { success: true }
    }),
    getProductListPdf: wrap((args) => DocumentService.generateProductListPdf(args)),
    saveProductListPdf: wrap(async (args) => {
      const filename = `Product-List_${new Date().toISOString().split('T')[0]}.pdf`
      return DocumentService.downloadFile(filename, args.base64, 'application/pdf')
    }),

    validateBatchBarcodes: wrap((args) => {
      const prods = args.products || []
      const valid = prods.every(p => p.barcode || p.code)
      return { valid, invalidCount: 0 }
    }),
    getBatchLabelPdf: wrap(async (args) => {
      const res = await DocumentService.generateBarcodeLabel({ productId: args.products?.[0]?.id || 1, quantity: args.products?.length || 1 })
      return { base64: res.base64, format: args.format || 'A4' }
    }),
    saveBatchLabelPdf: wrap(async (args) => {
      const filename = `Batch-Labels_${new Date().toISOString().split('T')[0]}.pdf`
      return DocumentService.downloadFile(filename, args.base64, 'application/pdf')
    }),
    printBatchLabels: wrap(async (args) => {
      const res = await DocumentService.generateBarcodeLabel({ productId: args.products?.[0]?.id || 1, quantity: args.products?.length || 1 })
      DocumentService.printHtml(res.html)
      return { success: true }
    }),

    // --- Settings & Backup ---
    getSettings: wrap(() => SettingsService.getSettings()),
    updateSettings: wrap((data) => SettingsService.updateSettings(data)),
    backupDatabase: wrap(() => SettingsService.createBackup()),
    restoreDatabase: wrap((json) => SettingsService.restoreBackup(json)),

    // --- Inventory ---
    getInventoryList: wrap(() => InventoryService.getStockList()),
    getInventoryValuation: wrap(() => InventoryService.getInventoryValuation()),
    getInventoryMovements: wrap((filters) => InventoryService.getMovements(filters)),
    adjustStock: wrap((data) => InventoryService.changeStock({
      productId: data.productId,
      warehouseId: data.warehouseId,
      delta: data.delta,
      movementType: 'ADJUSTMENT',
      reason: data.reason || 'Manual Adjustment'
    })),

    // --- Vendors ---
    getVendors: wrap(() => VendorService.getVendors()),
    getVendor: wrap((id) => VendorService.getVendor(id)),
    createVendor: wrap((data) => VendorService.createVendor(data)),
    updateVendor: wrap((id, data) => VendorService.updateVendor(id, data)),
    deleteVendor: wrap((id) => VendorService.deleteVendor(id)),
    getVendorBalance: wrap((id) => VendorService.getPayableBalance(id)),
    settleVendor: wrap((id, data) => VendorService.settlePayable(id, data.amount, data.notes)),
    getVendorLedger: wrap((id) => VendorService.getPayables(id)),

    // --- Purchases ---
    getPurchases: wrap(() => PurchaseService.getPurchases()),
    getPurchase: wrap((id) => PurchaseService.getPurchase(id)),
    createPurchase: wrap((data) => PurchaseService.createPurchase(data)),
    editPurchase: wrap((id, payload) => PurchaseService.editPurchase(id, payload)),
    cancelPurchase: wrap((id) => PurchaseService.cancelPurchase(id)),

    // --- Customers ---
    getCustomers: wrap(() => CustomerService.getCustomers()),
    getCustomer: wrap((id) => CustomerService.getCustomer(id)),
    createCustomer: wrap((data) => CustomerService.createCustomer(data)),
    updateCustomer: wrap((id, data) => CustomerService.updateCustomer(id, data)),
    deleteCustomer: wrap((id) => CustomerService.deleteCustomer(id)),
    getCustomerBalance: wrap((id) => CustomerService.getReceivableBalance(id)),
    getCustomerLedger: wrap((id) => CustomerService.getLedger(id)),
    settleCustomer: wrap((id, data) => CustomerService.settleReceivable(id, data.amount, data.notes)),

    // --- Sales ---
    getSales: wrap((filters) => SaleService.getSales(filters)),
    getSale: wrap((id) => SaleService.getSale(id)),
    cancelSale: wrap((id) => SaleService.cancelSale(id)),
    getNextSaleCode: wrap(() => SaleService.getNextCode()),
    createSale: wrap((data) => SaleService.createSale(data)),
    editSale: wrap(({ oldSaleId, data }) => SaleService.editSale(oldSaleId, data)),

    // --- Dashboard ---
    getDashboardMetrics: wrap((filters) => DashboardService.getMetrics(filters)),

    // --- Credit Notes ---
    getCreditNotes: wrap(() => CreditNoteService.getCreditNotes()),
    getCreditNote: wrap((id) => CreditNoteService.getCreditNote(id)),
    createCreditNote: wrap((data) => CreditNoteService.createCreditNote(data)),
    getNextCreditNoteCode: wrap(() => CreditNoteService.getNextCode()),

    // --- Debit Notes ---
    getDebitNotes: wrap(() => DebitNoteService.getDebitNotes()),
    getDebitNote: wrap((id) => DebitNoteService.getDebitNote(id)),
    createDebitNote: wrap((data) => DebitNoteService.createDebitNote(data)),
    getNextDebitNoteCode: wrap(() => DebitNoteService.getNextCode()),

    // --- Documents / Invoices ---
    getDocumentPdf: wrap(async (type, id, i18n) => {
      return DocumentService.generatePdfBuffer({ type, id, i18n })
    }),
    saveDocumentPdf: wrap(async (payload) => {
      const { type, code, base64 } = payload || {}
      const filename = `${type || 'Document'}-${code || '001'}.pdf`
      return DocumentService.downloadFile(filename, base64, 'application/pdf')
    }),
    printDocumentDialog: wrap(async (type, id, i18n) => {
      const resolved = await DocumentService.resolveDocumentData(type, id)
      const html = await DocumentService.generateHtml({ ...resolved, i18n })
      return DocumentService.printHtml(html)
    }),
    generateInvoicePdf: wrap(async (invoiceId, i18n) => {
      return DocumentService.generatePdfBuffer({ type: 'invoice', id: invoiceId, i18n })
    }),
    generateDocumentPdf: wrap(async (type, id, i18n) => {
      return DocumentService.generatePdfBuffer({ type, id, i18n })
    }),

    // --- Transfers ---
    getTransfers: wrap(() => TransferService.getTransfers()),
    getTransfer: wrap((id) => TransferService.getTransfer(id)),
    createTransfer: wrap((data) => TransferService.createTransfer(data)),

    // --- Images ---
    pickProductImage: wrap(async () => {
      return pickImageAsDataUrl()
    }),
    pickLogoImage: wrap(async () => {
      return pickImageAsDataUrl()
    }),

    // --- POS ---
    posGetRegisters: wrap(() => PosService.getRegisters()),
    posCreateRegister: wrap((data) => PosService.createRegister(data)),
    posGetActiveSession: wrap((registerId) => PosService.getActiveSession(registerId)),
    posOpenRegister: wrap((data) => PosService.openRegister(data.registerId, 1, data.openingCash, data.notes)),
    posCloseRegister: wrap((data) => PosService.closeRegister(data.sessionId, data.actualCash, 1)),
    posGetHeldSales: wrap((sessionId) => PosService.getHeldSales(sessionId)),
    posHoldSale: wrap((data) => PosService.holdSale(data.sessionId, 1, data.customerId, data.reference, data.cartData)),
    posDeleteHeldSale: wrap((id) => PosService.deleteHeldSale(id)),
    posCompleteSale: wrap((data) => PosService.completeSale(data.sessionId, 1, data.salePayload)),

    posGetPrinters: wrap(async () => [
      { name: 'Browser Default Printer', displayName: 'Default System Printer', isDefault: true, status: 0 },
      { name: 'POS-80 Thermal Printer', displayName: 'POS-80 Thermal Receipt Printer', isDefault: false, status: 0 }
    ]),
    posPrintReceipt: wrap(async (data) => {
      const html = await DocumentService.generateReceiptHtml(data.saleId)
      return DocumentService.printHtml(html)
    }),
    downloadReceiptPdf: wrap(async (args) => {
      const saleId = typeof args === 'object' ? args.saleId : args
      const res = await DocumentService.generateReceiptPdfBuffer(saleId)
      return DocumentService.downloadFile(`Receipt-${saleId}.pdf`, res.base64, 'application/pdf')
    }),
    getReceiptPdf: wrap(async (args) => {
      const saleId = typeof args === 'object' ? args.saleId : args
      return DocumentService.generateReceiptPdfBuffer(saleId)
    }),
    saveReceiptPdf: wrap(async (payload) => {
      const { saleCode, saleId, base64 } = payload || {}
      const filename = `Receipt-${saleCode || saleId || '001'}.pdf`
      return DocumentService.downloadFile(filename, base64, 'application/pdf')
    }),
    posPrintReceiptDialog: wrap(async (args) => {
      const saleId = typeof args === 'object' ? args.saleId : args
      const html = await DocumentService.generateReceiptHtml(saleId)
      return DocumentService.printHtml(html)
    }),

    // --- Excel Import/Export ---
    exportExcel: wrap((type, filters) => ExcelService.exportData(type, filters)),
    downloadExcelTemplate: wrap((type) => ExcelService.downloadTemplate(type)),
    previewExcelImport: wrap((type, mode) => ExcelService.previewImport(type, mode)),
    confirmExcelImport: wrap((previewData) => ExcelService.confirmImport(previewData))
  }

  window.api = api
  return api
}
