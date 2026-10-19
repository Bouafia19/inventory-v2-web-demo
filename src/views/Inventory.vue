<template>
  <div>
    <PageHeader :title="$t('inventory.title')" icon="mdi-warehouse" iconColor="info">
      <template #actions>
        <v-btn color="secondary" variant="outlined" prepend-icon="mdi-tune" @click="openAdjustDialog" class="mr-2">{{ $t('inventory.adjust') }}</v-btn>
      </template>
    </PageHeader>


    <!-- Valuation Summary -->
    <v-row class="mb-4" v-if="valuationSummary">
      <v-col cols="12" sm="4">
        <v-card elevation="0" border class="pa-4 bg-white text-center">
          <div class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1">Total Quantity</div>
          <div class="text-h4 font-weight-black text-primary">{{ valuationSummary.totalQuantity.toFixed(3) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card elevation="0" border class="pa-4 bg-white text-center">
          <div class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1">Products / Warehouses</div>
          <div class="text-h4 font-weight-black text-secondary">{{ valuationSummary.productCount }} / {{ valuationSummary.warehouseCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card elevation="0" border class="pa-4 bg-info-lighten-5 text-center">
          <div class="text-caption text-uppercase text-info-darken-1 font-weight-bold mb-1">Total Inventory Value</div>
          <div class="text-h4 font-weight-black text-info-darken-2">{{ (valuationSummary.totalInventoryValue / 100).toFixed(2) }} DA</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search -->
    <v-card elevation="0" border rounded="lg" class="mb-4">
      <v-card-text class="py-3">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          :label="$t('common.searchProdWh')"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 400px;"
        />
      </v-card-text>
    </v-card>

    <v-card elevation="0" border rounded="lg">
      <v-data-table class="primary-table" :headers="headers" :items="filteredItems" hover>
        <template v-slot:no-data>
          <EmptyState icon="mdi-warehouse" color="info" :title="$t('common.noData')" :description="$t('common.noData')" />
        </template>

        <template v-slot:item.quantity="{ item }">
          <v-chip
            :color="item.quantity <= 0 ? 'error' : item.quantity < 5 ? 'warning' : 'success'"
            variant="tonal"
            size="small"
          >
            {{ item.quantity }}
          </v-chip>
        </template>


        <template v-slot:item.costPrice="{ item }">
          {{ (item.costPrice / 100).toFixed(2) }} DA
        </template>
        <template v-slot:item.stockValue="{ item }">
          <strong>{{ (item.stockValue / 100).toFixed(2) }} DA</strong>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn icon="mdi-history" variant="text" size="small" color="info" @click="viewHistory(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Adjust Stock Dialog -->
    <v-dialog v-model="showAdjustDialog" max-width="520px">
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2 d-flex align-center">
          <v-icon class="mr-2" color="secondary">mdi-tune</v-icon>
          Adjust Stock
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showAdjustDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="px-6 pt-4 pb-2">
          <v-form ref="adjustFormRef" @submit.prevent="adjustStock">
            <v-autocomplete
              v-model="adjustForm.productId"
              :items="products"
              :item-title="p => `[${p.code}] ${p.name}`"
              item-value="id"
              :label="$t('inventory.product') + ' *'"
              :rules="[v => !!v || 'Product is required']"
              required
              class="mb-3"
            />
            <v-autocomplete
              v-model="adjustForm.warehouseId"
              :items="warehouses"
              item-title="name"
              item-value="id"
              :label="$t('inventory.warehouse') + ' *'"
              :rules="[v => !!v || 'Warehouse is required']"
              required
              class="mb-3"
            />
            <v-text-field
              v-model.number="adjustForm.delta"
              :label="$t('common.delta') + ' *'"
              type="number"
              step="0.001"
              :rules="[v => v !== 0 || 'Delta must not be zero']"
              required
              hint="Use positive to add stock, negative to remove"
              persistent-hint
              class="mb-3"
            />
            <v-text-field
              v-model="adjustForm.reason"
              :label="$t('inventory.reason') + ' *'"
              :rules="[v => !!v || 'Reason is required']"
              required
            />
          </v-form>
          <v-alert v-if="adjustError" type="error" variant="tonal" density="compact" class="mt-3">{{ adjustError }}</v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="bg-grey-lighten-5 px-6 py-3">
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="showAdjustDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="adjusting" @click="adjustStock">{{ $t('common.apply') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- History Dialog -->
    <v-dialog v-model="showHistoryDialog" max-width="800px" scrollable>
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2 d-flex align-center">
          <v-icon class="mr-2" color="info">mdi-history</v-icon>
          {{ $t('inventory.history') }} — {{ historyTitle }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showHistoryDialog = false" />
        </v-card-title>
        <v-card-text class="px-0 py-0" style="max-height: 60vh; overflow-y: auto;">
          <v-data-table :headers="historyHeaders" :items="historyItems" hover>
            <template v-slot:item.quantity_delta="{ item }">
              <span :class="item.quantity_delta >= 0 ? 'text-success font-weight-medium' : 'text-error font-weight-medium'">
                {{ item.quantity_delta >= 0 ? '+' : '' }}{{ item.quantity_delta }}
              </span>
            </template>
            <template v-slot:item.created_at="{ item }">
              {{ new Date(item.created_at).toLocaleString() }}
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '../stores/notifications.js'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'

const notificationStore = useNotificationStore()
const items = ref([])
const valuationSummary = ref(null)
const products = ref([])
const warehouses = ref([])
const search = ref('')

const headers = [
  { title: t('inventory.product'), key: 'product_name' },
  { title: t('common.code'), key: 'product_code' },
  { title: t('inventory.warehouse'), key: 'warehouse_name' },
  { title: t('inventory.quantity'), key: 'quantity', align: 'center' },
  { title: 'Cost Price', key: 'costPrice', align: 'end' },
  { title: 'Stock Value', key: 'stockValue', align: 'end' },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'center' }
]

const filteredItems = computed(() => {
  if (!search.value) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i =>
    (i.product_name || '').toLowerCase().includes(q) ||
    (i.product_code || '').toLowerCase().includes(q) ||
    (i.warehouse_name || '').toLowerCase().includes(q)
  )
})

// Adjust dialog
const showAdjustDialog = ref(false)
const adjusting = ref(false)
const adjustError = ref('')
const adjustFormRef = ref(null)
const adjustForm = ref({ productId: null, warehouseId: null, delta: 0, reason: '' })

// History dialog
const showHistoryDialog = ref(false)
const historyTitle = ref('')
const historyItems = ref([])
const historyHeaders = [
  { title: t('common.date'), key: 'created_at' },
  { title: t('common.type'), key: 'movement_type' },
  { title: t('common.delta'), key: 'quantity_delta', align: 'center' },
  { title: t('inventory.reason'), key: 'reason' },
  { title: t('common.user'), key: 'user_name' }
]

const load = async () => {
  const [invRes, prodRes, whRes] = await Promise.all([
    window.api.getInventoryValuation(),
    window.api.getProducts(),
    window.api.getWarehouses()
  ])
  if (invRes.success) {
    items.value = invRes.data.rows
    valuationSummary.value = invRes.data.summary
    notificationStore.checkStockAlerts(invRes.data.rows, t)
  }
  if (prodRes.success) products.value = prodRes.data
  if (whRes.success) warehouses.value = whRes.data
}

const openAdjustDialog = () => {
  adjustForm.value = { productId: null, warehouseId: null, delta: 0, reason: '' }
  adjustError.value = ''
  showAdjustDialog.value = true
}

const adjustStock = async () => {
  const { valid } = await adjustFormRef.value.validate()
  if (!valid) return

  adjusting.value = true
  adjustError.value = ''

  const payload = {
    productId: parseInt(adjustForm.value.productId, 10),
    warehouseId: parseInt(adjustForm.value.warehouseId, 10),
    delta: parseFloat(adjustForm.value.delta) || 0,
    reason: String(adjustForm.value.reason || '').trim()
  }
  const res = await window.api.adjustStock(payload)
  adjusting.value = false

  if (res.success) {
    window.toast.success(t('common.save'))
    notificationStore.addNotification({
      type: 'success',
      category: 'inventory',
      title: t('inventory.adjust') || 'Stock Adjustment',
      message: `Stock adjusted successfully. ${payload.reason ? 'Reason: ' + payload.reason : ''}`,
      route: '/inventory'
    })
    showAdjustDialog.value = false
    load()
  } else {
    adjustError.value = res.error
  }
}

const viewHistory = async (item) => {
  const res = await window.api.getInventoryMovements({
    productId: item.product_id,
    warehouseId: item.warehouse_id
  })
  if (res.success) {
    historyTitle.value = `${item.product_name} @ ${item.warehouse_name}`
    historyItems.value = res.data
    showHistoryDialog.value = true
  } else {
    window.toast.error(res.error)
  }
}

onMounted(load)
</script>
