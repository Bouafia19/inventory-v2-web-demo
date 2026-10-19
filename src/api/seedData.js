// Product SVGs for realistic, crisp demo product photos
function createSvgDataUri(iconName, bgGradient, title) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}"/>
        <stop offset="100%" stop-color="${bgGradient[1]}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="20" fill="url(#g)"/>
    <circle cx="100" cy="90" r="50" fill="rgba(255,255,255,0.15)"/>
    <text x="100" y="102" font-family="system-ui, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">${iconName}</text>
    <text x="100" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="rgba(255,255,255,0.9)" text-anchor="middle">${title}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function getInitialSeedData() {
  const allPermissions = [
    'users:view', 'users:create', 'users:update',
    'roles:view', 'roles:create', 'roles:update', 'roles:delete',
    'master_data:manage',
    'warehouses:view', 'warehouses:create', 'warehouses:update', 'warehouses:delete',
    'products:view', 'products:create', 'products:update', 'products:delete',
    'inventory:view', 'inventory:manage', 'inventory:valuation',
    'vendors:view', 'vendors:create', 'vendors:update', 'vendors:delete',
    'purchases:view', 'purchases:create', 'purchases:update', 'purchases:delete', 'purchases:manage',
    'customers:view', 'customers:create', 'customers:update', 'customers:delete',
    'sales:view', 'sales:create', 'sales:update', 'sales:delete',
    'finance:view', 'finance:manage',
    'receivables:view', 'receivables:settle',
    'payables:view', 'payables:settle',
    'invoices:view',
    'pos:access', 'pos:open_register', 'pos:close_register', 'pos:hold', 'pos:sell',
    'reports:view',
    'settings:view', 'settings:update',
    'backup:manage'
  ]

  const roles = [
    {
      id: 1,
      name: 'Admin',
      description: 'System Administrator with unrestricted access to all modules',
      permissions: allPermissions
    },
    {
      id: 2,
      name: 'Cashier',
      description: 'Point of sale cashier operator',
      permissions: [
        'pos:access', 'pos:open_register', 'pos:close_register', 'pos:hold', 'pos:sell',
        'sales:view', 'products:view', 'customers:view', 'invoices:view'
      ]
    },
    {
      id: 3,
      name: 'Store Manager',
      description: 'Operations manager for sales, purchases, and inventory',
      permissions: [
        'pos:access', 'pos:open_register', 'pos:close_register', 'pos:hold', 'pos:sell',
        'sales:view', 'sales:create', 'sales:update', 'sales:delete',
        'purchases:view', 'purchases:create', 'purchases:update', 'purchases:delete', 'purchases:manage',
        'inventory:view', 'inventory:manage', 'inventory:valuation',
        'products:view', 'products:create', 'products:update',
        'customers:view', 'customers:create', 'customers:update',
        'vendors:view', 'vendors:create', 'vendors:update',
        'receivables:view', 'receivables:settle',
        'payables:view', 'payables:settle',
        'invoices:view', 'reports:view',
        'master_data:manage', 'warehouses:view'
      ]
    }
  ]

  const users = [
    {
      id: 1,
      username: 'admin',
      role_id: 1,
      role: 'Admin',
      permissions: allPermissions,
      language: 'en',
      is_active: true,
      created_at: '2026-01-01T08:00:00.000Z'
    },
    {
      id: 2,
      username: 'cashier',
      role_id: 2,
      role: 'Cashier',
      permissions: roles[1].permissions,
      language: 'fr',
      is_active: true,
      created_at: '2026-01-02T08:00:00.000Z'
    },
    {
      id: 3,
      username: 'manager',
      role_id: 3,
      role: 'Store Manager',
      permissions: roles[2].permissions,
      language: 'ar',
      is_active: true,
      created_at: '2026-01-03T08:00:00.000Z'
    }
  ]

  const warehouses = [
    { id: 1, name: 'Main Warehouse', code: 'WH-MAIN', city: 'Algiers', street: 'Industrial Zone Oued Smar', state: 'Algiers' },
    { id: 2, name: 'Secondary Warehouse', code: 'WH-SEC', city: 'Oran', street: 'Zone d\'Activité Es Senia', state: 'Oran' },
    { id: 3, name: 'Showroom', code: 'WH-SHOW', city: 'Setif', street: 'Avenue du 8 Mai 1945', state: 'Setif' }
  ]

  const families = [
    { id: 1, name: 'Electronics', code: 'CAT-ELEC' },
    { id: 2, name: 'Mobile', code: 'CAT-MOB' },
    { id: 3, name: 'Office', code: 'CAT-OFF' },
    { id: 4, name: 'Accessories', code: 'CAT-ACC' }
  ]

  const units = [
    { id: 1, name: 'Piece', code: 'U-PCS' },
    { id: 2, name: 'Box', code: 'U-BOX' },
    { id: 3, name: 'Pack', code: 'U-PCK' },
    { id: 4, name: 'Set', code: 'U-SET' }
  ]

  const brands = [
    { id: 1, name: 'Dell' },
    { id: 2, name: 'HP' },
    { id: 3, name: 'Logitech' },
    { id: 4, name: 'Samsung' },
    { id: 5, name: 'Anker' },
    { id: 6, name: 'Canon' }
  ]

  const taxes = [
    { id: 1, name: 'TVA 19%', valueTax: 19 },
    { id: 2, name: 'TVA 9%', valueTax: 9 },
    { id: 3, name: 'Exonéré 0%', valueTax: 0 }
  ]

  const productsRaw = [
    // Electronics
    { id: 1, name: 'Laptop Pro 15', code: 'ELEC-001', barcode: '613123456001', family_id: 1, brand_id: 1, unit_id: 1, tax_id: 1, costPrice: 12000000, salePrice: 15000000, alertQuantity: 5, icon: '💻', grad: ['#1E3A8A', '#3B82F6'], stock: { 1: 12, 2: 7, 3: 2 } },
    { id: 2, name: 'Business Laptop 14', code: 'ELEC-002', barcode: '613123456002', family_id: 1, brand_id: 2, unit_id: 1, tax_id: 1, costPrice: 8000000, salePrice: 10000000, alertQuantity: 4, icon: '💻', grad: ['#1E40AF', '#60A5FA'], stock: { 1: 8, 2: 0, 3: 2 } },
    { id: 3, name: 'Wireless Mouse', code: 'ELEC-003', barcode: '613123456003', family_id: 1, brand_id: 3, unit_id: 1, tax_id: 1, costPrice: 150000, salePrice: 250000, alertQuantity: 10, icon: '🖱️', grad: ['#047857', '#10B981'], stock: { 1: 35, 2: 20, 3: 5 } },
    { id: 4, name: 'Mechanical Keyboard', code: 'ELEC-004', barcode: '613123456004', family_id: 1, brand_id: 3, unit_id: 1, tax_id: 1, costPrice: 600000, salePrice: 900000, alertQuantity: 5, icon: '⌨️', grad: ['#6D28D9', '#8B5CF6'], stock: { 1: 20, 2: 12, 3: 3 } },
    { id: 5, name: '24" Full HD Monitor', code: 'ELEC-005', barcode: '613123456005', family_id: 1, brand_id: 1, unit_id: 1, tax_id: 1, costPrice: 1800000, salePrice: 2500000, alertQuantity: 4, icon: '🖥️', grad: ['#0369A1', '#0ea5e9'], stock: { 1: 15, 2: 0, 3: 3 } },
    { id: 6, name: 'USB-C Hub', code: 'ELEC-006', barcode: '613123456006', family_id: 1, brand_id: 5, unit_id: 1, tax_id: 1, costPrice: 300000, salePrice: 500000, alertQuantity: 8, icon: '🔌', grad: ['#B45309', '#F59E0B'], stock: { 1: 25, 2: 0, 3: 1 } },
    { id: 7, name: 'Bluetooth Headphones', code: 'ELEC-007', barcode: '613123456007', family_id: 1, brand_id: 4, unit_id: 1, tax_id: 1, costPrice: 400000, salePrice: 700000, alertQuantity: 5, icon: '🎧', grad: ['#BE185D', '#EC4899'], stock: { 1: 0, 2: 18, 3: 4 } },

    // Mobile
    { id: 8, name: 'Smartphone X', code: 'MOB-001', barcode: '613123456008', family_id: 2, brand_id: 4, unit_id: 1, tax_id: 1, costPrice: 6000000, salePrice: 8000000, alertQuantity: 5, icon: '📱', grad: ['#1E293B', '#475569'], stock: { 1: 10, 2: 6, 3: 3 } },
    { id: 9, name: 'Smartphone Pro', code: 'MOB-002', barcode: '613123456009', family_id: 2, brand_id: 4, unit_id: 1, tax_id: 1, costPrice: 9000000, salePrice: 12000000, alertQuantity: 4, icon: '📱', grad: ['#0F172A', '#334155'], stock: { 1: 0, 2: 9, 3: 2 } },
    { id: 10, name: 'USB-C Fast Charger', code: 'MOB-003', barcode: '613123456010', family_id: 2, brand_id: 5, unit_id: 1, tax_id: 1, costPrice: 150000, salePrice: 300000, alertQuantity: 10, icon: '⚡', grad: ['#059669', '#34D399'], stock: { 1: 0, 2: 30, 3: 0 } },
    { id: 11, name: 'Power Bank 20,000mAh', code: 'MOB-004', barcode: '613123456011', family_id: 2, brand_id: 5, unit_id: 1, tax_id: 1, costPrice: 400000, salePrice: 600000, alertQuantity: 6, icon: '🔋', grad: ['#4338CA', '#6366F1'], stock: { 1: 0, 2: 22, 3: 0 } },

    // Office
    { id: 12, name: 'A4 Laser Printer', code: 'OFF-001', barcode: '613123456012', family_id: 3, brand_id: 6, unit_id: 1, tax_id: 1, costPrice: 1500000, salePrice: 2200000, alertQuantity: 3, icon: '🖨️', grad: ['#C2410C', '#FB923C'], stock: { 1: 6, 2: 4, 3: 0 } },
    { id: 13, name: 'A4 Paper 500 Sheets', code: 'OFF-002', barcode: '613123456013', family_id: 3, brand_id: 6, unit_id: 2, tax_id: 2, costPrice: 60000, salePrice: 90000, alertQuantity: 20, icon: '📄', grad: ['#0E7490', '#22D3EE'], stock: { 1: 100, 2: 0, 3: 0 } },
    { id: 14, name: 'Ergonomic Office Chair', code: 'OFF-003', barcode: '613123456014', family_id: 3, brand_id: 2, unit_id: 1, tax_id: 1, costPrice: 1200000, salePrice: 1800000, alertQuantity: 3, icon: '🪑', grad: ['#374151', '#6B7280'], stock: { 1: 12, 2: 0, 3: 2 } },
    { id: 15, name: 'LED Desk Lamp', code: 'OFF-004', barcode: '613123456015', family_id: 3, brand_id: 2, unit_id: 1, tax_id: 1, costPrice: 250000, salePrice: 400000, alertQuantity: 5, icon: '💡', grad: ['#D97706', '#FBBF24'], stock: { 1: 0, 2: 0, 3: 0 } },

    // Accessories
    { id: 16, name: 'HDMI Cable 2m', code: 'ACC-001', barcode: '613123456016', family_id: 4, brand_id: 5, unit_id: 1, tax_id: 1, costPrice: 50000, salePrice: 120000, alertQuantity: 10, icon: '➰', grad: ['#15803D', '#4ADE80'], stock: { 1: 40, 2: 0, 3: 2 } },
    { id: 17, name: 'Ethernet Cable 5m', code: 'ACC-002', barcode: '613123456017', family_id: 4, brand_id: 5, unit_id: 1, tax_id: 1, costPrice: 80000, salePrice: 150000, alertQuantity: 10, icon: '🌐', grad: ['#1D4ED8', '#60A5FA'], stock: { 1: 0, 2: 35, 3: 0 } },
    { id: 18, name: 'Laptop Backpack', code: 'ACC-003', barcode: '613123456018', family_id: 4, brand_id: 1, unit_id: 1, tax_id: 1, costPrice: 350000, salePrice: 550000, alertQuantity: 5, icon: '🎒', grad: ['#7C2D12', '#EA580C'], stock: { 1: 18, 2: 0, 3: 4 } },
    { id: 19, name: 'Wireless Presenter', code: 'ACC-004', barcode: '613123456019', family_id: 4, brand_id: 3, unit_id: 1, tax_id: 1, costPrice: 200000, salePrice: 350000, alertQuantity: 3, icon: '🪄', grad: ['#581C87', '#A855F7'], stock: { 1: 0, 2: 0, 3: 1 } },
    { id: 20, name: 'Webcam Full HD', code: 'ACC-005', barcode: '613123456020', family_id: 4, brand_id: 3, unit_id: 1, tax_id: 1, costPrice: 450000, salePrice: 700000, alertQuantity: 4, icon: '📷', grad: ['#9F1239', '#F43F5E'], stock: { 1: 0, 2: 15, 3: 3 } }
  ]

  const products = productsRaw.map(p => ({
    id: p.id,
    code: p.code,
    barcode: p.barcode,
    name: p.name,
    designation: `${p.name} — Commercial Spec`,
    family_id: p.family_id,
    brand_id: p.brand_id,
    unit_id: p.unit_id,
    tax_id: p.tax_id,
    costPrice: p.costPrice,
    salePrice: p.salePrice,
    alertQuantity: p.alertQuantity,
    durability: false,
    photo: createSvgDataUri(p.icon, p.grad, p.code),
    weight: 1.2,
    height: 10,
    width: 20,
    depth: 30,
    shelving: `RACK-${p.id}`,
    is_active: true
  }))

  const productStock = []
  const stockMovements = []
  let movementId = 1

  productsRaw.forEach(p => {
    Object.entries(p.stock).forEach(([wId, qty]) => {
      const warehouseId = Number(wId)
      productStock.push({
        product_id: p.id,
        warehouse_id: warehouseId,
        quantity: qty
      })
      if (qty > 0) {
        stockMovements.push({
          id: movementId++,
          product_id: p.id,
          warehouse_id: warehouseId,
          quantity_delta: qty,
          movement_type: 'INITIAL_STOCK',
          reference_type: 'INIT',
          reference_id: null,
          reason: 'Initial Inventory Setup',
          user_id: 1,
          created_at: '2026-01-01T08:00:00.000Z'
        })
      }
    })
  })

  const customers = [
    {
      id: 1,
      raison: 'SARL Digital Solutions',
      code: 'C-SDS',
      type: 'Entreprise',
      city: 'Alger',
      street: '14 Rue Didouche Mourad',
      state: 'Alger',
      phone: '023 50 12 34',
      mobile: '0550 11 22 33',
      tax_ids: 'NIF: 001616012345678, RC: 16/00-1234567B16',
      country: 'Algérie',
      disabled: false
    },
    {
      id: 2,
      raison: 'Société ABC Technologies',
      code: 'C-ABC',
      type: 'Entreprise',
      city: 'Oran',
      street: 'Boulevard Front de Mer',
      state: 'Oran',
      phone: '041 33 44 55',
      mobile: '0661 44 55 66',
      tax_ids: 'NIF: 001216098765432, RC: 12/00-9876543B12',
      country: 'Algérie',
      disabled: false
    },
    {
      id: 3,
      raison: 'Ahmed Benali',
      code: 'C-AB',
      type: 'Particulier',
      city: 'Constantine',
      street: 'Cité Sidi Mabrouk',
      state: 'Constantine',
      phone: '031 90 80 70',
      mobile: '0555 77 88 99',
      tax_ids: '',
      country: 'Algérie',
      disabled: false
    },
    {
      id: 4,
      raison: 'Demo Customer Express',
      code: 'C-DEMO',
      type: 'Particulier',
      city: 'Alger',
      street: 'Centre Ville',
      state: 'Alger',
      phone: '023 10 20 30',
      mobile: '0770 00 11 22',
      tax_ids: '',
      country: 'Algérie',
      disabled: false
    }
  ]

  const vendors = [
    {
      id: 1,
      raison: 'Tech Distribution Algeria',
      code: 'V-TDA',
      type: 'Grossiste',
      city: 'Alger',
      street: 'Zone Industrielle Rouiba',
      state: 'Alger',
      phone: '023 85 90 00',
      mobile: '0560 90 00 11',
      tax_ids: 'NIF: 001516055555555, RC: 15/00-5555555B15',
      country: 'Algérie',
      disabled: false
    },
    {
      id: 2,
      raison: 'Office Solutions DZ',
      code: 'V-OSDZ',
      type: 'Fournisseur',
      city: 'Blida',
      street: 'Avenue de la Gare',
      state: 'Blida',
      phone: '025 40 11 22',
      mobile: '0662 11 22 33',
      tax_ids: 'NIF: 001416044444444, RC: 14/00-4444444B14',
      country: 'Algérie',
      disabled: false
    },
    {
      id: 3,
      raison: 'Mobile Accessories Pro',
      code: 'V-MAP',
      type: 'Importateur',
      city: 'Sétif',
      street: 'Zone Commerciale',
      state: 'Sétif',
      phone: '036 80 70 60',
      mobile: '0550 33 44 55',
      tax_ids: 'NIF: 001716077777777, RC: 17/00-7777777B17',
      country: 'Algérie',
      disabled: false
    },
    {
      id: 4,
      raison: 'Digital Equipment Supply',
      code: 'V-DES',
      type: 'Distributeur',
      city: 'Annaba',
      street: 'Cours de la Révolution',
      state: 'Annaba',
      phone: '038 45 67 89',
      mobile: '0771 22 33 44',
      tax_ids: 'NIF: 001316033333333, RC: 13/00-3333333B13',
      country: 'Algérie',
      disabled: false
    }
  ]

  // Historical Sales & Customer Ledger Entries
  const sales = [
    {
      id: 1,
      code: 'S00001',
      date: '2026-02-10T10:30:00.000Z',
      customer_id: 1,
      total_untaxed: 30000000,
      total_taxes: 5700000,
      discount: 1000000,
      stamp: 2500,
      total_price: 34702500,
      payment: 20000000,
      rest: 14702500,
      payed: false,
      state: 'invoice',
      payment_method: 'bank_transfer',
      bank: 'BNA - Alger',
      status: 'FINALIZED',
      created_by: 1
    },
    {
      id: 2,
      code: 'S00002',
      date: '2026-02-15T14:15:00.000Z',
      customer_id: 2,
      total_untaxed: 11500000,
      total_taxes: 2185000,
      discount: 0,
      stamp: 2500,
      total_price: 13687500,
      payment: 13687500,
      rest: 0,
      payed: true,
      state: 'invoice',
      payment_method: 'check',
      bank: 'BEA - Oran',
      status: 'FINALIZED',
      created_by: 1
    },
    {
      id: 3,
      code: 'S00003',
      date: '2026-03-01T11:00:00.000Z',
      customer_id: 3,
      total_untaxed: 500000,
      total_taxes: 95000,
      discount: 0,
      stamp: 0,
      total_price: 595000,
      payment: 595000,
      rest: 0,
      payed: true,
      state: 'receipt',
      payment_method: 'cash',
      bank: null,
      status: 'FINALIZED',
      created_by: 2
    }
  ]

  const saleLines = [
    {
      id: 1,
      sale_id: 1,
      product_id: 1, // Laptop Pro 15
      warehouse_id: 1,
      amount: 2,
      price: 15000000,
      tax_percent: 19,
      untaxed_amount: 30000000,
      taxes: 5700000,
      subtotal: 35700000
    },
    {
      id: 2,
      sale_id: 2,
      product_id: 4, // Mechanical Keyboard
      warehouse_id: 1,
      amount: 5,
      price: 900000,
      tax_percent: 19,
      untaxed_amount: 4500000,
      taxes: 855000,
      subtotal: 5355000
    },
    {
      id: 3,
      sale_id: 2,
      product_id: 5, // Monitor
      warehouse_id: 1,
      amount: 2,
      price: 2500000,
      tax_percent: 19,
      untaxed_amount: 5000000,
      taxes: 950000,
      subtotal: 5950000
    },
    {
      id: 4,
      sale_id: 2,
      product_id: 3, // Wireless Mouse
      warehouse_id: 2,
      amount: 8,
      price: 250000,
      tax_percent: 19,
      untaxed_amount: 2000000,
      taxes: 380000,
      subtotal: 2380000
    },
    {
      id: 5,
      sale_id: 3,
      product_id: 3, // Wireless Mouse
      warehouse_id: 3,
      amount: 2,
      price: 250000,
      tax_percent: 19,
      untaxed_amount: 500000,
      taxes: 95000,
      subtotal: 595000
    }
  ]

  const customerReceivablesLedger = [
    {
      id: 1,
      customer_id: 1,
      amount: 34702500,
      type: 'CHARGE',
      reference_type: 'SALE',
      reference_id: 1,
      notes: 'Sale S00001 Total',
      created_by: 1,
      created_at: '2026-02-10T10:30:00.000Z'
    },
    {
      id: 2,
      customer_id: 1,
      amount: -20000000,
      type: 'PAYMENT',
      reference_type: 'SALE',
      reference_id: 1,
      notes: 'Payment for Sale S00001',
      created_by: 1,
      created_at: '2026-02-10T10:30:00.000Z'
    },
    {
      id: 3,
      customer_id: 2,
      amount: 13687500,
      type: 'CHARGE',
      reference_type: 'SALE',
      reference_id: 2,
      notes: 'Sale S00002 Total',
      created_by: 1,
      created_at: '2026-02-15T14:15:00.000Z'
    },
    {
      id: 4,
      customer_id: 2,
      amount: -13687500,
      type: 'PAYMENT',
      reference_type: 'SALE',
      reference_id: 2,
      notes: 'Payment for Sale S00002',
      created_by: 1,
      created_at: '2026-02-15T14:15:00.000Z'
    },
    {
      id: 5,
      customer_id: 3,
      amount: 595000,
      type: 'CHARGE',
      reference_type: 'SALE',
      reference_id: 3,
      notes: 'Sale S00003 Total',
      created_by: 2,
      created_at: '2026-03-01T11:00:00.000Z'
    },
    {
      id: 6,
      customer_id: 3,
      amount: -595000,
      type: 'PAYMENT',
      reference_type: 'SALE',
      reference_id: 3,
      notes: 'Payment for Sale S00003',
      created_by: 2,
      created_at: '2026-03-01T11:00:00.000Z'
    }
  ]

  // Historical Purchases & Vendor Payables Ledger
  const purchases = [
    {
      id: 1,
      code: 'P00001',
      date: '2026-01-15T09:00:00.000Z',
      vendor_id: 1,
      warehouse_id: 1,
      total_untaxed: 240000000,
      total_taxes: 45600000,
      discount: 0,
      stamp: 2500,
      total_price: 285602500,
      payment: 200000000,
      rest: 85602500,
      payed: false,
      status: 'FINALIZED',
      created_by: 1
    },
    {
      id: 2,
      code: 'P00002',
      date: '2026-01-20T14:00:00.000Z',
      vendor_id: 2,
      warehouse_id: 1,
      total_untaxed: 6000000,
      total_taxes: 540000,
      discount: 100000,
      stamp: 0,
      total_price: 6440000,
      payment: 6440000,
      rest: 0,
      payed: true,
      status: 'FINALIZED',
      created_by: 1
    }
  ]

  const purchaseLines = [
    {
      id: 1,
      purchase_id: 1,
      product_id: 1,
      warehouse_id: 1,
      amount: 20,
      price: 12000000,
      tax_percent: 19,
      untaxed_amount: 240000000,
      taxes: 45600000,
      subtotal: 285600000
    },
    {
      id: 2,
      purchase_id: 2,
      product_id: 13, // Paper
      warehouse_id: 1,
      amount: 100,
      price: 60000,
      tax_percent: 9,
      untaxed_amount: 6000000,
      taxes: 540000,
      subtotal: 6540000
    }
  ]

  const vendorPayablesLedger = [
    {
      id: 1,
      vendor_id: 1,
      amount: 285602500,
      type: 'CHARGE',
      reference_type: 'PURCHASE',
      reference_id: 1,
      notes: 'Purchase P00001 Total',
      created_by: 1,
      created_at: '2026-01-15T09:00:00.000Z'
    },
    {
      id: 2,
      vendor_id: 1,
      amount: -200000000,
      type: 'PAYMENT',
      reference_type: 'PURCHASE',
      reference_id: 1,
      notes: 'Initial Payment for Purchase P00001',
      created_by: 1,
      created_at: '2026-01-15T09:00:00.000Z'
    },
    {
      id: 3,
      vendor_id: 2,
      amount: 6440000,
      type: 'CHARGE',
      reference_type: 'PURCHASE',
      reference_id: 2,
      notes: 'Purchase P00002 Total',
      created_by: 1,
      created_at: '2026-01-20T14:00:00.000Z'
    },
    {
      id: 4,
      vendor_id: 2,
      amount: -6440000,
      type: 'PAYMENT',
      reference_type: 'PURCHASE',
      reference_id: 2,
      notes: 'Payment for Purchase P00002',
      created_by: 1,
      created_at: '2026-01-20T14:00:00.000Z'
    }
  ]

  const settings = {
    company_name: 'Next Inventory SARL',
    company_address: '12 Boulevard des Martyrs, Alger, Algérie',
    company_phone: '+213 (0) 23 45 67 89',
    company_email: 'contact@nextinventory.dz',
    company_tax_id: '001616012345678',
    rc: '16/00-1234567B16',
    nif: '001616012345678',
    nis: '00161601234567800001',
    art: '16012345678',
    rib: '001 00123 0123456789 45',
    currency: 'DA',
    company_logo: null
  }

  const posRegisters = [
    { id: 1, name: 'Caisse Principale (Counter 01)', status: 'CLOSED' },
    { id: 2, name: 'Caisse Express (Counter 02)', status: 'CLOSED' }
  ]

  return {
    roles,
    users,
    warehouses,
    families,
    units,
    brands,
    taxes,
    products,
    product_stock: productStock,
    stock_movements: stockMovements,
    customers,
    customer_receivables_ledger: customerReceivablesLedger,
    vendors,
    vendor_payables_ledger: vendorPayablesLedger,
    sales,
    sale_lines: saleLines,
    purchases,
    purchase_lines: purchaseLines,
    credit_notes: [],
    credit_note_lines: [],
    debit_notes: [],
    debit_note_lines: [],
    transfers: [],
    transfer_lines: [],
    pos_registers: posRegisters,
    pos_sessions: [],
    pos_held_sales: [],
    settings
  }
}
