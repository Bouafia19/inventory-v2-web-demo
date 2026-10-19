import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const permissions = computed(() => user.value?.permissions || [])

  function hasPermission(permission) {
    if (isAdmin.value) return true
    return permissions.value.includes(permission)
  }

  async function login(username, password) {
    const res = await window.api.login({ username, password })
    if (res.success) {
      localStorage.setItem('session_token', res.data.token)
      user.value = res.data.user
      return true
    }
    throw new Error(res.error)
  }

  async function logout() {
    await window.api.logout()
    localStorage.removeItem('session_token')
    user.value = null
  }

  async function checkSession() {
    const token = localStorage.getItem('session_token')
    if (token) {
      const res = await window.api.session()
      if (res.success && res.data) {
        user.value = res.data
        return true
      } else {
        localStorage.removeItem('session_token')
        user.value = null
      }
    }
    return false
  }

  return { user, isAuthenticated, isAdmin, permissions, hasPermission, login, logout, checkSession }
})
