<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-slate-800">{{ $t('finance.receivables') }}</h1>
      </div>
      <v-text-field
        v-model="search"
        :placeholder="$t('common.search')"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 300px"
      ></v-text-field>
    </div>

    <v-card class="border-sm" elevation="0">
      <v-data-table
        :headers="headers"
        :items="filteredCustomers"
        :search="search"
        :loading="loading"
        hover
      >
        <template v-slot:item.balance="{ item }">
          <span :class="{'text-error': item.balance > 0, 'text-success': item.balance <= 0}">
            {{ formatMoney(item.balance) }}
          </span>
        </template>
        <template v-slot:item.total_charges="{ item }">
          {{ formatMoney(item.total_charges) }}
        </template>
        <template v-slot:item.total_payments="{ item }">
          {{ formatMoney(item.total_payments) }}
        </template>
        <template v-slot:item.total_refunds="{ item }">
          {{ formatMoney(item.total_refunds) }}
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn variant="text" color="primary" @click="openLedger(item)">
            {{ $t('finance.transactionHistory') }}
          </v-btn>
          <v-btn variant="text" color="success" :disabled="item.balance <= 0" @click="openSettle(item)">
            {{ $t('finance.receivePayment') }}
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Ledger Dialog -->
    <v-dialog v-model="ledgerDialog" max-width="900" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center px-6 py-4 border-b">
          <span class="text-h6">{{ selectedCustomer?.raison }} - {{ $t('finance.transactionHistory') }}</span>
          <v-btn icon="mdi-close" variant="text" @click="ledgerDialog = false"></v-btn>
        </v-card-title>
        <v-card-text class="pa-0" style="height: 60vh;">
          <v-table>
            <thead>
              <tr>
                <th class="text-left">{{ $t('finance.date') }}</th>
                <th class="text-left">{{ $t('finance.type') }}</th>
                <th class="text-left">{{ $t('finance.reference') }}</th>
                <th class="text-left">{{ $t('finance.notes') }}</th>
                <th class="text-right">{{ $t('finance.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in ledgerEntries" :key="entry.id">
                <td>{{ new Date(entry.created_at).toLocaleString() }}</td>
                <td>
                  <v-chip size="small" :color="getTypeColor(entry.type)">{{ entry.type }}</v-chip>
                </td>
                <td>{{ entry.reference_type }} {{ entry.reference_id ? '#' + entry.reference_id : '' }}</td>
                <td style="max-width: 250px" class="text-truncate" :title="entry.notes">{{ entry.notes }}</td>
                <td class="text-right font-weight-medium" :class="entry.amount > 0 ? 'text-error' : 'text-success'">
                  {{ entry.amount > 0 ? '+' : '' }}{{ formatMoney(entry.amount) }}
                </td>
              </tr>
              <tr v-if="ledgerEntries.length === 0">
                <td colspan="5" class="text-center text-grey py-4">{{ $t('common.noData') }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Settle Dialog -->
    <v-dialog v-model="settleDialog" max-width="500">
      <v-card>
        <v-card-title class="px-6 py-4 border-b">
          {{ $t('finance.receivePayment') }} - {{ selectedCustomer?.raison }}
        </v-card-title>
        <v-card-text class="pa-6">
          <div class="d-flex justify-space-between mb-4">
            <span class="text-grey-darken-1">{{ $t('finance.outstandingBalance') }}</span>
            <span class="text-h6 text-error">{{ formatMoney(selectedCustomer?.balance) }}</span>
          </div>

          <v-form @submit.prevent="submitSettle" ref="settleForm">
            <v-text-field
              v-model.number="settleAmount"
              :label="$t('finance.amount')"
              type="number"
              min="0"
              :max="selectedCustomer?.balance ? selectedCustomer.balance / 100 : 0"
              step="0.01"
              variant="outlined"
              :rules="amountRules"
              required
            ></v-text-field>

            <v-textarea
              v-model="settleNotes"
              :label="$t('finance.notes')"
              variant="outlined"
              rows="3"
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 py-4 border-t">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="settleDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" @click="submitSettle" :loading="settling">{{ $t('common.confirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const loading = ref(false)
const search = ref('')
const customers = ref([])

const ledgerDialog = ref(false)
const settleDialog = ref(false)
const settling = ref(false)
const selectedCustomer = ref(null)
const ledgerEntries = ref([])

const settleAmount = ref(0)
const settleNotes = ref('')
const settleForm = ref(null)

const headers = computed(() => [
  { title: t('common.name'), key: 'raison' },
  { title: t('finance.totalCharges'), key: 'total_charges', align: 'right' },
  { title: t('finance.totalPayments'), key: 'total_payments', align: 'right' },
  { title: t('finance.totalRefunds'), key: 'total_refunds', align: 'right' },
  { title: t('finance.outstandingBalance'), key: 'balance', align: 'right' },
  { title: t('common.actions'), key: 'actions', align: 'right', sortable: false }
])

const filteredCustomers = computed(() => {
  return customers.value
})

const formatMoney = (val) => {
  return ((val || 0) / 100).toFixed(2)
}

const getTypeColor = (type) => {
  if (type.includes('PAYMENT')) return 'success'
  if (type.includes('CHARGE')) return 'error'
  if (type.includes('REFUND')) return 'warning'
  return 'grey'
}

const loadData = async () => {
  loading.value = true
  try {
    customers.value = await window.api.getCustomers()
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const openLedger = async (customer) => {
  selectedCustomer.value = customer
  ledgerEntries.value = []
  ledgerDialog.value = true
  try {
    ledgerEntries.value = await window.api.getCustomerLedger(customer.id)
  } catch (error) {
    console.error(error)
  }
}

const openSettle = (customer) => {
  selectedCustomer.value = customer
  settleAmount.value = customer.balance ? customer.balance / 100 : 0
  settleNotes.value = ''
  settleDialog.value = true
}

const amountRules = [
  v => !!v || 'Amount is required',
  v => v > 0 || 'Amount must be greater than zero',
  v => v <= (selectedCustomer.value?.balance || 0) / 100 || 'Amount cannot exceed balance'
]

const submitSettle = async () => {
  const { valid } = await settleForm.value.validate()
  if (!valid) return

  settling.value = true
  try {
    const amountInCents = Math.round(settleAmount.value * 100)
    await window.api.settleCustomer(selectedCustomer.value.id, { amount: amountInCents, notes: settleNotes.value })
    settleDialog.value = false
    await loadData()
  } catch (error) {
    console.error(error)
    alert(error.message)
  } finally {
    settling.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
