# HANDOVER & WORKFLOW BREAKDOWN: DevDot Toolkit

Dokumen ini adalah **panduan eksekusi bertahap (Handover & Task Division)** untuk pengembangan aplikasi **DevDot** (Privacy-First Universal Developer Toolkit) berbasis Vue 3, Pinia, Vite, dan Tauri v2.

---

> [!IMPORTANT]
> ### ⚠️ ATURAN EMAS UNTUK AGENT (AI AGENT RULES)
> 1. **DILARANG** mengeksekusi semua fase atau banyak modul sekaligus dalam satu giliran (single turn/prompt).
> 2. **HANYA KERJAKAN SATU SUB-FASE (Contoh: Fase 1.1)** per iterasi pengerjaan.
> 3. Setelah menyelesaikan satu sub-fase:
>    - Jalankan verifikasi/test/build lokal.
>    - Perbarui tanda centang `[x]` pada dokumen ini.
>    - Berikan laporan singkat kepada pengguna dan minta konfirmasi sebelum lanjut ke sub-fase berikutnya.
> 4. **Jaga Prinsip Zero Outbound Data**: Pastikan tidak ada dependensi eksternal yang memuat script/font via CDN saat runtime atau mengirimkan telemetry/analitik.

---

## 📌 DAFTAR ISI FASE PENGERJAAN

- [Fase 0: Inisialisasi Proyek & Scaffolding](#-fase-0-inisialisasi-proyek--scaffolding)
- [Fase 1: Core Architecture, Layout Shell & MD3 Design System](#-fase-1-core-architecture-layout-shell--md3-design-system)
- [Fase 2: Core Utility Modules & Snapshot State Engine](#-fase-2-core-utility-modules--snapshot-state-engine)
- [Fase 3: Advanced Utilities & Heavy Converters](#-fase-3-advanced-utilities--heavy-converters)
- [Fase 4: Privacy Hardening, Desktop Native Features & PWA Packaging](#-fase-4-privacy-hardening-desktop-native-features--pwa-packaging)
- [Format & Template Prompt Eksekusi](#-format-prompt-untuk-user)

---

## 🚀 FASE 0: Inisialisasi Proyek & Scaffolding
**Tujuan:** Membangun fondasi workspace, instalasi dependencies, dan struktur folder yang rapi.

- [x] **0.1 Setup Vue 3 + Vite + TypeScript Monorepo/Workspace**
  - Inisialisasi Vite template `vue-ts`.
  - Konfigurasi `tsconfig.json`, `vite.config.ts` (alias `@/` ke `src/`).
  - Instalasi paket inti: `pinia`, `vue-router` (opsional jika modular tab), `lucide-vue-next` (atau material symbols lokal), `@vueuse/core`.
- [x] **0.2 Inisialisasi Tauri v2 Configuration**
  - Setup Tauri v2 CLI dan scaffold folder `src-tauri`.
  - Konfigurasi permissions & capabilities dasar di `tauri.conf.json`.
- [x] **0.3 Standardisasi Struktur Direktori**
  - Membuat arsitektur direktori:
    ```text
    src/
    ├── assets/          # Fonts, SVG, CSS base
    ├── core/            # Execution adapter, workers pool, schema validator
    │   ├── adapters/
    │   ├── workers/
    │   └── types/
    ├── components/      # Reusable M3 UI components (Buttons, Dialogs, Inputs)
    ├── modules/         # Tool-specific components & logic (JSON, Crypto, dll.)
    ├── stores/          # Pinia stores (tabs, snapshot, preferences)
    └── styles/          # Material Design 3 tokens & CSS variables
    ```
- **Kriteria Selesai (DoD):** `npm run dev` berjalan normal tanpa error TypeScript atau Vite warnings.

---

## 🎨 FASE 1: Core Architecture, Layout Shell & MD3 Design System
**Tujuan:** Membangun arsitektur worker/adapter, integrasi Material Web Components (`@material/web`) & Design Tokens, shell navigasi adaptif, dan editor virtualized.

- [x] **1.1 Material Web Components (@material/web) & MD3 Tokens System**
  - Instalasi paket resmi `@material/web` (100% offline bundle via Vite).
  - Konfigurasi `compilerOptions.isCustomElement: (tag) => tag.startsWith('md-')` pada `vite.config.ts`.
  - Buat CSS Variables Design Tokens M3 di `src/styles/tokens.css` (`--md-sys-color-primary`, `--md-sys-color-surface`, Surface Containers, On-Surface, Error, Outline).
  - Buat composable `useTheme()` (Light, Dark, High-Contrast, System preference).
  - Buat Thin Vue 3 Wrappers di `src/components/ui/` untuk ergonomi Vue (`v-model`, typed props):
    - `M3Button.vue` (Filled, Elevated, Tonal, Outlined, Text)
    - `M3TextField.vue` & `M3TextArea.vue` (dengan dukungan `v-model`)
    - `M3Switch.vue` & `M3Checkbox.vue`
    - `M3Dialog.vue`
    - `M3Card.vue`, `M3Badge.vue`, `M3Tooltip.vue`
- [x] **1.2 Execution Adapter Layer & Web Worker Infrastructure**
  - Implementasi interface `IExecutionEngine`, `ExecutionPayload`, `ExecutionResult`.
  - Buat `WebEngineAdapter` berbasis Web Worker pipeline (`postMessage` & worker pool).
  - Buat stub `TauriEngineAdapter` untuk integrasi Rust IPC mendatang.
- [x] **1.3 Shell Layout & Navigation**
  - **Navigation Rail** (Desktop) dan **Bottom Bar / Drawer** (Mobile/Responsive) memanfaatkan styling M3 adaptif, category filter pills, dan dynamic tools list.
  - **Top App Bar** dengan status indikator Privacy/Offline (100% Offline Pill), action snapshot (Export / Import .toolkit), search trigger, dan theme controls.
  - **Command Palette (Kbar / Ctrl+K)** untuk pencarian cepat, keyboard navigation (Arrow Up/Down/Enter/Esc), jump antar-tools, dan trigger aksi cepat.
- [x] **1.4 Virtualized Split-Pane Editor Wrapper**
  - Integrasi CodeMirror 6 / Vue-Monaco dengan virtual scrolling (dukungan >50MB).
  - Resizable split-pane divider (Input panel di kiri, Output panel di kanan) yang smooth dan responsive.
  - Fitur toolbar editor: Copy to clipboard, Clear, Format, File upload/drop, Word-wrap toggle.
- **Kriteria Selesai (DoD):** Layout shell tampil modern, theme switcher berfungsi, `@material/web` terintegrasi tanpa warning Vite, split-pane resizable berjalan mulus, dan Command Palette aktif.

---

## 🧰 FASE 2: Core Utility Modules & Snapshot State Engine
**Tujuan:** Mengimplementasikan modul JSON, Crypto, Generator, dan sistem snapshot sesi `.toolkit`.

- [ ] **2.1 JSON Suite (Worker-Powered)**
  - Formatter (Indentation: 2 spaces, 4 spaces, Tab) & Minifier.
  - Auto-repair parser (memperbaiki trailing commas, unquoted keys, single quotes).
  - JSON Schema & Type Generator (TypeScript Interface, Go Struct, Rust Struct).
- [ ] **2.2 Encoders & Hash / ID Generators**
  - Base64 Encoder/Decoder (Text & File to Data URI/Base64).
  - URL Encoder/Decoder, Hex, HTML Entities.
  - Hash Generator (MD5, SHA-1, SHA-256, SHA-512) murni client-side.
  - ID Generator (UUIDv4, ULID, NanoID) dengan opsi batch generation.
- [ ] **2.3 Portable Session Snapshot Engine (`.toolkit`)**
  - Pinia store `useSnapshotStore` untuk mengelola snapshot state tab aktif.
  - Fitur **Export Snapshot**: Validasi skema JSON v1.0.0, kompresi/serialize data, download file `.toolkit`.
  - Fitur **Import Snapshot**: Drag-and-drop file `.toolkit`, validasi schema, re-hidrasi state tab dan editor secara reaktif.
- **Kriteria Selesai (DoD):** Modul JSON dan Crypto berfungsi penuh via Web Worker; export dan import file `.toolkit` berhasil memulihkan state.

---

## 🔬 FASE 3: Advanced Utilities & Heavy Converters
**Tujuan:** Mengimplementasikan tools perbandingan visual, token parser, transpiler multi-format, dan pembersih data sensitif.

- [ ] **3.1 JSON Visual Diff Checker**
  - Komponen Vue side-by-side & unified diff viewer.
  - Highlight perbedaan field (tambah, hapus, modifikasi nilai) dengan pewarnaan M3 tokens.
  - Minimap/gutter diff navigation.
- [ ] **3.2 Offline JWT Debugger**
  - Ekstraksi dan decoding Header & Payload (JSON formatted).
  - Visualisasi waktu exp/nbf dengan live countdown timer (Expired / Active status).
  - Offline signature verification checker (HMAC-SHA256 dengan secret key lokal).
- [ ] **3.3 Multi-Format Data Transpiler & cURL Parser**
  - Transpilasi 2 arah antara format: **JSON <-> YAML <-> TOML <-> CSV**.
  - cURL Converter: Parsing raw curl command menjadi JS `fetch`, `axios`, Python `requests`, dan `Go http`.
- [ ] **3.4 PII Log Redactor & Sanitizer**
  - Client-side regex engine untuk masking otomatis data sensitif (Email, Password, Credit Card, Bearer Token, IPv4/IPv6, API Key).
  - Opsi kustomisasi regex rule & custom replacement mask (e.g. `[REDACTED]`, `***`).
- **Kriteria Selesai (DoD):** Seluruh 4 modul lanjutan dapat memproses data secara instan di browser/worker tanpa network request.

---

## 🛡️ FASE 4: Privacy Hardening, Desktop Native Features & PWA Packaging
**Tujuan:** Menjamin privasi 100% offline, integrasi native Tauri v2, dan build produksi.

- [ ] **4.1 Security & Ephemeral Scrubbing**
  - Tombol "Panic / Quick Clear" di Pinia store untuk membersihkan seluruh LocalStorage/IndexedDB seketika.
  - Clipboard Auto-Purge timer (opsi membersihkan clipboard sistem setelah 30/60 detik).
  - Audit Zero Network Request (verifikasi Network Tab bersih dari outbound calls).
- [ ] **4.2 Tauri v2 Native Desktop Integrations**
  - Native File Dialog (`@tauri-apps/plugin-dialog`) untuk save/load file dan snapshot `.toolkit`.
  - Global Hotkeys (misal: Shortcut membuka DevDot dari mana saja).
  - Drag and drop native file handling.
- [ ] **4.3 PWA & Offline Service Worker**
  - Konfigurasi `vite-plugin-pwa` dengan `workbox` (cache-first strategy untuk 100% offline capability).
  - Web App Manifest, ikon adaptif M3, dan PWA install prompt.
  - Dokumentasi instruksi CI/CD GitHub Actions.
- [ ] **4.4 Build Verification & Release Pipeline**
  - Verifikasi build Web SPA (`npm run build`).
  - Verifikasi build Tauri Desktop (`npm run tauri build` untuk target Windows `.msi`/`.exe`).
- **Kriteria Selesai (DoD):** Aplikasi sukses di-build untuk Web (PWA) dan Native Desktop; seluruh fitur offline teruji.

---

## 📋 FORMAT PROMPT UNTUK USER

Gunakan format prompt berikut saat meminta AI Agent mengerjakan tugas agar tetap terarah dan terisolasi:

```text
Halo Agent, tolong kerjakan [FASE X.Y: NAMA SUB-FASE] sesuai spesifikasi di HANDOVER.md dan PLAN.md.

Aturan pengerjaan:
1. Hanya kerjakan sub-fase ini saja. Jangan kerjakan sub-fase lainnya dulu.
2. Buat/perbarui file yang relevan dengan arsitektur yang sudah disepakati.
3. Jalankan verifikasi/test setelah selesai.
4. Update checklist [x] di HANDOVER.md setelah berhasil.
```

---

## 📊 TABEL TRACKING PROGRESS KESELURUHAN

| Fase | Sub-Fase | Status | Catatan Verifikasi |
|---|---|---|---|
| **Fase 0** | 0.1 Vue 3 + Vite Setup | ✅ Selesai | Vite vue-ts, tsconfig alias, core deps terpasang |
| | 0.2 Tauri v2 Scaffold | ✅ Selesai | Tauri v2 CLI/API, src-tauri, Cargo & tauri.conf terkonfigurasi & terverifikasi |
| | 0.3 Directory Structure | ✅ Selesai | Struktur folder src/ terstandarisasi (core, modules, stores, components, styles, assets) & build terverifikasi |
| **Fase 1** | 1.1 Material Web & MD3 Tokens | ✅ Selesai | @material/web, tokens.css, useTheme(), wrappers UI (Button, Input, Dialog, Switch, Card, Badge, Tooltip) terverifikasi |
| | 1.2 Execution Adapter | ✅ Selesai | IExecutionEngine, WebEngineAdapter (WorkerPool, TaskRouter, Worker), TauriEngineAdapter stub, useExecutionEngine() composable terverifikasi |
| | 1.3 Shell Layout & Navigation | ✅ Selesai | AppLayout, AppTopBar, AppNavigationRail, AppBottomNav, CommandPalette (Ctrl+K), PrivacyDialog, SnapshotDialog, Pinia Navigation & Snapshot stores terverifikasi |
| | 1.4 Virtualized Split Editor | ✅ Selesai | CodeMirror 6 virtual scrolling (>50MB), split-pane divider resizable (50/50, max/min), MD3 dynamic themes, drag & drop upload, toolbar & stats terverifikasi |
| **Fase 2** | 2.1 JSON Suite | ⏳ Belum Dimulai | - |
| | 2.2 Encoders & Hash/ID | ⏳ Belum Dimulai | - |
| | 2.3 Snapshot Engine (.toolkit) | ⏳ Belum Dimulai | - |
| **Fase 3** | 3.1 JSON Visual Diff | ⏳ Belum Dimulai | - |
| | 3.2 Offline JWT Debugger | ⏳ Belum Dimulai | - |
| | 3.3 Multi-Format & cURL | ⏳ Belum Dimulai | - |
| | 3.4 PII Log Redactor | ⏳ Belum Dimulai | - |
| **Fase 4** | 4.1 Security & Scrubbing | ⏳ Belum Dimulai | - |
| | 4.2 Tauri Native Integrations | ⏳ Belum Dimulai | - |
| | 4.3 PWA Offline | ⏳ Belum Dimulai | - |
| | 4.4 Build & Release Pipeline | ⏳ Belum Dimulai | - |
