<template>
  <div>
    <PageHeader :title="$t('roles.title')" icon="mdi-shield-account-outline" iconColor="primary">
      <template #actions>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openDialog()">{{ $t('roles.createRole') }}</v-btn>
      </template>
    </PageHeader>
    
    <v-alert v-if="pageError" type="error" variant="tonal" class="mb-4" closable @click:close="pageError = ''">{{ pageError }}</v-alert>
    <v-card elevation="0" border rounded="lg">
      <v-data-table class="primary-table" :headers="headers" :items="items">
        <template v-slot:item.is_system="{ item }">
          <v-chip v-if="item.is_system" color="error" size="small" variant="flat">{{ $t('roles.systemRole') }}</v-chip>
          <v-chip v-else color="success" size="small" variant="flat">{{ $t('roles.customRole') }}</v-chip>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" color="primary" class="me-2" @click="openDialog(item)"></v-btn>
          <v-btn v-if="!item.is_system" icon="mdi-delete" size="small" color="error" @click="confirmDelete(item)"></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="showDialog" max-width="800px">
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2">
          {{ editingId ? $t('roles.editRole') : $t('roles.createRole') }}
          <v-btn icon="mdi-close" variant="text" size="small" class="float-end" @click="closeDialog"></v-btn>
        </v-card-title>
        <v-card-text class="px-6 pb-6 pt-2">
          <v-form ref="form" @submit.prevent="submit">
            <v-text-field v-model="formData.name" :label="$t('roles.roleName')" :disabled="formData.is_system" :rules="[v => !!v || $t('common.required', 'Required')]" required variant="outlined" density="comfortable" class="mb-4"></v-text-field>
            <v-textarea v-model="formData.description" :label="$t('roles.description')" variant="outlined" density="comfortable" class="mb-4" rows="2"></v-textarea>
            
            <div class="text-subtitle-1 font-weight-bold mb-2">{{ $t('roles.permissions') }}</div>
            <div class="mb-4">
              <v-btn size="small" variant="tonal" class="me-2" @click="selectAll" :disabled="formData.is_system && formData.name === 'Admin'">{{ $t('roles.selectAll') }}</v-btn>
              <v-btn size="small" variant="tonal" color="error" @click="clearAll" :disabled="formData.is_system && formData.name === 'Admin'">{{ $t('roles.clearAll') }}</v-btn>
            </div>
            
            <v-row>
              <v-col cols="12" md="6" v-for="(perms, module) in groupedPermissions" :key="module">
                <v-card variant="outlined" class="mb-4">
                  <v-card-title class="bg-grey-lighten-4 py-2 text-subtitle-2 text-uppercase d-flex justify-space-between align-center">
                    {{ module }}
                    <div>
                      <v-btn size="x-small" variant="text" @click="selectModule(module)" :disabled="formData.is_system && formData.name === 'Admin'">{{ $t('common.all') }}</v-btn>
                      <v-btn size="x-small" variant="text" color="error" @click="clearModule(module)" :disabled="formData.is_system && formData.name === 'Admin'">{{ $t('common.none') }}</v-btn>
                    </div>
                  </v-card-title>
                  <v-card-text class="pt-3">
                    <v-checkbox
                      v-for="perm in perms"
                      :key="perm.value"
                      v-model="formData.permissions"
                      :value="perm.value"
                      :label="perm.label"
                      density="compact"
                      hide-details
                      class="mt-0"
                      :disabled="formData.is_system && formData.name === 'Admin'"
                    ></v-checkbox>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-form>
          <v-alert v-if="error" type="error" variant="tonal" class="mt-4" density="compact">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions class="bg-grey-lighten-4 px-6 py-4 rounded-b-lg">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="secondary" @click="closeDialog">{{ $t('roles.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="submit">{{ $t('roles.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/PageHeader.vue'

const items = ref([])
const { t } = useI18n()
const headers = computed(() => [
  { title: t('common.id', 'ID'), key: 'id' },
  { title: t('roles.roleName'), key: 'name' },
  { title: t('roles.description'), key: 'description' },
  { title: t('roles.type'), key: 'is_system' },
  { title: t('common.actions', 'Actions'), key: 'actions', sortable: false, align: 'right' }
])

const showDialog = ref(false)
const editingId = ref(null)
const formData = ref({ name: '', description: '', is_system: false, permissions: [] })
const error = ref('')
const pageError = ref('')
const form = ref(null)

const AVAILABLE_PERMISSIONS = [
  'products:view', 'products:create', 'products:update', 'products:delete',
  'customers:view', 'customers:create', 'customers:update', 'customers:delete',
  'vendors:view', 'vendors:create', 'vendors:update', 'vendors:delete',
  'warehouses:view', 'warehouses:create', 'warehouses:update', 'warehouses:delete',
  'sales:view', 'sales:create', 'sales:update', 'sales:delete',
  'purchases:view', 'purchases:create', 'purchases:update', 'purchases:delete',
  'inventory:view', 'inventory:manage', 'inventory:valuation',
  'receivables:view', 'receivables:settle',
  'payables:view', 'payables:settle',
  'pos:access', 'pos:sell', 'pos:open_register', 'pos:close_register', 'pos:hold',
  'reports:view',
  'users:view', 'users:create', 'users:update', 'users:delete',
  'roles:view', 'roles:create', 'roles:update', 'roles:delete',
  'settings:view', 'settings:update',
  'finance:view', 'finance:manage',
  'invoices:view',
  'backup:manage',
  'master_data:manage'
]

const groupedPermissions = computed(() => {
  const groups = {}
  AVAILABLE_PERMISSIONS.forEach(p => {
    const parts = p.split(':')
    const module = parts[0].toUpperCase()
    const action = parts[1]
    
    if (!groups[module]) groups[module] = []
    
    groups[module].push({
      value: p,
      label: t('roles.' + action) || action.charAt(0).toUpperCase() + action.slice(1)
    })
  })
  return groups
})

const load = async () => {
  pageError.value = ''
  const res = await window.api.getRoles()
  if (res.success) {
    items.value = res.data
  } else {
    if (res.error.includes('Forbidden')) pageError.value = t('roles.forbidden')
    else pageError.value = res.error
  }
}

onMounted(() => {
  load()
})

const openDialog = async (item = null) => {
  error.value = ''
  if (item) {
    editingId.value = item.id
    const res = await window.api.getRole(item.id)
    if (res.success) {
      formData.value = { 
        name: res.data.name, 
        description: res.data.description, 
        is_system: res.data.is_system,
        permissions: res.data.permissions || []
      }
    } else {
      if (res.error.includes('Forbidden')) pageError.value = t('roles.forbidden')
      else pageError.value = res.error
      return
    }
  } else {
    editingId.value = null
    formData.value = { name: '', description: '', is_system: false, permissions: [] }
  }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const selectAll = () => {
  formData.value.permissions = [...AVAILABLE_PERMISSIONS]
}

const clearAll = () => {
  formData.value.permissions = []
}

const selectModule = (module) => {
  const modulePerms = groupedPermissions.value[module].map(p => p.value)
  const current = new Set(formData.value.permissions)
  modulePerms.forEach(p => current.add(p))
  formData.value.permissions = Array.from(current)
}

const clearModule = (module) => {
  const modulePerms = groupedPermissions.value[module].map(p => p.value)
  formData.value.permissions = formData.value.permissions.filter(p => !modulePerms.includes(p))
}

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  const payload = { 
    name: formData.value.name,
    description: formData.value.description
  }
  
  if (!(formData.value.is_system && formData.value.name === 'Admin')) {
    payload.permissions = [...formData.value.permissions]
  }
  
  let res
  if (editingId.value) {
    res = await window.api.updateRole(editingId.value, payload)
  } else {
    res = await window.api.createRole(payload)
  }

  if (res.success) {
    closeDialog()
    load()
  } else {
    if (res.error.includes('system role')) error.value = t('roles.cannotModifySystem')
    else if (res.error.includes('Forbidden')) error.value = t('roles.forbidden')
    else error.value = res.error
  }
}

const confirmDelete = async (item) => {
  if (confirm(t('roles.confirmDelete') + '\n' + item.name)) {
    const res = await window.api.deleteRole(item.id)
    if (res.success) {
      load()
    } else {
      if (res.error.includes('system role')) pageError.value = t('roles.cannotDeleteSystem')
      else if (res.error.includes('users assigned')) pageError.value = t('roles.usersAssigned')
      else if (res.error.includes('Forbidden')) pageError.value = t('roles.forbidden')
      else pageError.value = res.error
    }
  }
}
</script>
