import * as xlsx from 'xlsx'
import { getTable, insertRecord, updateRecord } from '../storage.js'
import { ProductService } from './product.service.js'
import { CustomerService } from './customer.service.js'
import { VendorService } from './vendor.service.js'

export class ExcelService {
  static async exportData(type, filters = {}) {
    let data = []
    let filename = `${type.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.xlsx`

    switch (type) {
      case 'Products': {
        const products = await ProductService.getProducts()
        data = products.map(p => ({
          'Product Code': p.code,
          'Name': p.name,
          'Designation': p.designation || '',
          'Family': p.family_name || '',
          'Brand': p.brand_name || '',
          'Unit': p.unit_name || '',
          'Tax': p.tax_name || '',
          'Cost Price': p.costPrice != null ? (p.costPrice / 100).toFixed(2) : '0.00',
          'Selling Price': p.salePrice != null ? (p.salePrice / 100).toFixed(2) : '0.00',
          'Stock': p.stock_quantity || 0,
          'Alert Quantity': p.alertQuantity || 0
        }))
        break
      }
      case 'Customers': {
        const customers = await CustomerService.getCustomers()
        data = customers.map(c => ({
          'Name': c.raison,
          'Type': c.type || '',
          'Phone': c.phone || '',
          'City': c.city || '',
          'Tax IDs': c.tax_ids || '',
          'Balance (DA)': (c.balance / 100).toFixed(2)
        }))
        break
      }
      case 'Vendors': {
        const vendors = await VendorService.getVendors()
        data = vendors.map(v => ({
          'Name': v.raison,
          'Type': v.type || '',
          'Phone': v.phone || '',
          'City': v.city || '',
          'Tax IDs': v.tax_ids || '',
          'Balance (DA)': (v.balance / 100).toFixed(2)
        }))
        break
      }
      default:
        throw new Error(`Unsupported export type: ${type}`)
    }

    if (data.length === 0) throw new Error('No data found to export')

    const worksheet = xlsx.utils.json_to_sheet(data)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, type)

    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    return { success: true, filePath: filename }
  }

  static async downloadTemplate(type) {
    let headers = []
    let sampleRow = {}
    let filename = `${type.toLowerCase()}_import_template.xlsx`

    if (type === 'Products') {
      sampleRow = {
        'Product Code': 'PRD-999',
        'Name': 'Sample Item',
        'Designation': 'Sample Product Designation',
        'Family': 'Electronics',
        'Brand': 'Dell',
        'Unit': 'Piece',
        'Tax': 'TVA 19%',
        'Cost Price': '5000.00',
        'Selling Price': '7500.00',
        'Alert Quantity': '5'
      }
    } else if (type === 'Customers') {
      sampleRow = {
        'Name': 'Client Exemple SARL',
        'Type': 'Entreprise',
        'Phone': '023 00 00 00',
        'City': 'Alger',
        'Tax IDs': 'NIF: 001600000000000'
      }
    } else {
      sampleRow = {
        'Name': 'Fournisseur Exemple',
        'Type': 'Grossiste',
        'Phone': '023 11 11 11',
        'City': 'Oran'
      }
    }

    const worksheet = xlsx.utils.json_to_sheet([sampleRow])
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template')

    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    return { success: true, filePath: filename }
  }

  static async previewImport(type, mode = 'create_only') {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.xlsx, .xls, .csv'
      input.style.display = 'none'
      document.body.appendChild(input)

      input.onchange = async (e) => {
        const file = e.target.files[0]
        document.body.removeChild(input)
        if (!file) return resolve({ canceled: true })

        try {
          const buffer = await file.arrayBuffer()
          const workbook = xlsx.read(buffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rawRows = xlsx.utils.sheet_to_json(sheet)

          const rows = rawRows.map((r, idx) => ({
            rowNumber: idx + 2,
            data: r,
            action: 'create',
            valid: true,
            errors: []
          }))

          resolve({
            type,
            mode,
            filePath: file.name,
            totalRows: rows.length,
            validRows: rows.length,
            invalidRows: 0,
            rows
          })
        } catch (err) {
          resolve({ canceled: true, error: err.message })
        }
      }

      input.click()
    })
  }

  static async confirmImport(previewData, userId = null) {
    const { type, rows = [] } = previewData
    let imported = 0

    if (type === 'Products') {
      for (const row of rows) {
        const d = row.data
        const code = d['Product Code'] || `PRD-${Date.now()}`
        const name = d['Name'] || 'Imported Product'
        const costPrice = Math.round(parseFloat(d['Cost Price'] || 0) * 100)
        const salePrice = Math.round(parseFloat(d['Selling Price'] || 0) * 100)
        
        insertRecord('products', {
          code,
          name,
          designation: d['Designation'] || name,
          costPrice,
          salePrice,
          alertQuantity: parseInt(d['Alert Quantity'] || 5, 10),
          is_active: true
        })
        imported++
      }
    } else if (type === 'Customers') {
      for (const row of rows) {
        const d = row.data
        insertRecord('customers', {
          raison: d['Name'] || 'Client Importé',
          type: d['Type'] || 'Client',
          phone: d['Phone'] || '',
          city: d['City'] || '',
          tax_ids: d['Tax IDs'] || '',
          disabled: false
        })
        imported++
      }
    }

    return {
      success: true,
      importedCount: imported,
      updatedCount: 0,
      skippedCount: 0
    }
  }
}
