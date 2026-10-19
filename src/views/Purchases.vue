<template>
  <div>
    <PageHeader :title="$t('purchases.title')" icon="mdi-shopping-outline" iconColor="orange">
      <template #actions>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openNew">{{ $t('purchases.new') }}</v-btn>
      </template>
    </PageHeader>

    <v-card elevation="0" border rounded="lg">
      <v-data-table class="primary-table" :headers="headers" :items="items" hover>
        <template v-slot:no-data>
          <EmptyState icon="mdi-shopping-outline" color="orange" :title="$t('purchases.empty')" :description="$t('purchases.recordPurchase')" />
        </template>

        <template v-slot:item.total_price="{ item }">
          <span class="font-weight-medium">{{ (item.total_price / 100).toFixed(2) }} DA</span>
        </template>
        <template v-slot:item.rest="{ item }">
          <span :class="item.rest > 0 ? 'text-error' : 'text-success'">{{ (item.rest / 100).toFixed(2) }} DA</span>
        </template>
        <template v-slot:item.status="{ item }">
          <v-chip :color="item.status === 'CANCELLED' ? 'error' : item.status === 'PAID' ? 'success' : 'warning'" variant="tonal" size="small">
            {{ item.status }}
          </v-chip>
        </template>
        <template v-slot:item.date="{ item }">
          {{ item.date ? new Date(item.date).toLocaleDateString() : '' }}
        </template>
        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn icon="mdi-file-document-outline" size="small" variant="text" color="info" class="mr-1" @click="openPurchasePreview(item)" />
            <v-btn v-if="auth.hasPermission('purchases:update') && item.status !== 'CANCELLED'" icon="mdi-pencil-outline" size="small" variant="text" color="primary" class="mr-1" @click="editPurchase(item)" />
            <v-btn v-if="auth.hasPermission('purchases:delete') && item.status !== 'CANCELLED'" icon="mdi-cancel" size="small" variant="text" color="error" @click="cancelPurchase(item.id)" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create/Edit Purchase Dialog -->
    <v-dialog v-model="showCreateDialog" fullscreen hide-overlay transition="dialog-bottom-transition">
      <v-card class="d-flex flex-column bg-background" elevation="0" rounded="0">
        <v-toolbar border="b" class="bg-white" elevation="0">
          <v-btn icon="mdi-close" variant="text" @click="showCreateDialog = false" />
          <v-toolbar-title class="font-weight-bold">
            {{ editId ? $t('purchases.edit') + ' — ' + form.code : $t('purchases.new') }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="savePurchase" prepend-icon="mdi-content-save" class="mr-4" :loading="saving">{{ $t('purchases.finalize') }}</v-btn>
        </v-toolbar>

        <v-card-text class="flex-grow-1 pa-6 overflow-y-auto">
          <v-card elevation="0" border class="pa-6 mx-auto bg-white" style="max-width: 1100px;">
            <v-form ref="purchaseFormRef" @submit.prevent="savePurchase">

              <!-- Header -->
              <div class="section-heading mb-3">{{ $t('purchases.header') }}</div>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.code" :label="$t('common.code') + ' *'" :rules="[v => !!v || 'Code required']" required />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.date" :label="$t('common.date')" type="date" />
                </v-col>
                
                <v-col cols="12">
                  <v-autocomplete
                    v-model="form.vendorId"
                    :items="vendors"
                    item-title="raison"
                    item-value="id"
                    :label="$t('purchases.vendor') + ' *'"
                    :rules="[v => !!v || 'Vendor required']"
                    required
                  />
                </v-col>
              </v-row>

              
              <!-- Scanner Input -->
              <div class="mb-4 pa-4 bg-grey-lighten-4 rounded-lg border d-flex align-center gap-4">
                <IconBox icon="mdi-barcode-scan" color="orange" />
                <v-text-field
                  v-model="scannerInput"
                  label="Scan Barcode / Product Code"
                  variant="outlined"
                  density="compact"
                  hide-details
                  bg-color="white"
                  @keyup.enter="handleScan"
                  placeholder="Scan item here..."
                  autofocus
                ></v-text-field>
              </div>

              <v-divider class="my-5" />
              <!-- Line Items -->
              <div class="section-heading mb-3">{{ $t('purchases.lines') }}</div>
              <v-table density="compact" class="mb-4">
                <thead>
                  <tr>
                    <th style="width:25%">{{ $t('inventory.product') }}</th>
                    <th style="width:15%">{{ $t('purchases.warehouse') }}</th>
                    <th style="width:12%">{{ $t('common.qty') }}</th>
                    <th style="width:18%">{{ $t('common.unitCost') }} (DA)</th>
                    <th style="width:10%">{{ $t('common.taxPercent') }}</th>
                    <th style="width:15%" class="text-right">{{ $t('common.subtotal') }}</th>
                    <th style="width:5%"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(line, i) in form.lines" :key="i">
                    <td class="py-2">
                      <div class="text-body-2 font-weight-medium px-2">{{ getProductNameDetailed(line.productId) }}</div>
                    </td>
                    <td class="py-2">
                      <div class="text-caption text-medium-emphasis px-2">{{ getWarehouseName(line.warehouseId) }}</div>
                    </td>
                    <td class="py-2">
                      <v-text-field
                        v-model.number="line.amount"
                        type="number"
                        min="0.001"
                        step="0.001"
                        density="compact"
                        hide-details
                        variant="outlined"
                      />
                    </td>
                    <td class="py-2">
                      <MoneyInput v-model="line.price" density="compact" hide-details />
                    </td>
                    <td class="py-2">
                      <v-text-field
                        v-model.number="line.taxPercent"
                        type="number"
                        min="0"
                        max="100"
                        density="compact"
                        hide-details
                        variant="outlined"
                        suffix="%"
                      />
                    </td>
                    <td class="py-2 text-right text-body-2 font-weight-medium">
                      {{ lineSubtotal(line) }} DA
                    </td>
                    <td class="py-2">
                      <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="form.lines.splice(i, 1)" />
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <v-btn size="small" variant="outlined" color="secondary" prepend-icon="mdi-plus" @click="openProductPicker">Add Product</v-btn>

              <v-divider class="my-5" />

              <!-- Totals -->
              <div class="section-heading mb-3">{{ $t('purchases.totals') }}</div>
              <v-row>
                <v-col cols="12" sm="4">
                  <MoneyInput v-model="form.discount" :label="$t('common.discount') + ' (DA)'" />
                </v-col>
                <v-col cols="12" sm="4">
                  <MoneyInput v-model="form.stamp" :label="$t('common.stamp') + ' (DA)'" />
                </v-col>
                <v-col cols="12" sm="4">
                  <MoneyInput v-model="form.payment" :label="$t('common.payment') + ' (DA)'" />
                </v-col>
              </v-row>

              <!-- Summary -->
              <v-card variant="tonal" color="orange" class="mt-4 pa-4" rounded="lg">
                <div class="d-flex justify-space-between text-body-2 mb-2">
                  <span>{{ $t('common.untaxed') }}:</span>
                  <span>{{ formTotals.untaxed }} DA</span>
                </div>
                <div class="d-flex justify-space-between text-body-2 mb-2">
                  <span>{{ $t('common.totalTaxes') }}:</span>
                  <span>{{ formTotals.taxes }} DA</span>
                </div>
                <div class="d-flex justify-space-between text-body-2 mb-2">
                  <span>{{ $t('common.discount') }}:</span>
                  <span>-{{ (form.discount / 100).toFixed(2) }} DA</span>
                </div>
                <div class="d-flex justify-space-between font-weight-bold text-body-1">
                  <span>{{ $t('common.grandTotal') }}:</span>
                  <span>{{ formTotals.grand }} DA</span>
                </div>
              </v-card>

              <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="mt-4">{{ saveError }}</v-alert>
            </v-form>
          </v-card>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showProductPicker" max-width="800px" scrollable>
      <v-card>
        <v-toolbar color="surface" elevation="1">
          <v-toolbar-title>{{ $t('inventory.product') }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="showProductPicker = false"></v-btn>
        </v-toolbar>
        <div class="pa-4 bg-grey-lighten-4 border-b">
          <v-row>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="productSearch"
                prepend-inner-icon="mdi-magnify"
                label="Search product, SKU or barcode..."
                variant="solo"
                hide-details
                density="comfortable"
                clearable
                autofocus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="selectedWarehouseFilter"
                :items="warehouses"
                item-title="name"
                item-value="id"
                label="Warehouse Filter"
                variant="solo"
                hide-details
                density="comfortable"
                clearable
              >
                <template v-slot:prepend-item>
                  <v-list-item title="All Warehouses" @click="selectedWarehouseFilter = null"></v-list-item>
                  <v-divider></v-divider>
                </template>
              </v-select>
            </v-col>
          </v-row>
        </div>
        <v-card-text class="pa-0" style="background-color: #f9f9f9;">
          <div v-if="filteredProducts.length === 0" class="pa-8 text-center text-grey">
            No products found.
          </div>
          <template v-else>
            <template v-for="warehouse in displayedWarehouses" :key="warehouse.id">
              <div class="mb-6 pa-4">
                <div class="d-flex align-center mb-3">
                  <v-icon color="primary" class="mr-2">mdi-warehouse</v-icon>
                  <span class="text-h6 font-weight-bold">{{ warehouse.name }}</span>
                </div>
                <v-divider class="mb-3"></v-divider>
                
                <div v-if="filteredProducts.length === 0" class="pa-8 text-center text-grey border bg-white rounded">
                  No products found in this warehouse.
                </div>
                
                <v-row v-else class="ma-0">
                  <v-col cols="12" sm="6" v-for="product in filteredProducts" :key="product.id">
                    <v-card elevation="1" hover @click="selectProductAndWarehouse(product, warehouse.id)" class="h-100">
                      <div class="d-flex pa-3">
                        <v-avatar rounded="lg" size="64" color="grey-lighten-3" class="mr-3">
                          <v-img v-if="product.photo" :src="'app-image://' + product.photo" cover></v-img>
                          <v-icon v-else size="32" color="grey">mdi-package-variant</v-icon>
                        </v-avatar>
                        <div class="flex-grow-1 overflow-hidden">
                          <div class="text-subtitle-1 font-weight-bold text-truncate" :title="product.name">{{ product.name }}</div>
                          <div class="text-caption text-grey text-truncate">
                            <span v-if="product.code">SKU: {{ product.code }}</span>
                            <span v-if="product.barcode" class="ml-2">BC: {{ product.barcode }}</span>
                          </div>
                          <div class="d-flex justify-space-between align-center mt-2">
                            <div class="text-primary font-weight-bold">{{ (product.costPrice / 100).toFixed(2) }} DA</div>
                            <v-chip size="small" :color="getAvailableStock(product.id, warehouse.id) > 0 ? 'success' : 'grey'" variant="flat">
                              Stock: {{ getAvailableStock(product.id, warehouse.id) }}
                            </v-chip>
                          </div>
                        </div>
                      </div>
                      <v-divider></v-divider>
                      <v-card-actions class="pa-2 bg-grey-lighten-5">
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="text" size="small" @click.stop="selectProductAndWarehouse(product, warehouse.id)">
                          Select
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
              </div>
            </template>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>

    <ConfirmDialog ref="confirmDialogRef" />

    <!-- Purchase Order PDF Preview Dialog -->
    <DocumentPreviewDialog
      v-model="showPreviewDialog"
      document-type="purchaseOrder"
      :document-id="previewPurchaseId"
      :document-code="previewPurchaseCode"
    />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, computed, onMounted } from 'vue'
import IconBox from '../components/IconBox.vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import MoneyInput from '../components/MoneyInput.vue'
import DocumentPreviewDialog from '../components/DocumentPreviewDialog.vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()

const items = ref([])
const showPreviewDialog = ref(false)
const previewPurchaseId = ref(null)
const previewPurchaseCode = ref('')

const openPurchasePreview = (purchase) => {
  if (!purchase || !purchase.id) return
  previewPurchaseId.value = purchase.id
  previewPurchaseCode.value = purchase.code || ''
  showPreviewDialog.value = true
}

const printDocument = (purchase) => {
  openPurchasePreview(purchase)
}

const vendors = ref([])
const warehouses = ref([])
const products = ref([])
const inventory = ref([])

const headers = [
  { title: t('common.code'), key: 'code' },
  { title: t('common.date'), key: 'date' },
  { title: t('purchases.vendor'), key: 'vendor_name' },
  { title: t('common.total') + ' (DA)', key: 'total_price', align: 'end' },
  { title: t('common.rest') + ' (DA)', key: 'rest', align: 'end' },
  { title: t('common.status'), key: 'status', align: 'center' },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
]

const showCreateDialog = ref(false)
const editId = ref(null)
const saving = ref(false)
const saveError = ref('')
const purchaseFormRef = ref(null)
const confirmDialogRef = ref(null)

const defaultForm = () => ({
  code: '',
  date: new Date().toISOString().split('T')[0],
  vendorId: null,
  
  discount: 0,
  stamp: 0,
  payment: 0,
  lines: []
})

const form = ref(defaultForm())

// Line computed helpers
const lineSubtotal = (line) => {
  const untaxed = (line.amount || 0) * (line.price || 0) / 100
  const taxAmount = untaxed * (line.taxPercent || 0) / 100
  return (untaxed + taxAmount).toFixed(2)
}


const scannerInput = ref('')
const handleScan = () => {
  const code = scannerInput.value.trim()
  if (!code) return
  
  const product = products.value.find(p => p.code === code || p.id.toString() === code || p.barcode === code)
  if (product) {
    // Find matching product -> open picker to select warehouse
    productSearch.value = product.barcode || product.code || product.name
    selectedWarehouseFilter.value = null
    showProductPicker.value = true
  } else {
    window.toast.error('Product not found for barcode: ' + code)
  }
  scannerInput.value = ''
}


const showProductPicker = ref(false)
const productSearch = ref('')

const openProductPicker = () => {
  productSearch.value = ''
  selectedWarehouseFilter.value = null
  showProductPicker.value = true
}

const filteredProducts = computed(() => {
  if (!productSearch.value) return products.value
  const q = productSearch.value.toLowerCase()
  return products.value.filter(p => 
    (p.name && p.name.toLowerCase().includes(q)) || 
    (p.code && p.code.toLowerCase().includes(q)) ||
    (p.barcode && p.barcode.toLowerCase().includes(q))
  )
})


const selectedWarehouseFilter = ref(null)

const displayedWarehouses = computed(() => {
  if (selectedWarehouseFilter.value) {
    const filterId = typeof selectedWarehouseFilter.value === 'object' ? selectedWarehouseFilter.value.id : selectedWarehouseFilter.value;
    return warehouses.value.filter(w => w.id == filterId)
  }
  return warehouses.value
})

const getAvailableStock = (productId, warehouseId) => {
  if (!productId || !warehouseId) return 0
  const stock = inventory.value.find(s => s.product_id === productId && s.warehouse_id === warehouseId)
  return stock ? stock.quantity : 0
}

const selectProductAndWarehouse = (product, warehouseId) => {
  const existingLine = form.value.lines.find(l => l.productId === product.id && l.warehouseId === warehouseId)
  if (existingLine) {
    existingLine.amount += 1
  } else {
    form.value.lines.push({ 
      productId: product.id, 
      warehouseId: warehouseId,
      amount: 1, 
      price: product.costPrice || 0, 
      taxPercent: product.tax_value || 0 
    })
  }
  showProductPicker.value = false
}

const getWarehouseName = (id) => {
  const w = warehouses.value.find(w => w.id === id)
  return w ? w.name : ''
}

const getProductNameDetailed = (id) => {
  if (!id) return ''
  const p = products.value.find(p => p.id === id)
  if (!p) return ''
  return p.code ? `${p.code} - ${p.name}` : p.name
}


const formTotals = computed(() => {
  let untaxedCents = 0
  let taxesCents = 0
  for (const line of form.value.lines) {
    const lineUntaxed = Math.round((line.amount || 0) * (line.price || 0))
    const lineTax = Math.round(lineUntaxed * (line.taxPercent || 0) / 100)
    untaxedCents += lineUntaxed
    taxesCents += lineTax
  }
  const grandCents = untaxedCents + taxesCents - (form.value.discount || 0) + (form.value.stamp || 0)
  return {
    untaxed: (untaxedCents / 100).toFixed(2),
    taxes: (taxesCents / 100).toFixed(2),
    grand: (grandCents / 100).toFixed(2)
  }
})



const load = async () => {
  const [pRes, vRes, wRes, prodRes, iRes] = await Promise.all([
    window.api.getPurchases(),
    window.api.getVendors(),
    window.api.getWarehouses(),
    window.api.getProducts(),
    window.api.getInventoryList()
  ])
  if (pRes.success) items.value = pRes.data
  if (vRes.success) vendors.value = vRes.data
  if (wRes.success) warehouses.value = wRes.data
  if (prodRes.success) products.value = prodRes.data
  if (iRes && iRes.success) inventory.value = iRes.data
  if (iRes && iRes.success) inventory.value = iRes.data
}

const openNew = () => {
  editId.value = null
  form.value = defaultForm()
  saveError.value = ''
  showCreateDialog.value = true
}

const editPurchase = async (item) => {
  const res = await window.api.getPurchase(item.id)
  if (res.success && res.data) {
    const p = res.data
    editId.value = p.id
    form.value = {
      code: p.code,
      date: p.date ? p.date.split('T')[0] : new Date().toISOString().split('T')[0],
      vendorId: p.vendor_id,
      discount: p.discount || 0,
      stamp: p.stamp || 0,
      payment: p.payment || 0,
      lines: p.lines.map(l => ({
        productId: l.product_id,
        warehouseId: l.warehouse_id,
        amount: l.amount,
        price: l.price,
        taxPercent: l.tax_percent
      }))
    }
    saveError.value = ''
    showCreateDialog.value = true
  } else {
    window.toast.error('Failed to load purchase')
  }
}

const savePurchase = async () => {
  const { valid, errors } = await purchaseFormRef.value.validate()
  if (!valid) {
    window.toast.error('Validation failed: ' + JSON.stringify(errors))
    return
  }
  if (form.value.lines.length === 0) {
    saveError.value = 'Add at least one line item'
    window.toast.error('Add at least one line item')
    return
  }

  saving.value = true
  saveError.value = ''

  const payload = {
    code: String(form.value.code || '').trim(),
    vendorId: parseInt(form.value.vendorId, 10),
    discount: parseInt(form.value.discount || 0, 10),
    stamp: parseInt(form.value.stamp || 0, 10),
    payment: parseInt(form.value.payment || 0, 10),
    lines: form.value.lines.map(line => ({
      productId: parseInt(line.productId, 10),
      warehouseId: parseInt(line.warehouseId, 10),
      amount: parseFloat(line.amount) || 0,
      price: parseInt(line.price || 0, 10),
      taxPercent: parseInt(line.taxPercent || 0, 10)
    })),
    date: form.value.date || new Date().toISOString()
  }

  const res = editId.value
    ? await window.api.editPurchase(editId.value, payload)
    : await window.api.createPurchase(payload)

  saving.value = false

  if (res.success) {
    window.toast.success(editId.value ? t('purchases.updated') : t('purchases.created'))
    showCreateDialog.value = false
    load()
  } else {
    saveError.value = res.error
    window.toast.error('API Error: ' + res.error)
  }
}

const cancelPurchase = async (id) => {
  const confirmed = await confirmDialogRef.value.open({
    title: t('purchases.cancelPurchase'),
    message: t('purchases.cancelConfirm'),
    confirmText: t('purchases.cancelPurchase'),
    destructive: true
  })
  if (confirmed) {
    const res = await window.api.cancelPurchase(id)
    if (res.success) {
      window.toast.success(t('purchases.cancelled'))
      load()
    } else {
      window.toast.error('Failed: ' + res.error)
    }
  }
}

onMounted(load)
</script>

<style scoped>
.section-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748B;
}
</style>
