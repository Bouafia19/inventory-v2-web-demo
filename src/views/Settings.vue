<template>
  <div>
    <PageHeader :title="$t('settings.title')" :subtitle="$t('settings.subtitle')" />

    <v-form @submit.prevent="save">
      <v-row>
        <!-- Company Profile -->
        <v-col cols="12" md="6">
          <v-card elevation="0" border rounded="lg" class="h-100">
            <v-card-title class="text-subtitle-1 font-weight-bold pt-4 px-6 bg-grey-lighten-4 border-b">{{ $t('settings.companyProfile') }}</v-card-title>
            <v-card-text class="pt-6 px-6">
              <v-text-field
                v-model="settings.companyName"
                :label="$t('settings.companyName')"
                variant="outlined"
                density="comfortable"
                class="mb-4"
              ></v-text-field>
              
              <v-text-field
                v-model="settings.address"
                :label="$t('settings.address')"
                variant="outlined"
                density="comfortable"
                class="mb-4"
              ></v-text-field>
              
              <v-text-field
                v-model="settings.phone"
                :label="$t('settings.phone')"
                variant="outlined"
                density="comfortable"
              ></v-text-field>

              <v-divider class="my-6"></v-divider>
              <div class="text-subtitle-2 font-weight-bold text-grey-darken-1 mb-3 text-uppercase">{{ $t('settings.logo') }}</div>
              <div class="d-flex align-center gap-4">
                <v-avatar size="80" rounded="lg" class="bg-grey-lighten-3 border">
                  <v-img v-if="settings.logo" :src="`app-image://logo/${settings.logo}`" cover>
                    <template #error>
                      <v-icon color="grey">mdi-image-broken</v-icon>
                    </template>
                  </v-img>
                  <v-icon v-else color="grey-lighten-1" size="32">mdi-domain</v-icon>
                </v-avatar>
                <div>
                  <v-btn
                    variant="outlined"
                    color="primary"
                    size="small"
                    prepend-icon="mdi-image-edit"
                    :loading="pickingLogo"
                    @click="pickLogo"
                  >
                    Select Logo
                  </v-btn>
                  <div class="text-caption text-grey mt-1">{{ $t('settings.logoDesc') }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Legal & Financial -->
        <v-col cols="12" md="6">
          <v-card elevation="0" border rounded="lg" class="h-100">
            <v-card-title class="text-subtitle-1 font-weight-bold pt-4 px-6 bg-grey-lighten-4 border-b">{{ $t('settings.legal') }}</v-card-title>
            <v-card-text class="pt-6 px-6">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="settings.taxIdentifier" label="Tax Identifier" variant="outlined" density="comfortable" class="mb-2"></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="settings.rc" :label="$t('settings.rc')" variant="outlined" density="comfortable" class="mb-2"></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="settings.nif" :label="$t('settings.nif')" variant="outlined" density="comfortable" class="mb-2"></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="settings.art" :label="$t('settings.art')" variant="outlined" density="comfortable" class="mb-2"></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="settings.nis" :label="$t('settings.nis')" variant="outlined" density="comfortable" class="mb-2"></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="settings.rib" :label="$t('settings.rib')" variant="outlined" density="comfortable" class="mb-2"></v-text-field>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-6">
        <v-col class="d-flex justify-end">
          <v-btn type="submit" color="primary" variant="flat" size="large" prepend-icon="mdi-content-save">{{ $t('settings.save') }}</v-btn>
        </v-col>
      </v-row>
    </v-form>

    <v-row class="mt-8">
      <v-col cols="12">
        <v-card elevation="0" border rounded="lg">
          <v-card-title class="text-subtitle-1 font-weight-bold pt-4 px-6 bg-grey-lighten-4 border-b d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-database</v-icon>{{ $t('settings.dataManagement') }}</v-card-title>
          <v-card-text class="pt-6 px-6 pb-6">
            <p class="text-body-2 text-grey-darken-1 mb-4">
              Backup your entire database including all settings, history, and inventory. 
              Restoring a backup will securely replace current data and restart the application.
            </p>
            <div class="d-flex gap-4">
              <v-btn 
                color="primary" 
                variant="outlined" 
                prepend-icon="mdi-download" 
                :loading="isBackingUp"
                @click="handleBackup"
                class="mr-4"
              >{{ $t('settings.backup') }}</v-btn>
              <v-btn 
                color="error" 
                variant="outlined" 
                prepend-icon="mdi-upload" 
                :loading="isRestoring"
                @click="handleRestore"
              >{{ $t('settings.restore') }}</v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <ConfirmDialog ref="confirmDialogRef" />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const confirmDialogRef = ref(null)
const isBackingUp = ref(false)
const isRestoring = ref(false)
const pickingLogo = ref(false)

const settings = ref({
  companyName: '',
  address: '',
  phone: '',
  taxIdentifier: '',
  rc: '',
  nif: '',
  art: '',
  nis: '',
  rib: '',
  logo: ''
})

const pickLogo = async () => {
  pickingLogo.value = true
  try {
    const res = await window.api.pickLogoImage()
    if (res.success && res.data && !res.data.canceled) {
      settings.value.logo = res.data.filePath
    }
  } catch (e) {
    window.toast.error('Could not open image picker')
  } finally {
    pickingLogo.value = false
  }
}

const handleBackup = async () => {
  isBackingUp.value = true
  try {
    const res = await window.api.backupDatabase()
    if (!res.success) {
      window.toast.error('Backup failed: ' + res.error, {
        category: 'system',
        title: t('notifications.backupError') || 'Backup Failed'
      })
    } else if (!res.canceled) {
      window.toast.success(t('settings.backupSuccess'), {
        persist: true,
        category: 'system',
        title: t('notifications.backupSuccess') || 'Backup Completed',
        message: 'Database backup completed successfully.'
      })
    }
  } finally {
    isBackingUp.value = false
  }
}

const handleRestore = async () => {
  const confirmed = await confirmDialogRef.value.open({
    title: t('settings.restoreConfirmTitle'),
    message: t('settings.restoreConfirmMsg'),
    confirmText: 'Restore',
    destructive: true
  })
  
  if (!confirmed) return

  isRestoring.value = true
  try {
    const res = await window.api.restoreDatabase()
    if (!res.success) {
      window.toast.error('Restore failed: ' + res.error)
    } else if (res.canceled) {
      // User canceled file dialog, just ignore
    }
    // If successful, the app relaunches so we don't need to alert.
  } finally {
    isRestoring.value = false
  }
}

const load = async () => {
  const res = await window.api.getSettings()
  if (res.success && res.data) {
    settings.value = { ...settings.value, ...res.data }
  }
}

const save = async () => {
  const payload = {
    companyName: String(settings.value.companyName || '').trim(),
    address: String(settings.value.address || '').trim(),
    phone: String(settings.value.phone || '').trim(),
    taxIdentifier: String(settings.value.taxIdentifier || '').trim(),
    rc: String(settings.value.rc || '').trim(),
    nif: String(settings.value.nif || '').trim(),
    art: String(settings.value.art || '').trim(),
    nis: String(settings.value.nis || '').trim(),
    rib: String(settings.value.rib || '').trim(),
    logo: settings.value.logo || ''
  }
  const res = await window.api.updateSettings(payload)
  if (res.success) {
    window.toast.success(t('settings.saved'))
  } else {
    window.toast.error('Failed to save settings: ' + res.error)
  }
}

onMounted(load)
</script>
