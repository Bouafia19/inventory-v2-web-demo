import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [

  {
    path: '/pos',
    name: 'POS',
    component: () => import('../views/POS.vue'),
    meta: { requiresAuth: true, requiresPermission: 'pos:access' }
  },

  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { requiresPermission: 'users:view' }
      },
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresPermission: 'reports:view' }
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('../views/Roles.vue'),
        meta: { requiresPermission: 'roles:view' }
      },

      {
        path: 'vendors',
        name: 'Vendors',
        component: () => import('../views/Vendors.vue'),
        meta: { requiresPermission: 'vendors:view' }
      },
      {
        path: 'invoices',
        name: 'Invoices',
        component: () => import('../views/Invoices.vue'),
        meta: { requiresPermission: 'invoices:view' }
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('../views/Customers.vue'),
        meta: { requiresPermission: 'customers:view' }
      },
      {
        path: 'credit-notes',
        name: 'CreditNotes',
        component: () => import('../views/CreditNotes.vue'),
        meta: { requiresPermission: 'finance:view' }
      },
      {
        path: 'debit-notes',
        name: 'DebitNotes',
        component: () => import('../views/DebitNotes.vue'),
        meta: { requiresPermission: 'purchases:view' }
      },
      {
        path: 'receivables',
        name: 'Receivables',
        component: () => import('../views/Receivables.vue'),
        meta: { requiresPermission: 'finance:view' }
      },
      {
        path: 'payables',
        name: 'Payables',
        component: () => import('../views/Payables.vue'),
        meta: { requiresPermission: 'finance:view' }
      },
      {
        path: 'sales',
        name: 'Sales',
        component: () => import('../views/Sales.vue'),
        meta: { requiresPermission: 'sales:view' }
      },
      {
        path: 'purchases',
        name: 'Purchases',
        component: () => import('../views/Purchases.vue'),
        meta: { requiresPermission: 'purchases:view' }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('../views/Products.vue'),
        meta: { requiresPermission: 'products:view' }
      },
      {
        path: 'families',
        name: 'Families',
        component: () => import('../views/Families.vue'),
        meta: { requiresPermission: 'master_data:manage' }
      },
      {
        path: 'units',
        name: 'Units',
        component: () => import('../views/Units.vue'),
        meta: { requiresPermission: 'master_data:manage' }
      },
      {
        path: 'brands',
        name: 'Brands',
        component: () => import('../views/Brands.vue'),
        meta: { requiresPermission: 'master_data:manage' }
      },
      {
        path: 'warehouses',
        name: 'Warehouses',
        component: () => import('../views/Warehouses.vue'),
        meta: { requiresPermission: 'warehouses:view' }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('../views/Inventory.vue'),
        meta: { requiresPermission: 'inventory:manage' }
      },
      {
        path: 'transfers',
        name: 'Transfers',
        component: () => import('../views/Transfers.vue'),
        meta: { requiresPermission: 'inventory:manage' }
      },
      {
        path: 'transfers/new',
        name: 'TransfersNew',
        component: () => import('../views/TransfersNew.vue'),
        meta: { requiresPermission: 'inventory:manage' }
      },
      {
        path: 'taxes',
        name: 'Taxes',
        component: () => import('../views/Taxes.vue'),
        meta: { requiresPermission: 'master_data:manage' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { requiresPermission: 'settings:view' }
      },
      {
        path: 'account',
        name: 'MyAccount',
        component: () => import('../views/MyAccount.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})


export const routerGuard = async (to, from, next, routes, authStore) => {
  if (!authStore.isAuthenticated && localStorage.getItem('session_token')) {
    await authStore.checkSession()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresPermission && !authStore.hasPermission(to.meta.requiresPermission)) {
    if (from.name === 'Login' || !from.name) {
      const layoutRoute = routes.find(r => r.name === 'Layout')
      const safeRoute = layoutRoute.children.find(r => !r.meta?.requiresPermission || authStore.hasPermission(r.meta.requiresPermission))
      next(safeRoute ? { name: safeRoute.name } : false)
    } else {
      next(false)
    }
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    const layoutRoute = routes.find(r => r.name === 'Layout')
    const safeRoute = layoutRoute.children.find(r => !r.meta?.requiresPermission || authStore.hasPermission(r.meta.requiresPermission))
    next(safeRoute ? { name: safeRoute.name } : '/')
  } else {
    next()
  }
}

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  await routerGuard(to, from, next, routes, authStore)
})


export default router
