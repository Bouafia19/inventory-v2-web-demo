<template>
  <div>
    <PageHeader :title="$t('customers.title')" icon="mdi-account-group-outline" iconColor="info">
      <template #actions>
        <v-btn variant="outlined" color="primary" class="mr-2" prepend-icon="mdi-upload" @click="showImportDialog = true">{{ $t('excel.import') }}</v-btn>
        <v-btn variant="outlined" color="primary" class="mr-2" prepend-icon="mdi-download" @click="exportData">{{ $t('excel.export') }}</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openDialog">{{ $t('customers.new') }}</v-btn>
      </template>
    </PageHeader>
    
    <v-card elevation="0" border rounded="lg"><v-data-table class="primary-table" :headers="headers" :items="items">
      <template v-slot:no-data>
        <EmptyState icon="mdi-account-group-outline" color="info" :title="$t('customers.empty')" :description="$t('common.noData')" />
      </template>
      
      <template v-slot:item.actions="{ item }">
        <v-btn v-if="auth.hasPermission('receivables:settle')" icon="mdi-cash" size="small" color="success" class="mr-2" @click="openSettle(item)"></v-btn>
        <v-btn icon="mdi-pencil" size="small" color="primary" class="mr-2" @click="openEditDialog(item)"></v-btn>
        <v-btn icon="mdi-delete" size="small" color="error" @click="remove(item.id)"></v-btn>
      </template>
    </v-data-table>

    <!-- Create Customer Dialog -->
    <v-dialog v-model="showDialog" max-width="600px">
      <v-card>
        <v-card-title>{{ $t('customers.new') }}</v-card-title>
        <v-card-text>
          <v-form ref="form" @submit.prevent="submit">
            <v-text-field
              v-model="formData.raison"
              :label="$t('customers.name')"
              :rules="[v => !!v || 'Name is required']"
              required
            ></v-text-field>
            <v-text-field v-model="formData.city" :label="'City'"></v-text-field>
            <v-text-field v-model="formData.street" :label="'Street'"></v-text-field>
            <v-text-field v-model="formData.state" :label="'State'"></v-text-field>
            <v-text-field v-model="formData.zip" :label="'Zip'"></v-text-field>
            <v-text-field v-model="formData.country" :label="'Country'"></v-text-field>
            <v-text-field v-model="formData.phone" :label="'Phone'"></v-text-field>
            <v-text-field v-model="formData.mobile" :label="'Mobile'"></v-text-field>
            <v-text-field v-model="formData.tax_ids" :label="'Tax IDs'"></v-text-field>
          </v-form>
          <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="closeDialog" variant="text">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" @click="submit">{{ editingId ? 'Save' : 'Create' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    

    <!-- Settle Dialog -->
    <v-dialog v-model="showSettleDialog" max-width="500px">
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2">
          Settle Receivable for {{ settleCustomerName }}
          <v-btn icon="mdi-close" variant="text" size="small" class="float-right" @click="showSettleDialog = false"></v-btn>
        </v-card-title>
        <v-card-text class="px-6 pb-6 pt-2">
          <p class="mb-4 text-body-1">Current Balance: <strong>{{ (settleBalance / 100).toFixed(2) }}</strong></p>
          <v-form ref="settleForm" @submit.prevent="submitSettle">
            <MoneyInput v-model="settleAmount" label="Amount" required />
            <v-text-field v-model="settleNotes" :label="$t('common.notes')" variant="outlined" density="comfortable" class="mt-4"></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions class="bg-grey-lighten-4 px-6 py-4 rounded-b-lg">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="secondary" @click="showSettleDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="submitSettle">Settle</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-card>
    <ConfirmDialog ref="confirmDialogRef" />

    <ExcelImportDialog v-model="showImportDialog" type="Customers" @success="loadItems" />
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
  { title: 'ID', key: 'id' },
  { title: 'Raison (Name)', key: 'raison' },
  { title: 'City', key: 'city' },
  { title: 'Phone', key: 'phone' },
  { title: 'Balance', key: 'balance' },
  { title: t('common.actions'), key: 'actions', sortable: false }
]

const showDialog = ref(false)
const showImportDialog = ref(false)

const exportData = async () => {
  try {
    const res = await window.api.exportExcel('Customers')
    if (res.canceled) return
    if (!res.success) throw new Error(res.error || 'Export failed')
    alert(`Export Complete! File saved to: ${res.filePath}`)
  } catch (err) {
    alert(`Export Error: ${err.message}`)
  }
}
const formData = ref({ raison: '', city: '', street: '', state: '', zip: '', country: '', phone: '', mobile: '', tax_ids: '' })
const error = ref('')
const form = ref(null)
const editingId = ref(null)

const showDeleteDialog = ref(false)
const deleteTargetId = ref(null)

const showSettleDialog = ref(false)
const settleTargetId = ref(null)
const settleCustomerName = ref('')
const settleBalance = ref(0)
const settleAmount = ref(0)
const settleNotes = ref('')
const settleForm = ref(null)

const load = async () => {
  const res = await window.api.getCustomers()
  if (res.success) {
    const cList = res.data
    cList.forEach(c => c.balance = c.balance ? (c.balance / 100).toFixed(2) : 0)
    items.value = cList
  }
}

const closeDialog = () => {
  showDialog.value = false
  formData.value = { raison: '', city: '', street: '', state: '', zip: '', country: '', phone: '', mobile: '', tax_ids: '' }
  error.value = ''
}

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  const payload = {
    raison: String(formData.value.raison || '').trim(),
    city: String(formData.value.city || '').trim(),
    street: String(formData.value.street || '').trim(),
    state: String(formData.value.state || '').trim(),
    zip: String(formData.value.zip || '').trim(),
    country: String(formData.value.country || '').trim(),
    phone: String(formData.value.phone || '').trim(),
    mobile: String(formData.value.mobile || '').trim(),
    tax_ids: String(formData.value.tax_ids || '').trim()
  }

  let res; if (editingId.value) { res = await window.api.updateCustomer(editingId.value, payload) } else { res = await window.api.createCustomer(payload) }
  if (res.success) {
    closeDialog()
    load()
  } else {
    error.value = res.error
  }
}

const remove = async (id) => {
  const confirmed = await confirmDialogRef.value.open({
    title: t('common.delete'),
    message: t('common.confirm'),
    confirmText: t('common.delete'),
    destructive: true
  })
  if (!confirmed) return
  const res = await window.api.deleteCustomer(id)
  if (res.success) {
    window.toast.success(t('common.delete'))
    load()
  } else {
    window.toast.error('Failed to delete: ' + res.error)
  }
}

const openSettle = async (customer) => {
  settleTargetId.value = customer.id
  settleCustomerName.value = customer.raison
  const bRes = await window.api.getCustomerBalance(customer.id)
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

  const res = await window.api.settleCustomer(settleTargetId.value, payload)
  if (res.success) {
    showSettleDialog.value = false
    load()
  } else {
    window.toast.error('Failed to settle: ' + res.error)
  }
}

onMounted(load)
</script>
