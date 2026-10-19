<template>
  <div>
    <PageHeader :title="$t('products.title')" icon="mdi-package-variant-closed" iconColor="primary">
      <template #actions>
        <v-btn variant="outlined" color="primary" class="mr-2" prepend-icon="mdi-upload" @click="showImportDialog = true">{{ $t('excel.import') }}</v-btn>
        <v-btn variant="outlined" color="primary" class="mr-2" prepend-icon="mdi-download" @click="exportData">{{ $t('excel.export') }}</v-btn>
        <v-btn variant="outlined" color="primary" class="mr-2" prepend-icon="mdi-printer" @click="openPrintProductsDialog()">{{ $t('products.printProducts') }}</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openDialog()">{{ $t('products.new') }}</v-btn>
      </template>
    </PageHeader>

    <!-- Filter bar -->
    <v-card elevation="0" border rounded="lg" class="mb-4">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" sm="4" md="3">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              :label="$t('common.search')"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3" md="2">
            <v-autocomplete
              v-model="filterFamily"
              :items="families"
              item-title="name"
              item-value="id"
              :label="$t('products.filterCategory')"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3" md="2">
            <v-autocomplete
              v-model="filterBrand"
              :items="brands"
              item-title="name"
              item-value="id"
              :label="$t('products.filterBrand')"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3" md="2">
            <v-select
              v-model="filterStock"
              :items="stockFilterOptions"
              item-title="title"
              item-value="value"
              :label="$t('products.filterStock')"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="auto" class="d-flex align-center gap-2">
            <v-btn
              v-if="hasActiveFilters"
              variant="text"
              color="secondary"
              size="small"
              prepend-icon="mdi-filter-remove-outline"
              @click="clearFilters"
            >
              {{ $t('products.clearFilters') }}
            </v-btn>
            <v-chip v-if="selectedProducts.length > 0" size="small" color="primary" variant="tonal" class="ml-auto">
              {{ $t('products.selectedCount', { count: selectedProducts.length }) }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card elevation="0" border rounded="lg">
      <v-data-table
        class="primary-table"
        :headers="headers"
        :items="filteredItems"
        v-model="selectedProducts"
        show-select
        return-object
        item-value="id"
        v-model:sort-by="sortBy"
        v-model:page="currentPage"
        :items-per-page="itemsPerPage"
        hover
      >
        <template v-slot:no-data>
          <EmptyState
            icon="mdi-package-variant-closed"
            color="primary"
            :title="$t('products.empty')"
            :description="$t('products.emptyDesc')"
          />
        </template>

        <template v-slot:item.photo="{ item }">
          <div class="py-1">
            <v-avatar size="36" rounded="md" color="grey-lighten-3">
              <v-img v-if="item.photo" :src="getImageSrc(item.photo)" cover>
                <template #error>
                  <v-icon size="20" color="grey">mdi-image-broken</v-icon>
                </template>
              </v-img>
              <v-icon v-else size="20" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
            </v-avatar>
          </div>
        </template>

        <template v-slot:item.barcode="{ item }">
          <span v-if="item.barcode" class="font-mono text-caption">{{ item.barcode }}</span>
          <span v-else class="text-grey-lighten-1 text-caption">—</span>
        </template>

        <template v-slot:item.costPrice="{ item }">
          <div class="text-right text-body-2">{{ (item.costPrice / 100).toFixed(2) }} DA</div>
        </template>
        <template v-slot:item.salePrice="{ item }">
          <div class="text-right font-weight-medium text-body-2">{{ (item.salePrice / 100).toFixed(2) }} DA</div>
        </template>
        <template v-slot:item.stock_quantity="{ item }">
          <v-chip
            size="x-small"
            :color="Number(item.stock_quantity ?? 0) <= 0 ? 'error' : (item.alertQuantity > 0 && Number(item.stock_quantity ?? 0) <= item.alertQuantity) ? 'warning' : 'success'"
            variant="tonal"
          >
            {{ Number(item.stock_quantity ?? 0) }}
          </v-chip>
        </template>
        <template v-slot:item.alertQuantity="{ item }">
          <v-chip v-if="item.alertQuantity > 0" size="x-small" color="warning" variant="tonal">
            {{ item.alertQuantity }}
          </v-chip>
          <span v-else class="text-grey-lighten-1 text-caption">—</span>
        </template>
        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn icon="mdi-barcode" variant="text" size="small" color="secondary" @click="openBarcodeDialog(item)" class="mr-1" title="Print Label"></v-btn>
            <v-btn icon="mdi-pencil-outline" variant="text" size="small" color="primary" @click="openEditDialog(item)" class="mr-1" />
            <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="remove(item.id)" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Print Label Dialog -->
    <v-dialog v-model="showBarcodeDialog" max-width="500px">
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2 d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-printer</v-icon>
          {{ $t('products.printLabel') }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showBarcodeDialog = false" />
        </v-card-title>
        <v-divider />
        
        <v-card-text class="pa-6">
          <!-- Missing barcode alert -->
          <v-alert
            v-if="!selectedProduct?.barcode"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4 text-body-2"
          >
            {{ $t('products.missingBarcode') }}
          </v-alert>

          <!-- Label Preview Card -->
          <v-card variant="outlined" class="pa-3 mb-5 bg-grey-lighten-5 text-center rounded-lg">
            <div class="text-caption text-grey-darken-1 mb-1 font-weight-bold">LABEL PREVIEW ({{ labelFormat }})</div>
            <div class="text-subtitle-2 font-weight-bold text-truncate px-2">{{ selectedProduct?.name }}</div>
            <div class="text-caption text-grey font-weight-medium mb-2">SKU: {{ selectedProduct?.code }}</div>

            <!-- Barcode Display -->
            <div v-if="selectedProduct?.barcode" class="d-flex flex-column align-center justify-center my-2 pa-2 bg-white rounded border">
              <div class="font-weight-bold text-caption text-slate-800 mb-1" style="font-family: monospace; letter-spacing: 2px;">
                |||| | ||||| || |||| | ||||
              </div>
              <div class="text-caption font-weight-bold" style="font-family: monospace;">
                {{ selectedProduct?.barcode }}
              </div>
            </div>
            <div v-else class="text-caption text-error font-italic my-2">
              (No barcode assigned)
            </div>

            <!-- Prominent Sale Price -->
            <div class="text-h6 font-weight-black text-primary mt-1">
              {{ (Number(selectedProduct?.salePrice || 0) / 100).toFixed(2) }} DA
            </div>
          </v-card>

          <!-- Printer Selector -->
          <v-select
            v-model="selectedPrinter"
            :items="printerOptions"
            item-title="title"
            item-value="value"
            :label="$t('products.selectPrinter')"
            prepend-inner-icon="mdi-printer-outline"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          ></v-select>

          <!-- Format Selector -->
          <v-select
            v-model="labelFormat"
            :items="['50x40', '50x25', '70x12']"
            :label="$t('products.labelFormat')"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          ></v-select>

          <!-- Quantity -->
          <v-text-field
            v-model.number="printQuantity"
            type="number"
            min="1"
            max="1000"
            :label="$t('products.printQuantity')"
            variant="outlined"
            density="compact"
            hide-details
          ></v-text-field>
        </v-card-text>
        
        <v-divider />
        <v-card-actions class="bg-grey-lighten-4 px-6 py-3">
          <v-btn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-download"
            size="small"
            :disabled="!selectedProduct?.barcode || isDownloadingPdf"
            :loading="isDownloadingPdf"
            @click="downloadLabelPdf"
          >
            PDF
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="showBarcodeDialog = false">{{ $t('common.cancel') || 'Cancel' }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-printer"
            :loading="isPrinting"
            :disabled="!selectedProduct?.barcode"
            @click="printLabel"
          >
            {{ $t('products.printLabel') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Print Products Configuration Dialog -->
    <v-dialog v-model="showPrintProductsDialog" max-width="650px" scrollable>
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2 d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-printer</v-icon>
          {{ $t('products.printConfig') }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showPrintProductsDialog = false" />
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-6" style="max-height: 75vh; overflow-y: auto;">
          <!-- 1. Print Scope -->
          <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1 mb-2">{{ $t('products.printScope') }}</div>
          <v-btn-toggle v-model="printScope" mandatory color="primary" variant="outlined" density="compact" class="mb-4 d-flex flex-wrap w-100">
            <v-btn value="all" class="flex-grow-1 text-caption">
              <v-icon start size="x-small">mdi-filter-check-outline</v-icon>
              {{ $t('products.scopeAll') }} ({{ filteredItems.length }})
            </v-btn>
            <v-btn value="selected" :disabled="selectedProducts.length === 0" class="flex-grow-1 text-caption">
              <v-icon start size="x-small">mdi-checkbox-marked-outline</v-icon>
              {{ $t('products.scopeSelected') }} ({{ selectedProducts.length }})
            </v-btn>
            <v-btn value="page" class="flex-grow-1 text-caption">
              <v-icon start size="x-small">mdi-file-document-outline</v-icon>
              {{ $t('products.scopePage') }} ({{ pageProductsCount }})
            </v-btn>
          </v-btn-toggle>

          <!-- Empty alert if scopeProducts is empty -->
          <v-alert
            v-if="scopeProducts.length === 0"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4 text-body-2"
          >
            {{ $t('products.noProductsToPrint') }}
          </v-alert>

          <!-- Active filters recap banner -->
          <v-sheet v-if="scopeProducts.length > 0 && hasActiveFilters" class="pa-2 px-3 mb-4 rounded bg-grey-lighten-4 border text-caption text-grey-darken-2">
            <div class="font-weight-bold mb-1">Active filters:</div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip v-if="search" size="x-small" variant="outlined">Search: {{ search }}</v-chip>
              <v-chip v-if="filterFamily" size="x-small" variant="outlined">Category: {{ families.find(f => f.id === filterFamily)?.name }}</v-chip>
              <v-chip v-if="filterBrand" size="x-small" variant="outlined">Brand: {{ brands.find(b => b.id === filterBrand)?.name }}</v-chip>
              <v-chip v-if="filterStock" size="x-small" variant="outlined">Stock: {{ stockFilterOptions.find(o => o.value === filterStock)?.title }}</v-chip>
            </div>
          </v-sheet>

          <!-- 2. Format Selection Tabs -->
          <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1 mb-2">{{ $t('products.printFormat') }}</div>
          <v-tabs v-model="printFormat" color="primary" class="mb-4 border-b">
            <v-tab value="list" prepend-icon="mdi-table">{{ $t('products.formatProductList') }}</v-tab>
            <v-tab value="labels" prepend-icon="mdi-barcode-scan">{{ $t('products.formatBarcodeLabels') }}</v-tab>
          </v-tabs>

          <!-- 3A. Product List Options -->
          <div v-if="printFormat === 'list'">
            <v-row dense class="mb-3">
              <v-col cols="12" sm="6">
                <v-select
                  v-model="listOrientation"
                  :items="[
                    { title: $t('products.portrait'), value: 'portrait' },
                    { title: $t('products.landscape'), value: 'landscape' }
                  ]"
                  item-title="title"
                  item-value="value"
                  :label="$t('products.orientation')"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" class="d-flex align-center">
                <v-switch
                  v-model="includeStoreHeader"
                  :label="$t('products.includeStoreHeader')"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1 mb-2">{{ $t('products.columnsToInclude') }}</div>
            <v-row dense class="mb-3">
              <v-col cols="6" sm="4" v-for="col in availablePrintColumns" :key="col.key">
                <v-checkbox
                  v-model="selectedColumns"
                  :value="col.key"
                  :label="col.title"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </div>

          <!-- 3B. Barcode Labels Options -->
          <div v-else-if="printFormat === 'labels'">
            <v-row dense class="mb-3">
              <v-col cols="12" sm="6">
                <v-select
                  v-model="batchLabelFormat"
                  :items="['50x40', '50x25', '70x12']"
                  :label="$t('products.labelFormat')"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="batchLabelQty"
                  type="number"
                  min="1"
                  max="100"
                  :label="$t('products.printQuantity')"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
            </v-row>

            <!-- Barcode validation feedback -->
            <div v-if="batchValidation.invalidCount > 0" class="mb-3">
              <v-alert type="warning" variant="tonal" density="compact" class="mb-2">
                <div class="font-weight-bold">
                  {{ $t('products.batchValidationWarning', { count: batchValidation.invalidCount }) }}
                </div>
                <div class="text-caption mt-1" style="max-height: 80px; overflow-y: auto;">
                  <div v-for="p in batchValidation.invalidProducts" :key="p.id">
                    • {{ p.name || p.code }} ({{ p.reason }})
                  </div>
                </div>
              </v-alert>
              <v-checkbox
                v-model="skipInvalidBarcodes"
                :label="$t('products.skipInvalidBarcodes', { count: batchValidation.validCount })"
                color="primary"
                density="compact"
                hide-details
              />
            </div>
            <v-sheet v-else class="pa-2 px-3 mb-3 bg-success-lighten-5 rounded border border-success text-caption text-success d-flex align-center">
              <v-icon size="small" color="success" class="mr-2">mdi-check-circle-outline</v-icon>
              All {{ batchValidation.validCount }} matching products have valid barcodes.
            </v-sheet>
          </div>

          <!-- 4. Destination Printer Selection -->
          <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1 mb-2">{{ $t('products.selectPrinter') }}</div>
          <v-select
            v-model="selectedPrintPrinter"
            :items="printerOptions"
            item-title="title"
            item-value="value"
            prepend-inner-icon="mdi-printer-outline"
            density="compact"
            variant="outlined"
            hide-details
            class="mb-2"
          />
        </v-card-text>

        <v-divider />
        <v-card-actions class="bg-grey-lighten-4 px-6 py-3">
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-file-eye-outline"
            size="small"
            :disabled="scopeProducts.length === 0 || isGeneratingListPdf || isPrintingList"
            :loading="isGeneratingListPdf"
            @click="previewProductsPrint"
          >
            {{ $t('products.previewPdf') }}
          </v-btn>
          <v-btn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-download"
            size="small"
            :disabled="scopeProducts.length === 0 || isGeneratingListPdf || isPrintingList"
            @click="downloadProductsPdf"
          >
            {{ $t('common.download_pdf') || 'Download PDF' }}
          </v-btn>
          <v-spacer />
          <v-btn color="grey-darken-1" variant="text" @click="showPrintProductsDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-printer"
            :disabled="scopeProducts.length === 0 || isPrintingList || (printFormat === 'labels' && batchValidation.validCount === 0 && !skipInvalidBarcodes)"
            :loading="isPrintingList"
            @click="printProductsAction"
          >
            {{ $t('common.print_pdf') || 'Print' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- PDF Preview Modal -->
    <v-dialog v-model="showPreviewModal" max-width="950px" scrollable>
      <v-card class="d-flex flex-column" style="max-height: 92vh;">
        <v-toolbar color="surface" density="comfortable" class="border-b px-2">
          <v-icon color="primary" class="mr-2">mdi-file-document-outline</v-icon>
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            {{ previewModalTitle }}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            prepend-icon="mdi-download"
            variant="tonal"
            color="primary"
            size="small"
            class="mr-2"
            @click="downloadProductsPdf"
          >
            {{ $t('common.download_pdf') || 'Download PDF' }}
          </v-btn>
          <v-btn
            prepend-icon="mdi-printer"
            variant="tonal"
            color="secondary"
            size="small"
            class="mr-2"
            :loading="isPrintingList"
            @click="printProductsAction"
          >
            {{ $t('common.print_pdf') || 'Print' }}
          </v-btn>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closePreviewModal" />
        </v-toolbar>

        <v-card-text class="pa-4 bg-grey-lighten-3 d-flex flex-column align-center" style="height: 75vh; overflow: hidden;">
          <iframe
            v-if="previewPdfUrl"
            :src="previewPdfUrl"
            style="width: 100%; height: 100%; border: none; background: white;"
            class="elevation-3 rounded"
            title="PDF Preview"
          ></iframe>
        </v-card-text>

        <v-card-actions class="bg-white border-t px-4 py-2">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="closePreviewModal">
            {{ $t('common.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


    <!-- Create / Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="900px" scrollable>
      <v-card elevation="0" rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 pb-2 d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-package-variant-closed</v-icon>
          {{ editingId ? 'Edit Product' : 'Create Product' }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
        </v-card-title>
        <v-divider />

        <v-card-text class="px-6 pt-4 pb-2" style="max-height: 70vh; overflow-y: auto;">
          <v-form ref="form" @submit.prevent="submit">

            <!-- Section: Identity -->
            <div class="section-heading mb-3">Identity</div>
            <v-row>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model="formData.code"
                  :label="$t('products.code') + ' *'"
                  :rules="[v => !!v || 'Code is required']"
                  required
                  hint="Unique SKU / reference code"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model="formData.barcode"
                  :label="$t('products.barcode') || 'Barcode'"
                  hint="EAN, UPC, or Code128 digits"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.name"
                  :label="$t('products.name') + ' *'"
                  :rules="[v => !!v || 'Name is required']"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="formData.designation"
                  label="Designation / Description"
                  hint="Brief description shown on invoices"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Section: Classification -->
            <div class="section-heading mb-3">Classification</div>
            <v-row>
              <v-col cols="12" sm="4">
                <v-autocomplete
                  v-model.number="formData.family_id"
                  :items="families"
                  item-title="name"
                  item-value="id"
                  label="Family"
                  clearable
                  no-data-text="No families found"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-autocomplete
                  v-model.number="formData.brand_id"
                  :items="brands"
                  item-title="name"
                  item-value="id"
                  :label="$t('products.brand')"
                  clearable
                  no-data-text="No brands found"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-autocomplete
                  v-model.number="formData.unit_id"
                  :items="units"
                  item-title="name"
                  item-value="id"
                  label="Unit of Measure"
                  clearable
                  no-data-text="No units found"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Section: Pricing & Tax -->
            <div class="section-heading mb-3">Pricing & Tax</div>
            <v-row>
              <v-col cols="12" sm="4">
                <MoneyInput v-model="formData.costPrice" label="Cost Price (DA)" />
              </v-col>
              <v-col cols="12" sm="4">
                <MoneyInput v-model="formData.salePrice" label="Sale Price (DA)" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-autocomplete
                  v-model.number="formData.tax_id"
                  :items="taxes"
                  :item-title="t => `${t.name} — ${t.valueTax}%`"
                  item-value="id"
                  label="Default Tax"
                  clearable
                  no-data-text="No taxes found"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Section: Inventory -->
            <div class="section-heading mb-3">Inventory</div>
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="formData.alertQuantity"
                  label="Minimum Stock Alert"
                  type="number"
                  min="0"
                  hint="Alert when stock drops below this"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="formData.shelving"
                  :label="$t('products.shelving')"
                  hint="Storage location reference"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="formData.expirationDate"
                  :label="$t('products.expirationDate')"
                  type="date"
                  clearable
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-switch
                  v-model="formData.durability"
                  label="Durable / Non-consumable"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Section: Dimensions (collapsible) -->
            <v-expansion-panels flat class="mb-2">
              <v-expansion-panel>
                <v-expansion-panel-title class="section-heading px-0" style="font-size: 0.78rem;">
                  Dimensions & Weight (optional)
                </v-expansion-panel-title>
                <v-expansion-panel-text class="px-0">
                  <v-row>
                    <v-col cols="6" sm="3">
                      <v-text-field v-model.number="formData.weight" :label="$t('products.weight')" type="number" min="0" step="0.01" />
                    </v-col>
                    <v-col cols="6" sm="3">
                      <v-text-field v-model.number="formData.height" :label="$t('products.height')" type="number" min="0" step="0.01" />
                    </v-col>
                    <v-col cols="6" sm="3">
                      <v-text-field v-model.number="formData.width" :label="$t('products.width')" type="number" min="0" step="0.01" />
                    </v-col>
                    <v-col cols="6" sm="3">
                      <v-text-field v-model.number="formData.depth" :label="$t('products.depth')" type="number" min="0" step="0.01" />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-divider class="my-4" />

            <!-- Section: Product Image -->
            <div class="section-heading mb-3">{{ $t('products.image') }}</div>
            <div class="d-flex align-start gap-4">
              <!-- Image Preview -->
              <div class="image-preview-box mr-4" @click="pickImage">
                <v-img
                  v-if="formData.photo"
                  :src="getImageSrc(formData.photo)"
                  width="120"
                  height="120"
                  cover
                  rounded="lg"
                >
                  <template #error>
                    <div class="image-placeholder">
                      <v-icon size="32" color="grey">mdi-image-broken</v-icon>
                    </div>
                  </template>
                </v-img>
                <div v-else class="image-placeholder" style="width: 120px; height: 120px;">
                  <v-icon size="32" color="grey-lighten-1">mdi-image-plus</v-icon>
                  <span class="text-caption text-grey mt-1">Click to add</span>
                </div>
              </div>

              <div class="d-flex flex-column gap-2 justify-center">
                <v-btn
                  variant="outlined"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-folder-image"
                  :loading="pickingImage"
                  @click="pickImage"
                >
                  {{ formData.photo ? 'Change Image' : 'Select Image' }}
                </v-btn>
                <v-btn
                  v-if="formData.photo"
                  variant="text"
                  color="error"
                  size="small"
                  prepend-icon="mdi-delete-outline"
                  @click="removeImage"
                >
                  Remove Image
                </v-btn>
                <p class="text-caption text-grey-darken-1 mb-0">
                  Supported: JPG, PNG, WEBP<br>
                  Image is stored locally on this device.
                </p>
              </div>
            </div>

          </v-form>
          <v-alert v-if="error" type="error" variant="tonal" class="mt-4 text-body-2" density="compact">{{ error }}</v-alert>
        </v-card-text>

        <v-divider />
        <v-card-actions class="bg-grey-lighten-5 px-6 py-3">
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="closeDialog">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="submit">
            {{ editingId ? 'Save Changes' : 'Create Product' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog ref="confirmDialogRef" />

    <ExcelImportDialog v-model="showImportDialog" type="Products" @success="loadItems" />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { watch } from 'vue'
const { t } = useI18n()
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import QrcodeVue from 'qrcode.vue'
import { nextTick } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import MoneyInput from '../components/MoneyInput.vue'
import ExcelImportDialog from '../components/ExcelImportDialog.vue'

const auth = useAuthStore()
const canViewCostPrice = computed(() => Boolean(auth.isAdmin || auth.hasPermission('purchases:view') || auth.hasPermission('inventory:valuation')))

// Data

const showBarcodeDialog = ref(false)
const labelFormat = ref('50x40')
const printQuantity = ref(1)
const isPrinting = ref(false)
const isDownloadingPdf = ref(false)
const selectedProduct = ref(null)
const selectedPrinter = ref(null)
const availablePrinters = ref([])

const printerOptions = computed(() => [
  { title: t('products.systemDefault') || 'System Print Dialog (Default)', value: null },
  ...availablePrinters.value.map(p => ({
    title: p.name + (p.isDefault ? ' (Default)' : ''),
    value: p.name
  }))
])

const openBarcodeDialog = async (item) => {
  selectedProduct.value = item
  printQuantity.value = 1
  selectedPrinter.value = null
  showBarcodeDialog.value = true
  try {
    const res = await window.api.posGetPrinters()
    if (res && res.success === false) {
      throw new Error(res.error || 'Failed to retrieve printer list')
    }
    const list = Array.isArray(res) ? res : (res?.success && Array.isArray(res.data) ? res.data : [])
    availablePrinters.value = list
  } catch (err) {
    console.error('Could not load printers', err)
    if (window.toast) window.toast.error(err.message)
  }
}

const printLabel = async () => {
  if (!selectedProduct.value) return
  if (!selectedProduct.value.barcode) {
    const msg = t('products.missingBarcode') || 'Product barcode is missing'
    if (window.toast) window.toast.error(msg)
    else alert(msg)
    return
  }

  isPrinting.value = true
  try {
    await window.api.printProductLabel({
      productId: selectedProduct.value.id,
      format: labelFormat.value,
      quantity: printQuantity.value,
      printerName: selectedPrinter.value
    })
    if (window.toast) {
      window.toast.success('Print job completed', {
        persist: true,
        category: 'printing',
        title: 'Print Dispatched',
        message: `Print job dispatched for "${selectedProduct.value.name}".`
      })
    }
    showBarcodeDialog.value = false
  } catch (err) {
    if (window.toast) {
      window.toast.error(err.message, {
        category: 'printing',
        title: 'Print Failed'
      })
    } else {
      alert(err.message)
    }
    console.error(err)
  } finally {
    isPrinting.value = false
  }
}

const downloadLabelPdf = async () => {
  if (!selectedProduct.value || !selectedProduct.value.barcode) return
  isDownloadingPdf.value = true
  try {
    const res = await window.api.saveProductLabelPdf({
      productId: selectedProduct.value.id,
      format: labelFormat.value,
      quantity: printQuantity.value
    })
    if (res?.success && !res.canceled && res.filePath) {
      if (window.toast) window.toast.success(t('common.pdf_saved') || 'PDF saved successfully')
    }
  } catch (err) {
    if (window.toast) window.toast.error(err.message)
    else alert(err.message)
    console.error(err)
  } finally {
    isDownloadingPdf.value = false
  }
}

const items = ref([])
const taxes = ref([])
const families = ref([])
const brands = ref([])
const units = ref([])
const search = ref('')
const filterFamily = ref(null)
const filterBrand = ref(null)
const filterStock = ref(null)
const selectedProducts = ref([])
const sortBy = ref([{ key: 'name', order: 'asc' }])
const currentPage = ref(1)
const itemsPerPage = ref(20)

const stockFilterOptions = computed(() => [
  { title: t('products.stockAll') || 'All Stock', value: null },
  { title: t('products.stockInStock') || 'In Stock', value: 'in_stock' },
  { title: t('products.stockLow') || 'Low Stock (at or below alert)', value: 'low_stock' },
  { title: t('products.stockOut') || 'Out of Stock', value: 'out_of_stock' }
])

const hasActiveFilters = computed(() => {
  return Boolean(search.value || filterFamily.value || filterBrand.value || filterStock.value)
})

const clearFilters = () => {
  search.value = ''
  filterFamily.value = null
  filterBrand.value = null
  filterStock.value = null
}

const headers = computed(() => {
  const list = [
    { title: t('products.image'), key: 'photo', sortable: false, width: '60px' },
    { title: t('common.code'), key: 'code' },
    { title: t('products.barcode') || 'Barcode', key: 'barcode' },
    { title: t('common.name'), key: 'name' },
    { title: t('products.family'), key: 'family_name' },
    { title: t('products.brand'), key: 'brand_name' },
    { title: t('products.unit'), key: 'unit_name' },
    { title: 'Tax', key: 'tax_name' }
  ]
  if (canViewCostPrice.value) {
    list.push({ title: 'Cost Price', key: 'costPrice', align: 'end' })
  }
  list.push(
    { title: 'Sale Price', key: 'salePrice', align: 'end' },
    { title: 'Stock', key: 'stock_quantity', align: 'center' },
    { title: 'Min Stock', key: 'alertQuantity', align: 'center' },
    { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
  )
  return list
})

const filteredItems = computed(() => {
  let list = items.value
  if (search.value) {
    const q = search.value.toLowerCase().trim()
    list = list.filter(i =>
      (i.code || '').toLowerCase().includes(q) ||
      (i.barcode || '').toLowerCase().includes(q) ||
      (i.name || '').toLowerCase().includes(q) ||
      (i.designation || '').toLowerCase().includes(q) ||
      (i.family_name || '').toLowerCase().includes(q) ||
      (i.brand_name || '').toLowerCase().includes(q)
    )
  }
  if (filterFamily.value) {
    list = list.filter(i => i.family_id === filterFamily.value)
  }
  if (filterBrand.value) {
    list = list.filter(i => i.brand_id === filterBrand.value)
  }
  if (filterStock.value) {
    if (filterStock.value === 'in_stock') {
      list = list.filter(i => Number(i.stock_quantity ?? 0) > 0)
    } else if (filterStock.value === 'low_stock') {
      list = list.filter(i => i.alertQuantity > 0 && Number(i.stock_quantity ?? 0) <= i.alertQuantity)
    } else if (filterStock.value === 'out_of_stock') {
      list = list.filter(i => Number(i.stock_quantity ?? 0) <= 0)
    }
  }

  // Preserve sort order
  if (Array.isArray(sortBy.value) && sortBy.value.length > 0) {
    const { key, order } = sortBy.value[0]
    list = [...list].sort((a, b) => {
      let valA = a[key]
      let valB = b[key]
      if (valA === undefined || valA === null) valA = ''
      if (valB === undefined || valB === null) valB = ''
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(String(valB))
        return order === 'desc' ? -cmp : cmp
      }
      const numA = Number(valA)
      const numB = Number(valB)
      if (!isNaN(numA) && !isNaN(numB)) {
        return order === 'desc' ? numB - numA : numA - numB
      }
      return 0
    })
  }

  return list
})

// --- Print Products Dialog State & Actions ---
const showPrintProductsDialog = ref(false)
const printScope = ref('all') // 'all', 'selected', 'page'
const printFormat = ref('list') // 'list', 'labels'
const listOrientation = ref('portrait')
const includeStoreHeader = ref(true)
const selectedColumns = ref(['code', 'name', 'barcode', 'category', 'unit', 'salePrice', 'stock'])
const batchLabelFormat = ref('50x40')
const batchLabelQty = ref(1)
const skipInvalidBarcodes = ref(false)
const selectedPrintPrinter = ref(null)
const isGeneratingListPdf = ref(false)
const isPrintingList = ref(false)

// Preview Modal State
const showPreviewModal = ref(false)
const previewPdfUrl = ref(null)
const previewBase64 = ref(null)
const previewModalTitle = ref('')

const availablePrintColumns = computed(() => {
  const cols = [
    { key: 'code', title: t('products.colCode') || 'Code / SKU' },
    { key: 'name', title: t('products.colName') || 'Product Name' },
    { key: 'barcode', title: t('products.colBarcode') || 'Barcode' },
    { key: 'category', title: t('products.colCategory') || 'Category' },
    { key: 'brand', title: t('products.colBrand') || 'Brand' },
    { key: 'unit', title: t('products.colUnit') || 'Unit' },
    { key: 'salePrice', title: t('products.colSalePrice') || 'Sale Price' },
    { key: 'stock', title: t('products.colStock') || 'Stock Quantity' },
    { key: 'alertQuantity', title: t('products.colAlertQuantity') || 'Alert Qty' }
  ]
  if (canViewCostPrice.value) {
    cols.push({ key: 'costPrice', title: t('products.colCostPrice') || 'Purchase Price' })
  }
  return cols
})

const scopeProducts = computed(() => {
  if (printScope.value === 'selected') {
    return selectedProducts.value
  }
  if (printScope.value === 'page') {
    const start = (currentPage.value - 1) * itemsPerPage.value
    return filteredItems.value.slice(start, start + itemsPerPage.value)
  }
  return filteredItems.value
})

const pageProductsCount = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredItems.value.slice(start, start + itemsPerPage.value).length
})

const batchValidation = computed(() => {
  const valid = []
  const invalid = []
  for (const p of scopeProducts.value) {
    if (!p.barcode || String(p.barcode).trim() === '') {
      invalid.push({ id: p.id, code: p.code, name: p.name, reason: t('products.missingBarcode') || 'Missing barcode' })
    } else {
      valid.push(p)
    }
  }
  return {
    validCount: valid.length,
    invalidCount: invalid.length,
    validProducts: valid,
    invalidProducts: invalid
  }
})

const getFiltersSummary = () => {
  const summary = {}
  if (search.value) summary.search = search.value.trim()
  if (filterFamily.value) {
    const fam = families.value.find(f => f.id === filterFamily.value)
    if (fam) summary.family = fam.name
  }
  if (filterBrand.value) {
    const b = brands.value.find(br => br.id === filterBrand.value)
    if (b) summary.brand = b.name
  }
  if (filterStock.value) {
    const opt = stockFilterOptions.value.find(o => o.value === filterStock.value)
    if (opt) summary.stockStatus = opt.title
  }
  if (printScope.value === 'selected') {
    summary.scope = t('products.scopeSelected') || 'Selected products only'
  } else if (printScope.value === 'page') {
    summary.scope = `${t('products.scopePage') || 'Current page'} (${currentPage.value})`
  }
  return summary
}

const getPrintI18nPayload = () => {
  const isRtl = ['ar'].includes(t('common.code') === 'الرمز' ? 'ar' : 'en')
  return {
    isRtl,
    lang: isRtl ? 'ar' : 'fr',
    title: t('products.printProducts') || 'Product List',
    colCode: t('products.colCode'),
    colName: t('products.colName'),
    colBarcode: t('products.colBarcode'),
    colCategory: t('products.colCategory'),
    colBrand: t('products.colBrand'),
    colUnit: t('products.colUnit'),
    colCostPrice: t('products.colCostPrice'),
    colSalePrice: t('products.colSalePrice'),
    colStock: t('products.colStock'),
    colAlertQuantity: t('products.colAlertQuantity'),
    searchLabel: isRtl ? 'بحث:' : 'Recherche :',
    familyLabel: isRtl ? 'الفئة:' : 'Famille :',
    brandLabel: isRtl ? 'العلامة:' : 'Marque :',
    stockStatusLabel: isRtl ? 'حالة المخزون:' : 'État stock :',
    scopeLabel: isRtl ? 'النطاق:' : 'Périmètre :',
    allProductsLabel: isRtl ? 'جميع المنتجات (بدون تصفية)' : 'Tous les produits (aucun filtre actif)'
  }
}

const toPlainData = (val) => {
  if (val === null || val === undefined) return val
  if (typeof val !== 'object') return val
  try {
    return JSON.parse(JSON.stringify(val))
  } catch (e) {
    throw new Error(`Data serialization failed: ${e?.message || e}`)
  }
}

const openPrintProductsDialog = async () => {
  printScope.value = selectedProducts.value.length > 0 ? 'selected' : 'all'
  selectedPrintPrinter.value = null
  showPrintProductsDialog.value = true
  try {
    const res = await window.api.posGetPrinters()
    if (res && res.success === false) {
      throw new Error(res.error || 'Failed to retrieve printer list')
    }
    const list = Array.isArray(res) ? res : (res?.success && Array.isArray(res.data) ? res.data : [])
    availablePrinters.value = list
  } catch (err) {
    console.error('Could not load printers', err)
    if (window.toast) window.toast.error(err.message)
  }
}

const cleanupPreviewUrl = () => {
  if (previewPdfUrl.value) {
    URL.revokeObjectURL(previewPdfUrl.value)
    previewPdfUrl.value = null
  }
}

const closePreviewModal = () => {
  cleanupPreviewUrl()
  showPreviewModal.value = false
}

const previewProductsPrint = async () => {
  if (scopeProducts.value.length === 0) return
  cleanupPreviewUrl()
  isGeneratingListPdf.value = true

  try {
    let res
    const plainProducts = toPlainData(scopeProducts.value)
    const plainColumns = toPlainData(selectedColumns.value)
    const plainFilters = toPlainData(getFiltersSummary())
    const plainI18n = toPlainData(getPrintI18nPayload())

    if (printFormat.value === 'list') {
      res = await window.api.getProductListPdf({
        products: plainProducts,
        columns: plainColumns,
        filtersSummary: plainFilters,
        orientation: listOrientation.value,
        i18n: plainI18n
      })
      previewModalTitle.value = `${t('products.formatProductList')} (${plainProducts.length} ${t('products.title')})`
    } else {
      res = await window.api.getBatchLabelPdf({
        products: plainProducts,
        format: batchLabelFormat.value,
        quantityPerProduct: batchLabelQty.value,
        skipInvalid: skipInvalidBarcodes.value
      })
      previewModalTitle.value = `${t('products.formatBarcodeLabels')} (${plainProducts.length} ${t('products.title')})`
    }

    if (!res?.success || !res?.data?.base64) {
      throw new Error(res?.error || 'Failed to generate PDF')
    }

    previewBase64.value = res.data.base64
    const byteCharacters = atob(res.data.base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    previewPdfUrl.value = URL.createObjectURL(blob)
    showPreviewModal.value = true
  } catch (err) {
    if (window.toast) window.toast.error(err.message)
    else alert(err.message)
  } finally {
    isGeneratingListPdf.value = false
  }
}

const downloadProductsPdf = async () => {
  if (scopeProducts.value.length === 0) return
  isGeneratingListPdf.value = true

  try {
    let res
    const plainProducts = toPlainData(scopeProducts.value)
    const plainColumns = toPlainData(selectedColumns.value)
    const plainFilters = toPlainData(getFiltersSummary())
    const plainI18n = toPlainData(getPrintI18nPayload())

    if (printFormat.value === 'list') {
      res = await window.api.saveProductListPdf({
        products: plainProducts,
        columns: plainColumns,
        filtersSummary: plainFilters,
        orientation: listOrientation.value,
        base64: previewBase64.value,
        i18n: plainI18n
      })
    } else {
      res = await window.api.saveBatchLabelPdf({
        products: plainProducts,
        format: batchLabelFormat.value,
        quantityPerProduct: batchLabelQty.value,
        skipInvalid: skipInvalidBarcodes.value,
        base64: previewBase64.value
      })
    }

    if (res?.success && !res.canceled && res.filePath) {
      if (window.toast) window.toast.success(t('common.pdf_saved') || 'PDF saved successfully')
    }
  } catch (err) {
    if (window.toast) window.toast.error(err.message)
    else alert(err.message)
  } finally {
    isGeneratingListPdf.value = false
  }
}

const printProductsAction = async () => {
  if (scopeProducts.value.length === 0) return
  isPrintingList.value = true

  try {
    let res
    const plainProducts = toPlainData(scopeProducts.value)
    const plainColumns = toPlainData(selectedColumns.value)
    const plainFilters = toPlainData(getFiltersSummary())
    const plainI18n = toPlainData(getPrintI18nPayload())

    if (printFormat.value === 'list') {
      res = await window.api.printProductList({
        products: plainProducts,
        columns: plainColumns,
        filtersSummary: plainFilters,
        orientation: listOrientation.value,
        printerName: selectedPrintPrinter.value,
        silent: !!selectedPrintPrinter.value,
        i18n: plainI18n
      })
    } else {
      res = await window.api.printBatchLabels({
        products: plainProducts,
        format: batchLabelFormat.value,
        quantityPerProduct: batchLabelQty.value,
        printerName: selectedPrintPrinter.value,
        silent: !!selectedPrintPrinter.value,
        skipInvalid: skipInvalidBarcodes.value
      })
    }

    if (res?.success) {
      if (window.toast) window.toast.success('Print job submitted successfully')
      showPrintProductsDialog.value = false
      if (showPreviewModal.value) closePreviewModal()
    } else if (res?.error) {
      throw new Error(res.error)
    }
  } catch (err) {
    if (window.toast) window.toast.error(err.message)
    else alert(err.message)
  } finally {
    isPrintingList.value = false
  }
}

onUnmounted(() => {
  cleanupPreviewUrl()
})

// Dialog state
const showDialog = ref(false)
const showImportDialog = ref(false)

const exportData = async () => {
  try {
    const res = await window.api.exportExcel('Products')
    if (res.canceled) return
    if (!res.success) throw new Error(res.error || 'Export failed')
    alert(`Export Complete! File saved to: ${res.filePath}`)
  } catch (err) {
    alert(`Export Error: ${err.message}`)
  }
}
const saving = ref(false)
const pickingImage = ref(false)
const error = ref('')
const form = ref(null)
const editingId = ref(null)
const confirmDialogRef = ref(null)

const emptyForm = () => ({
  code: '',
  barcode: '',
  name: '',
  designation: '',
  costPrice: 0,
  salePrice: 0,
  tax_id: null,
  family_id: null,
  brand_id: null,
  unit_id: null,
  alertQuantity: 0,
  shelving: '',
  expirationDate: null,
  durability: false,
  photo: null,
  weight: null,
  height: null,
  width: null,
  depth: null
})

const formData = ref(emptyForm())

// Image helpers
const getImageSrc = (photoPath) => {
  if (!photoPath) return null
  // If it's a file:// or absolute path, use it directly via the safe protocol
  if (photoPath.startsWith('data:') || photoPath.startsWith('http')) return photoPath
  // For file paths exposed by the main process, use the app-images protocol
  return `app-image://${photoPath}`
}

// Load data
const load = async () => {
  const [pRes, tRes, fRes, bRes, uRes] = await Promise.all([
    window.api.getProducts(),
    window.api.getTaxes(),
    window.api.getFamilies(),
    window.api.getBrands(),
    window.api.getUnits()
  ])
  if (pRes.success) items.value = pRes.data
  if (tRes.success) taxes.value = tRes.data
  if (fRes.success) families.value = fRes.data
  if (bRes.success) brands.value = bRes.data
  if (uRes.success) units.value = uRes.data
}

// Dialog actions
const openDialog = () => {
  formData.value = emptyForm()
  editingId.value = null
  error.value = ''
  showDialog.value = true
}

const openEditDialog = (item) => {
  editingId.value = item.id
  formData.value = {
    code: item.code || '',
    barcode: item.barcode || '',
    name: item.name || '',
    designation: item.designation || '',
    costPrice: item.costPrice || 0,
    salePrice: item.salePrice || 0,
    tax_id: item.tax_id || null,
    family_id: item.family_id || null,
    brand_id: item.brand_id || null,
    unit_id: item.unit_id || null,
    alertQuantity: item.alertQuantity || 0,
    shelving: item.shelving || '',
    expirationDate: item.expirationDate || null,
    durability: !!item.durability,
    photo: item.photo || null,
    weight: item.weight || null,
    height: item.height || null,
    width: item.width || null,
    depth: item.depth || null
  }
  error.value = ''
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  error.value = ''
}

// Image picker
const pickImage = async () => {
  pickingImage.value = true
  try {
    const res = await window.api.pickProductImage()
    if (res.success && res.data && !res.data.canceled) {
      formData.value.photo = res.data.filePath
    }
  } catch (e) {
    window.toast.error('Could not open image picker')
  } finally {
    pickingImage.value = false
  }
}

const removeImage = () => {
  formData.value.photo = null
}

// Submit
const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  saving.value = true
  error.value = ''

  const payload = {
    code: String(formData.value.code || '').trim(),
    name: String(formData.value.name || '').trim(),
    designation: String(formData.value.designation || '').trim() || undefined,
    costPrice: formData.value.costPrice || 0,
    salePrice: formData.value.salePrice || 0,
    tax_id: formData.value.tax_id ? parseInt(formData.value.tax_id, 10) : null,
    family_id: formData.value.family_id ? parseInt(formData.value.family_id, 10) : null,
    brand_id: formData.value.brand_id ? parseInt(formData.value.brand_id, 10) : null,
    unit_id: formData.value.unit_id ? parseInt(formData.value.unit_id, 10) : null,
    alertQuantity: parseInt(formData.value.alertQuantity, 10) || 0,
    shelving: String(formData.value.shelving || '').trim() || undefined,
    expirationDate: formData.value.expirationDate || undefined,
    durability: !!formData.value.durability,
    photo: formData.value.photo || undefined,
    weight: formData.value.weight ? parseFloat(formData.value.weight) : undefined,
    height: formData.value.height ? parseFloat(formData.value.height) : undefined,
    width: formData.value.width ? parseFloat(formData.value.width) : undefined,
    depth: formData.value.depth ? parseFloat(formData.value.depth) : undefined
  }

  let res
  if (editingId.value) {
    res = await window.api.updateProduct(editingId.value, payload)
  } else {
    res = await window.api.createProduct(payload)
  }

  saving.value = false

  if (res.success) {
    window.toast.success(editingId.value ? 'Product updated successfully' : 'Product created successfully')
    closeDialog()
    load()
  } else {
    error.value = res.error
  }
}

// Delete
const remove = async (id) => {
  const confirmed = await confirmDialogRef.value.open({
    title: t('products.deleteTitle'),
    message: t('products.deleteConfirm'),
    confirmText: t('common.delete'),
    destructive: true
  })
  if (confirmed) {
    const res = await window.api.deleteProduct(id)
    if (res.success) {
      window.toast.success(t('products.deleted'))
      load()
    } else {
      window.toast.error('Error deleting: ' + res.error)
    }
  }
}

onMounted(load)
</script>

<style scoped>
.section-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748B;
}

.image-preview-box {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border: 2px dashed #D1D5DB;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.image-placeholder:hover {
  border-color: #2563EB;
  background: #EFF6FF;
}
</style>
