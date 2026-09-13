# PROMPT.md - Prompt untuk Setiap Sesi Perbaikan

> **Cara pakai:** Copy prompt di bawah ke sesi baru. Setiap prompt sudah lengkap dan mandiri.

---

## 📋 PROMPT 1: Restructure Folder

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 1: Restructure Folder.

Tugas:
1. Buat folder: pages/, css/, js/
2. Pindahkan HTML ke pages/ (dashboard.html, jadwal.html, todo.html, index.html)
3. Pindahkan JS ke js/ (core.js, dashboard.js, jadwal.js, todo.js, gcal-sync.js)
4. Pecah style.css (793 baris) menjadi file terpisah di css/:
   - base.css: :root variables, reset (*, body), typography
   - layout.css: navbar, page-container, page-header, panel, footer, modal
   - components.css: btn, badge, form, input, radio, chip, manage-list, sync-badge
   - dashboard.css: week-nav, matrix-grid, matrix-cell, matrix-chip, legend, color-mode-toggle, todo-week-grid, todo-mini
   - jadwal.css: excel-table, table-scroll, cell-input, action-cell, row-completed, riwayat, repeat-label, table-toolbar
   - todo.css: progress-wrapper, todo-card, card-body, checkbox, date-group-header
   - responsive.css: semua @media queries
5. Update semua path di HTML:
   - <link rel="stylesheet" href="css/base.css"> dst
   - <script type="module" src="js/filename.js">
6. Update import di JS jika ada yang import file CSS
7. Test: buka semua halaman di browser, pastikan tidak ada error di console

Penting: index.html harus redirect ke pages/dashboard.html
```

---

## 📋 PROMPT 2: Navbar Hamburger Menu

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 2: Navbar Hamburger Menu.

Konteks: Struktur folder sudah dipindah ke pages/, css/, js/. HTML di pages/, CSS di css/, JS di js/.

Tugas:
1. Di semua HTML (pages/dashboard.html, pages/jadwal.html, pages/todo.html):
   - Tambah tombol hamburger di navbar-inner, sebelum nav-links:
     <button class="hamburger" id="hamburgerBtn" aria-label="Menu">
       <span></span><span></span><span></span>
     </button>

2. Di css/layout.css, tambah styles hamburger:
   - .hamburger: display none (desktop), flex column, gap 4px, padding 8px, cursor pointer
   - .hamburger span: width 22px, height 2px, bg var(--color-text), transition transform
   - .hamburger.active span:nth-child(1): rotate 45deg, translateY 6px
   - .hamburger.active span:nth-child(2): opacity 0
   - .hamburger.active span:nth-child(3): rotate -45deg, translateY -6px

3. Di css/responsive.css, tambah media query @media (max-width: 768px):
   - .hamburger: display flex
   - .nav-links: display none, position absolute, top 100%, left 0, right 0, bg white, flex-direction column, padding 16px, box-shadow, z-index 50
   - .nav-links.active: display flex
   - .navbar-actions: display none, position absolute, top calc(100% + nav-height), left 0, right 0, bg white, flex-direction column, padding 16px, box-shadow
   - .navbar-actions.active: display flex
   - .nav-link: padding 12px 16px (lebih besar untuk tap)
   - .navbar-actions .btn: width 100%, text-align left

4. Buat file js/navbar.js dengan logic:
   - Select #hamburgerBtn, .nav-links, .navbar-actions
   - Toggle class 'active' pada hamburger dan nav-links/navbar-actions saat diklik
   - Tutup menu jika klik di luar menu
   - Tutup menu jika resize window > 768px

5. Tambah <script type="module" src="../js/navbar.js"> di semua HTML setelah script lain

Test: buka di Chrome DevTools mobile mode, klik hamburger, pastikan menu muncul/hilang.
```

---

## 📋 PROMPT 3: Dashboard Card View Mobile

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 3: Dashboard Card View Mobile.

Konteks: Struktur folder sudah dipindah. CSS di css/, JS di js/, HTML di pages/.

Tugas:
1. Di pages/dashboard.html, tambah container baru di bawah matrix-scroll:
   <div class="matrix-mobile" id="matrixMobile" style="display:none;"></div>

2. Di css/dashboard.css, tambah styles untuk mobile view:
   .matrix-mobile: display none (default), padding 16px
   .mobile-day-card: bg white, border-radius 14px, padding 16px, margin-bottom 16px, box-shadow
   .mobile-day-header: font-weight 700, font-size 0.9rem, margin-bottom 8px, color primary
   .mobile-day-date: font-size 0.75rem, color muted
   .mobile-time-slot: display flex, align-items center, gap 8px, padding 8px 0, border-bottom 1px solid border
   .mobile-time-label: font-size 0.72rem, font-weight 600, color muted, min-width 50px
   .mobile-chips: display flex, flex-direction column, gap 4px, flex 1
   .mobile-chip: font-size 0.7rem, padding 6px 10px, border-radius 6px, border-left 3px solid, bg var(--color-bg)

3. Di css/responsive.css, tambah media query @media (max-width: 768px):
   - .matrix-scroll: display none
   - .matrix-mobile: display block
   - .todo-week-grid: display none (sembunyikan juga)

4. Di js/dashboard.js, tambah fungsi renderMobileView():
   - Ambil data dari matrixData yang sudah ada
   - Loop untuk setiap hari (Senin-Minggu)
   - Buat card per hari dengan header nama hari + tanggal
   - Di dalam card, tampilkan time slots (06:00-22:00)
   - Untuk setiap time slot, tampilkan chips jadwal yang ada
   - Render ke #matrixMobile

5. Panggil renderMobileView() saat:
   - Page load
   - Window resize (cek width <= 768px)
   - Navigation minggu berubah

6. Untuk chip di mobile, tampilkan:
   - Nama kegiatan (text)
   - Warna border-left dari kategori/prioritas
   - Klik chip untuk buka modal detail (sama seperti desktop)

Test: buka dashboard di mobile mode, pastikan card view muncul dengan benar.
```

---

## 📋 PROMPT 4: Tabel Jadwal Responsive

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 4: Tabel Jadwal Responsive.

Konteks: Struktur folder sudah dipindah. CSS di css/, JS di js/, HTML di pages/.

Tugas:
1. Di js/jadwal.js, saat render tabel, tambah data-label attribute di setiap td:
   - <td data-label="Nama">...</td>
   - <td data-label="Tanggal">...</td>
   - <td data-label="Mulai">...</td>
   - <td data-label="Selesai">...</td>
   - <td data-label="Kategori">...</td>
   - <td data-label="Prioritas">...</td>
   - dst untuk semua kolom

2. Di css/jadwal.css, tambah styles untuk mobile table:
   .excel-table.mobile-view thead: display none
   .excel-table.mobile-view tbody tr: display block, margin-bottom 16px, border 1px solid border, border-radius 14px, overflow hidden, bg white
   .excel-table.mobile-view tbody td: display flex, justify-content space-between, align-items center, padding 12px 16px, border-bottom 1px solid border, text-align right
   .excel-table.mobile-view tbody td:last-child: border-bottom none
   .excel-table.mobile-view tbody td::before: content attr(data-label), font-weight 700, font-size 0.78rem, color muted, text-align left, min-width 80px
   .excel-table.mobile-view .action-cell: justify-content flex-end, flex-wrap wrap, gap 8px, padding-top 8px

3. Di css/responsive.css, tambah media query @media (max-width: 768px):
   - .excel-table: add class 'mobile-view' via JS

4. Di js/jadwal.js, tambah fungsi toggleMobileView():
   - Cek window width <= 768px
   - Jika mobile: tambah class 'mobile-view' ke table
   - Jika desktop: hapus class 'mobile-view' dari table
   - Panggil saat page load dan resize

5. Pastikan fitur yang tetap jalan di mobile:
   - Inline editing (klik cell untuk edit)
   - Tombol Edit/Selesai/Hapus
   - Badge kategori dan prioritas
   - Badge sync (Google Calendar)
   - Row completed (opacity 0.55 + line-through)

Test: buka jadwal di mobile mode, pastikan tabel berubah menjadi card per baris.
```

---

## 📋 PROMPT 5: To-Do Compact Cards

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 5: To-Do Compact Cards.

Konteks: Struktur folder sudah dipindah. CSS di css/, JS di js/, HTML di pages/.

Tugas:
1. Di css/todo.css, tambah styles compact untuk mobile:
   @media (max-width: 768px):
   - .todo-card: padding 12px (dari 16px)
   - .card-title: font-size 0.85rem (dari 0.92rem)
   - .badge: font-size 0.65rem (dari 0.7rem), padding 2px 6px (dari 2px 8px)
   - .card-meta: gap 3px (dari 4px)
   - .todo-checkbox-wrapper: min-width 44px, min-height 44px (touch target)
   - .custom-checkbox: width 24px (dari 22px), height 24px (dari 22px)

2. Pastikan progress bar tetap prominent di mobile:
   - .progress-wrapper: tidak ada perubahan (tetap full width)
   - .progress-bar-track: height 12px (dari 10px) di mobile untuk visibility
   - .progress-info: font-size 0.85rem (dari 0.8rem) di mobile

3. Di css/responsive.css, tambah media query @media (max-width: 480px):
   - .todo-card: padding 10px, gap 10px
   - .card-title: font-size 0.82rem
   - .date-group-header: font-size 0.78rem
   - .progress-bar-track: height 14px

4. Pastikan checkbox tetap tap-friendly:
   - Custom checkbox harus minimal 44x44px touch target
   - Gunakan padding atau min-width/min-height jika perlu
   - Hover effects dinonaktifkan di touch devices:
     @media (hover: none) and (pointer: coarse) {
       .todo-card:hover { transform: none; box-shadow: var(--shadow-sm); }
     }

Test: buka to-do di mobile mode, pastikan kartu compact tapi tetap readable.
```

---

## 📋 PROMPT 6: Multi-Breakpoint Support

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 6: Multi-Breakpoint Support.

Konteks: Struktur folder sudah dipindah. CSS di css/, JS di js/, HTML di pages/.

Tugas:
1. Di css/responsive.css, definisikan 4 breakpoints:
   
   /* Small phones (< 480px) - iPhone SE, small Android */
   @media (max-width: 480px) { ... }
   
   /* Standard phones (481-768px) - iPhone 14, Galaxy S21 */
   @media (max-width: 768px) { ... }
   
   /* Tablets (769-1024px) - iPad Mini, iPad Air */
   @media (min-width: 769px) and (max-width: 1024px) { ... }
   
   /* Desktop (> 1024px) - Laptop, Desktop */
   @media (min-width: 1025px) { ... }

2. Untuk small phones (< 480px):
   - .page-container: padding 12px
   - .navbar-inner: padding 8px 12px
   - .brand: font-size 1.1rem
   - .modal: max-width 100%, border-radius 0, margin 0
   - .modal-body: padding 16px
   - .form-row: grid-template-columns 1fr
   - .radio-group: flex-direction column
   - input[type="text"], input[type="date"], input[type="time"]: padding 14px 12px (lebih besar)
   - .btn: min-height 44px (touch target)

3. Untuk tablets (769-1024px):
   - .page-container: max-width 100%, padding 20px
   - .navbar-inner: padding 12px 20px
   - .matrix-grid: grid-template-columns 70px repeat(7, 120px) (sedikit lebih kecil)
   - .excel-table: min-width 900px (dari 980px)
   - .modal: max-width 500px

4. Untuk desktop (> 1024px):
   - .page-container: max-width 1320px (sudah ada)
   - Semua styles default

5. Test di Chrome DevTools:
   - iPhone SE (375px)
   - iPhone 14 (390px)
   - Samsung Galaxy S21 (360px)
   - iPad Mini (768px)
   - iPad Air (820px)
   - Laptop (1366px)

Pastikan tidak ada horizontal scroll yang tidak perlu di semua breakpoints.
```

---

## 📋 PROMPT 7: Form & Modal Mobile

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 7: Form & Modal Mobile.

Konteks: Struktur folder sudah dipindah. CSS di css/, JS di js/, HTML di pages/.

Tugas:
1. Di css/layout.css, tambah styles modal untuk mobile:
   @media (max-width: 480px):
   - .modal-overlay: padding 0
   - .modal: max-width 100%, max-height 100vh, border-radius 0, height 100vh
   - .modal-header: padding 16px, border-bottom 1px solid border
   - .modal-body: padding 16px, overflow-y auto
   - .modal-footer: padding 16px, flex-direction column
   - .modal-footer .btn: width 100%, padding 14px

2. Di css/layout.css, tambah styles form untuk mobile:
   @media (max-width: 480px):
   - .form-group: margin-bottom 20px (lebih besar)
   - label: font-size 0.85rem (dari 0.8rem)
   - input[type="text"], input[type="date"], input[type="time"], select: padding 14px 12px (dari 10px 12px), font-size 0.95rem (dari 0.88rem)
   - .form-row: grid-template-columns 1fr (stack vertical)
   - .radio-group: flex-direction column, gap 10px
   - .radio-option: padding 14px 16px (dari 8px 14px), width 100%
   - .manage-add-row: flex-direction column
   - .manage-add-row input[type="text"]: width 100%
   - .manage-add-row .btn: width 100%

3. Di css/components.css, tambah styles input color untuk mobile:
   @media (max-width: 480px):
   - input[type="color"]: width 100%, height 50px (lebih besar untuk tap)

4. Pastikan modal tidak tertutup keyboard:
   - Gunakan position fixed untuk modal overlay
   - Body tidak scroll saat modal terbuka (tambah class 'modal-open' ke body)
   - di JS: document.body.classList.toggle('modal-open', isOpen)
   - .modal-open { overflow: hidden }

5. Pastikan semua form fields bisa diakses:
   - Date picker mobile native harus berfungsi
   - Time picker mobile native harus berfungsi
   - Select dropdown harus berfungsi
   - Radio buttons harus bisa di-tap

Test: buka modal tambah jadwal di mobile, pastikan form bisa diisi dengan nyaman.
```

---

## 📋 PROMPT 8: Touch-Friendly Interactions

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 8: Touch-Friendly Interactions.

Konteks: Struktur folder sudah dipindah. CSS di css/, JS di js/, HTML di pages/.

Tugas:
1. Di css/base.css, tambah touch-friendly base styles:
   @media (hover: none) and (pointer: coarse) {
     * { -webkit-tap-highlight-color: transparent; }
     .btn:active { transform: scale(0.97); }
     .btn-action:active { transform: scale(0.95); }
     .todo-card:hover { transform: none; box-shadow: var(--shadow-sm); }
     .todo-card:active { transform: scale(0.98); }
   }

2. Di css/components.css, pastikan semua tombol minimal 44px touch target:
   @media (hover: none) and (pointer: coarse) {
     .btn { min-height: 44px; }
     .btn-sm { min-height: 36px; min-width: 36px; }
     .btn-action { min-height: 44px; min-width: 44px; }
     .nav-link { min-height: 44px; display: flex; align-items: center; }
     .radio-option { min-height: 44px; }
     .manage-item { min-height: 44px; }
     .chip { min-height: 32px; }
     .custom-checkbox { min-width: 24px; min-height: 24px; }
     .todo-checkbox-wrapper { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
   }

3. Di css/layout.css, tambah smooth scroll:
   html { scroll-behavior: smooth; }

4. Di css/responsive.css, nonaktifkan hover effects di mobile:
   @media (hover: none) and (pointer: coarse) {
     .matrix-chip:hover { transform: none; }
     .btn:hover { box-shadow: var(--shadow-sm); }
     .btn-primary:hover { background: var(--color-primary); }
     .btn-secondary:hover { background: var(--color-secondary); }
   }

5. Di js/dashboard.js, tambah swipe gesture untuk navigasi minggu (optional):
   - Detect swipe left/right pada .matrix-scroll atau .matrix-mobile
   - Swipe left → next week (panggil btnNextWeek click)
   - Swipe right → prev week (panggil btnPrevWeek click)
   - Gunakan touchstart dan touchend events
   - Threshold minimal 50px untuk trigger swipe

6. Test di Chrome DevTools dengan touch simulation:
   - Aktifkan "Device Mode" dan pilih device
   - Pastikan semua tombol bisa di-tap
   - Pastikan hover effects tidak muncul
   - Test swipe gesture di dashboard
```

---

## 📋 PROMPT 9: Typography & Spacing

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 9: Typography & Spacing.

Konteks: Struktur folder sudah dipindah. CSS di css/, JS di js/, HTML di pages/.

Tugas:
1. Di css/base.css, definisikan typography scale:
   :root {
     --font-size-xs: 0.7rem;
     --font-size-sm: 0.78rem;
     --font-size-base: 0.88rem;
     --font-size-md: 0.95rem;
     --font-size-lg: 1.05rem;
     --font-size-xl: 1.15rem;
     --font-size-2xl: 1.3rem;
   }

2. Di css/responsive.css, adjust typography per breakpoint:
   
   @media (max-width: 480px) {
     :root {
       --font-size-xs: 0.65rem;
       --font-size-sm: 0.72rem;
       --font-size-base: 0.82rem;
       --font-size-md: 0.88rem;
       --font-size-lg: 0.95rem;
       --font-size-xl: 1.05rem;
       --font-size-2xl: 1.15rem;
     }
     body { line-height: 1.45; }
   }
   
   @media (max-width: 768px) {
     :root {
       --font-size-xs: 0.68rem;
       --font-size-sm: 0.75rem;
       --font-size-base: 0.85rem;
       --font-size-md: 0.92rem;
       --font-size-lg: 1rem;
       --font-size-xl: 1.1rem;
       --font-size-2xl: 1.2rem;
     }
     body { line-height: 1.48; }
   }
   
   @media (min-width: 769px) {
     body { line-height: 1.5; }
   }

3. Update semua font-size di CSS untuk menggunakan variables:
   - .brand: font-size: var(--font-size-2xl)
   - .page-header h1: font-size: var(--font-size-xl)
   - .nav-link: font-size: var(--font-size-sm)
   - .btn: font-size: var(--font-size-sm)
   - .cell-input: font-size: var(--font-size-base)
   - .matrix-cell: font-size: var(--font-size-xs)
   - .matrix-chip: font-size: var(--font-size-xs)
   - .todo-card .card-title: font-size: var(--font-size-base)
   - .badge: font-size: var(--font-size-xs)
   - dst untuk semua font-size yang ada

4. Pastikan heading hierarchy jelas:
   h1: var(--font-size-xl) atau var(--font-size-2xl)
   h2: var(--font-size-lg)
   h3: var(--font-size-md)
   h4: var(--font-size-base)
   p: var(--font-size-base)

5. Test di berbagai ukuran layar, pastikan:
   - Text tidak terlalu kecil di small phones
   - Text tidak terlalu besar di tablets
   - Line height cukup untuk readability
   - Tidak ada text overflow atau truncation yang tidak diinginkan
```

---

## 📋 PROMPT 10: Testing & Polish

```
Baca file PERBAIKAN.md di repository ini. Kerjakan FASE 10: Testing & Polish.

Konteks: Semua perbaikan mobile sudah diimplementasi. Struktur folder sudah dipindah.

Tugas:
1. Buka Chrome DevTools → Device Mode
2. Test di semua devices berikut:
   - iPhone SE (375x667)
   - iPhone 14 (390x844)
   - Samsung Galaxy S21 (360x800)
   - iPad Mini (768x1024)
   - iPad Air (820x1180)
   - Desktop (1366x768)

3. Untuk setiap device, test:
   [ ] Navbar hamburger berfungsi
   [ ] Menu navigasi bisa dibuka/tutup
   [ ] Dashboard card view muncul (mobile)
   [ ] Dashboard grid muncul (desktop)
   [ ] Chips jadwal bisa diklik
   [ ] Modal detail muncul
   [ ] Tabel jadwal responsive
   [ ] Inline editing berfungsi
   [ ] Tombol aksi (Edit/Selesai/Hapus) bisa di-tap
   [ ] To-Do cards compact
   [ ] Progress bar visible
   [ ] Checkbox bisa di-tap
   [ ] Modal form bisa diisi
   [ ] Date/time picker berfungsi
   [ ] Radio buttons bisa di-tap
   [ ] Tidak ada horizontal scroll yang tidak perlu
   [ ] Tidak ada text overflow
   [ ] Semua tombol minimal 44px touch target
   [ ] Tidak ada console errors

4. Fix bugs yang ditemukan:
   - Catat semua bugs di comment di PERBAIKAN.md
   - Fix satu per satu
   - Test ulang setelah fix

5. Buat screenshot perbandingan (optional):
   - Screenshot sebelum perbaikan
   - Screenshot sesudah perbaikan
   - Simpan di folder screenshots/

6. Update PERBAIKAN.md:
   - Tandai semua fase sebagai ✅ selesai
   - Tambah catatan perubahan yang dilakukan
   - Update status menjadi "Selesai"

7. Final commit:
   - git add .
   - git commit -m "feat: mobile responsive improvements"
```

---

## 📝 Catatan Penggunaan

1. **Copy paste prompt** ke sesi baru
2. **Baca PERBAIKAN.md** terlebih dahulu untuk konteks
3. **Kerjakan satu per satu** fase sesuai urutan
4. **Test setelah setiap fase** untuk memastikan tidak ada yang rusak
5. **Update PERBAIKAN.md** setelah selesai setiap fase

---

**Terakhir diperbarui:** 13 September 2026
