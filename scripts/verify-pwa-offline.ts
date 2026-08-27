import fs from 'node:fs'
import path from 'node:path'

let totalTests = 0
let passedTests = 0

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++
  if (condition) {
    console.log(`  [PASS] ${testName}`)
    passedTests++
  } else {
    console.error(`  [FAIL] ${testName}`)
    if (details) console.error(`         Details: ${details}`)
  }
}

async function runPwaAndOfflineVerification() {
  console.log('==================================================================')
  console.log('🔍 DEVDOT PWA, WORKBOX OFFLINE & CI/CD VERIFICATION SUITE (Sub-Fase 4.3)')
  console.log('==================================================================\n')

  const rootDir = process.cwd()

  // -------------------------------------------------------------------------
  // 1. Static Assets & PWA Icons Verification
  // -------------------------------------------------------------------------
  console.log('--- 1. PWA Static Assets & Adaptive Icons ---')
  const faviconSvg = path.join(rootDir, 'public', 'favicon.svg')
  const pwa192 = path.join(rootDir, 'public', 'pwa-192x192.svg')
  const pwa512 = path.join(rootDir, 'public', 'pwa-512x512.svg')
  const pwaMaskable = path.join(rootDir, 'public', 'pwa-maskable.svg')
  const robotsTxt = path.join(rootDir, 'public', 'robots.txt')

  assert(fs.existsSync(faviconSvg), 'public/favicon.svg exists')
  assert(fs.existsSync(pwa192), 'public/pwa-192x192.svg exists')
  assert(fs.existsSync(pwa512), 'public/pwa-512x512.svg exists')
  assert(fs.existsSync(pwaMaskable), 'public/pwa-maskable.svg exists')
  assert(fs.existsSync(robotsTxt), 'public/robots.txt exists')

  const pwa192Content = fs.readFileSync(pwa192, 'utf-8')
  assert(pwa192Content.includes('viewBox="0 0 192 192"'), 'pwa-192x192.svg has valid 192x192 viewBox')

  const pwa512Content = fs.readFileSync(pwa512, 'utf-8')
  assert(pwa512Content.includes('viewBox="0 0 512 512"'), 'pwa-512x512.svg has valid 512x512 viewBox')

  const pwaMaskableContent = fs.readFileSync(pwaMaskable, 'utf-8')
  assert(pwaMaskableContent.includes('viewBox="0 0 512 512"'), 'pwa-maskable.svg has valid maskable SVG viewBox')

  // -------------------------------------------------------------------------
  // 2. Vite Config & Workbox Configuration Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Vite Configuration & Workbox Cache-First Strategy ---')
  const viteConfigPath = path.join(rootDir, 'vite.config.ts')
  assert(fs.existsSync(viteConfigPath), 'vite.config.ts exists')
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8')

  assert(viteConfig.includes("import { VitePWA } from 'vite-plugin-pwa'"), 'VitePWA is imported in vite.config.ts')
  assert(viteConfig.includes("registerType: 'autoUpdate'"), 'registerType autoUpdate is configured')
  assert(viteConfig.includes("name: 'DevDot - Privacy-First Universal Developer Toolkit'"), 'Manifest name is properly set')
  assert(viteConfig.includes("short_name: 'DevDot'"), 'Manifest short_name is set to DevDot')
  assert(viteConfig.includes("display: 'standalone'"), 'Manifest display mode is set to standalone')
  assert(viteConfig.includes("theme_color: '#1e1b4b'"), 'Manifest theme_color is configured with MD3 dark primary')
  assert(viteConfig.includes("background_color: '#0f172a'"), 'Manifest background_color is configured')
  assert(viteConfig.includes("maximumFileSizeToCacheInBytes: 10 * 1024 * 1024"), 'Workbox allows large bundle caching up to 10MB')
  assert(viteConfig.includes("handler: 'CacheFirst'"), 'Workbox runtime caching uses CacheFirst strategy for 100% offline access')
  assert(viteConfig.includes("navigateFallback: 'index.html'"), 'Workbox navigateFallback to index.html is configured')

  // -------------------------------------------------------------------------
  // 3. HTML Meta Tags Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 3. HTML PWA Meta Tags Verification ---')
  const indexHtmlPath = path.join(rootDir, 'index.html')
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')

  assert(indexHtml.includes('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />'), 'index.html references favicon.svg')
  assert(indexHtml.includes('<link rel="apple-touch-icon" href="/pwa-192x192.svg" />'), 'index.html references apple-touch-icon')
  assert(indexHtml.includes('<meta name="theme-color" content="#1e1b4b" />'), 'index.html specifies theme-color meta tag')
  assert(indexHtml.includes('<meta name="mobile-web-app-capable" content="yes" />'), 'index.html specifies mobile-web-app-capable')
  assert(indexHtml.includes('<meta name="apple-mobile-web-app-title" content="DevDot" />'), 'index.html specifies apple-mobile-web-app-title')

  // -------------------------------------------------------------------------
  // 4. Pinia PWA Store & Composables Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 4. PWA State Store, Lifecycle & UI Components ---')
  const pwaStorePath = path.join(rootDir, 'src', 'stores', 'pwa.ts')
  assert(fs.existsSync(pwaStorePath), 'src/stores/pwa.ts exists')
  const pwaStoreContent = fs.readFileSync(pwaStorePath, 'utf-8')

  assert(pwaStoreContent.includes("defineStore('pwa'"), 'usePwaStore is defined')
  assert(pwaStoreContent.includes('beforeinstallprompt'), 'Handles beforeinstallprompt event')
  assert(pwaStoreContent.includes('appinstalled'), 'Handles appinstalled event')
  assert(pwaStoreContent.includes('isOffline'), 'Tracks offline/online network status')
  assert(pwaStoreContent.includes('promptInstall'), 'Exposes promptInstall method')
  assert(pwaStoreContent.includes('showInstallBanner'), 'Computes showInstallBanner reactivity')
  assert(pwaStoreContent.includes('dontAskAgainInstallPrompt'), 'Supports dontAskAgainInstallPrompt suppression')

  const usePwaPath = path.join(rootDir, 'src', 'composables', 'usePwa.ts')
  assert(fs.existsSync(usePwaPath), 'src/composables/usePwa.ts exists')

  const pwaBannerPath = path.join(rootDir, 'src', 'components', 'layout', 'PwaInstallBanner.vue')
  assert(fs.existsSync(pwaBannerPath), 'PwaInstallBanner.vue exists')
  const pwaBannerContent = fs.readFileSync(pwaBannerPath, 'utf-8')
  assert(pwaBannerContent.includes('handleDontAskAgain'), 'PwaInstallBanner includes Dont ask again option')

  const settingsDialogPath = path.join(rootDir, 'src', 'components', 'layout', 'SettingsDialog.vue')
  assert(fs.existsSync(settingsDialogPath), 'SettingsDialog.vue exists')
  const settingsDialogContent = fs.readFileSync(settingsDialogPath, 'utf-8')
  assert(settingsDialogContent.includes('pwaStore.isInstallable'), 'SettingsDialog includes manual PWA install action')
  assert(settingsDialogContent.includes('pwaStore.updateApp'), 'SettingsDialog includes manual offline cache update action')
  assert(settingsDialogContent.includes('dontAskInstall'), 'SettingsDialog includes install banner suppression switch')

  const cmdPalettePath = path.join(rootDir, 'src', 'components', 'layout', 'CommandPalette.vue')
  const cmdPaletteContent = fs.readFileSync(cmdPalettePath, 'utf-8')
  assert(cmdPaletteContent.includes('action-pwa-install'), 'CommandPalette includes Install DevDot App action')
  assert(cmdPaletteContent.includes('action-pwa-update'), 'CommandPalette includes Service Worker update action')

  // -------------------------------------------------------------------------
  // 5. GitHub Actions CI/CD Pipeline & Documentation Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 5. CI/CD GitHub Actions & Documentation ---')
  const cicdWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci-cd.yml')
  assert(fs.existsSync(cicdWorkflowPath), '.github/workflows/ci-cd.yml exists')
  const cicdWorkflow = fs.readFileSync(cicdWorkflowPath, 'utf-8')

  assert(cicdWorkflow.includes('verify-and-test:'), 'Workflow contains verify-and-test job')
  assert(cicdWorkflow.includes('build-pwa-web:'), 'Workflow contains build-pwa-web job')
  assert(cicdWorkflow.includes('build-tauri-desktop:'), 'Workflow contains build-tauri-desktop job')
  assert(cicdWorkflow.includes('windows-latest') && cicdWorkflow.includes('macos-latest') && cicdWorkflow.includes('ubuntu-22.04'), 'Workflow defines cross-platform matrix (Windows, macOS, Linux)')
  assert(cicdWorkflow.includes('tauri-apps/tauri-action@v0'), 'Workflow uses official tauri-apps/tauri-action for release packaging')
  assert(cicdWorkflow.includes('npm run test:pwa'), 'Workflow executes PWA verification test suite')

  const docPath = path.join(rootDir, 'docs', 'CI_CD.md')
  assert(fs.existsSync(docPath), 'docs/CI_CD.md exists')
  const docContent = fs.readFileSync(docPath, 'utf-8')
  assert(docContent.includes('DevDot CI/CD & Offline Deployment Documentation'), 'docs/CI_CD.md has comprehensive overview')
  assert(docContent.includes('Workbox Cache-First'), 'docs/CI_CD.md details PWA workbox caching strategy')

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n==================================================================')
  console.log(`🏁 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} checks passed`)
  console.log('==================================================================')

  if (passedTests === totalTests) {
    console.log('✅ ALL SUB-FASE 4.3 PWA, WORKBOX & CI/CD CHECKS PASSED PERFECTLY!\n')
    process.exit(0)
  } else {
    console.error(`❌ FAILED: ${totalTests - passedTests} checks failed.\n`)
    process.exit(1)
  }
}

runPwaAndOfflineVerification().catch((err) => {
  console.error('Fatal error during verification:', err)
  process.exit(1)
})
