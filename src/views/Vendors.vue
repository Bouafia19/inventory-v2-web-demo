<template>
  <div>
    <PageHeader :title="$t('vendors.title')" icon="mdi-truck-outline" iconColor="orange">
      <template #actions>
        <v-btn variant="outlined" color="primary" class="mr-2" prepend-icon="mdi-upload" @click="showImportDialog = true">{{ $t('excel.import') }}</v-btn>
        <v-btn variant="outlined" color="primary" class="mr-2" prepend-icon="mdi-download" @click="exportData">{{ $t('excel.export') }}</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openDialog">{{ $t('vendors.new') }}</v-btn>
      </template>
    </PageHeader>

    <v-card elevation="0" border rounded="lg">
      <v-data-table class="primary-table" :headers="headers" :items="items" hover>
        <template v-slot:no-data>
          <EmptyState icon="mdi-truck-outline" color="orange" :title="$t('vendors.empty')" :description="$t('common.noData')" />
        </template>

        <template v-slot:item.balance="{ item }">
          <span :class="parseFloat(item.balance) > 0 ? 'text-error font-weight-medium' : 'text-success font-weight-medium'">
            {{ item.balance }} DA
          </span>
        </template>

        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn v-if="auth.hasPermission('payables:settle')" icon="mdi-cash" size="small" variant="text" color="success" class="mr-1" @click="openSettle(item)" />
            <v-btn v-if="auth.hasPermission('finance:view')" icon="mdi-format-list-bulleted" size="small" variant="text" color="info" class="mr-1" @click="openLedger(item)" />
            <v-btn icon="mdi-pencil-outline" size="small" variant="text" color="primary" class="mr-1" @click="openEditDialog(item)" />
            <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="remove(item.id)" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create / Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="700px" scrollable>
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2 d-flex align-center">
          <v-icon class="mr-2" color="orange">mdi-truck-outline</v-icon>
          {{ editingId ? 'Edit Vendor' : 'Create Vendor' }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text class="px-6 pb-4 pt-4" style="max-height: 70vh; overflow-y: auto;">
          <v-form ref="form" @submit.prevent="submit">
            <v-row>
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="formData.raison"
                  label="Company / Vendor Name *"
                  :rules="[v => !!v || 'Name is required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="formData.type"
                  :items="['Company', 'Individual', 'Other']"
                  label="Type"
                  clearable
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.phone" :label="'Phone'" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.mobile" :label="'Mobile'" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="formData.street" label="Street Address" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model="formData.city" :label="'City'" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model="formData.state" label="State / Wilaya" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model="formData.zip" label="ZIP / Postal Code" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.country" :label="'Country'" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.tax_ids" label="Tax IDs (RC/NIF/NIS)" hint="Comma-separated if multiple" persistent-hint />
              </v-col>
            </v-row>
          </v-form>
          <v-alert v-if="error" type="error" variant="tonal" class="mt-4" density="compact">{{ error }}</v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="bg-grey-lighten-5 px-6 py-3">
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="closeDialog">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="submit">{{ editingId ? 'Save Changes' : 'Create Vendor' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Settle Dialog -->
    <v-dialog v-model="showSettleDialog" max-width="500px">
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2">
          Settle Payable — {{ settleVendorName }}
          <v-btn icon="mdi-close" variant="text" size="small" class="float-right" @click="showSettleDialog = false" />
        </v-card-title>
        <v-card-text class="px-6 pb-6 pt-2">
          <p class="mb-4 text-body-1">Outstanding Balance: <strong class="text-error">{{ (settleBalance / 100).toFixed(2) }} DA</strong></p>
          <v-form ref="settleForm" @submit.prevent="submitSettle">
            <MoneyInput v-model="settleAmount" label="Amount to Pay (DA)" required />
            <v-text-field v-model="settleNotes" :label="$t('common.notes')" class="mt-4" />
          </v-form>
        </v-card-text>
        <v-card-actions class="bg-grey-lighten-4 px-6 py-4 rounded-b-lg">
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="showSettleDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="success" variant="flat" @click="submitSettle">Record Payment</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Ledger Dialog -->
    <v-dialog v-model="showLedgerDialog" max-width="800px" scrollable>
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2">
          Payables Ledger — {{ ledgerVendorName }}
          <v-btn icon="mdi-close" variant="text" size="small" class="float-right" @click="showLedgerDialog = false" />
        </v-card-title>
        <v-card-text class="px-0 py-0" style="max-height: 60vh; overflow-y: auto;">
          <v-data-table :headers="ledgerHeaders" :items="ledgerItems" hover>
            <template v-slot:item.amount="{ item }">
              <span :class="item.amount > 0 ? 'text-error font-weight-medium' : 'text-success font-weight-medium'">
                {{ (item.amount / 100).toFixed(2) }} DA
              </span>
            </template>
            <template v-slot:item.created_at="{ item }">
              {{ new Date(item.created_at).toLocaleString() }}
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <ConfirmDialog ref="confirmDialogRef" />

    <ExcelImportDialog v-model="showImportDialog" type="Vendors" @success="loadItems" />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import MoneyInput from '../components/MoneyInput.vue'
import ExcelImportDialog from '../components/ExcelImportDialog.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const items = ref([])
const headers = [
  { title: 'Name', key: 'raison' },
  { title: 'City', key: 'city' },
  { title: 'Phone', key: 'phone' },
  { title: t('vendors.balance') + ' (DA)', key: 'balance' },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
]

const showDialog = ref(false)
const showImportDialog = ref(false)

const exportData = async () => {
  try {
    const res = await window.api.exportExcel('Vendors')
    if (res.canceled) return
    if (!res.success) throw new Error(res.error || 'Export failed')
    alert(`Export Complete! File saved to: ${res.filePath}`)
  } catch (err) {
    alert(`Export Error: ${err.message}`)
  }
}
const emptyForm = () => ({
  raison: '', type: '', phone: '', mobile: '',
  street: '', city: '', state: '', zip: '', country: '', tax_ids: ''
})
const formData = ref(emptyForm())
const error = ref('')
const form = ref(null)
const editingId = ref(null)

// Settle
const showSettleDialog = ref(false)
const settleTargetId = ref(null)
const settleVendorName = ref('')
const settleBalance = ref(0)
const settleAmount = ref(0)
const settleNotes = ref('')
const settleForm = ref(null)

// Ledger
const showLedgerDialog = ref(false)
const ledgerVendorName = ref('')
const ledgerItems = ref([])
const ledgerHeaders = [
  { title: 'Date', key: 'created_at' },
  { title: 'Type', key: 'type' },
  { title: 'Reference', key: 'reference_type' },
  { title: 'Amount', key: 'amount' },
  { title: 'Notes', key: 'notes' }
]

const confirmDialogRef = ref(null)

const load = async () => {
  const res = await window.api.getVendors()
  if (res.success) {
    items.value = res.data.map(v => ({
      ...v,
      balance: v.balance ? (v.balance / 100).toFixed(2) : '0.00'
    }))
  }
}

const closeDialog = () => {
  showDialog.value = false
  formData.value = emptyForm()
  editingId.value = null
  error.value = ''
}

const openDialog = () => {
  formData.value = emptyForm()
  editingId.value = null
  error.value = ''
  showDialog.value = true
}

const openEditDialog = (item) => {
  editingId.value = item.id
  formData.value = {
    raison: item.raison || '',
    type: item.type || '',
    phone: item.phone || '',
    mobile: item.mobile || '',
    street: item.street || '',
    city: item.city || '',
    state: item.state || '',
    zip: item.zip || '',
    country: item.country || '',
    tax_ids: item.tax_ids || ''
  }
  error.value = ''
  showDialog.value = true
}

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  // FIXED: was incorrectly reading formData.value.name (always undefined).
  // Now correctly reads formData.value.raison to match the form binding.
  const payload = {
    raison: String(formData.value.raison || '').trim(),
    type: String(formData.value.type || '').trim() || undefined,
    phone: String(formData.value.phone || '').trim() || undefined,
    mobile: String(formData.value.mobile || '').trim() || undefined,
    street: String(formData.value.street || '').trim() || undefined,
    city: String(formData.value.city || '').trim() || undefined,
    state: String(formData.value.state || '').trim() || undefined,
    zip: String(formData.value.zip || '').trim() || undefined,
    country: String(formData.value.country || '').trim() || undefined,
    tax_ids: String(formData.value.tax_ids || '').trim() || undefined
  }

  let res
  if (editingId.value) {
    res = await window.api.updateVendor(editingId.value, payload)
  } else {
    res = await window.api.createVendor(payload)
  }

  if (res.success) {
    window.toast.success(editingId.value ? 'Vendor updated' : 'Vendor created')
    closeDialog()
    load()
  } else {
    error.value = res.error
  }
}

const openSettle = async (vendor) => {
  settleTargetId.value = vendor.id
  settleVendorName.value = vendor.raison
  const bRes = await window.api.getVendorBalance(vendor.id)
  settleBalance.value = bRes.success ? bRes.data : 0
  settleAmount.value = 0
  settleNotes.value = ''
  showSettleDialog.value = true
}

const submitSettle = async () => {
  const { valid } = await settleForm.value.validate()
  if (!valid) return
  const payload = {
    amount: parseInt(settleAmount.value, 10),
    notes: String(settleNotes.value || '').trim()
  }
  const res = await window.api.settleVendor(settleTargetId.value, payload)
  if (res.success) {
    window.toast.success('Payment recorded')
    showSettleDialog.value = false
    load()
  } else {
    window.toast.error('Failed to settle: ' + res.error)
  }
}

const openLedger = async (vendor) => {
  ledgerVendorName.value = vendor.raison
  const res = await window.api.getVendorLedger(vendor.id)
  if (res.success) {
    ledgerItems.value = res.data
    showLedgerDialog.value = true
  } else {
    window.toast.error('Failed to load ledger: ' + res.error)
  }
}

const remove = async (id) => {
  const confirmed = await confirmDialogRef.value.open({
    title: t('common.delete'),
    message: t('common.confirm'),
    confirmText: t('common.delete'),
    destructive: true
  })
  if (confirmed) {
    const res = await window.api.deleteVendor(id)
    if (res.success) {
      window.toast.success(t('common.delete'))
      load()
    } else {
      window.toast.error('Failed to delete: ' + res.error)
    }
  }
}

onMounted(load)
</script>
