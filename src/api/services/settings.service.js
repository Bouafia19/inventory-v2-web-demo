import { getDb, persistStorage, resetDemoData } from '../storage.js'

export class SettingsService {
  static async getSettings() {
    const db = getDb()
    return db.settings || {
      company_name: 'Next Inventory SARL',
      company_address: '12 Boulevard des Martyrs, Alger, Algérie',
      company_phone: '+213 (0) 23 45 67 89',
      company_email: 'contact@nextinventory.dz',
      company_tax_id: '001616012345678',
      rc: '16/00-1234567B16',
      nif: '001616012345678',
      nis: '00161601234567800001',
      art: '16012345678',
      rib: '001 00123 0123456789 45',
      currency: 'DA',
      company_logo: null
    }
  }

  static async updateSettings(data) {
    const db = getDb()
    db.settings = {
      ...(db.settings || {}),
      ...data
    }
    persistStorage()
    return db.settings
  }

  static async createBackup() {
    const db = getDb()
    const jsonStr = JSON.stringify(db, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `next_inventory_backup_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return { success: true, filePath: a.download }
  }

  static async restoreBackup(jsonData) {
    if (!jsonData) {
      throw new Error('No backup data provided')
    }
    const db = getDb()
    Object.assign(db, jsonData)
    persistStorage()
    return { success: true }
  }
}
