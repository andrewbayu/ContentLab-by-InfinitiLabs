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
Database spreadsheet terdiri dari **4 tab** dengan kolom-kolom persis seperti berikut di baris pertama:

### A. Tab `Content` (21 Kolom, A s/d U)
`id` | `title` | `brief` | `status` | `channel` | `format` | `priority` | `assignee` | `publishDate` | `assetsLink` | `tags` | `budget` | `platformNotes` | `targetAudience` | `createdBy` | `checklist` | `views` | `likes` | `engagement` | `createdAt` | `updatedAt`

*   `checklist`: Berisi stringified JSON array dari subtask produksi, contoh:
    `[{"id":"sub1","label":"Draft Outline","done":false,"link":"https://..."}]`
*   `views` / `likes` / `engagement`: Berisi metrik performa konten untuk status `Published`.

### B. Tab `Team` (5 Kolom, A s/d E)
`id` | `name` | `email` | `avatar` | `password`

### C. Tab `Channels` (3 Kolom, A s/d C)
`id` | `name` | `color`

### D. Tab `Comments` (5 Kolom, A s/d E)
`id` | `contentId` | `author` | `text` | `createdAt`

---

## 🔒 3. Sistem Autentikasi & Multi-User
Aplikasi ini menerapkan autentikasi individual yang diverifikasi langsung ke tab `Team` spreadsheet.

*   **Penyebab Kendala Login (Error: "Username atau password salah")**:
    *   Jika aplikasi mengembalikan pesan ini, koneksi ke Google Sheets sudah berhasil terhubung, namun **Apps Script yang berjalan di sisi Google Sheets masih berupa versi lama** (yang belum memiliki fungsi penanganan `action === "login"`).
    *   Ketika Apps Script lama menerima request login, ia langsung mengembalikan `{ success: false }` secara default, yang diterjemahkan di frontend menjadi `"Username atau password salah"`.
    *   **Solusi**: Pengguna harus memperbarui kode Google Apps Script ke versi terbaru dan men-deploy ulang dengan memilih **New Version** (Versi Baru) di menu deployment Apps Script.

### Kredensial Uji Coba Sandbox Mode (Lokal)
Jika aplikasi belum dihubungkan ke spreadsheet, gunakan kredensial berikut di browser untuk menguji secara offline:
*   **Username**: `Andi Pratama` | `Siti Rahma`
*   **Password**: `pass123`

---

## 🛠️ 4. Langkah Sinkronisasi Google Apps Script
Setiap kali memperbarui kode Apps Script di editor Google Sheets:
1.  Klik **Save** (💾).
2.  Klik **Deploy** (pojok kanan atas) > **Manage Deployments**.
3.  Klik **ikon pensil (Edit)** pada Active Deployment Anda.
4.  Pada bagian **Version**, pilih **New Version** (wajib memilih Versi Baru agar Google memuat kode baru Anda).
5.  Klik **Deploy**.
6.  *Jika membuat deployment baru secara tidak sengaja, salin Web App URL baru (berakhiran `/exec`) dan perbarui kolom URL di menu Settings Manager > Sheets Connection di aplikasi web Anda.*
