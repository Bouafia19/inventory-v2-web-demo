<template>
  <div>
    <PageHeader :title="$t('users.title')" icon="mdi-account-group-outline" iconColor="primary">
      <template #actions>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openDialog()">{{ $t('users.new') }}</v-btn>
      </template>
    </PageHeader>
    
    <v-alert v-if="pageError" type="error" variant="tonal" class="mb-4" closable @click:close="pageError = ''">{{ pageError }}</v-alert>
    <v-card elevation="0" border rounded="lg">
      <v-data-table class="primary-table" :headers="headers" :items="items">
        <template v-slot:item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="flat">
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" color="primary" class="me-2" @click="openDialog(item)"></v-btn>
          <v-btn icon="mdi-key" size="small" color="warning" class="me-2" @click="openPasswordDialog(item)"></v-btn>
          <v-btn v-if="item.is_active" icon="mdi-account-off" size="small" color="error" @click="toggleActive(item, false)"></v-btn>
          <v-btn v-else icon="mdi-account-check" size="small" color="success" @click="toggleActive(item, true)"></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Form Dialog -->
    <v-dialog v-model="showDialog" max-width="500px">
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2">
          {{ editingId ? $t('common.edit') : $t('common.create') }}
          <v-btn icon="mdi-close" variant="text" size="small" class="float-end" @click="closeDialog"></v-btn>
        </v-card-title>
        <v-card-text class="px-6 pb-6 pt-2">
          <v-form ref="form" @submit.prevent="submit">
            <v-text-field v-model="formData.username" :label="$t('users.username')" :rules="[v => !!v || 'Required']" required variant="outlined" density="comfortable" class="mb-4"></v-text-field>
            <v-text-field v-if="!editingId" v-model="formData.password" :label="$t('users.password')" type="password" :rules="[v => !!v || 'Required']" required variant="outlined" density="comfortable" class="mb-4"></v-text-field>
            <v-select v-model="formData.role_id" :items="roles" item-title="name" item-value="id" :label="$t('users.role')" :rules="[v => !!v || 'Required']" required variant="outlined" density="comfortable" class="mb-4"></v-select>
            <v-select v-model="formData.language" :items="languageOptions" item-title="label" item-value="value" :label="$t('users.language')" required variant="outlined" density="comfortable"></v-select>
          </v-form>
          <v-alert v-if="error" type="error" variant="tonal" class="mt-4" density="compact">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions class="bg-grey-lighten-4 px-6 py-4 rounded-b-lg">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="secondary" @click="closeDialog">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="submit">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Password Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="400px">
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2">
          Reset Password
        </v-card-title>
        <v-card-text class="px-6 pb-6 pt-2">
          <v-form ref="passwordForm" @submit.prevent="submitPassword">
            <v-text-field v-model="newPassword" :label="$t('users.newPassword')" type="password" :rules="[v => !!v || 'Required']" required variant="outlined" density="comfortable"></v-text-field>
          </v-form>
          <v-alert v-if="passwordError" type="error" variant="tonal" class="mt-4" density="compact">{{ passwordError }}</v-alert>
          <v-alert v-if="passwordSuccess" type="success" variant="tonal" class="mt-4" density="compact">Password updated successfully</v-alert>
        </v-card-text>
        <v-card-actions class="bg-grey-lighten-4 px-6 py-4 rounded-b-lg">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="secondary" @click="showPasswordDialog = false">Close</v-btn>
          <v-btn v-if="!passwordSuccess" color="primary" variant="flat" @click="submitPassword">Reset</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'

const items = ref([])
const roles = ref([])
const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' }
]
const headers = [
  { title: 'ID', key: 'id' },
  { title: t('users.username'), key: 'username' },
  { title: t('users.role'), key: 'role' },
  { title: t('common.status'), key: 'is_active' },
  { title: t('users.language'), key: 'language' },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'right' }
]

const showDialog = ref(false)
const editingId = ref(null)
const formData = ref({ username: '', password: '', role_id: null, language: 'en' })
const error = ref('')
const form = ref(null)

const showPasswordDialog = ref(false)
const passwordTarget = ref(null)
const newPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref(false)
const passwordForm = ref(null)
const pageError = ref('')

const load = async () => {
  pageError.value = ''
  const res = await window.api.getUsers()
  if (res.success) {
    items.value = res.data
  } else {
    pageError.value = res.error
  }
}

const loadRoles = async () => {
  const res = await window.api.getRoles()
  if (res.success) roles.value = res.data
}

onMounted(() => {
  load()
  loadRoles()
})

const openDialog = (item = null) => {
  error.value = ''
  if (item) {
    editingId.value = item.id
    formData.value = { 
      username: item.username, 
      password: '', 
      role_id: item.role_id, 
      language: item.language 
    }
  } else {
    editingId.value = null
    formData.value = { username: '', password: '', role_id: null, language: 'en' }
  }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  const payload = { ...formData.value }
  let res
  if (editingId.value) {
    delete payload.password
    res = await window.api.updateUser(editingId.value, payload)
  } else {
    res = await window.api.createUser(payload)
  }

  if (res.success) {
    closeDialog()
    load()
  } else {
    error.value = res.error
  }
}

const toggleActive = async (item, active) => {
  const res = await window.api.updateUser(item.id, { is_active: active })
  if (res.success) {
    load()
  } else {
    pageError.value = res.error
  }
}

const openPasswordDialog = (item) => {
  passwordTarget.value = item.id
  newPassword.value = ''
  passwordError.value = ''
  passwordSuccess.value = false
  showPasswordDialog.value = true
}

const submitPassword = async () => {
  const { valid } = await passwordForm.value.validate()
  if (!valid) return

  const res = await window.api.resetPassword(passwordTarget.value, newPassword.value)
  if (res.success) {
    passwordSuccess.value = true
    newPassword.value = ''
  } else {
    passwordError.value = res.error
  }
}
</script>
