<template>
  <v-dialog v-model="dialog" max-width="400">
    <v-card>
      <v-card-title class="font-weight-bold text-slate-800 pa-6 border-b">
        Change Password
      </v-card-title>
      <v-card-text class="pa-6">
        <v-form @submit.prevent="submit" ref="form">
          <v-text-field
            v-model="currentPassword"
            label="Current Password"
            type="password"
            :rules="[v => !!v || 'Required']"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          ></v-text-field>

          <v-text-field
            v-model="newPassword"
            label="New Password"
            type="password"
            :rules="[v => !!v || 'Required', v => v.length >= 6 || 'Min 6 characters']"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          ></v-text-field>

          <v-text-field
            v-model="confirmPassword"
            label="Confirm New Password"
            type="password"
            :rules="[
              v => !!v || 'Required',
              v => v === newPassword || 'Passwords must match'
            ]"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          ></v-text-field>

          <div class="d-flex justify-end mt-4">
            <v-btn variant="text" color="secondary" @click="dialog = false" class="me-2">{{ $t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" type="submit" :loading="loading">{{ $t('common.save') }}</v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
    if (!val) {
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      if (form.value) form.value.resetValidation()
    }
  }
})

const form = ref(null)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  loading.value = true
  try {
    await window.api.changePassword(currentPassword.value, newPassword.value)
    window.toast.success('Password changed successfully')
    dialog.value = false
  } catch (err) {
    window.toast.error(err.message || 'Failed to change password')
  } finally {
    loading.value = false
  }
}
</script>
