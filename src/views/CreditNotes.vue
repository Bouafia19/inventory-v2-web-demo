<template>
  <div>
    <PageHeader title="Credit Notes" icon="mdi-file-undo-outline" iconColor="rose">
      <template #actions>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreateDialog">New Credit Note</v-btn>
      </template>
    </PageHeader>
    <v-card elevation="0" border rounded="lg"><v-data-table class="primary-table" :headers="headers" :items="items">
      <template v-slot:no-data>
        <EmptyState icon="mdi-file-undo-outline" color="rose" title="No credit notes found" description="No credit notes issued yet." />
      </template>
      
      <template v-slot:item.total_price="{ item }">
        {{ (item.total_price / 100).toFixed(2) }}
      </template>
      <template v-slot:item.date="{ item }">
        {{ new Date(item.date).toLocaleDateString() }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-eye" size="small" color="info" class="mr-2" @click="viewDetails(item)"></v-btn>
        <v-btn icon="mdi-file-document-outline" size="small" color="secondary" @click="openCreditNotePreview(item)"></v-btn>
      </template>
    </v-data-table>

    <!-- Create Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="1000px">
      <v-card>
        <v-card-title>Create Credit Note</v-card-title>
        <v-card-text>
          <div v-if="step === 1">
            <v-select
              v-model="selectedSaleId"
              :items="finalizedSales"
              item-title="code"
              item-value="id"
              label="Select Finalized Sale"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.customer_name + ' - ' + new Date(item.raw.date).toLocaleDateString()"></v-list-item>
              </template>
            </v-select>
            <v-btn color="primary" @click="loadSaleLines" :disabled="!selectedSaleId">Next</v-btn>
          </div>

          <div v-if="step === 2">
            <h3>Lines for Sale {{ selectedSale?.code }}</h3>
            <v-data-table :headers="lineHeaders" :items="saleLines" disable-pagination hide-default-footer>
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
          <v-btn v-if="step === 2" color="success" @click="submitCreditNote" :disabled="previewTotal <= 0">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="800px">
      <v-card v-if="selectedCreditNote">
        <v-card-title>
          Credit Note {{ selectedCreditNote.code }}
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showDetailDialog = false"></v-btn>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <p><strong>Date:</strong> {{ new Date(selectedCreditNote.date).toLocaleString() }}</p>
              <p><strong>Customer:</strong> {{ selectedCreditNote.customer_name }}</p>
              <p><strong>Source Sale:</strong> {{ selectedCreditNote.sale_code }}</p>
            </v-col>
          </v-row>
          
          <v-data-table :headers="detailHeaders" :items="selectedCreditNote.lines" hide-default-footer class="mt-4">
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
            <p>Total Untaxed: {{ (selectedCreditNote.total_untaxed / 100).toFixed(2) }}</p>
            <p>Total Taxes: {{ (selectedCreditNote.total_taxes / 100).toFixed(2) }}</p>
            <p class="text-h6">Total: {{ (selectedCreditNote.total_price / 100).toFixed(2) }}</p>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-btn
            color="info"
            variant="flat"
            prepend-icon="mdi-file-document-outline"
            @click="openCreditNotePreview(selectedCreditNote)"
          >
            {{ $t('common.preview_pdf') || 'Preview PDF' }}
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showDetailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Credit Note PDF Preview Dialog -->
    <DocumentPreviewDialog
      v-model="showPreviewDialog"
      document-type="creditNote"
      :document-id="previewCreditNoteId"
      :document-code="previewCreditNoteCode"
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
const previewCreditNoteId = ref(null)
const previewCreditNoteCode = ref('')

const openCreditNotePreview = (creditNote) => {
  if (!creditNote || !creditNote.id) return
  previewCreditNoteId.value = creditNote.id
  previewCreditNoteCode.value = creditNote.code || ''
  showPreviewDialog.value = true
}

const printDocument = (creditNote) => {
  openCreditNotePreview(creditNote)
}

const headers = [
  { title: t('common.code'), key: 'code' },
  { title: t('common.date'), key: 'date' },
  { title: t('sales.customer'), key: 'customer_name' },
  { title: 'Source Sale', key: 'sale_code' },
  { title: t('common.total'), key: 'total_price' },
  { title: t('common.actions'), key: 'actions', sortable: false }
]

const showCreateDialog = ref(false)
const step = ref(1)
const finalizedSales = ref([])
const selectedSaleId = ref(null)
const selectedSale = ref(null)
const saleLines = ref([])

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
const selectedCreditNote = ref(null)
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
  const res = await window.api.getCreditNotes()
  if (res.success) {
    items.value = res.data
  }
}

const openCreateDialog = async () => {
  const res = await window.api.getSales({ state: 'invoice' }) // or fetch all
  // We just fetch all sales and filter finalized locally for now
  const allSalesRes = await window.api.getSales({})
  if (allSalesRes.success) {
    finalizedSales.value = allSalesRes.data.filter(s => s.status === 'FINALIZED')
  }
  step.value = 1
  selectedSaleId.value = null
  saleLines.value = []
  previewUntaxed.value = 0
  previewTaxes.value = 0
  previewTotal.value = 0
  showCreateDialog.value = true
}

const loadSaleLines = async () => {
  if (!selectedSaleId.value) return
  
  const saleRes = await window.api.getSale(selectedSaleId.value)
  if (saleRes.success) {
    selectedSale.value = saleRes.data
    
    // To calculate 'returned', we'd technically need to fetch existing credit notes for this sale.
    // For simplicity in UI preview, we will just assume remaining = amount.
    // The backend is authoritative and will reject over-returns.
    // A more advanced UI would fetch all credit notes and sum up the lines.
    
    const cnRes = await window.api.getCreditNotes()
    const allCNs = cnRes.success ? cnRes.data : []
    const myCNs = allCNs.filter(cn => cn.sale_id === selectedSaleId.value)
    
    // We need line details for myCNs to calculate correctly... 
    // Since getCreditNotes doesn't return lines, we will fetch each.
    let returnedMap = {}
    for (let cn of myCNs) {
      const detailRes = await window.api.getCreditNote(cn.id)
      if (detailRes.success) {
        for (let line of detailRes.data.lines) {
          returnedMap[line.sale_line_id] = (returnedMap[line.sale_line_id] || 0) + parseFloat(line.amount)
        }
      }
    }

    saleLines.value = saleRes.data.lines.map(line => {
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
  for (const line of saleLines.value) {
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

const submitCreditNote = async () => {
  const linesToReturn = saleLines.value
    .filter(l => (parseFloat(l.returnQuantity) || 0) > 0)
    .map(l => ({
      saleLineId: l.id,
      amount: parseFloat(l.returnQuantity)
    }))
    
  if (linesToReturn.length === 0) {
    window.toast.error('Please enter at least one return quantity.')
    return
  }

  const payload = {
    saleId: selectedSaleId.value,
    date: new Date().toISOString(),
    lines: linesToReturn
  }

  const res = await window.api.createCreditNote(payload)
  if (res.success) {
    showCreateDialog.value = false
    load()
  } else {
    window.toast.error('Failed to create credit note: ' + res.error)
  }
}

const viewDetails = async (item) => {
  const res = await window.api.getCreditNote(item.id)
  if (res.success) {
    selectedCreditNote.value = res.data
    showDetailDialog.value = true
  }
}

onMounted(load)
</script>
