import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import i18n from './i18n.js'
import { setupBrowserApi } from './api/index.js'

// Initialize browser API simulation bridge
setupBrowserApi()

// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const lightTheme = {
  dark: false,
  colors: {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    primary: '#2563EB',
    secondary: '#64748B',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#3B82F6'
  }
}

const vuetify = createVuetify({
  components,
  directives,
  locale: {
    rtl: {
      ar: true
    }
  },
  theme: {
    defaultTheme: 'lightTheme',
    themes: {
      lightTheme,
    },
  },
  defaults: {
    VCard: {
      elevation: 0,
      border: true,
      rounded: 'lg'
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },
    VBtn: {
      rounded: 'md',
      style: 'text-transform: none; letter-spacing: normal;'
    },
    VDialog: {
      VCard: {
        elevation: 0,
        border: false,
        rounded: 'lg'
      }
    }
  }
})

import VueApexCharts from 'vue3-apexcharts'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(vuetify)
app.use(VueApexCharts)

app.mount('#app')
