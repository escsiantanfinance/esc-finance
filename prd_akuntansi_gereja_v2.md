# Product Requirements Document (PRD)
## Sistem Akuntansi & Bendahara Gereja Terintegrasi

**Status:** Draft Spesifikasi Komprehensif  
**Versi:** 2.1 (Penambahan: Manajemen Jenis Kas Dinamis, Analitik Kas Mendetail, & Pelacakan Perpuluhan Volunteer)  

---

## 1. Ringkasan Eksekutif & Latar Belakang
Sistem Akuntansi dan Bendahara Gereja dirancang khusus untuk memodernisasi alur pencatatan keuangan manual pasca-ibadah yang selama ini mengandalkan formulir kertas dan pemindahan data manual ke *spreadsheet*. Proses manual tersebut rentan terhadap salah ketik (*human error*), risiko kehilangan data fisik, dan keterlambatan penyusunan laporan kas yang multidimensi.

Platform ini memisahkan operasional menjadi dua bagian utama:
1. **Aplikasi Native Android:** Dioptimalkan untuk mobilitas, kecepatan, dan akurasi entri data tim Finance langsung di ruang penghitungan uang.
2. **Web Dashboard Admin:** Berbasis cloud yang dapat diakses di mana saja oleh Bendahara Utama dan Gembala untuk otorisasi, manajemen akuntansi nirlaba, dan peninjauan laporan kas berkala.

---

## 2. Arsitektur & Rekomendasi Teknologi
Untuk mengakomodasi kebutuhan skalabilitas (mampu melayani hingga ratusan pengguna relawan tanpa biaya lisensi per-pengguna yang tinggi) serta menjaga performa sinkronisasi data yang cepat, sistem ini didesain menggunakan arsitektur modern mandiri:
* **Frontend Aplikasi Mobile:** Kompilasi berbasis native menggunakan FlutterFlow / Android Engine guna menjamin antarmuka yang responsif, akses kamera yang lancar, serta penanganan penyimpanan lokal (*offline caching*).
* **Frontend Web Admin:** Aplikasi Web Responsif (Single Page Application) yang aman untuk akses dari peramban desktop maupun mobile di mana saja.
* **Backend & Database:** Menggunakan **Supabase** sebagai database relasional utama (PostgreSQL) karena mendukung penanganan relasi data akuntansi yang kompleks, skalabilitas tinggi, keamanan berlapis (*Row Level Security*), dan sinkronisasi *real-time*, didukung dengan logika komputasi server menggunakan **Node.js**.

---

## 3. Alur Kerja Sistem (User Journey & Rekonsiliasi)
### Protokol Rekonsiliasi Kas Pasca-Ibadah:
1. **Pembukaan Sesi:** Setelah ibadah selesai, Anggota Finance membuka aplikasi Android, memilih jadwal ibadah, dan membuka lembar input digital baru.
2. **Input Denominasi & Kategori:** Tim Finance memasukkan jumlah lembar uang berdasarkan denominasi (kalkulator fisik) dan mengelompokkan dana ke dalam kategori (Perpuluhan, Janji Iman, Persembahan Umum, dll.).
3. **Balancing Sistem:** Sistem menghitung otomatis total input digital. Tim Finance mencocokkan total angka sistem dengan hasil hitungan fisik uang kas.
4. **Otorisasi & Tanda Tangan:** Jika hasil akhir dinyatakan cocok (*balanced*), Gembala dan Saksi membubuhkan tanda tangan digital langsung pada layar Android.
5. **Kunci Data & Sinkronisasi:** Data yang telah ditandatangani otomatis terkunci (tidak bisa diubah di aplikasi mobile) dan terkirim ke Web Admin untuk memperbarui pos-pos kas terkait secara *real-time*.

---

## 4. Spesifikasi Fungsional: Aplikasi Android (Tim Finance)
Aplikasi mobile difokuskan pada fungsionalitas entri data yang cepat, aman, dan meminimalkan kesalahan ketik di lapangan.

| Fitur Utama | Deskripsi & Mekanisme Kerja | Kriteria Keberhasilan |
| :--- | :--- | :--- |
| **Manajemen Sesi Ibadah** | Memilih jenis ibadah (Ibadah Raya, Pemuda, Sekolah Minggu) beserta tanggal dan jam sesi untuk melokalisasi data persembahan. | Data transaksi terikat rapi pada metadata ibadah yang spesifik. |
| **Kalkulator Fisik & Form Kategori** | Input formulir digital untuk nominal per kategori (Perpuluhan, Janji Iman, Kolekte Umum, dll.). Dilengkapi kalkulator jumlah lembar uang (misal: 50 lembar Rp100.000 = Rp5.000.000). | Meminimalisir kesalahan hitung matematika manual oleh petugas. |
| **Modul Validasi & E-Signature** | Menampilkan indikator "MATCH" (Hijau) atau "MISMATCH" (Merah) antara total fisik uang dan total kategori. Jika cocok, mengaktifkan kanvas tanda tangan untuk Gembala dan Saksi. | Tombol simpan akhir hanya aktif jika status data sudah seimbang/*balanced*. |
| **Penyimpanan Lokal Sementara** | Setiap ketikan data otomatis disimpan ke memori lokal HP (SQLite/Local Caching). Jika aplikasi tertutup atau baterai habis, data input tidak hilang. | Anti-hilang data sebelum proses unggah selesai sepenuhnya. |

---

## 5. Spesifikasi Fungsional: Web Dashboard (Admin & Akuntansi)
Dashboard berbasis web memegang kendali penuh atas tata kelola keuangan, struktur akuntansi, dan pengeluaran kas gereja.

### A. Modul Akuntansi Standar & Multi-Kas
* **Bagan Akun (Chart of Accounts - COA):** Struktur pengaturan kode akun akuntansi nirlaba yang memisahkan Aset, Kewajiban, Ekuitas (Dana Terikat & Tidak Terikat), Pendapatan (Persembahan), dan Beban.
* **Manajemen Multi-Kas (Multi-Wallet Management):** Pengaturan rekening atau pos kas spesifik sesuai peruntukannya (misal: Kas Operasional, Kas Pembangunan, Kas Diakonia/Sosial, Kas Multimedia). Setiap pengeluaran harus memilih pos kas asal.
    * **Penambahan Jenis Kas Baru oleh Admin (Dinamis):** Admin dapat **menambah, mengubah, dan menonaktifkan** jenis/pos kas baru secara mandiri kapan saja — mencakup nama kas, tipe (tunai/bank/digital), saldo awal, nomor rekening, dan akun COA terkait — tanpa perlu bantuan developer. Setiap pos kas baru langsung tersedia di seluruh modul (input persembahan, pengeluaran, jurnal umum, dan laporan).
    * **Dashboard Analitik Kas Mendetail (Admin):** Halaman grafik khusus untuk memantau likuiditas tiap pos kas secara mendalam, mencakup: tren saldo harian/bulanan per kas (grafik garis), perbandingan arus kas masuk vs keluar (grafik batang), komposisi proporsi saldo antar-kas (diagram donat), serta tabel mutasi historis per pos kas. Dilengkapi filter rentang waktu dan pemilihan pos kas tertentu agar Admin dapat menganalisis pergerakan tiap kas secara rinci.
* **Jurnal Umum & Penyesuaian:** Fasilitas pencatatan transaksi non-persembahan (seperti biaya administrasi bank, penyusutan aset, atau koreksi pembukuan) secara manual oleh Akuntan/Bendahara.
* **Manajemen Pengeluaran & Budgeting:** Input pengeluaran kas disertai unggah bukti nota/kuitansi fisik. Fitur penetapan anggaran (*budgeting*) per divisi untuk mengontrol agar pengeluaran tidak melebihi pagu tahunan/bulanan.

### B. Modul Laporan Keuangan
* **Laporan Aktivitas (Income Statement):** Menampilkan total pendapatan persembahan berdasarkan kategori dikurangi total pengeluaran beban operasional.
* **Laporan Posisi Keuangan (Neraca):** Menyajikan saldo riil dari seluruh akun kas/bank, piutang janji iman, aset tetap, serta posisi ekuitas dana gereja.
* **Laporan Arus Kas (Cash Flow):** Laporan mutasi masuk dan keluar yang melacak likuiditas kas berdasarkan aktivitas operasional, investasi, dan pendanaan.

### C. Modul Pelacakan Perpuluhan Volunteer (Tithe Accountability)
Modul khusus untuk memantau ketaatan pengembalian perpuluhan para **Volunteer (relawan pelayanan)** dan jemaat terdaftar, agar pengurus dapat melakukan penggembalaan dan tindak lanjut secara terarah — tanpa membuka nominal pribadi demi menjaga sensitivitas pastoral.

* **Registrasi Jemaat & Volunteer:** Admin mengelola daftar anggota/volunteer (nama, kontak, divisi pelayanan, dan status wajib perpuluhan). Daftar inilah yang menjadi basis pengecekan pada setiap periode (mingguan/bulanan).
* **Daftar Centang Status Perpuluhan (Checklist):** Peran **Volunteer** dapat membuka daftar pada periode berjalan untuk melihat secara jelas **siapa yang sudah** dan **siapa yang belum** mengembalikan perpuluhan, lengkap dengan indikator warna (Hijau = Sudah, Merah/Abu-abu = Belum) serta ringkasan persentase ketaatan.
* **Penandaan Otomatis (Auto-Mark):** Ketika perpuluhan seorang anggota dicatat ke sistem — yaitu melalui **inputan anggota**, berupa pencatatan persembahan berkategori "Perpuluhan" yang ditautkan ke identitas anggota tersebut — sistem **otomatis menandai** anggota itu sebagai *"Sudah mengembalikan"* pada periode berjalan, tanpa perlu pencatatan manual ganda. Status pada daftar centang diperbarui secara *real-time*.
* **Tindak Lanjut & Pengingat:** Volunteer dapat menyaring daftar khusus "Belum mengembalikan" untuk keperluan *follow-up* (mis. menghubungi via kontak terdaftar). Riwayat ketaatan tiap anggota lintas periode tersimpan untuk peninjauan dan pelaporan.
* **Kriteria Keberhasilan:** Tidak ada lagi pencocokan manual di kertas — status pengembalian perpuluhan setiap volunteer/jemaat dapat dilihat seketika dan akurat, dan otomatis sinkron begitu data persembahan perpuluhan diinput.

---

## 6. Modul Pencadangan & Pemulihan Data (Data Backup & Recovery)
Menjamin keamanan data keuangan tingkat tinggi dari risiko kegagalan sistem maupun kendala operasional eksternal.

### A. Pencadangan Otomatis Berjadwal (Cloud Backup)
Sistem di sisi server (Supabase/Node.js) melakukan pencadangan basis data penuh (*database snapshot*) secara otomatis setiap hari pada jam non-aktif (pukul 02:00 WIB). File cadangan dienkripsi dan disimpan pada server penyimpanan cloud sekunder yang terpisah secara fisik dari database utama. Retensi penyimpanan mencakup cadangan harian selama 30 hari terakhir dan cadangan bulanan selama 12 bulan terakhir.

### B. Pencadangan Manual Instan (On-Demand Local Backup)
Disediakan tombol khusus "Picu Pencadangan Data" pada halaman Web Admin. Bendahara dapat mengunduh salinan data kapan saja dalam dua bentuk format file sekaligus yang dikompresi dalam satu file ZIP:
1. **Format Sistem (.sql / .json):** Berisi skrip struktur dan baris data mentah yang siap dipulihkan ke sistem jika terjadi kerusakan database berjalan.
2. **Format Universal (.xlsx / .csv):** Berisi tabel-tabel data kas masuk dan kas keluar yang terstruktur rapi agar dapat dibuka langsung melalui Microsoft Excel secara mandiri tanpa ketergantungan pada aplikasi.

### C. Log Cadangan & Pemulihan Darurat
Halaman khusus untuk meninjau riwayat backup yang mencakup ukuran file, status (Sukses/Gagal), dan pelaksana (Sistem/Nama Admin). Hak akses pemulihan data (*restore data*) dibatasi secara ketat, hanya dapat dieksekusi oleh Super Admin/Gembala Senior dengan otentikasi keamanan berlapis.
