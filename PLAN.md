# Technical Design Document: Privacy-First Universal Developer Toolkit (Vue 3 + Tauri v2)

## 1. Ringkasan Eksekutif & Tujuan

### 1.1 Visi
Nama Aplikasi: DevDot

Membangun developer utility suite modern, cepat, dan 100% privacy-first yang berjalan secara offline di lingkungan Web (PWA) dan Desktop (macOS, Windows, Linux).

Aplikasi dibangun menggunakan Vue 3 (Composition API), Pinia, Vite, dan Tauri v2. Aplikasi ini menjadi alternatif aman untuk formatter online populer yang berisiko menyimpan atau membocorkan data sensitif (API payload, JWT bearer token, kredensial produksi) ke server pihak ketiga.

### 1.2 Prinsip Utama (Core Principles)

- **Zero Outbound Data (Air-Gapped Execution):** 100% transformasi, kompresi, enkripsi, dan ekstraksi data dilakukan murni di memori lokal (client-side). Tidak ada request jaringan ke server eksternal.
- **Material Design 3 (M3) UI (Vue Component Suite):** Antarmuka modern berbasis Material Design 3 yang adaptif, mendukung dynamic color system, dan tata letak split-pane yang optimal untuk produktivitas pengembang.
- **Portable Session State (Pinia Driven):** Memungkinkan berbagi sesi pekerjaan antar pengembang secara aman via file `.toolkit` yang di-serialize langsung dari Pinia store tanpa memerlukan cloud database.
- **Universal Single Codebase:** Satu basis kode Vue 3 frontend yang dapat di-build menjadi Web SPA/PWA dan aplikasi native Desktop menggunakan Tauri v2.

## 2. Arsitektur Sistem (System Architecture)

### 2.1 High-Level Architecture

Aplikasi memisahkan layer antarmuka pengguna (Vue 3 UI Layer & Pinia Store) dari layer eksekusi data (Execution Layer) untuk menjamin UI tidak mengalami pembekuan (unresponsive UI) saat memproses payload berukuran besar (>10 MB).

```text
+-------------------------------------------------------------------------+
|                VUE 3 APPLICATION SHELL (M3 Component System)            |
|   - Navigation Rail / App Bar / Tab Manager / Command Palette (Kbar)    |
|   - Vue-Monaco Editor / CodeMirror 6 Wrapper (Virtual Scroll Input/Out) |
|   - Pinia Global Store (Tab States, Preferences, Snapshot Engine)       |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                       EXECUTION ADAPTER LAYER                           |
|   - Platform Detector (Web Browser vs Tauri Native IPC)                 |
|   - Task Router & Message Serialization (JSON-RPC Protocol)             |
+------------------------------------+------------------------------------+
                                     |
           +-------------------------+-------------------------+
           | (Web Browser Environment)                         | (Tauri Desktop Environment)
           v                                                   v
+--------------------------------------+            +--------------------------------------+
|          WEB WORKERS POOL            |            |           RUST BACKEND IPC           |
|  - JSON Formatter & Diff Worker      |            |  - High-Speed Regex Engine           |
|  - Crypto & Hash Worker (WASM)       |            |  - Native File System Dialogs        |
|  - Transpiler & Converter Worker     |            |  - Global Hotkeys & Tray Handling    |
+--------------------------------------+            +--------------------------------------+
```

### 2.2 Execution Adapter Pattern

Untuk mendukung eksekusi seragam antara Web Browser dan Tauri Native, aplikasi menggunakan pola Adapter berbasis TypeScript interface yang dipanggil di dalam Pinia Actions/Vue Composables:

```typescript
export interface ExecutionPayload<T = any> {
  tool: string;
  action: string;
  data: T;
  options?: Record<string, any>;
}

export interface ExecutionResult<R = any> {
  success: boolean;
  result?: R;
  error?: string;
  executionTimeMs: number;
}

export interface IExecutionEngine {
  execute<T, R>(payload: ExecutionPayload<T>): Promise<ExecutionResult<R>>;
}
```

- **WebEngineAdapter:** Mengirimkan job ke Web Worker Pool menggunakan `postMessage`.
- **TauriEngineAdapter:** Mengirimkan job ke Rust Native Command menggunakan Tauri IPC `@tauri-apps/api/core`.

## 3. Desain UI/UX & Material Design 3 (Vue + @material/web Implementation)

### 3.1 Integrasi Komponen UI & Layout Standard

Menggunakan pustaka resmi **Material Web Components (`@material/web`)** dengan Thin Vue 3 Wrappers (`src/components/ui/`) untuk mendukung full reactivity (`v-model`), slot ergonomics, dan 100% offline bundling (zero outbound requests).

- **Desktop Layout:**
  - Navigation Rail permanen (`<md-navigation-rail>`) di sisi kiri untuk berpindah modul/tool.
  - Top App Bar berisi nama modul aktif, status indikator offline/privasi, tombol Export Snapshot, dan Import Snapshot.
  - Main Canvas: Editor split-pane (Input di kiri, Output di kanan) dengan resizable divider berbasis Vue Directives.
- **Mobile / PWA Responsive Layout:**
  - Bottom Navigation Bar (`<md-navigation-bar>`) pengganti Navigation Rail.
  - Tab toggle cepat antara tampilan Input dan Output.

### 3.2 Dynamic Color & Theme System

Menggunakan Vue Composable `useTheme()` untuk mengontrol otomatisasi Dark Mode, Light Mode, dan preferensi kontras tinggi.

Token warna M3 diekstrak dan disesuaikan secara dinamis (Primary, Secondary, Surface, Surface Container, On-Surface, Error, Outline) menggunakan CSS Variables standar M3 (`--md-sys-color-*`).

## 4. Spesifikasi Modul Utilitas (Core Tool Suite)

### 4.1 JSON Suite

| Modul | Deskripsi | Kapabilitas Teknis |
|---|---|---|
| JSON Prettify & Minify | Formatter & pemadat JSON | Auto-repair trailing commas & unquoted keys |
| JSON Schema & Type Generator | Konversi JSON ke Type definition | Generasi otomatis TypeScript Interface, Go Struct, Rust Struct |
| JSON Visual Diff | Visualisasi perbedaan 2 JSON | Side-by-side diffing, highlight penambahan/penghapusan/perubahan field |

### 4.2 Cryptography & Tokens

| Modul | Deskripsi | Kapabilitas Teknis |
|---|---|---|
| Offline JWT Debugger | Ekstraktor & validator JWT | Decode Header, Payload, Signature Verification status, Expiry Countdown |
| Hash & ID Generator | Generator hash dan identifier | MD5, SHA-1, SHA-256, SHA-512, UUIDv4, ULID, NanoID |
| Encoder / Decoder | Transpiler teks & format data | Base64 (Text & File/Data URI), URL Encoding, Hex, HTML Entities |

### 4.3 Data Converters & Redactor

| Modul | Deskripsi | Kapabilitas Teknis |
|---|---|---|
| cURL Converter | Parser perintah cURL terminal | Mengubah cURL menjadi kode JS fetch, axios, Python requests, Go http |
| Multi-Format Transpiler | Converter data dua arah | Transpilasi JSON <-> YAML <-> TOML <-> CSV |
| Log Sanitizer (PII Redactor) | Masking otomatis data sensitif | Regex engine untuk mendeteksi email, password, credit card, bearer token |

## 5. Spesifikasi Portable Session Snapshot (.toolkit)

### 5.1 Skema Data JSON (JSON Schema Definition)

Setiap sesi pekerjaan yang diekspor dibungkus dalam format `.toolkit` (JSON berstruktur) yang langsung di-serialize dari Pinia State Store.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ToolkitSessionSnapshot",
  "type": "object",
  "properties": {
    "app": {
      "type": "string",
      "const": "dev-toolkit"
    },
    "schemaVersion": {
      "type": "string",
      "enum": ["1.0.0"]
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string"
        },
        "description": {
          "type": "string"
        }
      }
    },
    "activeTabId": {
      "type": "string"
    },
    "tabs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "toolId": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "state": {
            "type": "object"
          }
        },
        "required": ["id", "toolId", "title", "state"]
      }
    }
  },
  "required": ["app", "schemaVersion", "createdAt", "activeTabId", "tabs"]
}
```

### 5.2 Alur Ekspor & Impor via Pinia Store

#### Ekspor Sesi

```text
User Klik "Export Snapshot"
  -> Pinia `useSnapshotStore().exportSession()`
  -> M3 Dialog Vue Component (Pilih Tab)
  -> JSON.stringify(piniaState)
  -> Web: URL.createObjectURL (Blob Download)
  -> Desktop: Tauri Native Save Dialog (`@tauri-apps/plugin-dialog`)
  -> Tulis file .toolkit
```

#### Impor Sesi

```text
User Drag & Drop / Klik "Import File"
  -> Read File Text
  -> Validate Schema Version
  -> Pinia `useSnapshotStore().hydrateSession(parsedData)`
  -> Restore Reactive Tabs & CodeMirror Contents
```

## 6. Strategi Keamanan & Performa

### 6.1 Zero Data Leakage Guarantee

- **No External Network Calls:** Tidak ada analitik pihak ketiga (Google Analytics/Sentry), telemetry, atau CDN eksternal. Semua font M3 dan library di-bundle lokal oleh Vite.
- **Ephemeral Memory Scrubbing:** Menyediakan fitur "Quick Clear" pada Pinia store untuk menghapus seluruh LocalStorage dan memori IndexedDB secara instan.
- **Clipboard Auto-Purge Option:** Fitur opsional untuk membersihkan clipboard sistem setelah durasi tertentu saat pengguna menyalin teks sensitif.

### 6.2 Performa File Besar (> 50 MB)

- **Virtual Scrolling:** Penggunaan editor Vue berbasis virtual scrolling (CodeMirror 6 / Vue-Monaco Engine) agar memori DOM tetap konstan terlepas dari panjang teks.
- **Streaming Parser Workers:** Web Worker mengeksekusi parsing JSON secara bertahap menggunakan chunking memory stream tanpa menghambat Vue main thread.

## 7. Roadmap Pelaksanaan Pengembangan (Vue 3 Stack)

```text
+-----------------------------------------------------------------------------------+
| FASE 1: Foundation & Material 3 Setup (Minggu 1 - 2)                             |
| - Monorepo Setup (Vite + Vue 3 Script Setup + Pinia + Tauri v2)                   |
| - Material Design 3 Dynamic Theme System & Core Shell Layout                      |
| - Abstraksi Execution Layer (Web Worker Adapter + Vue Composables)                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 2: MVP Core Tools & Snapshot System (Minggu 3 - 5)                           |
| - JSON Suite (Formatter, Minifier, Repair, Schema/Type Gen)                       |
| - Encoder/Decoder & Hash Generator Suite                                          |
| - Implementasi Fitur Portable Session Snapshot (.toolkit Export/Import) via Pinia |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 3: Advanced Utilities & Heavy Converters (Minggu 6 - 8)                      |
| - JSON Visual Diff Checker (Split View Vue Component)                             |
| - Offline JWT Debugger & Signature Validator                                      |
| - Multi-Format Data Transpiler (JSON/YAML/TOML/CSV) & cURL Converter               |
| - PII Log Redactor & Sanitizer                                                    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| FASE 4: Desktop Native Features, PWA, & CI/CD Release (Minggu 9 - 10)            |
| - Tauri Native Integration (Drag and Drop, Global Hotkeys, Clipboard API)         |
| - PWA Service Worker caching (100% Offline Capability)                            |
| - Automated GitHub Actions Workflow (.exe, .dmg, .AppImage, Static Web Deploy)   |
+-----------------------------------------------------------------------------------+
```
