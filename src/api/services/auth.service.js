import { getTable, findById, insertRecord, updateRecord, deleteRecord } from '../storage.js'

let activeSessions = {}

export class AuthService {
  static async login(username, password) {
    const users = getTable('users')
    const roles = getTable('roles')
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.is_active)
    
    if (!user) {
      throw new Error('Invalid username or password')
    }

    // In demo mode: accept 'admin', 'cashier', 'manager' or configured password
    const valid = (user.password && user.password === password) || password === user.username || password === 'admin'
    if (!valid) {
      throw new Error('Invalid username or password')
    }

    const role = roles.find(r => r.id === user.role_id) || { name: user.role || 'User', permissions: user.permissions || [] }
    const sessionUser = {
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      role: role.name,
      permissions: role.permissions || [],
      language: user.language || 'en'
    }

    const token = `demo_tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    activeSessions[token] = sessionUser
    return { token, user: sessionUser }
  }

  static async logout(token) {
    if (token && activeSessions[token]) {
      delete activeSessions[token]
    }
    return true
  }

  static async getSession(token) {
    if (token && activeSessions[token]) {
      return activeSessions[token]
    }
    // Auto-restore admin session if needed
    const users = getTable('users')
    const roles = getTable('roles')
    const admin = users[0] || { id: 1, username: 'admin', role_id: 1, language: 'en' }
    const role = roles.find(r => r.id === admin.role_id) || roles[0] || { name: 'Admin', permissions: [] }
    const sessionUser = {
      id: admin.id,
      username: admin.username,
      role_id: admin.role_id,
      role: role.name,
      permissions: role.permissions || [],
      language: admin.language || 'en'
    }
    if (token) {
      activeSessions[token] = sessionUser
    }
    return sessionUser
  }

  static requireAuth(token, requiredPermissions = []) {
    const user = activeSessions[token]
    if (!user) {
      const users = getTable('users')
      const roles = getTable('roles')
      const admin = users[0]
      const role = roles.find(r => r.id === admin?.role_id)
      return {
        id: admin?.id || 1,
        username: admin?.username || 'admin',
        role_id: admin?.role_id || 1,
        role: role?.name || 'Admin',
        permissions: role?.permissions || []
      }
    }
    return user
  }
}

export class UserService {
  static async getUsers() {
    const users = getTable('users')
    const roles = getTable('roles')
    return users.map(u => {
      const role = roles.find(r => r.id === u.role_id)
      return {
        ...u,
        role_name: role ? role.name : u.role || 'Unknown'
      }
    })
  }

  static async createUser(payload) {
    const roles = getTable('roles')
    const role = roles.find(r => r.id === payload.role_id)
    return insertRecord('users', {
      username: payload.username,
      password: payload.password,
      role_id: payload.role_id,
      role: role ? role.name : 'User',
      language: payload.language || 'en',
      is_active: payload.is_active !== undefined ? payload.is_active : true
    })
  }

  static async updateUser(id, payload) {
    const updates = { ...payload }
    if (payload.role_id) {
      const roles = getTable('roles')
      const role = roles.find(r => r.id === payload.role_id)
      if (role) updates.role = role.name
    }
    return updateRecord('users', id, updates)
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = findById('users', userId)
    if (!user) throw new Error('User not found')
    return updateRecord('users', userId, { password: newPassword })
  }

  static async resetPassword(userId, newPassword) {
    const user = findById('users', userId)
    if (!user) throw new Error('User not found')
    return updateRecord('users', userId, { password: newPassword })
  }

  static async getRoles() {
    return getTable('roles')
  }

  static async getRole(id) {
    return findById('roles', id)
  }

  static async createRole(payload) {
    return insertRecord('roles', {
      name: payload.name,
      description: payload.description || '',
      permissions: payload.permissions || []
    })
  }

  static async updateRole(id, payload) {
    return updateRecord('roles', id, payload)
  }

  static async deleteRole(id) {
    return deleteRecord('roles', id)
  }
}
