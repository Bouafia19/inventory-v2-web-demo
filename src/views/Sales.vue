<template>
  <div>
    <PageHeader :title="$t('sales.title')" icon="mdi-cart-outline" iconColor="primary">
      <template #actions>
        <v-btn v-if="auth.hasPermission('sales:manage')" color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreateSale">{{ $t('sales.new') }}</v-btn>
      </template>
    </PageHeader>
    <v-card elevation="0" border rounded="lg">
      <div class="d-flex flex-wrap align-center gap-4 pa-4 bg-grey-lighten-4 border-b">
        <v-text-field
          v-model="filters.search"
          :label="$t('sales.search_placeholder')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-4"
          style="max-width: 300px;"
        ></v-text-field>
        <v-select
          v-model="filters.type"
          :items="[
            { title: $t('sales.allTypes'), value: 'all' },
            { title: $t('sales.receipt'), value: 'receipt' },
            { title: $t('sales.saleOrder'), value: 'saleOrder' },
            { title: $t('sales.proformaInvoice'), value: 'proformaInvoice' },
            { title: $t('sales.invoice'), value: 'invoice' }
          ]"
          :label="$t('sales.type')"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-4"
          style="max-width: 200px;"
          @update:modelValue="load"
        ></v-select>
        <v-text-field
          v-model="filters.startDate"
          :label="$t('sales.start_date')"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-4"
          style="max-width: 200px;"
          @change="load"
        ></v-text-field>
        <v-text-field
          v-model="filters.endDate"
          :label="$t('sales.end_date')"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-4"
          style="max-width: 200px;"
          @change="load"
        ></v-text-field>
        <v-btn color="primary" class="mr-2" @click="load">{{ $t('common.search') }}</v-btn>
        <v-btn color="grey" variant="text" @click="clearFilters">{{ $t('sales.clear') }}</v-btn>
      </div>
      <v-data-table class="primary-table" :headers="headers"
        :items="items"
        :loading="loading"
        hover
      >
      <template v-slot:no-data>
        <EmptyState icon="mdi-cart-outline" color="primary" :title="$t('sales.empty')" description="Record your first sale transaction." />
      </template>
      
        <template v-slot:item="{ item }">
          <tr :class="{ 'text-decoration-line-through text-grey': item.status === 'CANCELLED' }">
            <td>{{ item.code }}</td>
            <td>{{ new Date(item.date).toLocaleDateString() }}</td>
            <td>{{ item.customer_name }}</td>
            <td>
              <v-chip size="small" variant="tonal" color="indigo">{{ $t('sales.' + item.state) || item.state }}</v-chip>
            </td>
            <td class="text-right font-weight-bold">{{ (item.total_price / 100).toFixed(2) }}</td>
            <td class="text-right">
              <span :class="item.status === 'CANCELLED' ? '' : {'text-error': item.rest > 0, 'text-success': item.rest <= 0}">
                {{ (item.rest / 100).toFixed(2) }}
              </span>
            </td>
            <td>
              <v-chip size="small" :color="item.status === 'FINALIZED' ? 'success' : (item.status === 'CANCELLED' ? 'error' : 'grey')">
                {{ item.status }}
              </v-chip>
            </td>
            <td>
              <v-btn icon="mdi-eye" size="small" variant="text" color="info" @click="viewSale(item)"></v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <!-- Fullscreen Create Sale Dialog -->
    <v-dialog v-model="showCreateDialog" fullscreen hide-overlay transition="dialog-bottom-transition">
      <v-card class="d-flex flex-column bg-white" elevation="0" rounded="0">
        <v-toolbar border="b" class="bg-white" elevation="0">
          <v-btn icon="mdi-close" variant="text" @click="showCreateDialog = false"></v-btn>
          
          <v-toolbar-title>{{ editSaleId ? 'Edit Sale' : 'Create New Sale' }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="createSale" :loading="saving" prepend-icon="mdi-content-save" class="mr-4">{{ $t('sales.finalize') }}</v-btn>
        </v-toolbar>

        <v-card-text class="flex-grow-1 pa-4 overflow-y-auto">
          <v-alert
            v-if="editSaleId"
            type="info"
            variant="tonal"
            class="mb-4"
            icon="mdi-information"
          >
            {{ $t('sales.edit_note') }}
          </v-alert>
          <v-form ref="saleForm" @submit.prevent="createSale">
            <v-row>
              <!-- Sale Header Card -->
              <v-col cols="12">
                <v-card elevation="1" class="pa-4 mb-4">
                  <v-row>
                    <v-col cols="12" md="3">
                      <v-text-field v-model="form.code" :label="$t('sales.sale_code')" variant="outlined" density="comfortable" hide-details></v-text-field>
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field v-model="form.date" :label="$t('common.date')" type="date" variant="outlined" density="comfortable" hide-details></v-text-field>
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-select v-model="form.state" :items="['receipt', 'proformaInvoice', 'saleOrder', 'invoice']" :label="$t('sales.state')" variant="outlined" density="comfortable" hide-details></v-select>
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-autocomplete v-model.number="form.customerId" :items="customers" item-title="raison" item-value="id" label="Customer" variant="outlined" density="comfortable" hide-details clearable prepend-inner-icon="mdi-account"></v-autocomplete>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>

            <v-row>
              <!-- Sale Lines -->
              <v-col cols="12" lg="9">
                <v-card elevation="1">
                  <v-toolbar color="surface" flat border>
                    <v-toolbar-title class="text-subtitle-1 font-weight-medium">{{ $t('sales.sale_lines') }}</v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" @click="openProductPicker" prepend-icon="mdi-plus">Add Product</v-btn>
                  </v-toolbar>
                  <v-data-table
                    :headers="lineHeaders"
                    :items="form.lines"
                    hide-default-footer
                    disable-pagination
                    class="border-top"
                  >
                    <template v-slot:item.productId="{ item }">
                      <div class="text-body-2 font-weight-medium">{{ getProductNameDetailed(item.productId) }}</div>
                    </template>
                    <template v-slot:item.warehouse="{ item }">
                      <div class="text-body-2 text-medium-emphasis">{{ getWarehouseName(item.warehouseId) }}</div>
                    </template>
                    <template v-slot:item.stock="{ item }">
                      <v-chip size="small" :color="getAvailableStock(item.productId, item.warehouseId) < item.amount ? 'error' : 'success'">
                        {{ getAvailableStock(item.productId, item.warehouseId) }}
                      </v-chip>
                    </template>
                    <template v-slot:item.amount="{ item }">
                      <v-text-field v-model.number="item.amount" type="number" step="0.001" density="compact" hide-details variant="underlined" style="min-width: 80px;"></v-text-field>
                    </template>
                    <template v-slot:item.price="{ item }">
                      <MoneyInput v-model="item.price" density="compact" hide-details variant="underlined" />
                    </template>
                    <template v-slot:item.taxPercent="{ item }">
                      <v-select
                        v-model.number="item.taxPercent"
                        :items="taxes"
                        :item-title="t => `${t.name} — ${t.valueTax}%`"
                        item-value="valueTax"
                        density="compact"
                        hide-details
                        variant="underlined"
                        style="min-width: 150px;"
                      ></v-select>
                    </template>
                    <template v-slot:item.untaxed="{ item }">
                      {{ (computeLineUntaxed(item) / 100).toFixed(2) }}
                    </template>
                    <template v-slot:item.taxAmount="{ item }">
                      {{ (computeLineTax(item) / 100).toFixed(2) }}
                    </template>
                    <template v-slot:item.subtotal="{ item }">
                      <span class="font-weight-bold">{{ (computeLineSubtotal(item) / 100).toFixed(2) }}</span>
                    </template>
                    <template v-slot:item.actions="{ index }">
                      <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="form.lines.splice(index, 1)"></v-btn>
                    </template>
                  </v-data-table>
                </v-card>
              </v-col>

              <!-- Totals Sidebar -->
              <v-col cols="12" lg="3">
                <v-card elevation="1" class="pa-4 mb-4">
                  <div class="text-subtitle-1 font-weight-medium mb-3">{{ $t('sales.totals') }}</div>
                  <div class="d-flex justify-space-between mb-1">
                    <span class="text-medium-emphasis">{{ $t('sales.untaxed') }}</span>
                    <span>{{ (totalUntaxed / 100).toFixed(2) }}</span>
                  </div>
                  <div class="d-flex justify-space-between mb-3">
                    <span class="text-medium-emphasis">{{ $t('sales.taxes') }}</span>
                    <span>{{ (totalTaxes / 100).toFixed(2) }}</span>
                  </div>

                  <MoneyInput v-model="form.discount" :label="$t('common.discount')" density="compact" variant="outlined" hide-details class="mb-2" />
                  <MoneyInput v-model="form.stamp" :label="$t('common.stamp')" density="compact" variant="outlined" hide-details class="mb-4" />

                  <v-divider class="mb-4"></v-divider>

                  <div class="d-flex justify-space-between mb-4">
                    <span class="text-h6">{{ $t('common.grandTotal') }}</span>
                    <span class="text-h6 text-primary">{{ (grandTotal / 100).toFixed(2) }}</span>
                  </div>
                </v-card>

                <v-card elevation="1" class="pa-4">
                  <div class="text-subtitle-1 font-weight-medium mb-3">{{ $t('common.payment') }}</div>
                  <v-select v-model="form.paymentMethod" :items="['cash', 'check', 'virement']" :label="$t('sales.method')" variant="outlined" density="compact" hide-details class="mb-2"></v-select>

                  <v-text-field v-if="form.paymentMethod !== 'cash'" v-model="form.bank" :label="$t('sales.bank')" variant="outlined" density="compact" hide-details class="mb-2"></v-text-field>

                  <MoneyInput v-model="form.payment" :label="$t('sales.amount_tendered')" variant="outlined" density="compact" hide-details class="mb-4" />

                  <v-divider class="mb-4"></v-divider>

                  <div class="d-flex justify-space-between">
                    <span class="text-h6 text-medium-emphasis">{{ $t('common.rest') }}</span>
                    <span class="text-h6" :class="{'text-error': rest > 0}">{{ (rest / 100).toFixed(2) }}</span>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    
    <!-- Product Picker Dialog -->
    <v-dialog v-model="showProductPicker" max-width="800px" scrollable>
      <v-card>
        <v-toolbar color="surface" elevation="1">
          <v-toolbar-title>Select Product</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="showProductPicker = false"></v-btn>
        </v-toolbar>
        <div class="pa-4 bg-grey-lighten-4 border-b">
          <v-row>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="productSearch"
                prepend-inner-icon="mdi-magnify"
                label="Search product, SKU or barcode..."
                variant="solo"
                hide-details
                density="comfortable"
                clearable
                autofocus
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="selectedWarehouseFilter"
                :items="warehouses"
                item-title="name"
                item-value="id"
                label="Warehouse Filter"
                variant="solo"
                hide-details
                density="comfortable"
                clearable
              >
                <template v-slot:prepend-item>
                  <v-list-item title="All Warehouses" @click="selectedWarehouseFilter = null"></v-list-item>
                  <v-divider></v-divider>
                </template>
              </v-select>
            </v-col>
          </v-row>
        </div>
        <v-card-text class="pa-0" style="background-color: #f9f9f9;">
          <div v-if="filteredProducts.length === 0" class="pa-8 text-center text-grey">
            No products found.
          </div>
          <template v-else>
            <template v-for="warehouse in displayedWarehouses" :key="warehouse.id">
              <div class="mb-6 pa-4">
                <div class="d-flex align-center mb-3">
                  <v-icon color="primary" class="mr-2">mdi-warehouse</v-icon>
                  <span class="text-h6 font-weight-bold">{{ warehouse.name }}</span>
                </div>
                <v-divider class="mb-3"></v-divider>
                
                <div v-if="getProductsForWarehouse(warehouse.id).length === 0" class="pa-8 text-center text-grey border bg-white rounded">
                  No products found in this warehouse.
                </div>
                
                <v-row v-else>
                  <v-col cols="12" sm="6" v-for="product in getProductsForWarehouse(warehouse.id)" :key="product.id">
                    <v-card elevation="1" hover @click="selectProductAndWarehouse(product, warehouse.id)" class="h-100">
                      <div class="d-flex pa-3">
                        <v-avatar rounded="lg" size="64" color="grey-lighten-3" class="mr-3">
                          <v-img v-if="product.photo" :src="'app-image://' + product.photo" cover></v-img>
                          <v-icon v-else size="32" color="grey">mdi-package-variant</v-icon>
                        </v-avatar>
                        <div class="flex-grow-1 overflow-hidden">
                          <div class="text-subtitle-1 font-weight-bold text-truncate" :title="product.name">{{ product.name }}</div>
                          <div class="text-caption text-grey text-truncate">
                            <span v-if="product.code">SKU: {{ product.code }}</span>
                            <span v-if="product.barcode" class="ml-2">BC: {{ product.barcode }}</span>
                          </div>
                          <div class="d-flex justify-space-between align-center mt-2">
                            <div class="text-primary font-weight-bold">{{ (product.salePrice / 100).toFixed(2) }}</div>
                            <v-chip size="small" :color="getAvailableStock(product.id, warehouse.id) > 0 ? 'success' : 'error'" variant="flat">
                              Stock: {{ getAvailableStock(product.id, warehouse.id) }}
                            </v-chip>
                          </div>
                        </div>
                      </div>
                      <v-divider></v-divider>
                      <v-card-actions class="pa-2 bg-grey-lighten-5">
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="text" size="small" @click.stop="selectProductAndWarehouse(product, warehouse.id)">
                          Select
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
              </div>
            </template>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- View Sale Read-Only Dialog -->
    <v-dialog v-model="showViewDialog" max-width="900px" class="sale-view-dialog">
      <v-card v-if="viewingSale">
        <v-toolbar color="info" dark>
          <v-toolbar-title>Sale {{ viewingSale.code }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="showViewDialog = false"></v-btn>
        </v-toolbar>
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="6">
              <div><strong>Customer:</strong> {{ viewingSale.customer_name }}</div>
              <div><strong>Date:</strong> {{ new Date(viewingSale.date).toLocaleDateString() }}</div>
              <div><strong>State:</strong> {{ viewingSale.state }}</div>
            </v-col>
            <v-col cols="6" class="text-right">
              <div><strong>Payment Method:</strong> {{ viewingSale.payment_method }}</div>
              <div v-if="viewingSale.bank"><strong>Bank:</strong> {{ viewingSale.bank }}</div>
              <div><strong>Status:</strong> {{ viewingSale.status }}</div>
            </v-col>
          </v-row>
          <v-divider class="my-4"></v-divider>
          <div class="text-subtitle-1 mb-2">{{ $t('sales.lines') }}</div>
          <v-table density="compact" class="border">
            <thead>
              <tr>
                <th>{{ $t('inventory.product') }}</th>
                <th class="text-right">{{ $t('common.qty') }}</th>
                <th class="text-right">{{ $t('sales.price') }}</th>
                <th class="text-right">{{ $t('common.taxPercent') }}</th>
                <th class="text-right">{{ $t('sales.untaxed') }}</th>
                <th class="text-right">{{ $t('sales.taxes') }}</th>
                <th class="text-right">{{ $t('common.subtotal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in viewingSale.lines" :key="line.id">
                <td>{{ line.product_code }} - {{ line.product_name }}</td>
                <td class="text-right">{{ line.amount }}</td>
                <td class="text-right">{{ (line.price / 100).toFixed(2) }}</td>
                <td class="text-right">{{ line.tax_percent }}%</td>
                <td class="text-right">{{ (line.untaxed_amount / 100).toFixed(2) }}</td>
                <td class="text-right">{{ (line.taxes / 100).toFixed(2) }}</td>
                <td class="text-right font-weight-bold">{{ (line.subtotal / 100).toFixed(2) }}</td>
              </tr>
            </tbody>
          </v-table>
          <v-divider class="my-4"></v-divider>
          <v-row>
            <v-spacer></v-spacer>
            <v-col cols="4">
              <div class="d-flex justify-space-between"><span>Untaxed:</span> <span>{{ (viewingSale.total_untaxed / 100).toFixed(2) }}</span></div>
              <div class="d-flex justify-space-between"><span>Taxes:</span> <span>{{ (viewingSale.total_taxes / 100).toFixed(2) }}</span></div>
              <div class="d-flex justify-space-between"><span>{{ $t('common.discount') }}:</span> <span>{{ (viewingSale.discount / 100).toFixed(2) }}</span></div>
              <div class="d-flex justify-space-between"><span>Stamp:</span> <span>{{ (viewingSale.stamp / 100).toFixed(2) }}</span></div>
              <v-divider class="my-2"></v-divider>
              <div class="d-flex justify-space-between text-h6"><span>{{ $t('common.total') }}:</span> <span>{{ (viewingSale.total_price / 100).toFixed(2) }}</span></div>
              <div class="d-flex justify-space-between mt-2"><span>Payment:</span> <span>{{ (viewingSale.payment / 100).toFixed(2) }}</span></div>
              <div class="d-flex justify-space-between"><span>Rest:</span> <span>{{ (viewingSale.rest / 100).toFixed(2) }}</span></div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-btn
            v-if="viewingSale && viewingSale.state !== 'receipt'"
            color="info"
            variant="flat"
            prepend-icon="mdi-file-document-outline"
            @click="openDocPreview(viewingSale)"
          >
            {{ $t('common.preview_pdf') || 'Preview PDF' }}
          </v-btn>
          <v-btn
            v-if="viewingSale && viewingSale.state === 'receipt'"
            color="primary"
            variant="flat"
            prepend-icon="mdi-file-document-outline"
            @click="openReceiptPreview(viewingSale)"
          >
            {{ $t('sales.preview_receipt') || 'Preview Receipt' }}
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            v-if="auth.hasPermission('sales:delete') && viewingSale.status === 'FINALIZED'"
            color="error"
            variant="flat"
            prepend-icon="mdi-cancel"
            @click="showCancelConfirm = true"
          >
            Void Sale
          </v-btn>
          <v-btn
            v-if="auth.hasPermission('sales:manage') && viewingSale.status === 'FINALIZED'"
            color="primary"
            variant="flat"
            prepend-icon="mdi-pencil"
            class="ml-2"
            @click="openEditSale"
          >
            Edit Sale
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showViewDialog = false">{{ $t('common.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Void Confirm Dialog -->
    <v-dialog v-model="showCancelConfirm" max-width="500px">
      <v-card>
        <v-card-title class="text-error font-weight-bold">{{ $t('sales.confirm_void_sale') }}</v-card-title>
        <v-card-text>
          <p class="mb-2">{{ $t('sales.void_warning') }}</p>
          <ul class="ml-4 mb-4">
            <li>{{ $t('sales.void_li1') }}</li>
            <li>{{ $t('sales.void_li2') }}</li>
            <li>{{ $t('sales.void_li3') }}</li>
            <li>{{ $t('sales.void_li4') }}</li>
          </ul>
          <p class="font-weight-bold">{{ $t('sales.cannot_be_undone') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showCancelConfirm = false">{{ $t('sales.back') }}</v-btn>
          <v-btn color="error" @click="confirmCancelSale" :loading="cancelling">{{ $t('sales.confirm_void') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Document / Receipt PDF Preview Dialog -->
    <DocumentPreviewDialog
      v-model="showPreviewDialog"
      :document-type="previewDocType"
      :document-id="previewDocId"
      :document-code="previewSaleCode"
    />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { ref, computed, onMounted } from 'vue'
import IconBox from '../components/IconBox.vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import MoneyInput from '../components/MoneyInput.vue'
import DocumentPreviewDialog from '../components/DocumentPreviewDialog.vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const items = ref([])
const loading = ref(false)
const headers = [
  { title: t('common.code'), key: 'code' },
  { title: t('common.date'), key: 'date' },
  { title: t('sales.customer'), key: 'customer_name' },
  { title: t('sales.type'), key: 'state' },
  { title: t('common.total'), key: 'total_price', align: 'end' },
  { title: 'Rest', key: 'rest', align: 'end' },
  { title: t('common.status'), key: 'status' },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'center' }
]

const lineHeaders = [
  { title: 'Product', key: 'productId', width: '25%' },
  { title: 'Warehouse', key: 'warehouse', width: '15%' },
  { title: 'Stock', key: 'stock', width: '8%' },
  { title: 'Qty', key: 'amount', width: '10%' },
  { title: 'Price (¢)', key: 'price', width: '12%' },
  { title: 'Tax %', key: 'taxPercent', width: '8%' },
  { title: 'Untaxed', key: 'untaxed', align: 'end' },
  { title: 'Tax Amt', key: 'taxAmount', align: 'end' },
  { title: 'Subtotal', key: 'subtotal', align: 'end' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: '50px' }
]

const showCreateDialog = ref(false)
const showViewDialog = ref(false)
const viewingSale = ref(null)
const showPreviewDialog = ref(false)
const previewDocType = ref('receipt')
const previewDocId = ref(null)
const previewSaleCode = ref('')

const openReceiptPreview = (sale) => {
  if (!sale || !sale.id) return
  previewDocType.value = 'receipt'
  previewDocId.value = sale.id
  previewSaleCode.value = sale.code || ''
  showPreviewDialog.value = true
}

const openDocPreview = (sale) => {
  if (!sale || !sale.id) return
  let docType = sale.state
  if (sale.state === 'proformaInvoice') docType = 'proforma'
  previewDocType.value = docType
  previewDocId.value = sale.id
  previewSaleCode.value = sale.code || ''
  showPreviewDialog.value = true
}

const printDocument = (sale) => {
  openDocPreview(sale)
}

const downloadReceipt = (sale) => openReceiptPreview(sale)

const saving = ref(false)
const saleForm = ref(null)
const editSaleId = ref(null)

const form = ref({
  code: '',
  date: new Date().toISOString().substring(0,10),
  customerId: null,
  discount: 0,
  stamp: 0,
  payment: 0,
  state: 'receipt',
  paymentMethod: 'cash',
  bank: '',
  lines: []
})

const customers = ref([])
const warehouses = ref([])
const products = ref([])
const inventory = ref([])
const taxes = ref([])

const filters = ref({
  search: '',
  type: 'all',
  startDate: '',
  endDate: ''
})

const clearFilters = () => {
  filters.value = { search: '', type: 'all', startDate: '', endDate: '' }
  load()
}

const load = async () => {
  if (filters.value.startDate && filters.value.endDate && filters.value.startDate > filters.value.endDate) {
    window.toast.error(t('sales.date_error'))
    return
  }
  loading.value = true
  try {
    const payload = {}
    if (filters.value.search) payload.search = filters.value.search.trim()
    if (filters.value.startDate) payload.startDate = filters.value.startDate
    if (filters.value.endDate) payload.endDate = filters.value.endDate
    if (filters.value.type && filters.value.type !== 'all') payload.state = filters.value.type

    const [sRes, cRes, wRes, pRes, iRes, tRes] = await Promise.all([
      window.api.getSales(payload),
      window.api.getCustomers(),
      window.api.getWarehouses(),
      window.api.getProducts(),
      window.api.getInventoryList(),
      window.api.getTaxes()
    ])
    if (sRes.success !== false) items.value = Array.isArray(sRes?.data) ? sRes.data : (Array.isArray(sRes) ? sRes : [])
    if (cRes.success !== false) customers.value = Array.isArray(cRes?.data) ? cRes.data : (Array.isArray(cRes) ? cRes : [])
    if (wRes.success !== false) warehouses.value = Array.isArray(wRes?.data) ? wRes.data : (Array.isArray(wRes) ? wRes : [])
    if (pRes.success !== false) products.value = Array.isArray(pRes?.data) ? pRes.data : (Array.isArray(pRes) ? pRes : [])
    if (iRes.success !== false) inventory.value = Array.isArray(iRes?.data) ? iRes.data : (Array.isArray(iRes) ? iRes : [])
    if (tRes.success !== false) taxes.value = Array.isArray(tRes?.data) ? tRes.data : (Array.isArray(tRes) ? tRes : [])
  } finally {
    loading.value = false
  }
}


const showProductPicker = ref(false)
const productSearch = ref('')
const selectedWarehouseFilter = ref(null)

const openProductPicker = () => {
  productSearch.value = ''
  selectedWarehouseFilter.value = null
  showProductPicker.value = true
}

const filteredProducts = computed(() => {
  if (!productSearch.value) return products.value
  const q = productSearch.value.toLowerCase()
  return products.value.filter(p => 
    (p.name && p.name.toLowerCase().includes(q)) || 
    (p.code && p.code.toLowerCase().includes(q)) ||
    (p.barcode && p.barcode.toLowerCase().includes(q))
  )
})

const displayedWarehouses = computed(() => {
  if (selectedWarehouseFilter.value) {
    const filterId = typeof selectedWarehouseFilter.value === 'object' ? selectedWarehouseFilter.value.id : selectedWarehouseFilter.value;
    return warehouses.value.filter(w => w.id == filterId)
  }
  return warehouses.value
})
const getProductsForWarehouse = (warehouseId) => filteredProducts.value.filter(p => inventory.value.some(i => i.product_id === p.id && i.warehouse_id === warehouseId))

const getProductName = (id) => {
  const p = products.value.find(p => p.id === id)
  return p ? p.name : ''
}

const getProductNameDetailed = (id) => {
  const p = products.value.find(p => p.id === id)
  if (!p) return ''
  return p.code ? `${p.code} - ${p.name}` : p.name
}

const getWarehouseName = (id) => {
  const w = warehouses.value.find(w => w.id === id)
  return w ? w.name : ''
}

const selectProductAndWarehouse = (product, warehouseId) => {
  const existing = form.value.lines.find(l => l.productId === product.id && l.warehouseId === warehouseId)
  if (existing) {
    if (existing.amount < getAvailableStock(product.id, warehouseId)) {
      existing.amount += 1
    } else {
      window.toast.error(t('sales.out_of_stock') || 'Not enough stock available')
    }
  } else {
    if (getAvailableStock(product.id, warehouseId) > 0) {
      const newLine = { productId: product.id, warehouseId: warehouseId, amount: 1, price: 0, taxPercent: 0 }
      onProductSelected(newLine)
      form.value.lines.push(newLine)
    } else {
      window.toast.error(t('sales.out_of_stock') || 'Not enough stock available')
    }
  }
  showProductPicker.value = false
}

const openCreateSale = async () => {
  editSaleId.value = null
  const codeRes = await window.api.getNextSaleCode()

  // Ensure customers are loaded to avoid E2E flakiness
  if (!Array.isArray(customers.value) || customers.value.length === 0) {
    const cRes = await window.api.getCustomers()
    customers.value = Array.isArray(cRes?.data) ? cRes.data : (Array.isArray(cRes) ? cRes : [])
  }

  form.value = {
    code: codeRes.success ? codeRes.data : '',
    date: new Date().toISOString().substring(0,10),
    customerId: customers.value.length ? customers.value[0].id : null,
    
    discount: 0,
    stamp: 0,
    payment: 0,
    state: 'receipt',
    paymentMethod: 'cash',
    bank: '',
    lines: []
  }
  showCreateDialog.value = true
}

const openEditSale = () => {
  if (!viewingSale.value) return

  editSaleId.value = viewingSale.value.id
  form.value = {
    code: viewingSale.value.code, // Backend ignores this for edits, but UI displays it
    date: new Date(viewingSale.value.date).toISOString().substring(0, 10),
    customerId: viewingSale.value.customer_id,
    
    discount: viewingSale.value.discount,
    stamp: viewingSale.value.stamp,
    payment: viewingSale.value.payment,
    state: viewingSale.value.state,
    paymentMethod: viewingSale.value.payment_method,
    bank: viewingSale.value.bank || '',
    lines: viewingSale.value.lines.map(l => ({
      productId: l.product_id,
      warehouseId: l.warehouse_id,
      amount: l.amount,
      price: l.price,
      taxPercent: l.tax_percent
    }))
  }

  showViewDialog.value = false
  showCreateDialog.value = true
}



const getAvailableStock = (productId, warehouseId) => {
  if (!productId || !warehouseId) return 0
  const stock = inventory.value.find(s => s.product_id === productId && s.warehouse_id === warehouseId)
  return stock ? stock.quantity : 0
}

const onProductSelected = (line) => {
  const product = products.value.find(p => p.id === line.productId)
  if (product) {
    line.price = product.salePrice || 0
    if (product.tax_id) {
      const defaultTax = taxes.value.find(t => t.id === product.tax_id)
      line.taxPercent = defaultTax ? defaultTax.valueTax : 0
    } else {
      line.taxPercent = 0
    }
  }
}

// Computations
const computeLineUntaxed = (line) => Math.round((line.price || 0) * (line.amount || 0))
const computeLineTax = (line) => Math.round((computeLineUntaxed(line) * (line.taxPercent || 0)) / 100)
const computeLineSubtotal = (line) => computeLineUntaxed(line) + computeLineTax(line)

const totalUntaxed = computed(() => form.value.lines.reduce((sum, line) => sum + computeLineUntaxed(line), 0))
const totalTaxes = computed(() => form.value.lines.reduce((sum, line) => sum + computeLineTax(line), 0))
const grandTotal = computed(() => totalUntaxed.value + totalTaxes.value - (form.value.discount || 0) + (form.value.stamp || 0))
const rest = computed(() => grandTotal.value - (form.value.payment || 0))

const viewSale = async (item) => {
  const res = await window.api.getSale(item.id)
  if (res.success) {
    viewingSale.value = res.data
    showViewDialog.value = true
  } else {
    window.toast.error(t('sales.load_error') + ': ' + res.error)
  }
}

const createSale = async () => {
  if (!form.value.customerId && customers.value.length > 0) {
    form.value.customerId = customers.value[0].id;
  }
  if (!form.value.customerId) return window.toast.error(t('sales.customer_req'))
  
  if (form.value.lines.length === 0) return window.toast.error(t('sales.line_req'))
  for (const line of form.value.lines) {
    if (!line.productId) return window.toast.error(t('sales.product_req'))
    if (!line.warehouseId) return window.toast.error('Warehouse is required for all lines')
  }

  saving.value = true
  try {
    const payload = {
      code: String(form.value.code || '').trim(),
      date: new Date(form.value.date).toISOString(),
      customerId: parseInt(form.value.customerId, 10),
      
      discount: parseInt(form.value.discount || 0, 10),
      stamp: parseInt(form.value.stamp || 0, 10),
      payment: parseInt(form.value.payment || 0, 10),
      state: String(form.value.state || 'receipt'),
      paymentMethod: String(form.value.paymentMethod || 'cash'),
      bank: form.value.paymentMethod !== 'cash' ? String(form.value.bank || '').trim() : null,
      lines: form.value.lines.map(line => ({
        productId: parseInt(line.productId, 10),
        warehouseId: parseInt(line.warehouseId, 10),
        amount: parseFloat(line.amount) || 0,
        price: parseInt(line.price || 0, 10),
        taxPercent: parseInt(line.taxPercent || 0, 10)
      }))
    }

    let res;
    if (editSaleId.value) {
      res = await window.api.editSale(editSaleId.value, payload)
    } else {
      res = await window.api.createSale(payload)
    }

    if (res.success) {
      showCreateDialog.value = false
      await load()
      // If it was an edit, we might want to pop up the viewer on the new sale, but refreshing list is enough
      if (editSaleId.value) {
        viewSale({ id: res.data.id })
      }
    } else {
      window.toast.error(t('sales.save_error') + ': ' + res.error)
    }
  } finally {
    saving.value = false
  }
}

const showCancelConfirm = ref(false)
const cancelling = ref(false)

const confirmCancelSale = async () => {
  if (!viewingSale.value) return
  cancelling.value = true
  try {
    const res = await window.api.cancelSale(viewingSale.value.id)
    if (res.success) {
      showCancelConfirm.value = false
      showViewDialog.value = false
      await load() // refresh data table
    } else {
      window.toast.error(t('sales.cancel_error') + ': ' + res.error)
    }
  } catch (error) {
    window.toast.error(t('sales.error_cancelling') + ': ' + error.message)
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  load()
})
</script>
