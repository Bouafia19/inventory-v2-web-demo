import { getTable, findById, insertRecord, updateRecord, deleteRecord } from '../storage.js'

export class MasterDataService {
  // --- Families ---
  static async getFamilies() {
    return getTable('families')
  }
  static async createFamily(payload) {
    return insertRecord('families', payload)
  }
  static async updateFamily(id, payload) {
    return updateRecord('families', id, payload)
  }
  static async deleteFamily(id) {
    return deleteRecord('families', id)
  }

  // --- Units ---
  static async getUnits() {
    return getTable('units')
  }
  static async createUnit(payload) {
    return insertRecord('units', payload)
  }
  static async updateUnit(id, payload) {
    return updateRecord('units', id, payload)
  }
  static async deleteUnit(id) {
    return deleteRecord('units', id)
  }

  // --- Brands ---
  static async getBrands() {
    return getTable('brands')
  }
  static async createBrand(payload) {
    return insertRecord('brands', payload)
  }
  static async updateBrand(id, payload) {
    return updateRecord('brands', id, payload)
  }
  static async deleteBrand(id) {
    return deleteRecord('brands', id)
  }

  // --- Warehouses ---
  static async getWarehouses() {
    return getTable('warehouses')
  }
  static async createWarehouse(payload) {
    return insertRecord('warehouses', payload)
  }
  static async updateWarehouse(id, payload) {
    return updateRecord('warehouses', id, payload)
  }
  static async deleteWarehouse(id) {
    return deleteRecord('warehouses', id)
  }

  // --- Taxes ---
  static async getTaxes() {
    return getTable('taxes')
  }
  static async createTax(payload) {
    return insertRecord('taxes', payload)
  }
  static async updateTax(id, payload) {
    return updateRecord('taxes', id, payload)
  }
  static async deleteTax(id) {
    return deleteRecord('taxes', id)
  }
}
