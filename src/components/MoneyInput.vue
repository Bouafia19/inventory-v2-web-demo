<template>
  <v-text-field
    v-model="displayValue"
    :label="label"
    :rules="rules"
    :required="required"
    :readonly="readonly"
    :disabled="disabled"
    :hide-details="hideDetails"
    :density="density"
    :variant="variant"
    @blur="onBlur"
    @focus="onFocus"
    type="text"
  ></v-text-field>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number, // In cents!
    default: null
  },
  label: String,
  rules: Array,
  required: Boolean,
  readonly: Boolean,
  disabled: Boolean,
  hideDetails: [Boolean, String],
  density: String,
  variant: String
})

const emit = defineEmits(['update:modelValue'])

const displayValue = ref('')
const isFocused = ref(false)

const formatForDisplay = (cents) => {
  if (cents === null || cents === undefined || isNaN(cents)) return ''
  return (cents / 100).toFixed(2)
}

const parseToCents = (str) => {
  if (!str || str.trim() === '') return 0
  const normalized = str.replace(/,/g, '.')
  const floatVal = parseFloat(normalized)
  if (isNaN(floatVal)) return 0
  return Math.round(floatVal * 100)
}

watch(() => props.modelValue, (newVal) => {
  if (!isFocused.value) {
    displayValue.value = formatForDisplay(newVal)
  }
})

watch(displayValue, (newVal) => {
  if (isFocused.value) {
    emit('update:modelValue', parseToCents(newVal))
  }
})

const onFocus = (e) => {
  isFocused.value = true
  if (props.modelValue === 0) {
    displayValue.value = ''
  } else if (props.modelValue !== null) {
    displayValue.value = (props.modelValue / 100).toString()
  }
  // Delay the select slightly to allow Vue to update the DOM with the new displayValue string
  setTimeout(() => {
    if (e && e.target && e.target.select) {
      e.target.select()
    }
  }, 10)
}

const onBlur = () => {
  isFocused.value = false
  const cents = parseToCents(displayValue.value)
  emit('update:modelValue', cents)
  displayValue.value = formatForDisplay(cents)
}

onMounted(() => {
  displayValue.value = formatForDisplay(props.modelValue)
})
</script>
