<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="val => $emit('update:modelValue', val)"
    :max-width="isReceipt ? '600px' : '900px'"
    scrollable
    :class="[isReceipt ? 'receipt-preview-dialog' : 'document-preview-dialog']"
  >
    <v-card class="d-flex flex-column" style="max-height: 92vh;">
      <v-toolbar color="surface" density="comfortable" class="border-b px-2">
        <v-icon :color="isReceipt ? 'primary' : 'info'" class="mr-2">
          {{ isReceipt ? 'mdi-receipt-text-outline' : 'mdi-file-document-outline' }}
        </v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          {{ dialogTitle }} <span v-if="documentCode" class="text-grey text-caption">({{ documentCode }})</span>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          prepend-icon="mdi-download"
          variant="tonal"
          color="primary"
          size="small"
          class="mr-2"
          @click="downloadPdf"
          :disabled="!pdfUrl || downloading"
          :loading="downloading"
        >
          {{ $t('common.download_pdf') || $t('sales.download_pdf') || 'Download PDF' }}
        </v-btn>
        <v-btn
          prepend-icon="mdi-printer"
          variant="tonal"
          color="secondary"
          size="small"
          class="mr-2"
          @click="printPdf"
          :disabled="!pdfUrl || printing"
          :loading="printing"
        >
          {{ $t('common.print_pdf') || $t('sales.print') || 'Print' }}
        </v-btn>
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog"></v-btn>
      </v-toolbar>

      <v-card-text
        class="pa-4 bg-grey-lighten-3 d-flex flex-column align-center overflow-y-auto"
        :style="{ minHeight: isReceipt ? '520px' : '720px' }"
      >
        <!-- Loading State -->
        <div v-if="loading" class="d-flex flex-column align-center justify-center my-auto py-12">
          <v-progress-circular indeterminate color="primary" size="48" class="mb-4"></v-progress-circular>
          <div class="text-subtitle-2 text-grey-darken-1">
            {{ $t('common.generating_preview') || $t('sales.generating_preview') || 'Generating preview...' }}
          </div>
        </div>

        <!-- Error State -->
        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
          class="my-auto w-100"
          closable
          @click:close="error = null"
        >
          <div class="font-weight-bold">
            {{ $t('common.failed_generate_preview') || $t('sales.failed_generate_preview') || 'Failed to generate preview' }}
          </div>
          <div class="text-caption">{{ error }}</div>
        </v-alert>

        <!-- PDF Viewer Frame -->
        <div
          v-else-if="pdfUrl"
          :class="[isReceipt ? 'receipt-preview-wrapper' : 'document-preview-wrapper', 'elevation-3 rounded bg-white w-100']"
          :style="{
            maxWidth: isReceipt ? '380px' : '100%',
            height: isReceipt ? '580px' : '75vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }"
        >
          <iframe
            :src="pdfUrl"
            style="width: 100%; height: 100%; border: none;"
            title="PDF Preview"
          ></iframe>
        </div>
      </v-card-text>

      <v-card-actions class="bg-white border-t px-4 py-2">
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" @click="closeDialog">
          {{ $t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  documentType: { type: String, default: 'invoice' },
  documentId: { type: [Number, String], default: null },
  documentCode: { type: String, default: '' },
  customTitle: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const isReceipt = computed(() => props.documentType === 'receipt')

const loading = ref(false)
const error = ref(null)
const pdfUrl = ref(null)
const cachedBase64 = ref(null)
const downloading = ref(false)
const printing = ref(false)

const dialogTitle = computed(() => {
  if (props.customTitle) return props.customTitle
  if (isReceipt.value) return t('sales.preview_receipt') || 'Preview Receipt'
  const typeMap = {
    invoice: t('sales.invoice') || 'Invoice',
    proforma: t('sales.proformaInvoice') || 'Proforma Invoice',
    saleOrder: t('sales.saleOrder') || 'Sales Order',
    purchaseOrder: t('purchases.title') || 'Purchase Order',
    creditNote: t('nav.creditNotes') || 'Credit Note',
    debitNote: t('nav.debitNotes') || 'Debit Note'
  }
  const typeLabel = typeMap[props.documentType] || props.documentType
  return (t('common.preview_pdf') || 'Preview') + ' ' + typeLabel
})

const getI18nPayload = () => {
  return {
    isRtl: ['ar'].includes(t('common.code') === 'رمز' ? 'ar' : 'en'),
    title: props.customTitle || (t(`sales.${props.documentType}`) || props.documentType).toUpperCase(),
    companyInfo: t('settings.companyName'),
    customerInfo: t('sales.customer'),
    vendorInfo: t('purchases.vendor'),
    date: t('common.date'),
    rc: 'RC', nif: 'NIF', art: 'ART', nis: 'NIS', rib: 'RIB',
    code: t('common.code'), designation: t('products.designation'), qty: t('common.qty'), unitPrice: t('products.price'), tax: t('products.tax'), total: t('common.total'),
    totalUntaxed: t('common.untaxed'), totalTaxes: t('common.totalTaxes'), discount: t('sales.discount'), stamp: t('sales.stamp'), finalTotal: t('common.grandTotal'),
    payment: t('sales.payment'), rest: t('common.rest')
  }
}

const loadPdf = async () => {
  if (!props.documentId) return
  cleanupUrl()
  loading.value = true
  error.value = null
  cachedBase64.value = null

  try {
    let res
    if (isReceipt.value) {
      res = await window.api.getReceiptPdf(props.documentId)
    } else {
      res = await window.api.getDocumentPdf(props.documentType, props.documentId, getI18nPayload())
    }

    if (!res || !res.success || !res.data?.base64) {
      throw new Error(res?.error || 'Failed to generate PDF buffer')
    }

    cachedBase64.value = res.data.base64
    const byteCharacters = atob(res.data.base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    pdfUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    console.error('Error loading PDF preview:', err)
    error.value = err.message || 'Error generating preview'
  } finally {
    loading.value = false
  }
}

const downloadPdf = async () => {
  if (!props.documentId || !cachedBase64.value) return
  try {
    downloading.value = true
    let res
    if (isReceipt.value) {
      res = await window.api.saveReceiptPdf({
        saleId: props.documentId,
        saleCode: props.documentCode,
        base64: cachedBase64.value
      })
    } else {
      res = await window.api.saveDocumentPdf({
        type: props.documentType,
        id: props.documentId,
        code: props.documentCode,
        base64: cachedBase64.value,
        i18n: getI18nPayload()
      })
    }

    if (res && res.success) {
      if (!res.canceled && res.filePath) {
        if (window.toast?.success) {
          window.toast.success(t('common.pdf_saved') || 'PDF saved successfully')
        } else {
          alert(t('common.pdf_saved') || 'PDF saved successfully')
        }
      }
    } else if (res && !res.success) {
      const msg = (t('common.failed_download_pdf') || 'Failed to download PDF') + ': ' + res.error
      if (window.toast?.error) window.toast.error(msg)
      else alert(msg)
    }
  } catch (err) {
    console.error('Error downloading preview PDF:', err)
    const msg = (t('common.failed_download_pdf') || 'Failed to download PDF') + ': ' + err.message
    if (window.toast?.error) window.toast.error(msg)
    else alert(msg)
  } finally {
    downloading.value = false
  }
}

const printPdf = async () => {
  if (!props.documentId) return
  try {
    printing.value = true
    let res
    if (isReceipt.value) {
      res = await window.api.posPrintReceiptDialog({ saleId: props.documentId })
    } else {
      res = await window.api.printDocumentDialog(props.documentType, props.documentId, getI18nPayload())
    }

    if (res && !res.success && res.error) {
      const msg = (t('common.failed_print') || 'Failed to print') + ': ' + res.error
      if (window.toast?.error) window.toast.error(msg)
      else alert(msg)
    }
  } catch (err) {
    console.error('Error printing document PDF:', err)
    const msg = (t('common.failed_print') || 'Failed to print') + ': ' + err.message
    if (window.toast?.error) window.toast.error(msg)
    else alert(msg)
  } finally {
    printing.value = false
  }
}

const cleanupUrl = () => {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = null
  }
}

const closeDialog = () => {
  cleanupUrl()
  emit('update:modelValue', false)
}

watch(() => [props.modelValue, props.documentId], ([newModel, newId]) => {
  if (newModel && newId) {
    loadPdf()
  } else if (!newModel) {
    cleanupUrl()
  }
})

onUnmounted(() => {
  cleanupUrl()
})
</script>
