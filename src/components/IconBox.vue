<template>
  <div :class="['d-flex align-center justify-center rounded-lg', `bg-${color}-soft`]" :style="{ width: size + 'px', height: size + 'px' }">
    <v-icon :color="color" :size="iconSize">{{ icon }}</v-icon>
  </div>
</template>
<script setup>
defineProps({
  icon: String,
  color: { type: String, default: 'primary' },
  size: { type: [Number, String], default: 48 },
  iconSize: { type: [Number, String], default: 24 }
})
</script>
