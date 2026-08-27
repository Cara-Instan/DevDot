# DevDot: Architecture & Master Plan (Tauri Desktop Target)

## 🎯 Visi & Konsep Utama
**DevDot** adalah aplikasi *developer toolkit* offline, zero-telemetry, dan air-gapped yang didesain secara spesifik untuk target **Desktop Application (Tauri v2)** dengan ergonomi kerja modern (mirip Raycast, VS Code, dan DevToys).

---

## 🏛️ Arsitektur UI/UX: "Zero-Sidebar Full-Width Workspace"

1. **Zero-Sidebar by Default**:
   - Menghilangkan sidebar permanen yang memakan 250px-300px lebar layar.
   - Editor split-pane mendapatkan 100% lebar dan tinggi penuh jendela aplikasi.
2. **TopBar Quick Switcher & Command Palette**:
   - Dropdown instan di bar atas (`DevDot / [Tool Name] ▾`) untuk berpindah tool dalam 1 klik.
   - Command Palette (`Ctrl + K`) untuk pencarian fuzzy cepat berbasis keyboard.
   - On-Demand Slide-over Flyout Drawer untuk melihat kategori secara visual tanpa mengorbankan ruang layar permanen.
3. **Overview Hub dengan Drag-and-Drop Ordering**:
   - Halaman katalog utama dengan kartu ringkas yang dapat diatur urutannya secara fleksibel (*drag-and-drop*) dan tersimpan di `localStorage`.
4. **Modal Pengaturan (Settings) Terpusat**:
   - Manajemen tema (Dark/Light/High-Contrast), tombol Panic Clear, auto-purge clipboard, opsi instalasi PWA/App dengan pencegahan popup agresif (*Don't ask again*), dan reset urutan tool.
5. **Ultra-Compact Toolbars**:
   - Toolbar 1-baris tipis (~36px) di atas setiap editor dengan visual feedback cepat dan kontrol ergonomis.

---

## 📂 Struktur File Utama

```text
src/
├── components/
│   ├── editor/
│   │   └── SplitEditor.vue           # CodeMirror 6 high-performance split editor
│   ├── layout/
│   │   ├── AppLayout.vue             # Full-width shell
│   │   ├── AppTopBar.vue             # Compact titlebar + Tool Switcher + Actions
│   │   ├── AppNavigationDrawer.vue   # On-demand slide-over flyout
│   │   ├── CommandPalette.vue        # Ctrl+K fuzzy launcher
│   │   ├── SettingsDialog.vue        # Comprehensive settings modal
│   │   └── PwaInstallBanner.vue      # Suppressed / non-intrusive install prompt
│   └── ui/                           # Material 3 Vue components
├── modules/
│   ├── overview/                     # Streamlined Overview with draggable cards
│   ├── json/                         # Formatter, Schema Generator, Visual Diff
│   ├── crypto/                       # JWT Debugger, Hash & ID Generator, Encoders
│   ├── converters/                   # cURL Converter, Multi-format Transpiler
│   └── redactor/                     # PII Log Redactor & Sanitizer
└── stores/
    ├── settings.ts                   # Preferences, tool order, theme, PWA prompt
    ├── navigation.ts                 # Active tool state & registry
    ├── security.ts                   # Panic clear & clipboard purge
    ├── snapshot.ts                   # .toolkit state import/export
    └── pwa.ts                        # PWA & offline cache state
```

---

## 📑 Eksekusi & Handover
Untuk panduan eksekusi per fase oleh agent, silakan merujuk langsung ke **[HANDOVER.md](file:///d:/Ando/sites_win/devtoys-dot/HANDOVER.md)**.
