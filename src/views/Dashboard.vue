<template>
  <div>
    <PageHeader :title="$t('nav.dashboard')">
      <template #actions>
        <v-btn-toggle v-model="filterTimeline" color="primary" mandatory variant="outlined" density="comfortable" @update:model-value="loadMetrics">
          <v-btn value="1_month">{{ $t('dashboard.filters.oneMonth') }}</v-btn>
          <v-btn value="6_months">{{ $t('dashboard.filters.sixMonths') }}</v-btn>
          <v-btn value="1_year">{{ $t('dashboard.filters.oneYear') }}</v-btn>
          <v-btn value="all">{{ $t('dashboard.filters.all') }}</v-btn>
        </v-btn-toggle>
      </template>
    </PageHeader>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="d-flex justify-center py-12">
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" variant="tonal" class="text-body-2">{{ error }}</v-alert>
      </v-col>
    </v-row>

    <!-- Metrics Cards -->
    <v-row v-else>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" border rounded="lg" class="pa-4 d-flex align-center">
          <IconBox icon="mdi-cash-register" color="primary" class="mr-4" />
          <div>
            <div class="text-caption text-slate-500 font-weight-semibold text-uppercase tracking-wider">{{ $t('dashboard.salesVolume') }}</div>
            <div class="text-h4 font-weight-bold text-slate-800 my-1">{{ formatMoney(metrics.salesTotal) }}</div>
            <div class="text-caption text-slate-500">{{ metrics.salesCount }} {{ $t('dashboard.transactions') }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" border rounded="lg" class="pa-4 d-flex align-center">
          <IconBox icon="mdi-cart-outline" color="orange" class="mr-4" />
          <div>
            <div class="text-caption text-slate-500 font-weight-semibold text-uppercase tracking-wider">{{ $t('dashboard.purchases') }}</div>
            <div class="text-h4 font-weight-bold text-slate-800 my-1">{{ metrics.purchaseCount }}</div>
            <div class="text-caption text-slate-500">{{ $t('dashboard.ordersRecorded') }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" border rounded="lg" class="pa-4 d-flex align-center">
          <IconBox icon="mdi-package-variant-closed" color="info" class="mr-4" />
          <div>
            <div class="text-caption text-slate-500 font-weight-semibold text-uppercase tracking-wider">{{ $t('dashboard.inventory') }}</div>
            <div class="text-h4 font-weight-bold text-slate-800 my-1">{{ metrics.stockQuantity }}</div>
            <div class="text-caption text-slate-500">{{ metrics.productCount }} {{ $t('dashboard.activeProducts') }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" border rounded="lg" class="pa-4 d-flex align-center">
          <IconBox icon="mdi-account-group-outline" color="indigo" class="mr-4" />
          <div>
            <div class="text-caption text-slate-500 font-weight-semibold text-uppercase tracking-wider">{{ $t('dashboard.contacts') }}</div>
            <div class="text-h4 font-weight-bold text-slate-800 my-1">{{ metrics.customerCount }}</div>
            <div class="text-caption text-slate-500">{{ $t('dashboard.vendorsCount', { count: metrics.vendorCount }).replace('{count}', metrics.vendorCount) }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="0" border rounded="lg" class="pa-4 d-flex align-center">
          <IconBox icon="mdi-arrow-down-bold" color="success" class="mr-4" />
          <div>
            <div class="text-caption text-slate-500 font-weight-semibold text-uppercase tracking-wider">{{ $t('dashboard.totalReceivables') }}</div>
            <div class="text-h4 font-weight-bold text-success">{{ formatMoney(metrics.receivables) }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="0" border rounded="lg" class="pa-4 d-flex align-center">
          <IconBox icon="mdi-arrow-up-bold" color="purple" class="mr-4" />
          <div>
            <div class="text-caption text-slate-500 font-weight-semibold text-uppercase tracking-wider">{{ $t('dashboard.totalPayables') }}</div>
            <div class="text-h4 font-weight-bold text-purple">{{ formatMoney(metrics.payables) }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts -->
    <v-row v-if="!loading && !error" class="mt-2">
      <v-col cols="12" md="8">
        <v-card elevation="0" border rounded="lg">
          <v-card-title class="text-subtitle-1 font-weight-bold pt-4 px-6">Sales Over Time</v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pt-4">
            <apexchart v-if="salesSeries[0].data.length" type="area" height="350" :options="salesOptions" :series="salesSeries"></apexchart>
            <div v-else class="d-flex align-center justify-center pa-12 text-grey">No sales data for this period</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card elevation="0" border rounded="lg">
          <v-card-title class="text-subtitle-1 font-weight-bold pt-4 px-6">Top Products</v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pt-4">
            <apexchart v-if="topProductsSeries[0].data.length" type="bar" height="350" :options="topProductsOptions" :series="topProductsSeries"></apexchart>
            <div v-else class="d-flex align-center justify-center pa-12 text-grey">No product data for this period</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import IconBox from '../components/IconBox.vue'

const loading = ref(true)
const error = ref('')
const filterTimeline = ref('all')

const metrics = ref({
  salesCount: 0,
  salesTotal: 0,
  purchaseCount: 0,
  productCount: 0,
  stockQuantity: 0,
  customerCount: 0,
  vendorCount: 0,
  receivables: 0,
  payables: 0
})

const salesSeries = ref([{ name: 'Sales Total', data: [] }])
const salesOptions = ref({
  chart: { id: 'sales-over-time', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#2563EB'],
  xaxis: { categories: [], labels: { style: { colors: '#6B7280' } } },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
  dataLabels: { enabled: false },
  grid: { borderColor: '#F3F4F6', strokeDashArray: 4 },
  yaxis: {
    labels: {
      style: { colors: '#6B7280' },
      formatter: (value) => { return (value / 100).toFixed(2) }
    }
  }
})

const topProductsSeries = ref([{ name: 'Quantity Sold', data: [] }])
const topProductsOptions = ref({
  chart: { id: 'top-products', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#3B82F6'],
  xaxis: { categories: [], labels: { style: { colors: '#6B7280' } } },
  plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
  dataLabels: { enabled: false },
  grid: { borderColor: '#F3F4F6', strokeDashArray: 4 },
  yaxis: { labels: { style: { colors: '#6B7280' } } }
})

const formatMoney = (val) => {
  return (val / 100).toFixed(2)
}

const loadMetrics = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await window.api.getDashboardMetrics({ timeline: filterTimeline.value })
    if (res.success) {
      const data = res.data
      metrics.value = data.metrics

      const salesDates = data.salesOverTime.map(s => s.date)
      const salesTotals = data.salesOverTime.map(s => s.total)
      salesOptions.value = { ...salesOptions.value, xaxis: { categories: salesDates, labels: { style: { colors: '#6B7280' } } } }
      salesSeries.value = [{ name: 'Sales Total', data: salesTotals }]

      const productNames = data.topProducts.map(p => p.name)
      const productQuantities = data.topProducts.map(p => p.quantity)
      topProductsOptions.value = { ...topProductsOptions.value, xaxis: { categories: productNames, labels: { style: { colors: '#6B7280' } } } }
      topProductsSeries.value = [{ name: 'Quantity Sold', data: productQuantities }]

    } else {
      error.value = res.error || 'Failed to load dashboard metrics'
    }
  } catch (err) {
    error.value = err.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadMetrics()
})
</script>
