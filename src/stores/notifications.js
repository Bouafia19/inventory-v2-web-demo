import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'next_inventory_notifications'
const MAX_CAPACITY = 100

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Failed to parse notifications from localStorage:', err)
    return []
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    console.error('Failed to save notifications to localStorage:', err)
  }
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref(loadFromStorage())

  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })

  const unreadNotifications = computed(() => {
    return notifications.value.filter(n => !n.read)
  })

  const sortedNotifications = computed(() => {
    return [...notifications.value].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0
      const timeB = new Date(b.timestamp).getTime() || 0
      return timeB - timeA
    })
  })

  function addNotification(payload) {
    if (!payload || !payload.title) return null

    // Deduplication check
    if (payload.dedupKey) {
      const existing = notifications.value.find(n => n.dedupKey === payload.dedupKey)
      if (existing) {
        // If an unread or existing alert exists, update it rather than spamming
        existing.title = payload.title || existing.title
        existing.message = payload.message || existing.message
        existing.timestamp = payload.timestamp || new Date().toISOString()
        existing.type = payload.type || existing.type
        existing.category = payload.category || existing.category
        if (payload.route) existing.route = payload.route
        if (payload.metadata) existing.metadata = payload.metadata
        if (payload.read !== undefined) existing.read = payload.read
        saveToStorage(notifications.value)
        return existing
      }
    }

    const item = {
      id: payload.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: payload.type || 'info', // 'success' | 'warning' | 'error' | 'info'
      title: String(payload.title),
      message: String(payload.message || ''),
      timestamp: payload.timestamp || new Date().toISOString(),
      read: Boolean(payload.read),
      category: payload.category || 'general',
      route: payload.route || null,
      metadata: payload.metadata || null,
      dedupKey: payload.dedupKey || null
    }

    // Insert at front
    notifications.value.unshift(item)

    // Cap capacity to avoid memory/storage bloating
    if (notifications.value.length > MAX_CAPACITY) {
      // First try removing oldest read items
      const oldestReadIdx = notifications.value.map(n => n.read).lastIndexOf(true)
      if (oldestReadIdx !== -1) {
        notifications.value.splice(oldestReadIdx, 1)
      } else {
        notifications.value.splice(MAX_CAPACITY)
      }
    }

    saveToStorage(notifications.value)
    return item
  }

  function markAsRead(id) {
    const item = notifications.value.find(n => n.id === id)
    if (item && !item.read) {
      item.read = true
      saveToStorage(notifications.value)
    }
  }

  function markAllAsRead() {
    let changed = false
    notifications.value.forEach(n => {
      if (!n.read) {
        n.read = true
        changed = true
      }
    })
    if (changed) {
      saveToStorage(notifications.value)
    }
  }

  function removeNotification(id) {
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1) {
      notifications.value.splice(idx, 1)
      saveToStorage(notifications.value)
    }
  }

  function clearAll() {
    notifications.value = []
    saveToStorage(notifications.value)
  }

  /**
   * Helper to inspect inventory/products and generate deduplicated stock alerts
   * @param {Array} items List of products or inventory items
   * @param {Function} [t] i18n translate function (optional)
   */
  function checkStockAlerts(items, t) {
    if (!Array.isArray(items)) return

    items.forEach(item => {
      const id = item.id || item.product_id
      const name = item.name || item.product_name
      if (!id || !name) return

      const qty = item.quantity !== undefined ? Number(item.quantity) : null
      if (qty === null || isNaN(qty)) return

      const minStock = Number(item.min_stock ?? item.alert_quantity ?? 5)

      if (qty <= 0) {
        addNotification({
          dedupKey: `stock-empty-${id}`,
          type: 'warning',
          category: 'inventory',
          title: t ? t('notifications.outOfStock') : 'Out of Stock',
          message: `${name}: 0 units left.`,
          route: '/inventory'
        })
      } else if (qty <= minStock) {
        addNotification({
          dedupKey: `stock-low-${id}`,
          type: 'warning',
          category: 'inventory',
          title: t ? t('notifications.lowStock') : 'Low Stock',
          message: `${name}: only ${qty} units remaining.`,
          route: '/inventory'
        })
      }
    })
  }

  return {
    notifications,
    unreadCount,
    unreadNotifications,
    sortedNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    checkStockAlerts
  }
})
