<template>
  <div class="d-flex flex-column align-center justify-center py-12 px-4 text-center">
    <IconBox :icon="icon" :color="color" size="64" iconSize="32" class="mb-6 mx-auto" />
    <h3 class="text-h6 font-weight-bold text-slate-800 mb-2">{{ title }}</h3>
    <p class="text-body-1 text-slate-500 mb-6" style="max-width: 400px">{{ description }}</p>
    <slot name="action"></slot>
  </div>
</template>
<script setup>
import IconBox from './IconBox.vue'
defineProps({
  icon: String,
  color: { type: String, default: 'primary' },
  title: String,
  description: String
})
</script>
