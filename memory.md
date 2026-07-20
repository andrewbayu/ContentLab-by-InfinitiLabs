# ContentLab — Project Memory & Continuity

Dokumen ini berfungsi sebagai acuan kelanjutan proyek (*continuity guide*) bagi pengembang maupun asisten AI setiap kali melakukan `git pull` atau memulai sesi pengerjaan baru.

---

## 🚀 1. Overview Proyek
**ContentLab** adalah studio perencana & pelacak konten pemasaran (*content marketing planner*) kolaboratif. Aplikasi ini dibangun sebagai aplikasi web statis modern (React + Vite + TypeScript) dengan database terintegrasi langsung ke **Google Sheets** menggunakan perantara **Google Apps Script Web App API**.

*   **Repositori GitHub**: `https://github.com/andrewbayu/ContentLab-by-InfinitiLabs`
*   **Target Deployment**: Vercel
*   **Tema Desain**: Light Mode (Putih-Biru minimalis)

---

## 🗂️ 2. Skema Struktur Database Google Sheets
Database spreadsheet terdiri dari **7 tab** dengan kolom-kolom persis seperti berikut di baris pertama:

### A. Tab `Content` (26 Kolom, A s/d Z)
`id` | `title` | `brief` | `status` | `channel` | `format` | `priority` | `assignee` | `publishDate` | `assetsLink` | `tags` | `budget` | `platformNotes` | `targetAudience` | `createdBy` | `checklist` | `views` | `likes` | `engagement` | `createdAt` | `updatedAt` | `taskType` | `category` | `dueDate` | `client` | `brand`

*   `checklist`: Berisi stringified JSON array dari subtask produksi, contoh:
    `[{"id":"sub1","label":"Draft Outline","done":false,"link":"https://..."}]`
*   `views` / `likes` / `engagement`: Berisi metrik performa konten untuk status `Published`.

### B. Tab `Team` (6 Kolom, A s/d F)
`id` | `name` | `email` | `avatar` | `password` | `role`

*   `role`: hanya menerima `super` atau `team`. Nilai kosong dibaca sebagai `team` untuk keamanan dan kompatibilitas data lama.

### C. Tab `Channels` (3 Kolom, A s/d C)
`id` | `name` | `color`

### D. Tab `Comments` (5 Kolom, A s/d E)
`id` | `contentId` | `author` | `text` | `createdAt`

### E. Tab `Clients` (5 Kolom, A s/d E)
`id` | `client` | `brand` | `color` | `active`

### F. Tab `KPI Definitions` (14 Kolom, A s/d N)
`id` | `clientBrandId` | `client` | `brand` | `name` | `category` | `unit` | `baseline` | `target` | `direction` | `cadence` | `weight` | `active` | `createdAt`

### G. Tab `KPI Updates` (8 Kolom, A s/d H)
`id` | `kpiId` | `period` | `actual` | `notes` | `sourceLink` | `updatedBy` | `updatedAt`

---

## 🧭 3. Task Umum & Multi-Client

*   Setiap item memiliki `taskType`: `Content` atau `General`.
*   Task `General` memakai `category`, `dueDate`, serta status `To Do`, `In Progress`, dan `Done`.
*   Task `Content` tetap memakai channel, format, publish date, dan metrik performa.
*   Pasangan client–brand dikelola dari tab `Clients`, dapat dibuat langsung dari form task, dan dapat difilter secara global di workspace.
*   Data lama yang tidak memiliki `taskType` dibaca sebagai `Content` agar backward-compatible.
*   Scope switcher mendukung level All Clients, satu client, atau satu brand dan berlaku konsisten pada Overview, Tasks, Calendar, serta Analytics.
*   View task bawaan: All Work, Content, General, My Work, dan Overdue.

### Analytics & KPI

*   KPI target didefinisikan per client/brand oleh role `super` di tab `KPI Definitions`.
*   Role `team` dan `super` dapat menambahkan aktual KPI; setiap input menjadi riwayat baru di `KPI Updates` agar tren tidak hilang.
*   Analytics menampilkan metrik operasional otomatis dari task serta KPI manual target-versus-actual.

---

## 🔒 4. Sistem Autentikasi & Multi-User
Aplikasi ini menerapkan autentikasi individual yang diverifikasi langsung ke tab `Team` spreadsheet.

*   **Penyebab Kendala Login (Error: "Username atau password salah")**:
    *   Jika aplikasi mengembalikan pesan ini, koneksi ke Google Sheets sudah berhasil terhubung, namun **Apps Script yang berjalan di sisi Google Sheets masih berupa versi lama** (yang belum memiliki fungsi penanganan `action === "login"`).
    *   Ketika Apps Script lama menerima request login, ia langsung mengembalikan `{ success: false }` secara default, yang diterjemahkan di frontend menjadi `"Username atau password salah"`.
    *   **Solusi**: Pengguna harus memperbarui kode Google Apps Script ke versi terbaru dan men-deploy ulang dengan memilih **New Version** (Versi Baru) di menu deployment Apps Script.

Tidak ada akun demo atau login sandbox. Seluruh autentikasi wajib menggunakan akun yang terdaftar di tab `Team` pada Google Sheet aktif.

### Role & Hak Akses

*   `super`: admin internal dengan akses penuh, termasuk **Settings Manager** serta pengelolaan anggota tim, channel, dan client/brand.
*   `team`: dapat memakai dashboard, kanban, calendar, list, task, dan komentar, tetapi tidak dapat membuka **Settings Manager** atau membuat registry baru dari form task.
*   Setidaknya satu akun aktif harus memiliki role `super` agar pengaturan workspace tetap dapat diakses.

---

## 🛠️ 5. Langkah Sinkronisasi Google Apps Script
Source siap copy-paste tersedia di `apps-script/Code.gs` dan juga melalui tombol **Copy Latest Apps Script** di Settings Manager.

Setiap kali memperbarui kode Apps Script di editor Google Sheets:
1.  Klik **Save** (💾).
2.  Klik **Deploy** (pojok kanan atas) > **Manage Deployments**.
3.  Klik **ikon pensil (Edit)** pada Active Deployment Anda.
4.  Pada bagian **Version**, pilih **New Version** (wajib memilih Versi Baru agar Google memuat kode baru Anda).
5.  Klik **Deploy**.
6.  *Jika membuat deployment baru secara tidak sengaja, salin Web App URL baru (berakhiran `/exec`) dan perbarui kolom URL di menu Settings Manager > Sheets Connection di aplikasi web Anda.*
