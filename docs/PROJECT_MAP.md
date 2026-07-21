# ContentLab Project Map

> Baca file ini terlebih dahulu pada setiap session/request baru sebelum menjelajah repository.
> Tujuan: langsung menuju area yang relevan dan menghindari scan seluruh project.

## Quick route

| Jenis request | Mulai dari | Lanjut ke |
|---|---|---|
| UI, halaman, layout | `src/App.tsx` | `src/components/` dan `src/App.css` |
| Dokumen/content workflow | `src/components/DocumentsView.tsx` | `src/styles/documents.css` |
| Dashboard/analytics | `src/components/DashboardView.tsx` | `src/components/AnalyticsView.tsx` |
| Task/kanban/list | `src/components/KanbanBoard.tsx` | `ListView.tsx`, `TaskModal.tsx` |
| Kalender | `src/components/CalendarView.tsx` | `src/App.tsx` |
| Login/auth screen | `src/components/LoginPage.tsx` | `src/App.tsx` |
| Settings/integrasi | `src/components/SettingsView.tsx` | `src/services/sheets.ts` |
| Google Sheets API | `src/services/sheets.ts` | `.env.example`, `.env.local` |
| Google Apps Script | `integrations/google-apps-script/Code.gs` | `docs/memory.md` |
| Styling global | `src/index.css`, `src/App.css` | component stylesheet terkait |
| Build/configuration | `package.json`, `vite.config.ts` | `tsconfig*.json` |
| Dokumentasi/riwayat keputusan | `docs/` | file dokumentasi terkait |

## Structure

```text
ContentLab-by-InfinitiLabs/
├── docs/                         # Dokumentasi dan project notes
│   ├── PROJECT_MAP.md            # File ini; entry point navigasi
│   └── memory.md                 # Catatan implementasi dan konteks historis
├── integrations/
│   └── google-apps-script/       # Script backend/integrasi Google Apps Script
├── public/                       # File static yang disajikan langsung oleh Vite
├── src/
│   ├── assets/                   # Asset yang di-import oleh aplikasi
│   ├── components/               # View, shell, modal, dan reusable UI
│   ├── services/                 # Akses data dan integrasi eksternal
│   ├── styles/                  # CSS khusus fitur
│   ├── App.tsx                   # Root state dan routing view utama
│   ├── App.css                   # Styling shell/aplikasi
│   ├── index.css                 # Global/reset styling
│   └── main.tsx                  # Entry point React
├── index.html                    # HTML entry Vite
├── package.json                  # Scripts dan dependency
├── vite.config.ts                # Konfigurasi Vite
└── tsconfig*.json                # Konfigurasi TypeScript
```

## Request workflow

1. Baca `docs/PROJECT_MAP.md`.
2. Tentukan satu route di tabel Quick route.
3. Baca file entry point route tersebut dan hanya dependency yang langsung relevan.
4. Gunakan `rg` untuk mencari symbol/import spesifik bila diperlukan.
5. Setelah perubahan, jalankan `npm.cmd run lint` dan/atau `npm.cmd run build` sesuai dampak.
6. Jika struktur folder berubah, update file ini pada request yang sama.

## Conventions

- UI React berada di `src/components/`.
- Integrasi eksternal berada di `src/services/` atau `integrations/` jika berjalan di luar frontend.
- CSS fitur berada di `src/styles/`; global CSS tetap di `src/index.css` atau `src/App.css`.
- Dokumentasi durable berada di `docs/`.
- Jangan scan `node_modules/` atau `dist/`.
- Jangan membaca `.env*` secara penuh; gunakan `.env.example` untuk nama variable dan minta nilai hanya jika benar-benar diperlukan.

## Known validation notes

- `npm.cmd run build` saat ini berhasil.
- `npm.cmd run lint` berhasil tetapi memiliki warning existing di `src/App.tsx` dan `src/components/SettingsView.tsx`.
