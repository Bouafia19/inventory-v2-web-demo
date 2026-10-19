<template>
  <v-app class="bg-background">
    <router-view></router-view>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="ui.snackbar.show"
      :color="ui.snackbar.color"
      :timeout="ui.snackbar.timeout"
      location="top right"
      rounded="pill"
      elevation="24"
    >
      <div class="d-flex align-center font-weight-medium">
        <v-icon
          start
          :icon="ui.snackbar.color === 'error' ? 'mdi-alert-circle' : ui.snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-information'"
        ></v-icon>
        {{ ui.snackbar.text }}
      </div>
      <template v-slot:actions>
        <v-btn variant="text" icon="mdi-close" @click="ui.snackbar.show = false"></v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { watch, onMounted } from 'vue'
import { useUiStore } from './stores/ui.js'
import { useAuthStore } from './stores/auth.js'
import { useNotificationStore } from './stores/notifications.js'
import { useI18n } from 'vue-i18n'
import { useTheme, useLocale } from 'vuetify'

const ui = useUiStore()
const auth = useAuthStore()
const notificationStore = useNotificationStore()
const { locale } = useI18n()
const vuetifyLocale = useLocale()

// Expose to window for easy replacement of raw window.toast.error() calls
window.toast = {
  error: (text, opts) => {
    ui.showError(text)
    if (!opts || opts.persist !== false) {
      notificationStore.addNotification({
        dedupKey: opts?.dedupKey || (typeof text === 'string' ? `err-${text}` : undefined),
        type: 'error',
        title: opts?.title || 'Error',
        message: String(text || ''),
        category: opts?.category || 'system',
        route: opts?.route
      })
    }
  },
  success: (text, opts) => {
    ui.showSuccess(text)
    if (opts && opts.persist) {
      notificationStore.addNotification({
        dedupKey: opts?.dedupKey,
        type: 'success',
        title: opts.title || 'Success',
        message: String(text || ''),
        category: opts.category || 'system',
        route: opts.route
      })
    }
  },
  info: (text, opts) => {
    ui.showInfo(text)
    if (opts && opts.persist) {
      notificationStore.addNotification({
        dedupKey: opts?.dedupKey,
        type: 'info',
        title: opts.title || 'Information',
        message: String(text || ''),
        category: opts.category || 'system',
        route: opts.route
      })
    }
  },
  notify: (payload) => {
    return notificationStore.addNotification(payload)
  }
}

// Watch user language and apply to i18n + RTL
watch(() => auth.user?.language, (newLang) => {
  if (newLang) {
    locale.value = newLang
    vuetifyLocale.current.value = newLang
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
  }
}, { immediate: true })

onMounted(() => {
  const localLang = localStorage.getItem('app_language')
  if (localLang) {
    locale.value = localLang
    vuetifyLocale.current.value = localLang
    document.documentElement.dir = localLang === 'ar' ? 'rtl' : 'ltr'
  } else if (auth.user?.language) {
    locale.value = auth.user.language
    vuetifyLocale.current.value = auth.user.language
    document.documentElement.dir = auth.user.language === 'ar' ? 'rtl' : 'ltr'
  }
})
</script>


<style>
body, .v-application {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  color: #0F172A;
}

.text-slate-800 { color: #1E293B !important; }
.text-slate-500 { color: #64748B !important; }

.bg-primary-soft { background-color: #EFF6FF !important; color: #2563EB !important; }
.bg-success-soft { background-color: #ECFDF5 !important; color: #10B981 !important; }
.bg-warning-soft { background-color: #FFFBEB !important; color: #F59E0B !important; }
.bg-error-soft   { background-color: #FEF2F2 !important; color: #EF4444 !important; }
.bg-info-soft    { background-color: #ECFEFF !important; color: #06B6D4 !important; }
.bg-purple-soft  { background-color: #F5F3FF !important; color: #8B5CF6 !important; }
.bg-orange-soft  { background-color: #FFF7ED !important; color: #F97316 !important; }
.bg-slate-soft   { background-color: #F1F5F9 !important; color: #475569 !important; }
.bg-indigo-soft  { background-color: #EEF2FF !important; color: #6366F1 !important; }
.bg-rose-soft    { background-color: #FFF1F2 !important; color: #E11D48 !important; }

.text-primary { color: #2563EB !important; }
.text-success { color: #10B981 !important; }
.text-warning { color: #F59E0B !important; }
.text-error   { color: #EF4444 !important; }
.text-info    { color: #06B6D4 !important; }
.text-purple  { color: #8B5CF6 !important; }
.text-orange  { color: #F97316 !important; }
.text-indigo  { color: #6366F1 !important; }
.text-rose    { color: #E11D48 !important; }

.primary-table th {
  background-color: #F8FAFC !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em;
  color: #475569 !important;
  border-bottom: 1px solid #E2E8F0 !important;
}
.primary-table td {
  border-bottom: 1px solid #F1F5F9 !important;
  font-size: 0.875rem !important;
}
.primary-table tbody tr:hover {
  background-color: #F8FAFC !important;
}
</style>

<style>
.v-card { border-color: #E2E8F0 !important; }
.v-text-field .v-field__outline { color: #CBD5E1 !important; }
.v-btn { font-weight: 500 !important; letter-spacing: 0.01em !important; }
</style>
