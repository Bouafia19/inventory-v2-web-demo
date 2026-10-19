import { getInitialSeedData } from './seedData.js'

const DB_KEY = 'next_inventory_v2_demo_db'
let memoryDb = null

export function initStorage(forceReset = false) {
  if (!forceReset && memoryDb) {
    return memoryDb
  }

  if (!forceReset) {
    try {
      const raw = localStorage.getItem(DB_KEY)
      if (raw) {
        memoryDb = JSON.parse(raw)
        return memoryDb
      }
    } catch (e) {
      console.warn('Failed to parse demo database from localStorage, resetting to seed...', e)
    }
  }

  memoryDb = getInitialSeedData()
  persistStorage()
  return memoryDb
}

export function resetDemoData() {
  memoryDb = getInitialSeedData()
  persistStorage()
  return memoryDb
}

export function persistStorage() {
  if (!memoryDb) return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(memoryDb))
  } catch (e) {
    console.error('Failed to persist demo database to localStorage:', e)
  }
}

export function getDb() {
  if (!memoryDb) {
    initStorage()
  }
  return memoryDb
}

export function getTable(name) {
  const db = getDb()
  if (!db[name]) {
    db[name] = []
  }
  return db[name]
}

export function getNextId(name) {
  const table = getTable(name)
  if (!Array.isArray(table) || table.length === 0) return 1
  const max = table.reduce((m, item) => (item.id && item.id > m ? item.id : m), 0)
  return max + 1
}

export function findById(name, id) {
  const table = getTable(name)
  const numericId = Number(id)
  return table.find(item => item.id === numericId) || null
}

export function insertRecord(name, record) {
  const table = getTable(name)
  const id = record.id || getNextId(name)
  const newRecord = {
    ...record,
    id,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  table.push(newRecord)
  persistStorage()
  return newRecord
}

export function updateRecord(name, id, updates) {
  const table = getTable(name)
  const numericId = Number(id)
  const index = table.findIndex(item => item.id === numericId)
  if (index === -1) {
    throw new Error(`Record with id ${id} not found in ${name}`)
  }
  const updated = {
    ...table[index],
    ...updates,
    id: numericId,
    updated_at: new Date().toISOString()
  }
  table[index] = updated
  persistStorage()
  return updated
}

export function deleteRecord(name, id) {
  const table = getTable(name)
  const numericId = Number(id)
  const index = table.findIndex(item => item.id === numericId)
  if (index === -1) {
    throw new Error(`Record with id ${id} not found in ${name}`)
  }
  const deleted = table.splice(index, 1)[0]
  persistStorage()
  return deleted
}
