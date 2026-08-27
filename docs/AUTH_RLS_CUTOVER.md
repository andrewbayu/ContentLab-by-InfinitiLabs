# ContentLab Auth + RLS cutover

Dokumen ini adalah runbook untuk memindahkan login ContentLab dari pengecekan
password lama di `team_members` ke Supabase Auth, lalu mengaktifkan Row Level
Security (RLS) secara aman.

## Status saat ini

- Project Supabase aktif: `infinitilab-north-01`
- Project ref: `jpjsycnbamvxnwmziedh`
- Migration `20260827063153_auth_foundation.sql` sudah diterapkan ke database.
- Kolom `team_members.auth_user_id` dan helper authorization di schema `private`
  sudah tersedia.
- Migration `20260827063200_auth_rls_policies.sql` sudah diuji secara
  transactional (`BEGIN`/`ROLLBACK`), tetapi **belum diterapkan permanen**.
- Aplikasi saat ini masih berjalan dalam mode legacy karena
  `VITE_SUPABASE_AUTH_ENABLED=false`.

RLS belum diaktifkan dengan sengaja. Saat ini baru sebagian row `team_members`
yang memiliki pasangan `auth.users` (cek angka terbaru dengan query di bawah).
Mengaktifkan RLS sebelum mapping lengkap dapat membuat anggota tim tidak bisa
login atau melihat data.

## 1. Buat akun Supabase Auth

Di Supabase Dashboard project tersebut, buka **Authentication → Users** lalu
buat/invite satu user untuk setiap email yang ada di tab `Team`.

Gunakan password sementara yang unik untuk tiap user dan minta user menggantinya
setelah login pertama. Jangan menaruh password di repository, spreadsheet, atau
chat. Pastikan status email user sudah **Confirmed** (atau invitation sudah
diterima); jika Email Confirmation aktif, user yang belum mengonfirmasi tidak
akan bisa login dengan password. Akun yang dibutuhkan saat ini:

- `hi.andrewbayu@gmail.com`
- `visuanara@gmail.com`
- `bagasshrmwn@gmail.com`
- `hi@adityabayu.com`
- `yessica.kezia@gmail.com`
- `nova.elaine@365mcindonesia.com`

Jika ada email yang sudah menjadi user Auth, jangan membuat duplikat. Catat hanya
UUID user-nya untuk langkah mapping.

Project Supabase Free dapat membatasi jumlah email invitation per periode. Jika
rate limit tercapai, jangan retry berulang. Tunggu reset limit atau gunakan
opsi **Create new user** dengan password sementara yang dibagikan melalui kanal
aman di luar repository/chat ini.

## 2. Map Auth user ke `team_members`

Jalankan query berikut di **SQL Editor** untuk memeriksa pasangan email dan UUID:

```sql
select
  tm.id as team_member_id,
  tm.name,
  tm.email,
  tm.role,
  tm.auth_user_id,
  au.id as auth_user_id_by_email
from public.team_members tm
left join auth.users au on lower(au.email) = lower(tm.email)
order by tm.email;
```

Jika hasilnya tepat satu user Auth untuk setiap email, map otomatis dengan query
berikut:

```sql
update public.team_members tm
set auth_user_id = au.id
from auth.users au
where lower(au.email) = lower(tm.email)
  and tm.auth_user_id is null;
```

Verifikasi sebelum melanjutkan:

```sql
select
  count(*) as total_members,
  count(auth_user_id) as mapped_members,
  count(*) filter (where auth_user_id is null) as unmapped_members
from public.team_members;
```

Nilai wajib: `unmapped_members = 0` dan `mapped_members = total_members`.

Jika ada email ganda, email salah ketik, atau satu row masih `NULL`, berhenti dan
perbaiki mapping secara manual berdasarkan UUID Auth yang benar. Migration RLS
memiliki preflight check dan akan menolak cutover jika masih ada row yang belum
terpetakan.

## 3. Terapkan RLS

Setelah verifikasi mapping lulus, buka file
`supabase/migrations/20260827063200_auth_rls_policies.sql`, copy seluruh isinya,
lalu jalankan di SQL Editor. Migration ini:

- mengaktifkan RLS pada tabel ContentLab yang terekspos;
- mencabut akses anonymous;
- membatasi data berdasarkan role, client/brand, owner, assignee, dan creator;
- menjaga agar client hanya dapat mengubah status review yang diizinkan;
- tidak mengekspos kolom legacy `team_members.password` melalui Data API.

Jalankan query verifikasi:

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'team_members', 'channels', 'client_brands', 'tasks', 'comments',
    'kpi_definitions', 'kpi_updates', 'documents', 'task_resources',
    'notifications'
  )
order by tablename;
```

Semua row `rowsecurity` harus `true`.

## 4. Aktifkan Auth di deployment

Setelah RLS aktif dan smoke test selesai:

1. Tambahkan environment variable `VITE_SUPABASE_AUTH_ENABLED=true` pada
   environment Production di Vercel.
2. Trigger redeploy dari commit berikutnya (atau redeploy manual).
3. Untuk lokal, set variable yang sama di `.env.local`; jangan commit file env
   yang berisi secret.

Sebelum flag ini diaktifkan, login lama masih tersedia sebagai fallback dan
   RLS belum boleh dinyalakan. Setelah flag aktif, login memakai email/password
   Supabase Auth dan session dikelola oleh Supabase.

## 5. Smoke test wajib

- Super: dapat melihat semua client/brand, mengelola team, dan mengubah semua
  data yang memang diizinkan aplikasi.
- Team: dapat melihat/mengubah workspace sesuai client access, tetapi tidak dapat
  membuka atau mengubah pengaturan manager.
- Client: hanya melihat task/document dengan client access yang sesuai; dapat
  memberi feedback dan mengubah status review yang diizinkan.
- Logout lalu login ulang: session tetap konsisten dan tidak kembali ke akun
  legacy.
- Coba request tanpa session: harus ditolak oleh Auth/RLS.

Periksa juga bahwa task, comment, KPI, document, dan notifikasi yang dibuat satu
user langsung terlihat oleh user lain sesuai scope-nya.

## Catatan Storage / gambar

RLS tabel tidak otomatis melindungi `storage.objects`. Upload cover image saat
ini memakai salah satu bucket lama (`contentLab-storage`, `contentlab-covers`,
atau `covers`) dan menyimpan public URL agar gambar pada card tetap tampil.
Jangan mengubah bucket tersebut menjadi private sebagai bagian dari cutover ini;
public URL lama akan berhenti bekerja. Hardening storage sebaiknya menjadi
langkah terpisah: pilih satu bucket private, simpan path yang mengandung task ID,
ubah UI ke signed URL, lalu tambahkan policy object yang memeriksa scope client /
brand. Sampai langkah itu dikerjakan, anggap URL gambar sebagai link yang dapat
dibagikan siapa pun yang memilikinya.

## 6. Penguatan keamanan Auth

Di **Authentication → Password Security**, aktifkan **Leaked password
protection**. Ini terpisah dari RLS dan mencegah password yang diketahui bocor
dipakai untuk akun baru/perubahan password.

Jangan pernah menjalankan query dengan `service_role` key di browser atau
memasukkannya ke `.env` yang dibundel Vite. Provisioning user dilakukan melalui
Dashboard Auth atau backend tepercaya.

## Rollback / recovery

Ambil snapshot/export database sebelum langkah 3. Jika smoke test gagal, jangan
mematikan Auth flag secara acak. Simpan error dan rollback policy/migration
secara terkontrol melalui SQL Editor agar tidak meninggalkan tabel setengah
terkunci. Selama flag Auth masih `false`, aplikasi produksi tetap menggunakan
jalur legacy dan perubahan fondasi di atas tidak memutus akses yang berjalan.
