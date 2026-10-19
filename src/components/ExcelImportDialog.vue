<template>
  <v-dialog v-model="internalValue" max-width="900" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-h6 font-weight-bold pt-4 px-6 d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-file-excel</v-icon>
        {{ $t('excel.importTitle', { type: $t(`entities.${type}`) }) }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" :disabled="loading" />
      </v-card-title>

      <v-card-text class="px-6 py-4">
        <!-- Step 1: Settings -->
        <div v-if="!previewData">
          <div class="mb-4 text-body-1">
            {{ $t('excel.importInstructions') }}
          </div>
          <div class="d-flex align-center mb-6">
            <v-btn variant="outlined" color="primary" prepend-icon="mdi-download" @click="downloadTemplate" class="mr-4">
              {{ $t('excel.downloadTemplate') }}
            </v-btn>
          </div>

          <v-radio-group v-model="mode" :label="$t('excel.importMode')">
            <v-radio :label="$t('excel.modeCreateOnly')" value="create_only"></v-radio>
            <v-radio :label="$t('excel.modeCreateUpdate')" value="create_update"></v-radio>
          </v-radio-group>
        </div>

        <!-- Step 2: Loading -->
        <div v-if="loading" class="d-flex flex-column align-center justify-center py-8">
          <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
          <div class="text-body-1">{{ $t('excel.processing') }}</div>
        </div>

        <!-- Step 3: Preview -->
        <div v-if="previewData && !loading">
          <v-row class="mb-4">
            <v-col cols="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-caption text-grey-darken-1">{{ $t('excel.totalRows') }}</div>
                <div class="text-h6 font-weight-bold">{{ previewData.totalRows }}</div>
              </v-card>
            </v-col>
            <v-col cols="3">
              <v-card variant="outlined" color="success" class="pa-3 text-center">
                <div class="text-caption">{{ $t('excel.newRecords') }}</div>
                <div class="text-h6 font-weight-bold">{{ previewData.newRecords }}</div>
              </v-card>
            </v-col>
            <v-col cols="3">
              <v-card variant="outlined" color="info" class="pa-3 text-center">
                <div class="text-caption">{{ $t('excel.updateRecords') }}</div>
                <div class="text-h6 font-weight-bold">{{ previewData.updateRecords }}</div>
              </v-card>
            </v-col>
            <v-col cols="3">
              <v-card variant="outlined" color="error" class="pa-3 text-center">
                <div class="text-caption">{{ $t('excel.invalidRows') }}</div>
                <div class="text-h6 font-weight-bold">{{ previewData.invalidRows }}</div>
              </v-card>
            </v-col>
          </v-row>

          <v-alert v-if="previewData.invalidRows > 0 && previewData.validRows === 0" type="error" variant="tonal" class="mb-4">
            {{ $t('excel.noValidRows') }}
          </v-alert>

          <v-table density="compact" class="border rounded" fixed-header height="300">
            <thead>
              <tr>
                <th style="width: 80px">{{ $t('excel.row') }}</th>
                <th style="width: 120px">{{ $t('excel.status') }}</th>
                <th>{{ $t('excel.details') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in previewData.preview" :key="item.rowNum" :class="{'bg-red-lighten-5': item.status === 'invalid', 'bg-grey-lighten-4': item.status === 'duplicate'}">
                <td>{{ item.rowNum }}</td>
                <td>
                  <v-chip size="small" :color="getStatusColor(item.status)">{{ $t(`excel.status_${item.status}`) }}</v-chip>
                </td>
                <td class="py-2">
                  <div v-if="item.status === 'invalid'" class="text-error text-caption">
                    <ul class="pl-4">
                      <li v-for="(err, i) in item.errors" :key="i">{{ err }}</li>
                    </ul>
                  </div>
                  <div v-else class="text-caption text-truncate" style="max-width: 400px;">
                    {{ JSON.stringify(item.data) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>

      <v-divider />
      
      <v-card-actions class="bg-grey-lighten-4 px-6 py-3">
        <v-btn variant="text" @click="close" :disabled="loading">{{ $t('common.cancel') }}</v-btn>
        <v-spacer />
        <v-btn v-if="!previewData" color="primary" prepend-icon="mdi-upload" @click="selectAndPreview" :loading="loading">
          {{ $t('excel.selectFile') }}
        </v-btn>
        <v-btn v-if="previewData" color="primary" prepend-icon="mdi-check" @click="confirmImport" :loading="loading" :disabled="previewData.validRows === 0">
          {{ $t('excel.confirmImport') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  type: {
    type: String,
    required: true // 'Products', 'Customers', 'Vendors', 'Warehouses'
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const internalValue = ref(props.modelValue)
const mode = ref('create_only')
const loading = ref(false)
const previewData = ref(null)

watch(() => props.modelValue, (val) => {
  internalValue.value = val
  if (val) {
    mode.value = 'create_only'
    previewData.value = null
  }
})

watch(internalValue, (val) => {
  emit('update:modelValue', val)
})

const close = () => {
  internalValue.value = false
}

const getStatusColor = (status) => {
  switch (status) {
    case 'new': return 'success'
    case 'update': return 'info'
    case 'invalid': return 'error'
    case 'duplicate': return 'grey'
    default: return 'grey'
  }
}

const downloadTemplate = async () => {
  loading.value = true
  try {
    const res = await window.api.downloadExcelTemplate(props.type)
    if (res.success) {
      alert(`Template downloaded successfully to: ${res.filePath}`)
    }
  } catch (err) {
    alert(`Error: ${err.message}`)
  } finally {
    loading.value = false
  }
}

const selectAndPreview = async () => {
  loading.value = true
  try {
    const res = await window.api.previewExcelImport(props.type, mode.value)
    if (res.canceled) return
    if (!res.success) throw new Error(res.error || 'Preview failed')
    previewData.value = res.data
  } catch (err) {
    alert(`Import Error: ${err.message}`)
  } finally {
    loading.value = false
  }
}

const confirmImport = async () => {
  if (!previewData.value || previewData.value.validRows === 0) return
  
  loading.value = true
  try {
    const res = await window.api.confirmExcelImport(previewData.value)
    if (!res.success) throw new Error(res.error || 'Import failed')
    
    alert(`Import Complete. Created: ${res.data.created}, Updated: ${res.data.updated}`)
    emit('success')
    close()
  } catch (err) {
    alert(`Import Error: ${err.message}`)
  } finally {
    loading.value = false
  }
}
</script>
