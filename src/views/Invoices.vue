<template>
  <v-container fluid class="pa-4 h-100">
    <v-row class="mb-2">
      <v-col>
        <div class="text-h4 font-weight-bold">{{ $t('nav.invoices') }}</div>
      </v-col>
    </v-row>

    <v-card elevation="2">
      <v-card-title class="d-flex flex-wrap align-center gap-4 pa-4 bg-grey-lighten-4">
        <v-text-field
          v-model="filters.search"
          :label="$t('common.search')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-4"
          style="max-width: 300px;"
          @keyup.enter="load"
        ></v-text-field>
        <v-text-field
          v-model="filters.startDate"
          :label="'Start Date'"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-4"
          style="max-width: 200px;"
          @change="load"
        ></v-text-field>
        <v-text-field
          v-model="filters.endDate"
          :label="'End Date'"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-4"
          style="max-width: 200px;"
          @change="load"
        ></v-text-field>
        <v-btn color="primary" @click="load" prepend-icon="mdi-refresh">Refresh</v-btn>
      </v-card-title>

      <v-data-table class="primary-table" :headers="headers"
        :items="invoices"
        :loading="loading"
        hover
        
      >
      <template v-slot:no-data>
        <EmptyState icon="mdi-file-document-outline" color="indigo" title="No invoices found" description="No invoices generated yet." />
      </template>
      
        <template v-slot:item.date="{ item }">
          {{ formatDate(item.date) }}
        </template>
        <template v-slot:item.total_price="{ item }">
          <span class="font-weight-bold">{{ formatMoney(item.total_price) }}</span> DA
        </template>
        <template v-slot:item.payment="{ item }">
          <span class="text-success">{{ formatMoney(item.payment) }}</span> DA
        </template>
        <template v-slot:item.rest="{ item }">
          <span class="text-error">{{ formatMoney(item.rest) }}</span> DA
        </template>
        <template v-slot:item.status="{ item }">
          <v-chip
            :color="item.status === 'FINALIZED' ? 'success' : 'error'"
            size="small"
            class="text-uppercase"
          >
            {{ item.status }}
          </v-chip>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn icon="mdi-eye" variant="text" size="small" color="info" @click="viewInvoice(item)"></v-btn>
          <v-btn icon="mdi-file-pdf-box" variant="text" size="small" color="red" @click="openInvoicePreview(item)"></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Invoice Details Dialog -->
    <v-dialog v-model="showViewDialog" max-width="900px" scrollable>
      <v-card v-if="viewingInvoice" class="bg-grey-lighten-5">
        <v-toolbar color="primary" dark density="compact">
          <v-toolbar-title>Invoice Details: {{ viewingInvoice.code }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="showViewDialog = false"></v-btn>
        </v-toolbar>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4 h-100 bg-white">
                <div class="text-h6 mb-2">Invoice Info</div>
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-grey-darken-1">Date:</span>
                  <span class="font-weight-medium">{{ formatDate(viewingInvoice.date) }}</span>
                </div>
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-grey-darken-1">Status:</span>
                  <v-chip :color="viewingInvoice.status === 'FINALIZED' ? 'success' : 'error'" size="x-small" class="text-uppercase">{{ viewingInvoice.status }}</v-chip>
                </div>
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-grey-darken-1">Payment Method:</span>
                  <span class="text-capitalize">{{ viewingInvoice.payment_method }}</span>
                </div>
                <div class="d-flex justify-space-between mb-1" v-if="viewingInvoice.bank">
                  <span class="text-grey-darken-1">Bank:</span>
                  <span>{{ viewingInvoice.bank }}</span>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4 h-100 bg-white">
                <div class="text-h6 mb-2">Customer Info</div>
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-grey-darken-1">Name:</span>
                  <span class="font-weight-medium">{{ viewingInvoice.customer_name }}</span>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Lines Table -->
          <v-card variant="outlined" class="mt-4 bg-white">
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th class="text-left">Product</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Tax %</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in viewingInvoice.lines" :key="line.id">
                  <td>
                    <div class="font-weight-medium">{{ line.product_code || 'Unknown' }}</div>
                    <div class="text-caption text-grey">{{ line.product_name || 'No Name' }}</div>
                  </td>
                  <td class="text-right">{{ line.amount }}</td>
                  <td class="text-right">{{ formatMoney(line.price) }} DA</td>
                  <td class="text-right">{{ line.tax_percent }}%</td>
                  <td class="text-right font-weight-medium">{{ formatMoney(line.subtotal) }} DA</td>
                </tr>
              </tbody>
            </v-table>
          </v-card>

          <!-- Totals Section -->
          <v-row class="mt-4">
            <v-spacer></v-spacer>
            <v-col cols="12" md="5">
              <v-card variant="outlined" class="pa-4 bg-white">
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-grey-darken-1">Total Untaxed:</span>
                  <span>{{ formatMoney(viewingInvoice.total_untaxed) }} DA</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-grey-darken-1">Total Taxes:</span>
                  <span>{{ formatMoney(viewingInvoice.total_taxes) }} DA</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-grey-darken-1">Discount:</span>
                  <span class="text-error">- {{ formatMoney(viewingInvoice.discount) }} DA</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-grey-darken-1">Stamp:</span>
                  <span>+ {{ formatMoney(viewingInvoice.stamp) }} DA</span>
                </div>
                <v-divider class="my-2"></v-divider>
                <div class="d-flex justify-space-between mb-2 text-h6">
                  <span>Final Total:</span>
                  <span>{{ formatMoney(viewingInvoice.total_price) }} DA</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-grey-darken-1">Payment:</span>
                  <span class="text-success">{{ formatMoney(viewingInvoice.payment) }} DA</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Rest:</span>
                  <span class="text-error">{{ formatMoney(viewingInvoice.rest) }} DA</span>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="pa-4 bg-white">
          <v-btn 
            v-if="viewingInvoice.status === 'FINALIZED'" 
            color="error" 
            variant="outlined" 
            @click="showCancelConfirm = true"
          >
            Cancel Invoice
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            prepend-icon="mdi-file-document-outline"
            @click="openInvoicePreview(viewingInvoice)"
          >
            {{ $t('common.preview_pdf') || 'Preview PDF' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cancel Confirmation -->
    <v-dialog v-model="showCancelConfirm" max-width="500px">
      <v-card>
        <v-toolbar color="error" dark density="compact">
          <v-toolbar-title>Cancel Invoice</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pt-4 text-body-1">
          Are you sure you want to cancel this invoice? This will reverse all stock movements and remove the receivable amount from the customer ledger. This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCancelConfirm = false">Close</v-btn>
          <v-btn color="error" @click="confirmCancelInvoice" :loading="cancelling">Yes, Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Document PDF Preview Dialog -->
    <DocumentPreviewDialog
      v-model="showPreviewDialog"
      document-type="invoice"
      :document-id="previewInvoiceId"
      :document-code="previewInvoiceCode"
    />
  </v-container>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusChip from '../components/StatusChip.vue'
import DocumentPreviewDialog from '../components/DocumentPreviewDialog.vue'

const loading = ref(false)
const invoices = ref([])

const filters = ref({
  search: '',
  startDate: '',
  endDate: '',
  state: 'invoice'
})

const headers = [
  { title: t('common.code'), key: 'code', sortable: true },
  { title: t('common.date'), key: 'date', sortable: true },
  { title: t('sales.customer'), key: 'customer_name', sortable: true },
  { title: t('common.total'), key: 'total_price', sortable: true, align: 'end' },
  { title: t('sales.payment'), key: 'payment', sortable: true, align: 'end' },
  { title: t('common.rest'), key: 'rest', sortable: true, align: 'end' },
  { title: 'Status', key: 'status', sortable: true },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
]

const showViewDialog = ref(false)
const viewingInvoice = ref(null)

const showCancelConfirm = ref(false)
const cancelling = ref(false)
const generatingPdf = ref(false)

const formatMoney = (cents) => {
  return (cents / 100).toFixed(2)
}

const formatDate = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

const load = async () => {
  loading.value = true
  const res = await window.api.getSales(filters.value)
  if (res.success) {
    invoices.value = res.data
  }
  loading.value = false
}

const viewInvoice = async (item) => {
  const res = await window.api.getSale(item.id)
  if (res.success) {
    viewingInvoice.value = res.data
    showViewDialog.value = true
  } else {
    window.toast.error('Failed to load invoice details: ' + res.error)
  }
}

const showPreviewDialog = ref(false)
const previewInvoiceId = ref(null)
const previewInvoiceCode = ref('')

const openInvoicePreview = (invoice) => {
  if (!invoice || !invoice.id) return
  previewInvoiceId.value = invoice.id
  previewInvoiceCode.value = invoice.code || ''
  showPreviewDialog.value = true
}

const generatePdf = (id) => {
  const inv = invoices.value.find(i => i.id === id) || (viewingInvoice.value?.id === id ? viewingInvoice.value : { id })
  openInvoicePreview(inv)
}

const confirmCancelInvoice = async () => {
  if (!viewingInvoice.value) return
  cancelling.value = true
  try {
    const res = await window.api.cancelSale(viewingInvoice.value.id)
    if (res.success) {
      showCancelConfirm.value = false
      showViewDialog.value = false
      await load()
    } else {
      window.toast.error('Failed to cancel invoice: ' + res.error)
    }
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  load()
})
</script>
