# 🌊 Remindly — Manajer Tugas "Sea Space" Premium & Kolaboratif

**Remindly** adalah platform manajemen tugas dan kolaborasi real-time kelas atas yang dibangun dengan **React 19**, **Firebase**, dan **Tailwind CSS**. Didesain dengan estetika glassmorphism "Deep Sea" yang memukau, aplikasi ini menawarkan pengalaman mulus bagi tim atau individu untuk mengelola tugas dalam "Sea Space" bersama.

---

## ✨ Fitur Unggulan

- 🔐 **Autentikasi Google**: Login aman dan cepat dalam sekali klik.
- 🌍 **Kolaborasi Sea Space**: Sinkronisasi tugas secara real-time antar pengguna menggunakan Firebase Firestore.
- 📊 **Statistik Dinamis**: Visualisasi progress bar dan analitik tugas yang interaktif.
- 📝 **Sistem Tugas & Ringkasan**: Tab terpisah untuk mengelola tugas harian dan ringkasan/catatan panjang.
- 🎨 **UI/UX Premium**:
  - **Desain Glassmorphism**: Efek kaca buram (frosted glass) yang elegan.
  - **Animasi Halus**: Didukung oleh Framer Motion.
  - **Efek Confetti**: Perayaan visual saat tugas selesai.
- 📱 **PWA Ready**: Dapat diinstal di Desktop dan HP seperti aplikasi native.
- 🔍 **Filter & Pencarian Lanjut**: Cari, urutkan berdasarkan prioritas/waktu, dan filter berdasarkan status.
- 🔔 **Notifikasi Push**: Siap diintegrasikan dengan Firebase Cloud Messaging (FCM).

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend/Database**: Firebase Firestore (Real-time DB)
- **Autentikasi**: Firebase Auth (Google Provider)
- **Animasi**: Framer Motion, Canvas Confetti
- **Ikon**: Lucide React
- **PWA**: Vite PWA Plugin

---

## 🚀 Panduan Penggunaan (Setup)

Ikuti langkah-langkah berikut untuk mengaktifkan Remindly milik Anda sendiri.

### 1. Persyaratan Sistem

- Node.js (v18 atau lebih baru)
- npm atau yarn
- Akun Firebase

### 2. Instalasi

```bash
# Clone repository ini
git clone https://github.com/username-anda/remindly.git

# Masuk ke direktori
cd remindly

# Instal dependensi
npm install
```

---

## 🔥 Konfigurasi Firebase (Penting)

Aplikasi ini menggunakan Firebase sebagai backend. Ikuti panduan ini untuk menghubungkan aplikasi dengan akun Firebase Anda:

### Langkah 1: Buat Proyek Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Klik **"Add project"** dan beri nama "Remindly".
3. Aktifkan Google Analytics (opsional), lalu klik **"Create project"**.

### Langkah 2: Aktifkan Autentikasi (Google Login)

1. Di menu samping, pilih **Build > Authentication**.
2. Klik **"Get Started"**.
3. Di tab **Sign-in method**, pilih **Google**.
4. Aktifkan (Enable), pilih email dukungan proyek, lalu klik **Save**.

### Langkah 3: Siapkan Database Firestore

1. Di menu samping, pilih **Build > Firestore Database**.
2. Klik **"Create database"**.
3. Pilih lokasi database terdekat (misal: `asia-southeast2` untuk Jakarta).
4. Pilih **"Start in test mode"** untuk kemudahan setup awal, lalu klik **Create**.

### Langkah 4: Daftarkan Aplikasi Web

1. Di halaman Project Overview, klik ikon **Web (`</>`)**.
2. Beri nama aplikasi (misal: "Remindly Web").
3. Klik **"Register app"**.
4. Anda akan melihat objek `firebaseConfig`. Salin kode tersebut.

### Langkah 5: Masukkan Konfigurasi ke Kode

Buka file `src/firebase.js` dan ganti `firebaseConfig` lama dengan milik Anda:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### Langkah 6: Atur Security Rules Firestore

Agar fitur kolaborasi berjalan lancar, pastikan aturan keamanan (Rules) di Firestore diatur seperti ini:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 💻 Menjalankan Aplikasi

```bash
# Jalankan di mode pengembangan (local)
npm run dev

# Build untuk produksi
npm run build

# Pratinjau hasil build
npm run preview
```

---

## 🎨 Panduan Kustomisasi

### Mengubah Tema Warna

Remindly menggunakan CSS Variables. Anda bisa mengubah warna dasar di file `src/index.css`:

```css
:root {
  --bg-primary: #020c1b; /* Warna latar belakang utama */
  --accent-primary: #64ffda; /* Warna aksen/brand */
  --text-primary: #e6f1ff; /* Warna teks utama */
}
```

### Mengubah Logo & Nama

1. Ganti file `favicon.ico` dan ikon di folder `public/`.
2. Update nama aplikasi di `index.html` dan `vite.config.js` (pada bagian PWA manifest).
3. Ubah judul di `src/App.jsx`.

---

## 🌐 Deployment

Proyek ini sangat mudah dideploy ke **Vercel** atau **Netlify**:

1. Push kode Anda ke GitHub.
2. Hubungkan repository ke Vercel.
3. Vercel akan otomatis mendeteksi Vite dan melakukan deployment.

---

## 📄 Lisensi & Dukungan

Produk ini adalah template digital. Anda bebas menggunakan dan memodifikasinya untuk proyek pribadi maupun komersial.

**Butuh Bantuan?**
Jika Anda memiliki pertanyaan atau butuh pengembangan kustom, jangan ragu untuk menghubungi kami!

---

_Dibuat dengan ❤️ untuk Web Modern._
