<template>
  <div class="pos-container d-flex flex-column" style="height: 100vh; overflow: hidden; background: #f3f4f6;">
    <!-- POS Header -->
    <v-toolbar color="sidebar-navy" dark elevation="2">
      <v-btn icon @click="goHome" class="mr-2" color="white">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-toolbar-title class="text-white font-weight-bold">
        <v-icon class="mr-2" color="white">mdi-monitor-dashboard</v-icon>
        {{ $t('nav.pos') }}
      </v-toolbar-title>
      <v-spacer></v-spacer>
      
      <!-- Session Info -->
      <div v-if="activeSession" class="pos-session-info d-flex align-center bg-white rounded-pill px-4 py-1 mr-4">
        <v-icon color="green" size="small" class="mr-2">mdi-circle</v-icon>
        <span class="font-weight-bold text-slate-800">{{ currentRegister?.name }}</span>
        <v-divider vertical class="mx-3 my-1"></v-divider>
        <v-icon size="small" color="slate-600" class="mr-2">mdi-account</v-icon>
        <span class="text-slate-600">{{ auth.user?.username }}</span>
      </div>

      <v-btn v-if="activeSession" color="error" variant="flat" @click="showCloseRegister = true" class="font-weight-bold mr-2">
        <v-icon left>mdi-lock</v-icon> {{ $t('pos.close_register') }}
      </v-btn>
      <v-btn v-if="!activeSession && registers.length > 0" color="success" variant="flat" @click="openOpenRegisterDialog" class="font-weight-bold mr-2">
        <v-icon left>mdi-lock-open</v-icon> {{ $t('pos.open_register') }}
      </v-btn>
      <v-btn v-if="!activeSession && registers.length === 0" color="primary" variant="flat" @click="openCreateRegisterDialog" class="font-weight-bold mr-2">
        <v-icon left>mdi-plus-box</v-icon> {{ $t('pos.create_register') || 'Create Register' }}
      </v-btn>
      
      <LanguageSelector>
        <template v-slot:activator="{ props, currentLocaleName }">
          <v-btn v-bind="props" variant="text" color="white" class="mr-2 text-none font-weight-medium">
            <v-icon start>mdi-translate</v-icon>
            {{ currentLocaleName }}
          </v-btn>
        </template>
      </LanguageSelector>
      <NotificationCenter class="mr-2" />
      <v-btn icon color="white" @click="openPosSettings" class="mr-2" title="POS Settings">
        <v-icon>mdi-cog</v-icon>
      </v-btn>
      <v-btn icon color="white" @click="openHeldSales" class="mr-2" title="Held Sales (F6)">
        <v-badge :content="heldSales.length" :model-value="heldSales.length > 0" color="error">
          <v-icon>mdi-pause-circle-outline</v-icon>
        </v-badge>
      </v-btn>
    </v-toolbar>

    <!-- Main Content -->
    <div v-if="!activeSession && registers.length === 0" class="flex-grow-1 d-flex align-center justify-center">
      <div class="text-center pa-6" style="max-width: 520px;">
        <v-avatar size="96" color="grey-lighten-3" class="mb-4">
          <v-icon size="56" color="grey-darken-1">mdi-cash-register</v-icon>
        </v-avatar>
        <h2 class="text-h5 font-weight-bold text-slate-800 mb-2">{{ $t('pos.no_registers_configured') || 'No Cash Registers Configured' }}</h2>
        <p class="text-body-1 text-grey-darken-1 mb-6">
          {{ $t('pos.no_registers_description') || 'A cash register linked to a warehouse is required to operate the POS.' }}
        </p>
        <div class="d-flex justify-center gap-3">
          <v-btn color="primary" size="large" class="font-weight-bold px-6" @click="openCreateRegisterDialog">
            <v-icon left class="mr-2">mdi-plus</v-icon> {{ $t('pos.create_register') || 'Create Register' }}
          </v-btn>
          <v-btn variant="outlined" color="grey-darken-2" size="large" class="font-weight-bold px-6" @click="goHome">
            <v-icon left class="mr-2">mdi-arrow-left</v-icon> {{ $t('pos.back_to_dashboard') || 'Back to Dashboard' }}
          </v-btn>
        </div>
      </div>
    </div>

    <div v-else-if="!activeSession" class="flex-grow-1 d-flex align-center justify-center">
      <div class="text-center pa-6" style="max-width: 520px;">
        <v-avatar size="96" color="primary-lighten-5" class="mb-4">
          <v-icon size="56" color="primary">mdi-cash-register</v-icon>
        </v-avatar>
        <h2 class="text-h5 font-weight-bold text-slate-800 mb-2">{{ $t('pos.no_active_session') }}</h2>
        <p class="text-body-1 text-grey-darken-1 mb-6">
          {{ $t('pos.open_session_instruction') || 'Open a register session to start selling.' }}
        </p>
        <div class="d-flex justify-center gap-3">
          <v-btn color="success" size="large" class="font-weight-bold px-8 elevation-2" @click="openOpenRegisterDialog">
            <v-icon left class="mr-2">mdi-lock-open</v-icon> {{ $t('pos.open_register') }}
          </v-btn>
          <v-btn variant="outlined" color="grey-darken-2" size="large" class="font-weight-bold px-6" @click="goHome">
            <v-icon left class="mr-2">mdi-arrow-left</v-icon> {{ $t('pos.back_to_dashboard') || 'Back to Dashboard' }}
          </v-btn>
        </div>
      </div>
    </div>

    <div v-else class="flex-grow-1 d-flex flex-row overflow-hidden">
      <!-- Left Pane: Products -->
      <div class="flex-grow-1 d-flex flex-column border-e" style="width: 65%;">
        <!-- Search & Categories -->
        <div class="pa-4 bg-white border-b">
          <v-text-field
            v-model="searchQuery"
            :placeholder="$t('pos.search_product') + ' (F2)'"
            variant="outlined"
            density="comfortable"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
            @keyup.enter="handleBarcodeScan"
            ref="searchInput"
            class="mb-3"
            bg-color="grey-lighten-4"
          >
            <template v-slot:append-inner>
              <v-icon color="primary">mdi-barcode-scan</v-icon>
            </template>
          </v-text-field>

          <v-slide-group v-model="selectedCategory" selected-class="bg-primary text-white" show-arrows>
            <v-slide-group-item v-slot="{ isSelected, toggle }">
              <v-chip :class="['mx-1', isSelected ? 'bg-primary text-white' : 'bg-grey-lighten-3']" @click="toggle" variant="elevated" elevation="0">
                All
              </v-chip>
            </v-slide-group-item>
            <v-slide-group-item v-for="cat in categories" :key="cat.id" :value="cat.id" v-slot="{ isSelected, toggle }">
              <v-chip :class="['mx-1', isSelected ? 'bg-primary text-white' : 'bg-grey-lighten-3']" @click="toggle" variant="elevated" elevation="0">
                {{ cat.name }}
              </v-chip>
            </v-slide-group-item>
          </v-slide-group>
        </div>

        <!-- Product Grid -->
        <div class="flex-grow-1 overflow-y-auto pa-4 bg-grey-lighten-4">
          <v-row dense>
            <v-col v-for="product in filteredProducts" :key="product.id" cols="12" sm="6" md="4" lg="3">
              <v-card @click="addToCart(product)" hover class="h-100 rounded-lg d-flex flex-column border" elevation="1">
                <div class="pa-3 text-center bg-grey-lighten-5">
                  <v-avatar size="64" rounded="lg" color="grey-lighten-3">
                    <v-img v-if="product.image" :src="getImageUrl(product.image)"></v-img>
                    <v-icon v-else size="32" color="grey">mdi-package-variant</v-icon>
                  </v-avatar>
                </div>
                <v-divider></v-divider>
                <v-card-text class="pa-3 flex-grow-1 d-flex flex-column">
                  <div class="font-weight-bold text-truncate text-slate-800" :title="product.name">{{ product.name }}</div>
                  <div class="text-caption text-grey-darken-1 mb-2">{{ product.code }}</div>
                  <v-spacer></v-spacer>
                  <div class="d-flex justify-space-between align-end">
                    <span class="font-weight-black text-primary text-body-1">{{ formatMoney(product.salePrice) }}</span>
                    <v-chip size="x-small" :color="product.quantity > 0 ? 'success' : 'error'" variant="flat">
                      {{ product.quantity || 0 }} {{ product.unit_name || '' }}
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </div>

      <!-- Right Pane: Cart & Checkout -->
      <div class="d-flex flex-column bg-white border-l" style="width: 35%; min-width: 380px;">
        <!-- Customer Selection -->
        <div class="pa-4 border-b bg-grey-lighten-5">
          <v-autocomplete
            v-model="selectedCustomer"
            :items="customers"
            item-title="raison"
            item-value="id"
            :label="$t('pos.customer') || 'Customer'"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            prepend-inner-icon="mdi-account"
            bg-color="white"
            :placeholder="$t('pos.select_customer')"
            return-object
          ></v-autocomplete>
        </div>

        <!-- Cart Items -->
        <div class="flex-grow-1 overflow-y-auto pa-2">
          <div v-if="cart.length === 0" class="h-100 d-flex flex-column align-center justify-center text-grey">
            <v-icon size="48" class="mb-3">mdi-cart-outline</v-icon>
            <div>{{ $t('pos.cart_empty') }}</div>
          </div>
          <v-list v-else lines="two" bg-color="transparent" class="pa-0">
            <v-list-item v-for="(item, index) in cart" :key="index" class="border-b px-2 py-3">
              <div class="d-flex justify-space-between w-100 mb-1">
                <div class="font-weight-bold text-truncate flex-grow-1 mr-2">{{ item.product.name }}</div>
                <div class="font-weight-bold">{{ formatMoney(item.subtotal) }}</div>
              </div>
              <div class="d-flex align-center justify-space-between w-100">
                <div class="text-caption text-grey-darken-1">{{ formatMoney(item.price) }} / {{ item.product.unit_name }}</div>
                <div class="d-flex align-center bg-grey-lighten-4 rounded px-1 border">
                  <v-btn icon="mdi-minus" variant="text" size="x-small" @click="updateQty(index, -1)"></v-btn>
                  <span class="mx-3 font-weight-bold">{{ item.qty }}</span>
                  <v-btn icon="mdi-plus" variant="text" size="x-small" @click="updateQty(index, 1)"></v-btn>
                </div>
                <v-btn icon="mdi-delete" color="error" variant="text" size="small" @click="removeFromCart(index)"></v-btn>
              </div>
            </v-list-item>
          </v-list>
        </div>

        <!-- Totals & Actions -->
        <div class="bg-grey-lighten-4 border-t pa-4">
          <div class="d-flex justify-space-between mb-1 text-body-2">
            <span class="text-slate-600">{{ $t('pos.subtotal') }}</span>
            <span class="font-weight-medium">{{ formatMoney(cartTotals.untaxed) }}</span>
          </div>
          <div class="d-flex justify-space-between mb-1 text-body-2">
            <span class="text-slate-600">{{ $t('pos.tax') }}</span>
            <span class="font-weight-medium">{{ formatMoney(cartTotals.taxes) }}</span>
          </div>
          
          <div class="d-flex align-center justify-space-between mb-3 mt-2">
            <span class="text-slate-600 font-weight-medium">{{ $t('pos.discount') }}</span>
            <div class="d-flex align-center" style="width: 120px;">
              <v-text-field v-model.number="cartDiscount" variant="outlined" density="compact" hide-details prefix="-" suffix="DA" bg-color="white" class="text-right"></v-text-field>
            </div>
          </div>
          
          <v-divider class="mb-3 border-opacity-100" color="grey-300"></v-divider>
          
          <div class="d-flex justify-space-between align-end mb-4">
            <span class="text-h6 font-weight-black text-slate-800">{{ $t('pos.total') }}</span>
            <span class="text-h4 font-weight-black text-primary">{{ formatMoney(cartTotals.total) }}</span>
          </div>

          <v-row dense>
            <v-col cols="6">
              <v-btn block color="warning" variant="tonal" size="x-large" class="font-weight-bold" @click="holdSale" :disabled="cart.length === 0">
                <v-icon left>mdi-pause</v-icon> {{ $t('pos.hold_sale') }}
              </v-btn>
            </v-col>
            <v-col cols="6">
              <v-btn block color="error" variant="tonal" size="x-large" class="font-weight-bold" @click="cart = []" :disabled="cart.length === 0">
                <v-icon left>mdi-delete-sweep</v-icon> {{ $t('pos.clear_cart') }}
              </v-btn>
            </v-col>
            <v-col cols="12" class="mt-2">
              <v-btn block color="success" size="x-large" height="64" class="text-h6 font-weight-black elevation-2" @click="openPayment" :disabled="cart.length === 0">
                {{ $t('pos.payment') }} (F4) <v-icon right size="large" class="ml-2">mdi-chevron-right</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </div>
    </div>

    <!-- Modals -->
  <!-- Held Sales Dialog -->
  <v-dialog v-model="showHeldSales" max-width="600" scrollable @keydown.esc="showHeldSales = false">
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold bg-warning text-white pa-4 d-flex justify-space-between align-center">
        <span>{{ $t('pos.held_sales') }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="showHeldSales = false"></v-btn>
      </v-card-title>
      <v-card-text class="pa-4 bg-grey-lighten-4" style="max-height: 60vh;">
        <div v-if="heldSales.length === 0" class="text-center text-grey-darken-1 py-8">
          <v-icon size="48" class="mb-3">mdi-inbox-outline</v-icon>
          <div>{{ $t('pos.no_held_sales') }}</div>
        </div>
        <v-list v-else lines="two" bg-color="transparent" class="pa-0">
          <v-card v-for="hs in heldSales" :key="hs.id" class="mb-3 rounded-lg border" elevation="0">
            <v-list-item class="pa-3">
              <template v-slot:prepend>
                <v-avatar color="warning-lighten-4" class="text-warning">
                  <v-icon>mdi-pause</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold">{{ hs.reference }}</v-list-item-title>
              <v-list-item-subtitle class="mt-1 d-flex flex-column gap-1">
                <span class="text-caption text-grey-darken-1">{{ new Date(hs.created_at).toLocaleString() }}</span>
                <span>{{ hs.parsedCart.cart.length }} {{ $t('pos.items') }} • <span class="font-weight-bold text-primary">{{ formatMoney(hs.parsedCart.totals.total) }} DA</span></span>
              </v-list-item-subtitle>
              <template v-slot:append>
                <div class="d-flex align-center gap-2">
                  <v-btn color="error" variant="text" size="small" icon="mdi-delete" @click="deleteHeldSale(hs.id)" :title="$t('pos.delete')"></v-btn>
                  <v-btn color="success" variant="flat" size="small" @click="resumeHeldSale(hs)" class="ml-2 font-weight-bold">{{ $t('pos.resume_sale') }}</v-btn>
                </div>
              </template>
            </v-list-item>
          </v-card>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- POS Settings Dialog -->
  <v-dialog v-model="showPosSettings" max-width="400" @keydown.esc="showPosSettings = false">
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>POS Settings</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="showPosSettings = false"></v-btn>
      </v-card-title>
      <v-card-text class="pa-6">
        <v-select v-model="selectedPrinter" :items="printers" item-title="name" item-value="name" :label="$t('pos.receipt_printer')" variant="outlined" clearable persistent-clear :hint="$t('pos.clear_default_printer')"></v-select>
        <v-switch v-model="autoPrint" :label="$t('pos.auto_print_receipt')" color="primary"></v-switch>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="flat" class="px-6" @click="savePosSettings">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Open Register Dialog -->
  <v-dialog v-model="showOpenRegister" max-width="450" @keydown.esc="showOpenRegister = false">
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>{{ $t('pos.open_register') }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="showOpenRegister = false"></v-btn>
      </v-card-title>
      <v-card-text class="pa-6">
        <div v-if="registers.length === 0" class="text-center py-4">
          <v-icon size="48" color="warning" class="mb-2">mdi-alert-circle-outline</v-icon>
          <div class="text-body-1 font-weight-medium text-slate-800 mb-2">{{ $t('pos.no_registers_configured') || 'No Cash Registers Configured' }}</div>
          <p class="text-caption text-grey-darken-1 mb-4">{{ $t('pos.no_registers_description') || 'A cash register linked to a warehouse is required to operate the POS.' }}</p>
          <v-btn color="primary" variant="flat" @click="openCreateRegisterDialog">
            <v-icon left class="mr-1">mdi-plus</v-icon> {{ $t('pos.create_register') || 'Create Register' }}
          </v-btn>
        </div>
        <div v-else>
          <v-select v-model="selectedRegisterId" :items="registers" item-title="name" item-value="id" :label="$t('pos.select_register')" variant="outlined"></v-select>
          <v-text-field v-model.number="openingCashInput" type="number" :label="$t('pos.opening_cash')" variant="outlined" suffix="DA" class="mt-2" min="0"></v-text-field>
          <v-textarea v-model="sessionNotes" :label="$t('pos.notes')" variant="outlined" rows="2" class="mt-2"></v-textarea>
        </div>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-btn color="grey-darken-1" variant="text" @click="showOpenRegister = false">{{ $t('common.cancel') || 'Cancel' }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn v-if="registers.length > 0" color="primary" variant="flat" class="px-6" @click="confirmOpenRegister" :disabled="!selectedRegisterId || openingCashInput < 0">{{ $t('pos.open_register') || 'Open' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Create Register Dialog -->
  <v-dialog v-model="showCreateRegister" max-width="450" @keydown.esc="showCreateRegister = false">
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>{{ $t('pos.create_register') || 'Create Cash Register' }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="showCreateRegister = false"></v-btn>
      </v-card-title>
      <v-card-text class="pa-6">
        <v-text-field
          v-model="newRegisterName"
          :label="$t('pos.register_name') || 'Register Name'"
          variant="outlined"
          placeholder="e.g. Register 1"
          class="mb-3"
          autofocus
        ></v-text-field>
        <v-select
          v-model="newRegisterWarehouseId"
          :items="warehouses"
          item-title="name"
          item-value="id"
          :label="$t('pos.select_warehouse') || 'Warehouse'"
          variant="outlined"
          :hint="warehouses.length === 0 ? 'No warehouses available' : ''"
          persistent-hint
        ></v-select>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-btn color="grey-darken-1" variant="text" @click="showCreateRegister = false">{{ $t('common.cancel') || 'Cancel' }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="flat"
          class="px-6"
          @click="confirmCreateRegister"
          :disabled="!newRegisterName.trim() || !newRegisterWarehouseId"
          :loading="isCreatingRegister"
        >
          {{ $t('common.save') || 'Save' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Close Register Dialog -->
  <v-dialog v-model="showCloseRegister" max-width="400" @keydown.esc="showCloseRegister = false">
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold bg-error text-white pa-4 d-flex justify-space-between align-center">
        <span>{{ $t('pos.close_register') }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="showCloseRegister = false"></v-btn>
      </v-card-title>
      <v-card-text class="pa-6">
        <div class="d-flex justify-space-between mb-2">
          <span>{{ $t('pos.expected_cash') }}</span>
          <span class="font-weight-bold">{{ formatMoney(activeSession?.expected_cash || 0) }} DA</span>
        </div>
        <v-divider class="mb-4"></v-divider>
        <v-text-field v-model.number="actualCashInput" type="number" :label="$t('pos.actual_cash')" variant="outlined" suffix="DA" autofocus></v-text-field>
        
        <div class="d-flex justify-space-between mt-2 pt-2 border-t" :class="closeDifference < 0 ? 'text-error' : (closeDifference > 0 ? 'text-success' : '')">
          <span>{{ $t('pos.difference') }}</span>
          <span class="font-weight-bold">{{ formatMoney(closeDifference) }} DA</span>
        </div>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-btn color="grey-darken-1" variant="text" @click="showCloseRegister = false">{{ $t('common.cancel') || 'Cancel' }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="error" variant="flat" class="px-6" @click="confirmCloseRegister">{{ $t('common.confirm') || 'Close' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Payment Dialog -->
  <v-dialog v-model="showPayment" max-width="600" @keydown.esc="showPayment = false">
    <v-card rounded="xl">
      <v-card-title class="text-h5 font-weight-bold bg-success text-white pa-4 d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <span>{{ $t('pos.payment') }}</span>
          <span class="font-weight-black ml-4">{{ formatMoney(cartTotals.total) }} DA</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="showPayment = false"></v-btn>
      </v-card-title>
      <v-card-text class="pa-4 bg-grey-lighten-4">
        <!-- Added Payments -->
        <div class="mb-4">
          <div v-for="(p, i) in splitPayments" :key="i" class="d-flex justify-space-between align-center bg-white pa-3 mb-2 rounded border">
            <div>
              <v-chip size="small" :color="p.method === 'cash' ? 'success' : (p.method === 'card' ? 'primary' : 'info')" class="text-uppercase font-weight-bold mr-2">{{ $t('pos.' + p.method) || p.method }}</v-chip>
              <span class="text-caption text-grey-darken-1" v-if="p.reference">#{{ p.reference }}</span>
            </div>
            <div class="d-flex align-center">
              <span class="font-weight-bold mr-4 text-h6">{{ formatMoney(p.amount) }} DA</span>
              <v-btn icon="mdi-close-circle" size="small" color="error" variant="text" @click="removeSplitPayment(i)"></v-btn>
            </div>
          </div>
        </div>

        <!-- Add Payment Controls -->
        <v-card variant="outlined" class="pa-4 bg-white">
          <div class="text-subtitle-2 mb-2 font-weight-bold text-slate-600">{{ $t('pos.add_payment') }}</div>
          <v-row dense>
            <v-col cols="4">
              <v-select v-model="pendingPayment.method" :items="paymentMethods" item-title="title" item-value="value" variant="outlined" density="compact" hide-details></v-select>
            </v-col>
            <v-col cols="5">
              <v-text-field v-model.number="pendingPayment.amount" type="number" variant="outlined" density="compact" hide-details suffix="DA" @keyup.enter="addSplitPayment" ref="pendingPaymentInput"></v-text-field>
            </v-col>
            <v-col cols="3">
              <v-btn block color="primary" height="40" @click="addSplitPayment" :disabled="!pendingPayment.amount || pendingPayment.amount <= 0">{{ $t('common.add') }}</v-btn>
            </v-col>
          </v-row>
          <div class="mt-2" v-if="pendingPayment.method !== 'cash'">
             <v-text-field v-model="pendingPayment.reference" :label="$t('pos.reference_optional')" variant="outlined" density="compact" hide-details></v-text-field>
          </div>
        </v-card>

        <div class="d-flex justify-space-between align-center mt-4 pa-4 bg-white rounded border">
          <div class="text-center">
            <div class="text-caption text-grey-darken-1 font-weight-bold text-uppercase">{{ $t('pos.paid') }}</div>
            <div class="text-h6 font-weight-bold text-success">{{ formatMoney(totalSplitPaid) }} DA</div>
          </div>
          <v-divider vertical class="mx-2"></v-divider>
          <div class="text-center">
            <div class="text-caption text-grey-darken-1 font-weight-bold text-uppercase">{{ $t('pos.remaining') }}</div>
            <div class="text-h6 font-weight-bold" :class="remainingToPay > 0 ? 'text-error' : 'text-grey'">{{ formatMoney(Math.max(0, remainingToPay)) }} DA</div>
          </div>
          <v-divider vertical class="mx-2"></v-divider>
          <div class="text-center">
            <div class="text-caption text-grey-darken-1 font-weight-bold text-uppercase">{{ $t('pos.change') }}</div>
            <div class="text-h6 font-weight-bold" :class="splitChange > 0 ? 'text-warning' : 'text-grey'">{{ formatMoney(splitChange) }} DA</div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-4 bg-white border-t">
        <v-btn size="large" color="grey-darken-1" variant="text" @click="showPayment = false">{{ $t('common.cancel') || 'Cancel' }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn size="large" color="success" variant="flat" class="px-8 font-weight-bold" @click="completeSale" :disabled="remainingToPay > 0" :loading="isCompleting">
          <v-icon left class="mr-2">mdi-check-circle</v-icon> {{ $t('pos.complete_sale') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import LanguageSelector from '../components/LanguageSelector.vue'
import NotificationCenter from '../components/NotificationCenter.vue'
import { useAuthStore } from '../stores/auth.js'
import { useNotificationStore } from '../stores/notifications.js'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const auth = useAuthStore()
const notificationStore = useNotificationStore()
const { t } = useI18n()

const goHome = () => {
  showOpenRegister.value = false
  showCreateRegister.value = false
  showCloseRegister.value = false
  showPayment.value = false
  showPosSettings.value = false
  showHeldSales.value = false

  if (window.history.state && window.history.state.back) {
    router.back()
  } else {
    router.push('/')
  }
}

// State
const products = ref([])
const categories = ref([])
const customers = ref([])
const warehouses = ref([])
const registers = ref([])
const activeSession = ref(null)
const currentRegister = ref(null)

const searchQuery = ref('')
const selectedCategory = ref(null)
const searchInput = ref(null)

const cart = ref([])
const selectedCustomer = ref(null)
const cartDiscount = ref(0)

// Dialogs
const showOpenRegister = ref(false)
const selectedRegisterId = ref(null)
const openingCashInput = ref(0)
const sessionNotes = ref('')

const showCreateRegister = ref(false)
const newRegisterName = ref('')
const newRegisterWarehouseId = ref(null)
const isCreatingRegister = ref(false)

const showCloseRegister = ref(false)
const actualCashInput = ref(0)

const showPayment = ref(false)
const isCompleting = ref(false)

// POS Settings
const showPosSettings = ref(false)
const printers = ref([])
const selectedPrinter = ref(localStorage.getItem('pos_printer') || null)
const autoPrint = ref(localStorage.getItem('pos_auto_print') !== 'false')

const openPosSettings = async () => {
  try {
    if (window.api.posGetPrinters) {
      const res = await window.api.posGetPrinters()
      if (res && res.success) {
        printers.value = res.data || []
      }
    }
  } catch (err) {
    console.error('Failed to get printers', err)
  }
  showPosSettings.value = true
}

const savePosSettings = () => {
  if (selectedPrinter.value) {
    localStorage.setItem('pos_printer', selectedPrinter.value)
  } else {
    localStorage.removeItem('pos_printer')
  }
  localStorage.setItem('pos_auto_print', String(autoPrint.value))
  showPosSettings.value = false
}

const printReceipt = async (saleId) => {
  try {
    if (window.api.posPrintReceiptDialog) {
      await window.api.posPrintReceiptDialog({ saleId })
    }
  } catch (err) {
    console.error('Failed to print receipt', err)
  }
}

// Data Loaders
const loadRegisters = async () => {
  const res = await window.api.posGetRegisters()
  if (res && res.success) {
    registers.value = res.data || []
  }
}

const loadWarehouses = async () => {
  const res = await window.api.getWarehouses()
  if (res && res.success) {
    warehouses.value = res.data || []
  }
}

const loadProducts = async () => {
  const res = await window.api.getProducts()
  if (res && res.success) {
    products.value = (res.data || []).filter(p => !p.disabled)
    const catMap = new Map()
    products.value.forEach(p => {
      if (p.family_id && p.family_name) {
        catMap.set(p.family_id, { id: p.family_id, name: p.family_name })
      }
    })
    categories.value = Array.from(catMap.values())
  }
}

const loadCustomers = async () => {
  const res = await window.api.getCustomers()
  if (res && res.success) {
    customers.value = res.data || []
  }
}

// Held Sales
const heldSales = ref([])
const showHeldSales = ref(false)

const loadHeldSales = async () => {
  if (!activeSession.value) return
  const res = await window.api.posGetHeldSales(activeSession.value.id)
  if (res && res.success) {
    heldSales.value = (res.data || []).map(hs => ({
      ...hs,
      parsedCart: JSON.parse(hs.cart_data)
    }))
  }
}

const openHeldSales = () => {
  loadHeldSales()
  showHeldSales.value = true
}

const holdSale = async () => {
  if (cart.value.length === 0) return
  if (!activeSession.value) return
  
  const reference = 'Hold #' + Math.floor(Math.random() * 10000)
  const cartData = {
    cart: cart.value,
    discount: cartDiscount.value,
    customer: selectedCustomer.value,
    totals: cartTotals.value
  }

  const res = await window.api.posHoldSale({
    sessionId: activeSession.value.id,
    customerId: selectedCustomer.value ? selectedCustomer.value.id : null,
    reference,
    cartData
  })

  if (res && res.success) {
    window.toast?.success(t('pos.sale_held'))
    notificationStore.addNotification({
      type: 'info',
      category: 'pos',
      title: t('pos.sale_held') || 'Sale Held',
      message: `${reference} held successfully.`,
      route: '/pos'
    })
    cart.value = []
    selectedCustomer.value = null
    cartDiscount.value = 0
    splitPayments.value = []
    searchQuery.value = ''
    loadHeldSales()
  } else {
    window.toast?.error((t('pos.failed_hold_sale') || 'Failed to hold sale') + ': ' + (res?.error || ''))
  }
}

const resumeHeldSale = async (hs) => {
  if (cart.value.length > 0) {
    if (!confirm(t('pos.current_cart_warning'))) {
      return
    }
  }

  cart.value = hs.parsedCart.cart || []
  cartDiscount.value = hs.parsedCart.discount || 0
  
  if (hs.parsedCart.customer) {
    selectedCustomer.value = customers.value.find(c => c.id === hs.parsedCart.customer.id) || hs.parsedCart.customer
  } else {
    selectedCustomer.value = null
  }
  
  splitPayments.value = []
  showHeldSales.value = false
  
  await window.api.posDeleteHeldSale(hs.id)
  await loadHeldSales()
  
  window.toast?.success(t('pos.sale_resumed'))
}

const deleteHeldSale = async (id) => {
  if (!confirm(t('pos.delete_confirm'))) return
  const res = await window.api.posDeleteHeldSale(id)
  if (res && res.success) {
    loadHeldSales()
  }
}

// Helpers
const getImageUrl = (path) => path ? `app-image://${path}` : null

const formatMoney = (cents) => {
  if (!cents && cents !== 0) return '0.00'
  return (cents / 100).toFixed(2)
}

const filteredProducts = computed(() => {
  let list = products.value
  if (selectedCategory.value) {
    list = list.filter(p => p.family_id === selectedCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.name?.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)))
  }
  return list
})

const handleBarcodeScan = () => {
  if (!searchQuery.value) return
  const code = searchQuery.value.trim().toLowerCase()
  const match = products.value.find(p => p.code?.toLowerCase() === code)
  if (match) {
    addToCart(match)
    searchQuery.value = ''
  }
}

// Cart Logic
const addToCart = (product) => {
  const existing = cart.value.find(item => item.product.id === product.id)
  if (existing) {
    existing.qty += 1
  } else {
    cart.value.push({
      product,
      qty: 1,
      price: product.salePrice || 0,
      taxPercent: product.tax_value || 0
    })
  }
}

const updateQty = (index, delta) => {
  const item = cart.value[index]
  if (item && item.qty + delta > 0) {
    item.qty += delta
  }
}

const removeFromCart = (index) => {
  cart.value.splice(index, 1)
}

const cartTotals = computed(() => {
  let untaxed = 0
  let taxes = 0
  cart.value.forEach(item => {
    const itemUntaxed = Math.round(item.price * item.qty)
    const itemTax = Math.round(itemUntaxed * (item.taxPercent || 0) / 100)
    item.subtotal = itemUntaxed + itemTax
    untaxed += itemUntaxed
    taxes += itemTax
  })
  const total = untaxed + taxes - Math.round((cartDiscount.value || 0) * 100)
  return { untaxed, taxes, total: Math.max(0, total) }
})

// Register Management
const openOpenRegisterDialog = () => {
  if (registers.value.length > 0 && !selectedRegisterId.value) {
    selectedRegisterId.value = registers.value[0].id
  }
  openingCashInput.value = 0
  sessionNotes.value = ''
  showOpenRegister.value = true
}

const confirmOpenRegister = async () => {
  if (!selectedRegisterId.value) return
  const res = await window.api.posOpenRegister({
    registerId: selectedRegisterId.value,
    openingCash: Math.round(openingCashInput.value * 100),
    notes: sessionNotes.value
  })
  if (res && res.success) {
    activeSession.value = res.data
    currentRegister.value = registers.value.find(r => r.id === selectedRegisterId.value) || null
    showOpenRegister.value = false
    window.toast?.success(t('pos.register_opened') || 'Register opened')
    notificationStore.addNotification({
      type: 'success',
      category: 'pos',
      title: t('notifications.registerOpened') || 'Register Opened',
      message: `${currentRegister.value?.name || 'Register'} session opened successfully.`,
      route: '/pos'
    })
    const noReg = notificationStore.notifications.find(n => n.dedupKey === 'pos-no-active-register')
    if (noReg) notificationStore.markAsRead(noReg.id)
    await loadProducts()
    await loadCustomers()
    await loadHeldSales()
  } else {
    window.toast?.error(res?.error || 'Failed to open register')
  }
}

const openCreateRegisterDialog = async () => {
  showOpenRegister.value = false
  await loadWarehouses()
  newRegisterName.value = ''
  if (warehouses.value.length > 0) {
    newRegisterWarehouseId.value = warehouses.value[0].id
  } else {
    newRegisterWarehouseId.value = null
  }
  showCreateRegister.value = true
}

const confirmCreateRegister = async () => {
  if (!newRegisterName.value.trim() || !newRegisterWarehouseId.value) return
  isCreatingRegister.value = true
  try {
    const res = await window.api.posCreateRegister({
      name: newRegisterName.value.trim(),
      warehouse_id: newRegisterWarehouseId.value,
      active: true
    })
    if (res && res.success) {
      window.toast?.success(t('pos.register_created') || 'Register created successfully')
      notificationStore.addNotification({
        type: 'success',
        category: 'pos',
        title: t('pos.register_created') || 'Register Created',
        message: `Cash register "${newRegisterName.value.trim()}" created successfully.`,
        route: '/pos'
      })
      await loadRegisters()
      showCreateRegister.value = false
      if (res.data?.id) {
        selectedRegisterId.value = res.data.id
      }
      openOpenRegisterDialog()
    } else {
      window.toast?.error(res?.error || 'Failed to create register')
    }
  } catch (err) {
    window.toast?.error(err.message || 'Failed to create register')
  } finally {
    isCreatingRegister.value = false
  }
}

const closeDifference = computed(() => {
  if (!activeSession.value) return 0
  return Math.round(actualCashInput.value * 100) - (activeSession.value.expected_cash || 0)
})

const confirmCloseRegister = async () => {
  if (!activeSession.value) return
  const res = await window.api.posCloseRegister({
    sessionId: activeSession.value.id,
    actualCash: Math.round(actualCashInput.value * 100)
  })
  if (res && res.success) {
    activeSession.value = null
    currentRegister.value = null
    showCloseRegister.value = false
    cart.value = []
    selectedCustomer.value = null
    cartDiscount.value = 0
    splitPayments.value = []
    window.toast?.success(t('pos.register_closed') || 'Register closed successfully')
    notificationStore.addNotification({
      type: 'success',
      category: 'pos',
      title: t('notifications.registerClosed') || 'Register Closed',
      message: 'Register closed successfully.',
      route: '/pos'
    })
  } else {
    window.toast?.error(res?.error || 'Failed to close register')
  }
}

// Payment & Checkout
const splitPayments = ref([])
const pendingPayment = ref({ method: 'cash', amount: 0, reference: '' })
const pendingPaymentInput = ref(null)

const paymentMethods = computed(() => [
  { title: t('pos.cash') || 'Cash', value: 'cash' },
  { title: t('pos.card') || 'Card', value: 'card' },
  { title: t('pos.transfer') || 'Transfer', value: 'transfer' },
  { title: t('pos.account') || 'Customer Account', value: 'account' }
])

const totalSplitPaid = computed(() => {
  return splitPayments.value.reduce((sum, p) => sum + p.amount, 0)
})

const remainingToPay = computed(() => {
  return cartTotals.value.total - totalSplitPaid.value
})

const splitChange = computed(() => {
  if (remainingToPay.value < 0) {
    return Math.abs(remainingToPay.value)
  }
  return 0
})

const openPayment = () => {
  splitPayments.value = []
  pendingPayment.value = { method: 'cash', amount: cartTotals.value.total / 100, reference: '' }
  showPayment.value = true
}

const addSplitPayment = () => {
  if (!pendingPayment.value.amount || pendingPayment.value.amount <= 0) return
  
  splitPayments.value.push({
    method: pendingPayment.value.method,
    amount: Math.round(pendingPayment.value.amount * 100),
    reference: pendingPayment.value.reference
  })
  
  pendingPayment.value = { 
    method: 'cash', 
    amount: remainingToPay.value > 0 ? remainingToPay.value / 100 : 0,
    reference: ''
  }
}

const removeSplitPayment = (index) => {
  splitPayments.value.splice(index, 1)
  pendingPayment.value.amount = remainingToPay.value > 0 ? remainingToPay.value / 100 : 0
}

const completeSale = async () => {
  if (remainingToPay.value > 0) {
    window.toast?.error(t('pos.insufficient_payment'))
    return
  }
  
  if (!selectedCustomer.value) {
    window.toast?.error(t('pos.please_select_customer'))
    return
  }

  isCompleting.value = true
  const lines = cart.value.map(item => ({
    productId: item.product.id,
    amount: item.qty,
    price: item.price,
    taxPercent: item.taxPercent
  }))

  const payload = {
    date: new Date().toISOString(),
    customerId: selectedCustomer.value ? selectedCustomer.value.id : null,
    warehouseId: currentRegister.value.warehouse_id,
    discount: Math.round((cartDiscount.value || 0) * 100),
    paymentMethod: 'split',
    payment: cartTotals.value.total,
    payments: splitPayments.value.filter(p => p.method !== 'account'),
    state: 'receipt',
    lines
  }

  const res = await window.api.posCompleteSale({
    sessionId: activeSession.value.id,
    salePayload: payload
  })

  isCompleting.value = false

  if (res && res.success) {
    window.toast?.success(t('pos.sale_completed'))
    notificationStore.addNotification({
      type: 'success',
      category: 'sales',
      title: t('notifications.saleCompleted') || 'Sale Completed',
      message: res.data?.code ? `Sale #${res.data.code} completed successfully.` : 'Sale completed successfully.',
      route: '/sales'
    })
    if (autoPrint.value) {
      printReceipt(res.data.id)
    }
    showPayment.value = false
    cart.value = []
    selectedCustomer.value = null
    cartDiscount.value = 0
    splitPayments.value = []
    searchQuery.value = ''
    
    const cashPayments = splitPayments.value.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0)
    const changeGiven = splitChange.value
    const netCash = cashPayments - changeGiven
    if (netCash > 0) {
      activeSession.value.expected_cash += netCash
    }
    
    loadProducts()
  } else {
    window.toast?.error((t('pos.failed_complete_sale') || 'Failed to complete sale') + ': ' + (res?.error || ''))
  }
}

// Keyboard shortcuts
const handleGlobalKeydown = (e) => {
  if (e.key === 'Escape') {
    if (showCreateRegister.value) { showCreateRegister.value = false; return; }
    if (showOpenRegister.value) { showOpenRegister.value = false; return; }
    if (showCloseRegister.value) { showCloseRegister.value = false; return; }
    if (showPayment.value) { showPayment.value = false; return; }
    if (showPosSettings.value) { showPosSettings.value = false; return; }
    if (showHeldSales.value) { showHeldSales.value = false; return; }
  } else if (e.key === 'F2') {
    e.preventDefault()
    searchInput.value?.focus()
  } else if (e.key === 'F4') {
    e.preventDefault()
    if (cart.value.length > 0 && activeSession.value) openPayment()
  } else if (e.key === 'F6') {
    e.preventDefault()
    if (activeSession.value) openHeldSales()
  }
}

// Lifecycle
onMounted(async () => {
  await loadRegisters()
  await loadProducts()
  await loadCustomers()
  await loadWarehouses()

  if (registers.value.length > 0) {
    selectedRegisterId.value = registers.value[0].id
    for (const reg of registers.value) {
      const res = await window.api.posGetActiveSession(reg.id)
      if (res && res.success && res.data) {
        activeSession.value = res.data
        currentRegister.value = reg
        selectedRegisterId.value = reg.id
        await loadHeldSales()
        break
      }
    }
  }

  if (registers.value.length > 0 && !activeSession.value) {
    notificationStore.addNotification({
      dedupKey: 'pos-no-active-register',
      type: 'warning',
      category: 'pos',
      title: t('notifications.register') || 'Register',
      message: t('pos.no_active_session') || 'No active register session.',
      route: '/pos'
    })
  }

  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>
