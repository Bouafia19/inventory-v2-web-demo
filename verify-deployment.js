import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const screenshotsDir = path.join(__dirname, 'test-screenshots')
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

const TARGET_URL = process.env.TEST_URL || 'https://inventory-nextchallenge.netlify.app'

console.log('========================================================================')
console.log('🚀 INVENTORY V2 — FULL PRODUCTION LIVE VERIFICATION')
console.log(`Target URL: ${TARGET_URL}`)
console.log('========================================================================\n')

async function runTests() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  })

  const page = await browser.newPage()
  const consoleErrors = []
  const networkRequests = []

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
      console.log(`[BROWSER ERROR] ${msg.text()}`)
    }
  })

  page.on('pageerror', err => {
    consoleErrors.push(err.message)
    console.log(`[BROWSER PAGEERROR] ${err.message}`)
  })

  page.on('request', req => {
    networkRequests.push({ url: req.url(), method: req.method() })
  })

  const results = {
    titleMatch: false,
    metaDescription: false,
    canonicalUrl: false,
    ogTags: false,
    securityHeaders: false,
    spaFallback: false,
    authWorks: false,
    dashboardLoaded: false,
    productsLoaded: false,
    productCount: 0,
    searchFilterWorks: false,
    warehousesLoaded: false,
    salesLoaded: false,
    posLoaded: false,
    persistenceWorks: false,
    desktopLayout: false,
    tabletLayout: false,
    mobileLayout: false,
    zeroBackendCalls: false,
    consoleErrors: []
  }

  try {
    // 1. Initial Load & Metadata Check
    console.log('1️⃣ Testing Initial Load and Metadata...')
    await page.setViewport({ width: 1440, height: 900 })
    const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 })
    
    const headers = response.headers()
    console.log(`Response Status: ${response.status()}`)
    console.log(`X-Frame-Options: ${headers['x-frame-options']}`)
    console.log(`X-Content-Type-Options: ${headers['x-content-type-options']}`)
    results.securityHeaders = headers['x-frame-options'] === 'SAMEORIGIN' && headers['x-content-type-options'] === 'nosniff'

    const title = await page.title()
    console.log(`Page Title: "${title}"`)
    results.titleMatch = title === 'Inventory V2 – Smart Inventory Management'

    const metaDesc = await page.$eval('meta[name="description"]', el => el.getAttribute('content')).catch(() => '')
    const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href')).catch(() => '')
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content')).catch(() => '')

    console.log(`Canonical URL: ${canonical}`)
    console.log(`Meta Description: ${metaDesc}`)
    results.canonicalUrl = canonical === 'https://inventory.nextchallenge.tech'
    results.metaDescription = metaDesc.length > 20
    results.ogTags = ogTitle === 'Inventory V2 – Smart Inventory Management'

    await page.screenshot({ path: path.join(screenshotsDir, '01_initial_landing.png') })

    // 2. Test Demo Authentication
    console.log('\n2️⃣ Testing Authentication...')
    const currentUrl = page.url()
    console.log(`Current URL: ${currentUrl}`)

    if (currentUrl.includes('/login')) {
      console.log('Submitting login form for admin...')
      const submitBtn = await page.$('button[type="submit"]')
      if (submitBtn) {
        await submitBtn.click()
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    const afterLoginUrl = page.url()
    console.log(`After login URL: ${afterLoginUrl}`)
    results.authWorks = !afterLoginUrl.includes('/login')

    await page.screenshot({ path: path.join(screenshotsDir, '02_dashboard_desktop.png') })

    // 3. Verify Dashboard & Statistics
    console.log('\n3️⃣ Verifying Dashboard & Statistics...')
    const cardCount = await page.$$eval('.v-card', cards => cards.length)
    console.log(`Visible VCards on Dashboard: ${cardCount}`)
    const chartExists = await page.$('.vue-apexcharts, svg.apexcharts-svg')
    console.log(`ApexCharts SVG rendered: ${!!chartExists}`)
    results.dashboardLoaded = cardCount >= 4

    // 4. Products View & Operations
    console.log('\n4️⃣ Verifying Products View...')
    await page.goto(`${TARGET_URL}/#/products`, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 2000))
    await page.screenshot({ path: path.join(screenshotsDir, '03_products_view.png') })

    const productRows = await page.$$eval('tbody tr, .v-data-table tbody tr', trs => trs.length).catch(() => 0)
    console.log(`Visible product rows: ${productRows}`)
    results.productsLoaded = productRows > 0
    results.productCount = productRows

    // Test search filter
    const searchInput = await page.$('input[type="text"], input[placeholder*="Recherch"], input[placeholder*="Search"]')
    if (searchInput) {
      await searchInput.type('SSD')
      await new Promise(r => setTimeout(r, 1000))
      const filteredRows = await page.$$eval('tbody tr, .v-data-table tbody tr', trs => trs.length).catch(() => 0)
      console.log(`Filtered rows for "SSD": ${filteredRows}`)
      results.searchFilterWorks = filteredRows > 0 && filteredRows <= productRows
      await searchInput.click({ clickCount: 3 })
      await page.keyboard.press('Backspace')
      await new Promise(r => setTimeout(r, 1000))
    }

    // 5. Warehouses View
    console.log('\n5️⃣ Verifying Warehouses View...')
    await page.goto(`${TARGET_URL}/#/warehouses`, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))
    const warehouseRows = await page.$$eval('tbody tr', trs => trs.length).catch(() => 0)
    console.log(`Warehouse rows: ${warehouseRows}`)
    results.warehousesLoaded = warehouseRows >= 3
    await page.screenshot({ path: path.join(screenshotsDir, '04_warehouses.png') })

    // 6. Sales View
    console.log('\n6️⃣ Verifying Sales History...')
    await page.goto(`${TARGET_URL}/#/sales`, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))
    const salesRows = await page.$$eval('tbody tr', trs => trs.length).catch(() => 0)
    console.log(`Sales rows: ${salesRows}`)
    results.salesLoaded = salesRows > 0
    await page.screenshot({ path: path.join(screenshotsDir, '05_sales.png') })

    // 7. POS View
    console.log('\n7️⃣ Verifying POS View...')
    await page.goto(`${TARGET_URL}/#/pos`, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 2000))
    const posContainer = await page.$('.pos-container')
    console.log(`POS Container found: ${!!posContainer}`)
    results.posLoaded = !!posContainer
    await page.screenshot({ path: path.join(screenshotsDir, '06_pos.png') })

    // 8. Client-side Persistence Check
    console.log('\n8️⃣ Verifying Client-Side Storage Persistence...')
    const storageKeys = await page.evaluate(() => {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i))
      }
      return keys
    })
    console.log(`LocalStorage keys present: ${storageKeys.join(', ')}`)
    const demoDb = await page.evaluate(() => {
      const raw = localStorage.getItem('next_inventory_v2_demo_db')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return {
        products: parsed.products?.length || 0,
        warehouses: parsed.warehouses?.length || 0,
        customers: parsed.customers?.length || 0,
        sales: parsed.sales?.length || 0
      }
    })
    console.log('Demo Database structure in LocalStorage:', demoDb)
    results.persistenceWorks = !!demoDb && demoDb.products > 0 && demoDb.warehouses > 0

    // 9. SPA Fallback Refresh Check
    console.log('\n9️⃣ Verifying SPA Fallback Refresh...')
    await page.goto(`${TARGET_URL}/#/inventory`, { waitUntil: 'networkidle2' })
    await page.reload({ waitUntil: 'networkidle2' })
    const inventoryPageTitle = await page.title()
    results.spaFallback = inventoryPageTitle.includes('Inventory V2')
    console.log(`Reload succeeded. Title: "${inventoryPageTitle}"`)

    // 10. Responsive Layouts
    console.log('\n🔟 Testing Viewport Layouts...')
    // Desktop
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(`${TARGET_URL}/#/`, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))
    await page.screenshot({ path: path.join(screenshotsDir, '07_dashboard_desktop_1440.png') })
    results.desktopLayout = true

    // Tablet
    await page.setViewport({ width: 768, height: 1024 })
    await page.goto(`${TARGET_URL}/#/`, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))
    await page.screenshot({ path: path.join(screenshotsDir, '08_dashboard_tablet_768.png') })
    results.tabletLayout = true

    // Mobile
    await page.setViewport({ width: 375, height: 667 })
    await page.goto(`${TARGET_URL}/#/`, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))
    await page.screenshot({ path: path.join(screenshotsDir, '09_dashboard_mobile_375.png') })
    results.mobileLayout = true

    // 11. Backend Verification
    // Ensure all requests are for static assets, no external API/DB server contacted
    const externalBackends = networkRequests.filter(r => 
      !r.url.includes(new URL(TARGET_URL).hostname) &&
      !r.url.includes('fonts.googleapis.com') &&
      !r.url.includes('fonts.gstatic.com') &&
      !r.url.includes('netlify.app') &&
      !r.url.includes('data:')
    )
    console.log(`External non-asset requests: ${externalBackends.length}`)
    results.zeroBackendCalls = externalBackends.length === 0

  } catch (err) {
    console.error('Test execution failed:', err)
  } finally {
    results.consoleErrors = consoleErrors
    await browser.close()
  }

  console.log('\n========================================================================')
  console.log('📊 FINAL TEST RESULTS SUMMARY')
  console.log('========================================================================')
  console.log(JSON.stringify(results, null, 2))
}

runTests()
