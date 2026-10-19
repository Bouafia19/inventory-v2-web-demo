<template>
  <div class="h-100 d-flex align-center justify-center position-relative" style="background-color: #F8FAFC; overflow: hidden; min-height: 100vh;">
    <!-- Abstract gradient accents -->
    <div class="position-absolute rounded-circle bg-primary" style="width: 600px; height: 600px; opacity: 0.03; top: -150px; left: -150px; filter: blur(60px);"></div>
    <div class="position-absolute rounded-circle bg-info" style="width: 500px; height: 500px; opacity: 0.04; bottom: -100px; right: -100px; filter: blur(60px);"></div>
    
    <v-card width="480" elevation="0" rounded="xl" class="pa-8 bg-surface border position-relative" style="z-index: 1;">
      <div class="text-center mb-6">
        <v-img :src="logoUrl" width="64" height="64" class="mx-auto mb-3" contain></v-img>
        <div class="d-flex align-center justify-center mb-1">
          <v-chip size="small" color="primary" variant="flat" class="font-weight-bold px-3">
            WEB DEMO
          </v-chip>
        </div>
        <h1 class="text-h4 font-weight-bold text-slate-800 tracking-tight mt-2">Next Inventory</h1>
        <p class="text-body-2 text-slate-500 mt-1">{{ $t('auth.loginTo') }}</p>
      </div>

      <!-- Demo Info Banner -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mb-5 text-caption rounded-lg"
        icon="mdi-information-outline"
      >
        <strong>Frontend-Only Demonstration</strong><br/>
        All data is simulated and stored locally in your browser. No server or Electron required.
      </v-alert>

      <!-- Quick Login Profiles -->
      <div class="mb-4">
        <div class="text-caption font-weight-bold text-slate-500 mb-2 text-uppercase" style="letter-spacing: 0.05em;">
          Quick Demo Accounts:
        </div>
        <v-btn-toggle v-model="selectedRole" mandatory density="compact" color="primary" class="w-100 d-flex" rounded="lg">
          <v-btn value="admin" class="flex-1-1 text-caption text-none" @click="setAccount('admin', 'admin')">
            <v-icon start size="16">mdi-shield-crown</v-icon> Admin
          </v-btn>
          <v-btn value="cashier" class="flex-1-1 text-caption text-none" @click="setAccount('cashier', 'cashier')">
            <v-icon start size="16">mdi-cash-register</v-icon> Cashier
          </v-btn>
          <v-btn value="manager" class="flex-1-1 text-caption text-none" @click="setAccount('manager', 'manager')">
            <v-icon start size="16">mdi-account-tie</v-icon> Manager
          </v-btn>
        </v-btn-toggle>
      </div>

      <v-form @submit.prevent="handleLogin" class="mt-4">
        <v-text-field
          v-model="username"
          :label="$t('auth.username')"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-account-outline"
          class="mb-3"
          hide-details
          bg-color="white"
        ></v-text-field>

        <v-text-field
          v-model="password"
          :label="$t('auth.password')"
          type="password"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-lock-outline"
          class="mb-5"
          hide-details
          bg-color="white"
        ></v-text-field>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-5" density="compact">
          {{ error }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          class="text-body-1 font-weight-bold tracking-wide"
          variant="flat"
          rounded="lg"
          :loading="loading"
        >
          {{ $t('auth.login') }}
        </v-btn>
      </v-form>
      
      <div class="text-center mt-6 text-caption text-slate-500">
        &copy; 2026 Next Challenge. Frontend Web Demo.
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const logoUrl = `${import.meta.env.BASE_URL}pallet.png`
const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const selectedRole = ref('admin')
const username = ref('admin')
const password = ref('admin')
const error = ref('')
const loading = ref(false)

const setAccount = (u, p) => {
  username.value = u
  password.value = p
}

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message || t('auth.loginError')
  } finally {
    loading.value = false
  }
}
</script>
