<template>
  <v-dialog v-model="dialog" max-width="400px">
    <v-card>
      <v-card-title class="text-h6 font-weight-bold pb-2">
        {{ title }}
      </v-card-title>
      <v-card-text class="pt-0 text-body-1 text-grey-darken-2">
        {{ message }}
      </v-card-text>
      <v-card-actions class="bg-grey-lighten-4 pa-4 rounded-b-lg">
        <v-spacer></v-spacer>
        <v-btn variant="text" color="secondary" @click="cancel">Cancel</v-btn>
        <v-btn :color="destructive ? 'error' : 'primary'" variant="flat" :loading="loading" @click="confirm">
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'

const dialog = ref(false)
const resolvePromise = ref(null)

const title = ref('')
const message = ref('')
const confirmText = ref('Confirm')
const destructive = ref(false)
const loading = ref(false)

const open = (options) => {
  title.value = options.title || 'Confirm'
  message.value = options.message || 'Are you sure?'
  confirmText.value = options.confirmText || 'Confirm'
  destructive.value = options.destructive || false
  loading.value = false
  dialog.value = true

  return new Promise((resolve) => {
    resolvePromise.value = resolve
  })
}

const confirm = () => {
  dialog.value = false
  if (resolvePromise.value) resolvePromise.value(true)
}

const cancel = () => {
  dialog.value = false
  if (resolvePromise.value) resolvePromise.value(false)
}

defineExpose({ open, dialog, loading })
</script>
