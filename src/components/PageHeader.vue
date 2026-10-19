<template>
  <div class="d-flex justify-space-between align-center mb-6">
    <div class="d-flex align-center">
      <IconBox v-if="icon" :icon="icon" :color="iconColor" size="32" iconSize="18" class="mr-4" />
      <div>
        <h1 class="text-h5 font-weight-bold text-slate-800">{{ title }}</h1>
        <p v-if="subtitle" class="text-body-2 text-slate-500 mt-1">{{ subtitle }}</p>
      </div>
    </div>
    <div>
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
import IconBox from './IconBox.vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  iconColor: {
    type: String,
    default: 'primary'
  }
})
</script>
