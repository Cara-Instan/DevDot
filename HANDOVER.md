# HANDOVER & WORKFLOW BREAKDOWN: DevDot Desktop Toolkit (Tauri First)

Dokumen ini adalah **panduan eksekusi bertahap (Handover & Task Division)** untuk transformasi arsitektur UI/UX **DevDot** (Privacy-First Universal Developer Toolkit) menjadi aplikasi **Desktop Tauri-First & Zero-Sidebar Full-Width Editor**.

---

> [!IMPORTANT]
> ### ⚠️ ATURAN EMAS UNTUK AGENT (AI AGENT EXECUTION RULES)
> 1. **DILARANG** mengeksekusi semua fase sekaligus dalam satu giliran (single prompt/turn).
> 2. **HANYA KERJAKAN SATU SUB-FASE (Contoh: Fase 1.1)** per iterasi pengerjaan.
> 3. Setelah menyelesaikan satu sub-fase:
>    - Jalankan verifikasi/test/build lokal (`npm run build` & verifikasi runtime).
>    - Perbarui tanda centang `[x]` pada dokumen ini.
>    - Berikan laporan singkat kepada pengguna dan minta konfirmasi sebelum lanjut ke sub-fase berikutnya.
> 4. **Prinsip Utama UI/UX Desktop**:
>    - **Zero-Sidebar / Full-Width**: Ruang layar 100% didedikasikan untuk editor code.
>    - **Compact & High-Density**: Header ~40px, toolbar ~36px, no oversized badges, no web-like hero bloat.
>    - **Zero Outbound Data**: Tidak ada telemetri, analitik, atau script eksternal runtime.

---

## 📌 DAFTAR ISI FASE PENGERJAAN

- [Fase 1: Settings Architecture & Preferences Store](#-fase-1-settings-architecture--preferences-store)
- [Fase 2: Zero-Sidebar Layout, Compact TopBar & Tool Switcher](#-fase-2-zero-sidebar-layout-compact-topbar--tool-switcher)
- [Fase 3: Overview Page Streamlining & Drag-and-Drop Reordering](#-fase-3-overview-page-streamlining--drag-and-drop-reordering)
- [Fase 4: Compact Editor-First Tool Workspaces & Toolbars](#-fase-4-compact-editor-first-tool-workspaces--toolbars)
- [Fase 5: PWA Suppression & Final Quality Verification](#-fase-5-pwa-suppression--final-quality-verification)

---

## ⚙️ FASE 1: Settings Architecture & Preferences Store
**Tujuan:** Membangun store preferensi pengguna terpusat dan dialog Pengaturan (Settings) komprehensif.

- [x] **1.1 Buat Store Pengaturan (`src/stores/settings.ts`)**
  - Definisikan state:
    - `themeMode`: `'dark' | 'light' | 'system'`
    - `isHighContrast`: `boolean`
    - `dontAskAgainInstallPrompt`: `boolean` (suppress PWA/Install popup)
    - `toolOrder`: `string[]` (urutan kustom tool IDs untuk Overview)
    - `clipboardAutoPurgeSeconds`: `number` (0 = nonaktif, default 60s)
    - `editorFontSize`: `number` (default 13px)
    - `editorWordWrap`: `boolean` (default true)
  - Simpan dan sinkronkan state ke `localStorage` (`devdot_settings_v1`).
  - Sediakan actions: `updateSettings()`, `resetToolOrder()`, `setDontAskInstall()`, `wipeAllData()`.

- [x] **1.2 Buat Modal Pengaturan Terpusat (`src/components/layout/SettingsDialog.vue`)**
  - Desain modal Material 3 compact dengan tab/kategori:
    1. **Appearance**: Pilihan Tema (Dark, Light, System), Toggle High Contrast, Ukuran font editor.
    2. **Storage & Privacy**: Tombol **Panic Clear** (bersihkan semua snapshot, storage, clipboard), konfigurasi timer Auto-Purge Clipboard.
    3. **Application & PWA**: Tombol manual **Install DevDot**, tombol **Check Updates**, Switch "Jangan tampilkan popup install otomatis".
    4. **Tool Management**: Tombol **Reset Urutan Tool** ke default.
    5. **About**: Status runtime (Tauri Desktop / Web Engine), versi aplikasi, jaminan 100% Offline Air-Gapped.
  - Hubungkan state dialog ke `useNavigationStore` (`isSettingsOpen` atau `openSettings()`).

- **Kriteria Selesai (DoD 1):**
  - File `src/stores/settings.ts` dan `src/components/layout/SettingsDialog.vue` terintegrasi.
  - Dialog settings dapat dibuka dan ditutup dengan mulus.
  - Mengubah tema atau setting di dialog langsung berpengaruh dan tersimpan di `localStorage`.

---

## 🖥️ FASE 2: Zero-Sidebar Layout, Compact TopBar & Tool Switcher
**Tujuan:** Menghapus sidebar permanen, merampingkan header (~40px), dan mengintegrasikan TopBar Tool Switcher Dropdown & On-Demand Flyout Drawer.

- [x] **2.1 Rampingkan TopBar Desktop (`src/components/layout/AppTopBar.vue`)**
  - Kurangi tinggi TopBar ke standar titlebar desktop (~40-44px).
  - Hapus badge "100% Offline" dan tombol "Panic Clear" dari header utama (karena sudah ada di Settings).
  - Susun tata letak compact:
    - **Kiri**: Brand DevDot + **Tool Switcher Dropdown** (`DevDot / [Nama Tool Aktif] ▾`). Mengklik ini memunculkan popup menu daftar tool cepat.
    - **Tengah**: Tombol trigger Quick Search (`Ctrl + K`).
    - **Kanan**: Tombol Snapshot (.toolkit), Tombol Ikon Pengaturan (Gear/Settings), Tombol Quick Theme Switcher.

- [x] **2.2 Transformasi Sidebar Menjadi On-Demand Slide-Over Flyout (`src/components/layout/AppNavigationDrawer.vue`)**
  - Ubah `AppNavigationRail.vue` menjadi drawer melayang (*slide-over flyout*) yang hanya muncul saat tombol menu ditekan atau via shortcut.
  - Drawer menutup otomatis (*auto-dismiss*) saat pengguna memilih sebuah tool atau mengklik area luar (backdrop).
  - Hilangkan ruang kosong horizontal permanen (0px width lost) agar workspace editor dapat melebar 100% secara default.

- [x] **2.3 Perbarui Shell Layout (`src/components/layout/AppLayout.vue`)**
  - Pastikan container utama menggunakan lebar penuh (`width: 100%`) tanpa margin/padding sidebar default.

- **Kriteria Selesai (DoD 2):**
  - Header tampil sangat rapi dan compact.
  - Tidak ada sidebar permanen yang memakan layar horizontal.
  - Berpindah tool via TopBar Dropdown Switcher atau `Ctrl+K` berjalan instan.

---

## 🧩 FASE 3: Overview Page Streamlining & Drag-and-Drop Reordering
**Tujuan:** Menjadikan halaman Overview bersih, informatif, bebas bloat, serta mendukung kustomisasi urutan kartu tool dengan Drag-and-Drop.

- [x] **3.1 Hapus Bloat & Rampingkan Header Overview (`src/modules/overview/OverviewView.vue`)**
  - Ganti hero section besar dan kartu diagnostik berat dengan **Intro Banner Compact** (1 baris judul + deskripsi singkat + pill 100% offline).
  - Hapus section "Recently Used".
  - Hapus micro-scratchpads duplikat yang memenuhi halaman.

- [x] **3.2 Implementasi Drag-and-Drop Tool Ordering**
  - Tampilkan katalog aplikasi dalam grid kartu compact yang bersih (ikon, judul, kategori, deskripsi singkat).
  - Implementasikan fitur **Drag-and-Drop Reordering** pada kartu aplikasi (menggunakan HTML5 Drag and Drop API atau pointer events ringan).
  - Simpan urutan kartu ke `settingsStore.toolOrder` di `localStorage`.
  - Berikan visual feedback saat dragging (drag handle, elevation, placeholder indicator).
  - Sediakan filter kategori (All, JSON, Crypto, Converters, Text) dan input pencarian instan.

- **Kriteria Selesai (DoD 3):**
  - Halaman Overview tampil modern, compact, dan responsif.
  - Pengguna dapat menyeret (*drag*) kartu tool untuk mengubah urutan posisi, dan urutan tersebut tetap tersimpan saat refresh/reopen.

---

## ⚡ FASE 4: Compact Editor-First Tool Workspaces & Toolbars
**Tujuan:** Memaksimalkan area editor code (>90% viewport) dan merombak toolbar di seluruh modul menjadi 1-baris ultra-compact.

- [ ] **4.1 Hapus Banner Besar Header Tool di `src/App.vue`**
  - Hapus elemen `.tool-view-header` yang memakan >120px ruang vertikal.
  - Ganti dengan header inline minimalis atau integrasikan langsung ke dalam toolbar modul.

- [ ] **4.2 Standardisasi Toolbar Compact 1-Baris pada Modul Utama**
  - **JSON Formatter (`JsonFormatterView.vue`)**:
    - Toolbar 1-baris tipis (`height: ~36px`): Segmented pills Indentation (2 sp / 4 sp / Tab), Minify toggle, Sort keys, Auto-repair switch, Load Sample, Clear, dan execution badge.
  - **JSON Schema & Types (`JsonSchemaView.vue`)**:
    - Toolbar 1-baris: Target language selector (TypeScript / Go / Rust), Copy, Format.
  - **JSON Visual Diff (`JsonDiffView.vue`)**:
    - Toolbar 1-baris: View mode (Split / Unified), Ignore whitespace, Swap panes.
  - **Crypto & Converters (`EncoderDecoderView.vue`, `HashGeneratorView.vue`, `JwtDebuggerView.vue`, `CurlConverterView.vue`, `MultiTranspilerView.vue`, `PiiRedactorView.vue`)**:
    - Pastikan seluruh toolbar compact, padding tipis, dan tidak ada elemen bertumpuk vertikal.

- [ ] **4.3 Optimasi Viewport SplitEditor (`src/components/editor/SplitEditor.vue`)**
  - Pastikan tinggi editor mengisi seluruh ruang layar yang tersedia (`calc(100vh - header_height - toolbar_height)`).

- **Kriteria Selesai (DoD 4):**
  - Ruang editor mendominasi 90%+ area aplikasi.
  - Toolbar tidak memakan ruang vertikal berlebih dan terasa seperti software desktop profesional.

---

## 🛡️ FASE 5: PWA Suppression & Final Quality Verification
**Tujuan:** Menghentikan popup install yang mengganggu, memastikan integrasi "Don't ask again", dan verifikasi menyeluruh.

- [ ] **5.1 Integrasi PWA Suppression (`src/stores/pwa.ts` & `src/components/layout/PwaInstallBanner.vue`)**
  - Sambungkan `pwaStore.showInstallBanner` dengan `settingsStore.dontAskAgainInstallPrompt`.
  - Jika pengguna memilih "Don't ask again" atau menonaktifkannya di Pengaturan, popup install tidak akan pernah muncul otomatis.
  - Tombol install manual tetap tersedia di dalam modal Pengaturan (`SettingsDialog.vue`).

- [ ] **5.2 Verifikasi Suite & Build**
  - Jalankan `npm run build` untuk memastikan tidak ada error TypeScript / Vite.
  - Jalankan test scripts: `npm run test:json`, `npm run test:crypto`, `npm run test:snapshot`, dll.
  - Lakukan smoke test navigasi, dragging kartu, buka tutup settings, dan manipulasi editor.

- **Kriteria Selesai (DoD 5):**
  - Seluruh sub-fase tercentang `[x]`.
  - Aplikasi siap dijalankan baik sebagai Tauri Desktop App maupun PWA Offline.

---

## 📋 Format Laporan untuk Agent

Setelah menyelesaikan setiap sub-fase, agent wajib melaporkan ringkasan dengan format:
```markdown
### ✅ Laporan Sub-Fase [Nomor Fase] Selesai
- **Perubahan yang dilakukan:** [Ringkasan file & fungsionalitas]
- **Hasil Verifikasi:** [Build / Test / UI check]
- **Status Dokumen:** Sub-fase [Nomor Fase] ditandai selesai di HANDOVER.md
- **Langkah Berikutnya:** Siap melanjutkan ke Sub-Fase [Nomor Fase Berikutnya] (Menunggu konfirmasi).
```
