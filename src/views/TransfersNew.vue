<template>
  <div>
    <PageHeader :title="$t('transfers.new')" icon="mdi-swap-horizontal" iconColor="success">
      <template #actions>
        <v-btn variant="text" to="/transfers">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
      </template>
    </PageHeader>
    
    <v-card elevation="0" border rounded="lg" class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field v-model="form.date" :label="$t('common.date')" type="date" variant="outlined" density="comfortable" hide-details></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="form.sourceWarehouseId"
            :items="warehouses"
            item-title="name"
            item-value="id"
            :label="$t('transfers.source')"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:modelValue="onWarehouseChanged"
          ></v-select>
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="form.destinationWarehouseId"
            :items="destinationWarehouses"
            item-title="name"
            item-value="id"
            :label="$t('transfers.destination')"
            variant="outlined"
            density="comfortable"
            hide-details
          ></v-select>
        </v-col>
        <v-col cols="12">
          <v-text-field v-model="form.notes" label="Notes" variant="outlined" density="comfortable" hide-details></v-text-field>
        </v-col>
      </v-row>
    </v-card>

    <v-card elevation="0" border rounded="lg">
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        {{ $t('inventory.product') }}s
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" @click="addLine">{{ $t('common.addLine') }}</v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-data-table
        :headers="lineHeaders"
        :items="form.lines"
        density="comfortable"
        hide-default-footer
        :items-per-page="-1"
      >
        <template v-slot:item.productId="{ item }">
          <v-autocomplete
            v-model="item.productId"
            :items="products"
            item-title="name"
            item-value="id"
            density="compact"
            hide-details
            variant="underlined"
            placeholder="Select product"
          ></v-autocomplete>
        </template>
        <template v-slot:item.stock="{ item }">
          <v-chip size="small" :color="getAvailableStock(item.productId, form.sourceWarehouseId) > 0 ? 'success' : 'error'">
            {{ getAvailableStock(item.productId, form.sourceWarehouseId) }}
          </v-chip>
        </template>
        <template v-slot:item.quantity="{ item }">
          <v-text-field v-model.number="item.quantity" type="number" step="0.001" density="compact" hide-details variant="underlined" style="min-width: 100px;"></v-text-field>
        </template>
        <template v-slot:item.actions="{ item, index }">
          <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="removeLine(index)"></v-btn>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const saving = ref(false)

const warehouses = ref([])
const products = ref([])
const inventory = ref([])

const form = ref({
  date: new Date().toISOString().substring(0, 10),
  sourceWarehouseId: null,
  destinationWarehouseId: null,
  notes: '',
  lines: [
    { productId: null, quantity: 1 }
  ]
})

const destinationWarehouses = computed(() => {
  return warehouses.value.filter(w => w.id !== form.value.sourceWarehouseId)
})

const lineHeaders = [
  { title: 'Product', key: 'productId', width: '40%' },
  { title: 'Available Source Stock', key: 'stock', width: '20%' },
  { title: 'Quantity to Transfer', key: 'quantity', width: '20%' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: '10%' }
]

const loadDependencies = async () => {
  const [wRes, pRes, iRes] = await Promise.all([
    window.api.getWarehouses(),
    window.api.getProducts(),
    window.api.getInventoryList()
  ])
  if (wRes.success) warehouses.value = wRes.data
  if (pRes.success) products.value = pRes.data
  if (iRes.success) inventory.value = iRes.data
}

const onWarehouseChanged = () => {
  if (form.value.destinationWarehouseId === form.value.sourceWarehouseId) {
    form.value.destinationWarehouseId = null
  }
}

const addLine = () => {
  form.value.lines.push({ productId: null, quantity: 1 })
}

const removeLine = (index) => {
  form.value.lines.splice(index, 1)
}

const getAvailableStock = (productId, warehouseId) => {
  if (!productId || !warehouseId) return 0
  const stock = inventory.value.find(s => s.product_id === productId && s.warehouse_id === warehouseId)
  return stock ? stock.quantity : 0
}

const save = async () => {
  if (!form.value.sourceWarehouseId) return window.toast.error('Select a source warehouse')
  if (!form.value.destinationWarehouseId) return window.toast.error('Select a destination warehouse')
  if (form.value.sourceWarehouseId === form.value.destinationWarehouseId) return window.toast.error('Source and destination must be different')
  if (form.value.lines.length === 0) return window.toast.error('Add at least one product to transfer')

  for (const line of form.value.lines) {
    if (!line.productId) return window.toast.error('Please select a product for all lines')
    if (line.quantity <= 0) return window.toast.error('Quantity must be greater than zero')
  }

  saving.value = true
  try {
    const payload = {
      date: new Date(form.value.date).toISOString(),
      sourceWarehouseId: parseInt(form.value.sourceWarehouseId, 10),
      destinationWarehouseId: parseInt(form.value.destinationWarehouseId, 10),
      notes: form.value.notes.trim(),
      lines: form.value.lines.map(l => ({
        productId: parseInt(l.productId, 10),
        quantity: parseFloat(l.quantity)
      }))
    }
    
    const res = await window.api.createTransfer(payload)
    if (res.success) {
      router.push('/transfers')
    } else {
      window.toast.error('Failed to save transfer: ' + res.error)
    }
  } catch (err) {
    window.toast.error('Failed to save transfer: ' + err.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadDependencies()
})
</script>
