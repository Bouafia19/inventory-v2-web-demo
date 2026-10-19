<template>
  <span :class="['px-3 py-1 rounded-pill text-caption font-weight-bold d-inline-flex align-center justify-center', colorClass]" style="letter-spacing: 0.05em; min-width: 80px;">
    {{ status }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

const colorClass = computed(() => {
  const s = props.status.toUpperCase()
  if (['FINALIZED', 'PAID', 'ACTIVE'].includes(s)) return 'bg-success-soft text-success'
  if (['CANCELLED', 'VOID', 'UNPAID'].includes(s)) return 'bg-error-soft text-error'
  if (['PARTIAL', 'PENDING'].includes(s)) return 'bg-warning-soft text-warning'
  if (['DRAFT'].includes(s)) return 'bg-slate-soft text-slate-500'
  return 'bg-primary-soft text-primary'
})
</script>
