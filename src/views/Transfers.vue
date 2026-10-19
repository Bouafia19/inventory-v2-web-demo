<template>
  <div>
    <PageHeader :title="$t('transfers.title')" icon="mdi-swap-horizontal" iconColor="success">
      <template #actions>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" to="/transfers/new">{{ $t('transfers.new') }}</v-btn>
      </template>
    </PageHeader>

    <v-card elevation="0" border rounded="lg">
      <v-data-table
        class="primary-table"
        :headers="headers"
        :items="items"
        :loading="loading"
        hover
      >
        <template v-slot:no-data>
          <EmptyState icon="mdi-swap-horizontal" color="success" :title="$t('transfers.empty')" :description="$t('transfers.emptyDesc')" />
        </template>

        <template v-slot:item.date="{ item }">
          {{ new Date(item.date).toLocaleDateString() }}
        </template>

        <template v-slot:item.status="{ item }">
          <StatusChip :status="item.status" />
        </template>

        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn icon="mdi-eye-outline" variant="text" size="small" color="info" @click="viewTransfer(item)" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Transfer Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="750px" scrollable>
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2 d-flex align-center">
          <v-icon class="mr-2" color="success">mdi-swap-horizontal</v-icon>
          {{ $t('transfers.detailTitle') }} — {{ selectedTransfer?.code }}
          <v-spacer />
          <StatusChip v-if="selectedTransfer" :status="selectedTransfer.status" class="mr-3" />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showDetailDialog = false" />
        </v-card-title>
        <v-divider />

        <v-card-text v-if="selectedTransfer" class="px-6 pt-4 pb-2" style="max-height: 65vh; overflow-y: auto;">
          <!-- Header info -->
          <v-row class="mb-4">
            <v-col cols="6" sm="3">
              <div class="text-caption text-grey font-weight-bold text-uppercase mb-1">{{ $t('common.date') }}</div>
              <div class="text-body-2">{{ new Date(selectedTransfer.date).toLocaleDateString() }}</div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-caption text-grey font-weight-bold text-uppercase mb-1">{{ $t('transfers.source') }}</div>
              <div class="text-body-2 font-weight-medium">{{ selectedTransfer.source_warehouse_name }}</div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-caption text-grey font-weight-bold text-uppercase mb-1">{{ $t('transfers.destination') }}</div>
              <div class="text-body-2 font-weight-medium">{{ selectedTransfer.destination_warehouse_name }}</div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-caption text-grey font-weight-bold text-uppercase mb-1">{{ $t('common.notes') }}</div>
              <div class="text-body-2">{{ selectedTransfer.notes || '—' }}</div>
            </v-col>
          </v-row>

          <!-- Lines -->
          <div class="section-heading mb-3">{{ $t('transfers.title') }}</div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>{{ $t('inventory.product') }}</th>
                <th>{{ $t('common.code') }}</th>
                <th class="text-right">{{ $t('inventory.quantity') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in selectedTransfer.lines" :key="line.id">
                <td class="py-2">{{ line.product_name }}</td>
                <td class="py-2 text-grey">{{ line.product_code }}</td>
                <td class="py-2 text-right font-weight-medium">{{ line.quantity }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-card-text v-else class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusChip from '../components/StatusChip.vue'

const items = ref([])
const loading = ref(true)
const showDetailDialog = ref(false)
const selectedTransfer = ref(null)

const headers = [
  { title: t('common.code'), key: 'code' },
  { title: t('common.date'), key: 'date' },
  { title: t('transfers.source'), key: 'source_warehouse_name' },
  { title: t('transfers.destination'), key: 'destination_warehouse_name' },
  { title: t('common.status'), key: 'status', align: 'center' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
]

const loadItems = async () => {
  loading.value = true
  const res = await window.api.getTransfers()
  if (res.success) {
    items.value = res.data
  }
  loading.value = false
}

const viewTransfer = async (item) => {
  selectedTransfer.value = null
  showDetailDialog.value = true
  const res = await window.api.getTransfer(item.id)
  if (res.success) {
    selectedTransfer.value = res.data
  } else {
    window.toast.error(t('common.noData'))
    showDetailDialog.value = false
  }
}

onMounted(() => {
  loadItems()
})
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
