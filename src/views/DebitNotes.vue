<template>
  <div>
    <PageHeader title="Debit Notes" icon="mdi-file-undo-outline" iconColor="rose">
      <template #actions>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreateDialog">New Debit Note</v-btn>
      </template>
    </PageHeader>
    <v-card elevation="0" border rounded="lg"><v-data-table class="primary-table" :headers="headers" :items="items">
      <template v-slot:no-data>
        <EmptyState icon="mdi-file-undo-outline" color="rose" title="No debit notes found" description="No debit notes issued yet." />
      </template>
      
      <template v-slot:item.total_price="{ item }">
        {{ (item.total_price / 100).toFixed(2) }}
      </template>
      <template v-slot:item.date="{ item }">
        {{ new Date(item.date).toLocaleDateString() }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-eye" size="small" color="info" class="mr-2" @click="viewDetails(item)"></v-btn>
        <v-btn icon="mdi-file-document-outline" size="small" color="secondary" @click="openDebitNotePreview(item)"></v-btn>
      </template>
    </v-data-table>

    <!-- Create Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="1000px">
      <v-card>
        <v-card-title>Create Debit Note</v-card-title>
        <v-card-text>
          <div v-if="step === 1">
            <v-select
              v-model="selectedPurchaseId"
              :items="finalizedPurchases"
              item-title="code"
              item-value="id"
              label="Select Finalized Purchase"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.vendor_name + ' - ' + new Date(item.raw.date).toLocaleDateString()"></v-list-item>
              </template>
            </v-select>
            <v-btn color="primary" @click="loadPurchaseLines" :disabled="!selectedPurchaseId">Next</v-btn>
          </div>

          <div v-if="step === 2">
            <h3>Lines for Purchase {{ selectedPurchase?.code }}</h3>
            <v-data-table :headers="lineHeaders" :items="purchaseLines" disable-pagination hide-default-footer>
              <template v-slot:item.price="{ item }">
                {{ (item.price / 100).toFixed(2) }}
              </template>
              <template v-slot:item.return_quantity="{ item }">
                <v-text-field
                  v-model.number="item.returnQuantity"
                  type="number"
                  min="0"
                  :max="item.remaining"
                  hide-details
                  density="compact"
                  @input="calculatePreviewTotals"
                ></v-text-field>
              </template>
            </v-data-table>
            
            <div class="mt-4 text-right">
              <p>Preview Total Untaxed: {{ (previewUntaxed / 100).toFixed(2) }}</p>
              <p>Preview Taxes: {{ (previewTaxes / 100).toFixed(2) }}</p>
              <p class="text-h6">Preview Total: {{ (previewTotal / 100).toFixed(2) }}</p>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showCreateDialog = false" variant="text">Cancel</v-btn>
          <v-btn v-if="step === 2" color="secondary" @click="step = 1" class="mr-2">Back</v-btn>
          <v-btn v-if="step === 2" color="success" @click="submitDebitNote" :disabled="previewTotal <= 0">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="800px">
      <v-card v-if="selectedDebitNote">
        <v-card-title>
          Debit Note {{ selectedDebitNote.code }}
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showDetailDialog = false"></v-btn>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <p><strong>Date:</strong> {{ new Date(selectedDebitNote.date).toLocaleString() }}</p>
              <p><strong>Vendor:</strong> {{ selectedDebitNote.vendor_name }}</p>
              <p><strong>Source Purchase:</strong> {{ selectedDebitNote.purchase_code }}</p>
            </v-col>
          </v-row>
          
          <v-data-table :headers="detailHeaders" :items="selectedDebitNote.lines" hide-default-footer class="mt-4">
            <template v-slot:item.price="{ item }">
              {{ (item.price / 100).toFixed(2) }}
            </template>
            <template v-slot:item.untaxed_amount="{ item }">
              {{ (item.untaxed_amount / 100).toFixed(2) }}
            </template>
            <template v-slot:item.taxes="{ item }">
              {{ (item.taxes / 100).toFixed(2) }}
            </template>
            <template v-slot:item.subtotal="{ item }">
              {{ (item.subtotal / 100).toFixed(2) }}
            </template>
          </v-data-table>
          
          <div class="mt-4 text-right">
            <p>Total Untaxed: {{ (selectedDebitNote.total_untaxed / 100).toFixed(2) }}</p>
            <p>Total Taxes: {{ (selectedDebitNote.total_taxes / 100).toFixed(2) }}</p>
            <p class="text-h6">Total: {{ (selectedDebitNote.total_price / 100).toFixed(2) }}</p>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-btn
            color="info"
            variant="flat"
            prepend-icon="mdi-file-document-outline"
            @click="openDebitNotePreview(selectedDebitNote)"
          >
            {{ $t('common.preview_pdf') || 'Preview PDF' }}
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showDetailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Debit Note PDF Preview Dialog -->
    <DocumentPreviewDialog
      v-model="showPreviewDialog"
      document-type="debitNote"
      :document-id="previewDebitNoteId"
      :document-code="previewDebitNoteCode"
    />
    </v-card>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import DocumentPreviewDialog from '../components/DocumentPreviewDialog.vue'

const items = ref([])
const showPreviewDialog = ref(false)
const previewDebitNoteId = ref(null)
const previewDebitNoteCode = ref('')

const openDebitNotePreview = (debitNote) => {
  if (!debitNote || !debitNote.id) return
  previewDebitNoteId.value = debitNote.id
  previewDebitNoteCode.value = debitNote.code || ''
  showPreviewDialog.value = true
}
const headers = [
  { title: t('common.code'), key: 'code' },
  { title: t('common.date'), key: 'date' },
  { title: t('purchases.vendor'), key: 'vendor_name' },
  { title: 'Source Purchase', key: 'purchase_code' },
  { title: t('common.total'), key: 'total_price' },
  { title: t('common.actions'), key: 'actions', sortable: false }
]

const showCreateDialog = ref(false)
const step = ref(1)
const finalizedPurchases = ref([])
const selectedPurchaseId = ref(null)
const selectedPurchase = ref(null)
const purchaseLines = ref([])

const previewUntaxed = ref(0)
const previewTaxes = ref(0)
const previewTotal = ref(0)

const lineHeaders = [
  { title: 'Product', key: 'product_name' },
  { title: 'Original Qty', key: 'amount' },
  { title: 'Returned', key: 'returned' },
  { title: 'Remaining', key: 'remaining' },
  { title: 'Unit Price', key: 'price' },
  { title: 'Tax %', key: 'tax_percent' },
  { title: 'Return Qty', key: 'return_quantity', sortable: false }
]

const showDetailDialog = ref(false)
const selectedDebitNote = ref(null)
const detailHeaders = [
  { title: 'Product', key: 'product_name' },
  { title: 'Qty', key: 'amount' },
  { title: 'Price', key: 'price' },
  { title: 'Tax %', key: 'tax_percent' },
  { title: 'Untaxed', key: 'untaxed_amount' },
  { title: 'Taxes', key: 'taxes' },
  { title: 'Subtotal', key: 'subtotal' }
]

const load = async () => {
  const res = await window.api.getDebitNotes()
  if (res.success) {
    items.value = res.data
  }
}

const openCreateDialog = async () => {
  const allPurchasesRes = await window.api.getPurchases({})
  if (allPurchasesRes.success) {
    finalizedPurchases.value = allPurchasesRes.data.filter(s => s.status === 'FINALIZED')
  }
  step.value = 1
  selectedPurchaseId.value = null
  purchaseLines.value = []
  previewUntaxed.value = 0
  previewTaxes.value = 0
  previewTotal.value = 0
  showCreateDialog.value = true
}

const loadPurchaseLines = async () => {
  if (!selectedPurchaseId.value) return
  
  const purchaseRes = await window.api.getPurchase(selectedPurchaseId.value)
  if (purchaseRes.success) {
    selectedPurchase.value = purchaseRes.data
    
    // To calculate 'returned', we'd technically need to fetch existing debit notes for this purchase.
    // For simplicity in UI preview, we will just assume remaining = amount.
    // The backend is authoritative and will reject over-returns.
    // A more advanced UI would fetch all debit notes and sum up the lines.
    
    const cnRes = await window.api.getDebitNotes()
    const allCNs = cnRes.success ? cnRes.data : []
    const myCNs = allCNs.filter(cn => cn.purchase_id === selectedPurchaseId.value)
    
    // We need line details for myCNs to calculate correctly... 
    // Since getDebitNotes doesn't return lines, we will fetch each.
    let returnedMap = {}
    for (let cn of myCNs) {
      const detailRes = await window.api.getDebitNote(cn.id)
      if (detailRes.success) {
        for (let line of detailRes.data.lines) {
          returnedMap[line.purchase_line_id] = (returnedMap[line.purchase_line_id] || 0) + parseFloat(line.amount)
        }
      }
    }

    purchaseLines.value = purchaseRes.data.lines.map(line => {
      const returned = returnedMap[line.id] || 0
      return {
        ...line,
        returned,
        remaining: line.amount - returned,
        returnQuantity: 0
      }
    })
    
    calculatePreviewTotals()
    step.value = 2
  }
}

const calculatePreviewTotals = () => {
  let u = 0, t = 0
  for (const line of purchaseLines.value) {
    const qty = parseFloat(line.returnQuantity) || 0
    if (qty > 0) {
      const lineUntaxed = Math.round(line.price * qty)
      const lineTaxes = Math.round(lineUntaxed * line.tax_percent / 100)
      u += lineUntaxed
      t += lineTaxes
    }
  }
  previewUntaxed.value = u
  previewTaxes.value = t
  previewTotal.value = u + t
}

const submitDebitNote = async () => {
  const linesToReturn = purchaseLines.value
    .filter(l => (parseFloat(l.returnQuantity) || 0) > 0)
    .map(l => ({
      purchaseLineId: l.id,
      amount: parseFloat(l.returnQuantity)
    }))
    
  if (linesToReturn.length === 0) {
    window.toast.error('Please enter at least one return quantity.')
    return
  }

  const payload = {
    purchaseId: selectedPurchaseId.value,
    date: new Date().toISOString(),
    lines: linesToReturn
  }

  const res = await window.api.createDebitNote(payload)
  if (res.success) {
    showCreateDialog.value = false
    load()
  } else {
    window.toast.error('Failed to create credit note: ' + res.error)
  }
}

const viewDetails = async (item) => {
  const res = await window.api.getDebitNote(item.id)
  if (res.success) {
    selectedDebitNote.value = res.data
    showDetailDialog.value = true
  }
}

onMounted(load)
</script>
