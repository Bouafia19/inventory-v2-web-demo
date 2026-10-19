
<template>
  <v-app class="bg-background">
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent width="260" elevation="0" border="0" class="sidebar-navy">
      <!-- Ambient Glow Effect -->
      <div class="sidebar-glow"></div>
      
      <div :class="['d-flex align-center brand-area position-relative z-index-1', rail ? 'pa-2 justify-center' : 'pa-5']">
        <div class="d-flex align-center justify-center" :class="{'me-3': !rail}" style="width: 36px; height: 36px;">
          <v-img :src="logoUrl" width="32" height="32" contain></v-img>
        </div>
        <div v-show="!rail">
          <div class="text-h6 font-weight-bold text-white tracking-tight" style="line-height: 1.2;">Next Inventory</div>
          <div class="text-overline text-slate-400" style="line-height: 1; letter-spacing: 0.15em; font-size: 0.65rem;">Enterprise</div>
        </div>
      </div>

      <v-list density="compact" nav class="px-3 position-relative z-index-1 mt-2">
        <template v-for="(item, i) in items" :key="i">
          <div v-if="!item.requiresPermission || auth.hasPermission(item.requiresPermission)">
            <div v-if="item.divider" class="my-3 border-opacity-10 border-top"></div>
            <div v-else-if="item.heading" class="nav-section-title ms-2 mb-2 mt-5" v-show="!rail">{{ $t(item.heading) }}</div>
            <v-list-item
              v-else
              :to="item.to"
              :active="isActive(item.to)"
              rounded="lg"
              class="mb-1 nav-item"
              :class="{ 'nav-item-active': isActive(item.to) }"
              :ripple="false"
            >
              <template v-slot:prepend>
                <v-icon 
                  :color="isActive(item.to) ? 'white' : item.iconColor" 
                  size="20" 
                  :class="['icon-transition', { 'me-3': !rail }]"
                  :style="{ opacity: isActive(item.to) ? 1 : 0.85 }"
                >{{ item.icon }}</v-icon>
              </template>
              <v-list-item-title 
                class="font-weight-medium text-transition" 
                style="font-size: 0.875rem"
              >{{ $t(item.title) }}</v-list-item-title>
              <v-tooltip v-if="rail" activator="parent" location="right">{{ $t(item.title) }}</v-tooltip>
            </v-list-item>
          </div>
        </template>
      </v-list>
      
      <template v-slot:append>
        <div style="border-top: 1px solid rgba(255,255,255,0.05); position-relative z-index-1">
          <v-list density="compact" nav class="px-3 py-4 bg-transparent">
            <v-list-item v-if="auth.hasPermission('users:view')" to="/users" rounded="lg" :active="isActive('/users')" class="mb-1 nav-item" :class="{ 'nav-item-active': isActive('/users') }">
              <template v-slot:prepend>
                <v-icon :color="isActive('/users') ? 'white' : '#6366F1'" size="20" :class="['icon-transition', { 'me-3': !rail }]">mdi-account-group-outline</v-icon>
              </template>
              <v-list-item-title class="font-weight-medium" style="font-size: 0.875rem">{{ $t('nav.users') }}</v-list-item-title>
              <v-tooltip v-if="rail" activator="parent" location="right">{{ $t('nav.users') }}</v-tooltip>
            </v-list-item>
            <v-list-item v-if="auth.hasPermission('roles:view')" to="/roles" rounded="lg" :active="isActive('/roles')" class="mb-1 nav-item" :class="{ 'nav-item-active': isActive('/roles') }">
              <template v-slot:prepend>
                <v-icon :color="isActive('/roles') ? 'white' : '#EC4899'" size="20" :class="['icon-transition', { 'me-3': !rail }]">mdi-shield-account-outline</v-icon>
              </template>
              <v-list-item-title class="font-weight-medium" style="font-size: 0.875rem">{{ $t('nav.roles') }}</v-list-item-title>
              <v-tooltip v-if="rail" activator="parent" location="right">{{ $t('nav.roles') }}</v-tooltip>
            </v-list-item>

            <v-list-item v-if="auth.hasPermission('settings:view')" to="/settings" rounded="lg" :active="isActive('/settings')" class="mb-1 nav-item" :class="{ 'nav-item-active': isActive('/settings') }">
              <template v-slot:prepend>
                <v-icon :color="isActive('/settings') ? 'white' : '#8B5CF6'" size="20" :class="['icon-transition', { 'me-3': !rail }]">mdi-cog-outline</v-icon>
              </template>
              <v-list-item-title class="font-weight-medium" style="font-size: 0.875rem">{{ $t('nav.settings') }}</v-list-item-title>
              <v-tooltip v-if="rail" activator="parent" location="right">{{ $t('nav.settings') }}</v-tooltip>
            </v-list-item>
          </v-list>
        </div>
      </template>
    </v-navigation-drawer>


    
    <v-app-bar elevation="0" class="border-b topbar-navy" density="comfortable">
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer" class="d-md-none topbar-item" color="#06B6D4"></v-app-bar-nav-icon>
        <v-app-bar-nav-icon @click="rail = !rail" class="d-none d-md-flex topbar-item" color="#06B6D4"></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title class="text-body-1 font-weight-medium text-white d-none d-sm-block">
        {{ currentRouteName ? $t(currentRouteName) : "" }}
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Demo Mode Badge -->
      <v-chip
        size="small"
        color="warning"
        variant="tonal"
        class="me-3 font-weight-bold d-none d-md-flex align-center"
        prepend-icon="mdi-flask-outline"
      >
        Demo Mode
        <v-tooltip activator="parent" location="bottom">
          Data is simulated and stored locally in this browser.
        </v-tooltip>
      </v-chip>

      <!-- Reset Demo Data Action -->
      <v-btn
        variant="tonal"
        color="warning"
        size="small"
        prepend-icon="mdi-restore"
        class="me-3 text-none d-none d-sm-flex"
        @click="confirmResetDemo"
      >
        Reset Data
        <v-tooltip activator="parent" location="bottom">
          Restore initial sample data (products, stock, transactions)
        </v-tooltip>
      </v-btn>

      <LanguageSelector class="me-2">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" icon rounded="pill" class="topbar-item">
            <v-icon color="#8B5CF6" class="icon-transition">mdi-web</v-icon>
          </v-btn>
        </template>
      </LanguageSelector>

      <NotificationCenter class="me-2" />

      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" class="px-2 text-none topbar-item" rounded="pill">
            <v-icon start color="#6366F1" class="icon-transition">mdi-account-circle-outline</v-icon>
            <span class="d-none d-sm-inline">{{ auth.user?.username }}</span>
            <v-icon end color="#64748B" class="icon-transition">mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list density="compact" min-width="200">
          <v-list-item to="/account">
            <template v-slot:prepend><v-icon size="small" class="me-3 text-secondary">mdi-account-circle-outline</v-icon></template>
            <v-list-item-title>{{ $t('nav.account') }}</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1"></v-divider>
          <v-list-item @click="logout" color="error">
            <template v-slot:prepend><v-icon size="small" class="me-3 text-error">mdi-logout</v-icon></template>
            <v-list-item-title class="text-error">{{ $t('nav.logout') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>


    <ChangePasswordDialog v-model="changePasswordDialog" />
    <ConfirmDialog ref="confirmDialogRef" />

    <v-main class="bg-background">
      <div class="pa-8 mx-auto" style="max-width: 1440px;">
        <router-view></router-view>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import LanguageSelector from '../components/LanguageSelector.vue'
import NotificationCenter from '../components/NotificationCenter.vue'
import ChangePasswordDialog from '../components/ChangePasswordDialog.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useNotificationStore } from '../stores/notifications.js'
import { useI18n } from 'vue-i18n'

const logoUrl = `${import.meta.env.BASE_URL}pallet.png`
const router = useRouter()
const route = useRoute()
const drawer = ref(true)
const rail = ref(false)
const changePasswordDialog = ref(false)
const confirmDialogRef = ref(null)
const auth = useAuthStore()

const confirmResetDemo = async () => {
  if (!confirmDialogRef.value) return
  const confirmed = await confirmDialogRef.value.open({
    title: 'Reset Demo Data?',
    message: 'This will reset all products, inventory levels, sales, purchases, and contacts to their default fictional sample state. Changes stored in your browser will be overwritten.',
    confirmText: 'Reset Demo Data',
    destructive: true
  })
  if (confirmed) {
    await window.api.resetDemoData()
    if (window.toast?.success) {
      window.toast.success('Sample demo data has been restored!')
    }
    setTimeout(() => {
      window.location.reload()
    }, 400)
  }
}

const items = [
  
  { heading: 'nav.overview' },
  { title: 'nav.dashboard', icon: 'mdi-view-dashboard-outline', to: '/', iconColor: '#3B82F6', requiresPermission: 'reports:view' },
  
  { heading: 'nav.operations' },
  { title: 'nav.pos', icon: 'mdi-monitor-dashboard', to: '/pos', iconColor: '#E11D48', requiresPermission: 'pos:access' },
  { title: 'nav.sales', icon: 'mdi-cart-outline', to: '/sales', iconColor: '#3B82F6', requiresPermission: 'sales:view' },
  { title: 'nav.purchases', icon: 'mdi-shopping-outline', to: '/purchases', iconColor: '#F97316', requiresPermission: 'purchases:view' },
  { title: 'nav.inventory', icon: 'mdi-warehouse', to: '/inventory', iconColor: '#10B981', requiresPermission: 'inventory:manage' },
  { title: 'nav.transfers', icon: 'mdi-swap-horizontal', to: '/transfers', iconColor: '#10B981', requiresPermission: 'inventory:manage' },
  { title: 'nav.products', icon: 'mdi-package-variant-closed', to: '/products', iconColor: '#06B6D4', requiresPermission: 'products:view' },
  
  { heading: 'nav.contacts' },
  { title: 'nav.customers', icon: 'mdi-account-group-outline', to: '/customers', iconColor: '#6366F1', requiresPermission: 'customers:view' },
  { title: 'nav.vendors', icon: 'mdi-truck-outline', to: '/vendors', iconColor: '#F59E0B', requiresPermission: 'vendors:view' },
  
  { heading: 'nav.finance' },
  { title: 'nav.receivables', icon: 'mdi-cash-plus', to: '/receivables', iconColor: '#10B981', requiresPermission: 'finance:view' },
  { title: 'nav.payables', icon: 'mdi-cash-minus', to: '/payables', iconColor: '#EF4444', requiresPermission: 'finance:view' },
  { title: 'nav.invoices', icon: 'mdi-file-document-outline', to: '/invoices', iconColor: '#10B981', requiresPermission: 'invoices:view' },
  { title: 'nav.creditNotes', icon: 'mdi-file-undo-outline', to: '/credit-notes', iconColor: '#F43F5E', requiresPermission: 'finance:view' },
  { title: 'nav.debitNotes', icon: 'mdi-file-send-outline', to: '/debit-notes', iconColor: '#EAB308', requiresPermission: 'purchases:view' },
  
  { heading: 'nav.configuration' },
  { title: 'nav.families', icon: 'mdi-format-list-bulleted-type', to: '/families', iconColor: '#8B5CF6', requiresPermission: 'master_data:manage' },
  { title: 'nav.units', icon: 'mdi-ruler', to: '/units', iconColor: '#8B5CF6', requiresPermission: 'master_data:manage' },
  { title: 'nav.brands', icon: 'mdi-tag-outline', to: '/brands', iconColor: '#8B5CF6', requiresPermission: 'master_data:manage' },
  { title: 'nav.warehouses', icon: 'mdi-store-outline', to: '/warehouses', iconColor: '#8B5CF6', requiresPermission: 'master_data:manage' },
  { title: 'nav.taxes', icon: 'mdi-percent-outline', to: '/taxes', iconColor: '#8B5CF6', requiresPermission: 'master_data:manage' },
]


const currentRouteName = computed(() => {
  const current = items.find(i => i.to === route.path)
  return current ? (current.title ? current.title : '') : ''
})

const isActive = (path) => route.path === path

const logout = async () => {
  await auth.logout()
  router.push('/login')
}

const notifications = useNotificationStore()
const { t } = useI18n()

onMounted(async () => {
  if (window.api?.getInventoryValuation) {
    try {
      const res = await window.api.getInventoryValuation()
      if (res?.success && res.data?.rows) {
        notifications.checkStockAlerts(res.data.rows, t)
      }
    } catch (e) {
      // non-blocking
    }
  }
})
</script>
<style scoped>
.sidebar-navy {
  background: #0F172A !important;
  color: #F8FAFC !important;
  overflow: hidden;
}

.topbar-navy {
  background: #0F172A !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}

.sidebar-glow {
  position: absolute;
  top: -100px;
  left: -100px;
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(15,23,42,0) 70%);
  z-index: 0;
  pointer-events: none;
}

.z-index-1 {
  z-index: 1;
}

.brand-icon-container {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
  border-radius: 10px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3);
}

.brand-area {
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.nav-section-title {
  color: #64748B;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.border-top {
  border-top: 1px solid rgba(255,255,255,1) !important;
}

.nav-item {
  color: #94A3B8 !important;
  transition: all 0.2s ease;
}

.nav-item:hover:not(.nav-item-active) {
  background-color: rgba(255, 255, 255, 0.04) !important;
  color: #F1F5F9 !important;
}

.nav-item:hover:not(.nav-item-active) .icon-transition {
  opacity: 1 !important;
  filter: brightness(1.2);
}

.icon-transition, .text-transition {
  transition: all 0.2s ease;
}

.nav-item-active {
  background: linear-gradient(90deg, #1E40AF 0%, #2563EB 100%) !important;
  color: #FFFFFF !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 6px -1px rgba(0,0,0,0.2) !important;
  position: relative;
}

.nav-item-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  height: 70%;
  width: 4px;
  background-color: #60A5FA;
  border-radius: 0 4px 4px 0;
}

.topbar-item {
  color: #94A3B8;
  transition: all 0.2s ease;
}

.topbar-item:hover {
  background-color: rgba(255, 255, 255, 0.04) !important;
  color: #F1F5F9 !important;
}

/* Fix for rail mode icon alignment */
:deep(.v-navigation-drawer--rail .v-navigation-drawer__content::-webkit-scrollbar) {
  display: none !important;
}
:deep(.v-navigation-drawer--rail .v-navigation-drawer__content) {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}
:deep(.v-navigation-drawer--rail .v-list) {
  padding-inline: 0 !important;
  width: 56px !important;
}
:deep(.v-navigation-drawer--rail .v-list-item) {
  padding: 0 !important;
  width: 56px !important;
  justify-content: center !important;
}
:deep(.v-navigation-drawer--rail .v-list-item__prepend) {
  margin: 0 !important;
  width: 56px !important;
  justify-content: center !important;
}
:deep(.v-navigation-drawer--rail .v-list-item__spacer) {
  display: none !important;
}
:deep(.v-navigation-drawer--rail .v-list-item__content) {
  display: none !important;
}

</style>
