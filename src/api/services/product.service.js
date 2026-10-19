import { getTable, findById, insertRecord, updateRecord, deleteRecord } from '../storage.js'

export class ProductService {
  static async getProducts() {
    const products = getTable('products')
    const families = getTable('families')
    const units = getTable('units')
    const brands = getTable('brands')
    const taxes = getTable('taxes')
    const stock = getTable('product_stock')

    return products.map(p => {
      const fam = families.find(f => f.id === p.family_id)
      const u = units.find(unit => unit.id === p.unit_id)
      const b = brands.find(brand => brand.id === p.brand_id)
      const t = taxes.find(tax => tax.id === p.tax_id)
      const totalStock = stock
        .filter(s => s.product_id === p.id)
        .reduce((sum, s) => sum + (s.quantity || 0), 0)

      return {
        ...p,
        family_name: fam?.name || '',
        unit_name: u?.name || '',
        brand_name: b?.name || '',
        tax_name: t?.name || '',
        tax_value: t?.valueTax || 0,
        stock_quantity: totalStock
      }
    })
  }

  static async getProductByCode(code) {
    const products = getTable('products')
    return products.find(p => p.code === code) || null
  }

  static async createProduct(data) {
    const products = getTable('products')
    const exists = products.find(p => p.code === data.code)
    if (exists) throw new Error('Product code must be unique')

    return insertRecord('products', {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true
    })
  }

  static async updateProduct(id, data) {
    const numericId = Number(id)
    const products = getTable('products')
    if (data.code) {
      const exists = products.find(p => p.code === data.code && p.id !== numericId)
      if (exists) throw new Error('Product code must be unique')
    }

    return updateRecord('products', numericId, data)
  }

  static async deleteProduct(id) {
    const numericId = Number(id)
    return deleteRecord('products', numericId)
  }
}
