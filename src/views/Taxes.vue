<template>
  <div>
    <PageHeader :title="$t('taxes.title')" icon="mdi-percent-outline" iconColor="success">
      <template #actions>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreateDialog">{{ $t('taxes.new') }}</v-btn>
      </template>
    </PageHeader>
    
    <v-card elevation="0" border rounded="lg">
      <v-data-table class="primary-table" :headers="headers" :items="items" hover>
      <template v-slot:no-data>
        <EmptyState icon="mdi-percent-outline" color="success" :title="$t('common.noData')" :description="$t('common.noData')" />
      </template>
      
        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn icon="mdi-pencil-outline" variant="text" size="small" color="primary" @click="openEditDialog(item)" class="mr-1"></v-btn>
            <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="remove(item.id)"></v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="showDialog" max-width="500px">
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2">
          {{ editingId ? $t('taxes.editTitle') : $t('taxes.createTitle') }}
          <v-btn icon="mdi-close" variant="text" size="small" class="float-right" @click="closeDialog" />
        </v-card-title>
        <v-card-text class="px-6 pb-6 pt-2">
          <v-form ref="form" @submit.prevent="submit">
            <v-text-field
              v-model="formData.name"
              :label="$t('taxes.name')"
              :rules="[v => !!v || 'Name is required']"
              required
              variant="outlined"
              density="comfortable"
              class="mb-4"
            />

            <v-text-field
              v-model.number="formData.valueTax"
              :label="$t('taxes.value')"
              type="number"
              :rules="[v => v >= 0 || 'Tax must be positive']"
              required
              variant="outlined"
              density="comfortable"
            ></v-text-field>
          </v-form>
          <v-alert v-if="error" type="error" variant="tonal" class="mt-2 text-body-2" density="compact">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions class="bg-grey-lighten-4 px-6 py-4 rounded-b-lg">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="secondary" @click="closeDialog">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="submit">{{ $t('common.create') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog ref="confirmDialogRef" />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const items = ref([])
const headers = [
  { title: 'ID', key: 'id' },
  { title: t('common.name'), key: 'name' },
  { title: t('taxes.value'), key: 'valueTax' },
  { title: t('common.actions'), key: 'actions', sortable: false }
]

const showDialog = ref(false)
const formData = ref({ name: '', valueTax: 0 })
const error = ref('')
const form = ref(null)
const editingId = ref(null)

const load = async () => {
  const res = await window.api.getTaxes()
  if (res.success) items.value = res.data
}

const openCreateDialog = () => {
  editingId.value = null
  formData.value = { name: '', valueTax: 0 }
  error.value = ''
  showDialog.value = true
}

const openEditDialog = (item) => {
  editingId.value = item.id
  formData.value = { name: item.name, valueTax: item.valueTax }
  error.value = ''
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  const payload = { name: String(formData.value.name || '').trim(), valueTax: Number(formData.value.valueTax) }
  let res; if (editingId.value) { res = await window.api.updateTax(editingId.value, payload) } else { res = await window.api.createTax(payload) }
  if (res.success) {
    window.toast.success(editingId.value ? 'Tax updated' : 'Tax created')
    closeDialog()
    load()
  } else {
    error.value = res.error
  }
}

const confirmDialogRef = ref(null)

const remove = async (id) => {
  const confirmed = await confirmDialogRef.value.open({
    title: t('common.delete'),
    message: t('common.confirm'),
    confirmText: t('common.delete'),
    destructive: true
  })
  if (confirmed) {
    const res = await window.api.deleteTax(id)
    if (res.success) {
      window.toast.success('Tax deleted')
      load()
    } else {
      window.toast.error('Error deleting: ' + res.error)
    }
  }
}

onMounted(load)
</script>
