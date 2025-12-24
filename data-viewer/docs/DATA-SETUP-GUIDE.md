# Data Setup Guide - Cara Menambahkan Path Data untuk Visualisasi

## 📋 Overview

Data Viewer membutuhkan **2 konfigurasi utama** untuk menampilkan gambar:
1. **Base URL** - URL dasar untuk mengakses gambar (S3 atau CloudFront)
2. **Image Paths List** - Daftar path relatif semua gambar yang akan di-visualisasikan

---

## 🗂️ Struktur Path yang Diharapkan

Aplikasi ini mengharapkan struktur path dengan format berikut:

```
assets/images/{version}/{plane}/{subset}/{class}/{filename}.png
```

### Komponen Path:

- **`assets/images/`** - Prefix tetap (harus selalu ada)
- **`{version}`** - `original-images` atau `enhanced-images`
- **`{plane}`** - `axial`, `coronal`, atau `sagittal`
- **`{subset}`** - `train`, `test`, atau `val`
- **`{class}`** - `CN` (Normal) atau `AD` (Alzheimer's)
- **`{filename}.png`** - Nama file gambar (format PNG)

### Contoh Path yang Valid:

```
assets/images/enhanced-images/axial/test/AD/002_S_1018_m06_axial_x110.png
assets/images/original-images/coronal/train/CN/100_S_0035_m06_coronal_y95.png
assets/images/enhanced-images/sagittal/val/AD/137_S_1041_m12_sagittal_z120.png
```

---

## 🔧 Setup Data Path - 3 Metode

### **Metode 1: Menggunakan File List yang Sudah Ada (Manual)**

Jika Anda sudah punya daftar path gambar, edit file:

**File:** `src/data/s3-actual-images.ts`

```typescript
// Ganti array S3_IMAGE_PATHS dengan path gambar Anda
export const S3_IMAGE_PATHS = [
  'assets/images/enhanced-images/axial/test/AD/image1.png',
  'assets/images/enhanced-images/axial/test/AD/image2.png',
  // ... tambahkan semua path gambar Anda di sini
];

// Update TOTAL_IMAGES sesuai jumlah gambar
export const TOTAL_IMAGES = 2; // Ganti dengan jumlah sebenarnya
```

**Keuntungan:**
- ✅ Kontrol penuh
- ✅ Tidak perlu AWS credentials
- ✅ Bisa menggunakan path lokal atau URL apapun

**Kekurangan:**
- ❌ Harus update manual setiap ada gambar baru
- ❌ File bisa jadi sangat besar jika gambar banyak

---

### **Metode 2: Generate dari AWS S3 (Otomatis)**

Jika gambar Anda sudah di AWS S3, gunakan script untuk generate list otomatis:

#### **Step 1: Setup AWS Credentials**

```bash
# Install AWS CLI jika belum ada
# https://aws.amazon.com/cli/

# Configure credentials
aws configure
# Masukkan: Access Key ID, Secret Access Key, Region (misal: ap-southeast-1)
```

#### **Step 2: List Semua File dari S3**

```bash
# List semua file PNG dari S3 bucket
aws s3 ls s3://<your-bucket-name>/assets/images/ --recursive | grep "\.png$" | awk '{print $4}' > /tmp/s3-images.txt

# Contoh dengan bucket yang sudah ada:
aws s3 ls s3://ad-public-storage-data-viewer-ap-southeast-1-836322468413/assets/images/ --recursive | grep "\.png$" | awk '{print $4}' > /tmp/s3-images.txt
```

#### **Step 3: Generate TypeScript File**

```bash
cd data-viewer
node scripts/generate-image-list.js
```

Script ini akan membaca `/tmp/s3-images.txt` dan generate `src/data/s3-actual-images.ts` secara otomatis.

**Keuntungan:**
- ✅ Otomatis, tidak perlu edit manual
- ✅ Selalu sync dengan S3 bucket
- ✅ Support banyak gambar (ribuan)

**Kekurangan:**
- ❌ Perlu AWS credentials
- ❌ Hanya untuk gambar di S3

---

### **Metode 3: Generate dari S3 menggunakan Node.js Script**

Script alternatif yang lebih lengkap:

#### **Step 1: Install Dependencies**

```bash
cd data-viewer
npm install aws-sdk  # Jika belum terinstall
```

#### **Step 2: Edit Script Configuration**

Edit `scripts/generate-s3-file-list.js`:

```javascript
const BUCKET_NAME = 'your-bucket-name';  // Ganti dengan bucket Anda
const REGION = 'ap-southeast-1';         // Ganti dengan region Anda
```

#### **Step 3: Run Script**

```bash
node scripts/generate-s3-file-list.js
```

Script ini akan:
1. Connect ke S3 bucket
2. List semua file PNG di folder `assets/images/`
3. Generate file `src/data/s3-images.json` (alternatif format)

**Note:** Script ini generate JSON, bukan TypeScript. Anda perlu convert ke format yang digunakan aplikasi.

---

## 🌐 Setup Base URL

Setelah path gambar sudah di-setup, konfigurasi base URL untuk mengakses gambar:

### **File:** `.env` (buat jika belum ada)

```bash
# Untuk CloudFront CDN (Recommended - lebih cepat)
VITE_IMAGE_BASE_URL=https://d2iiwoaj8v8tqz.cloudfront.net

# ATAU untuk S3 Direct (Fallback)
VITE_IMAGE_BASE_URL=https://ad-public-storage-data-viewer-ap-southeast-1-836322468413.s3.ap-southeast-1.amazonaws.com

# ATAU untuk local development (jika serve gambar lokal)
VITE_IMAGE_BASE_URL=http://localhost:8080
```

### **Cara Kerja:**

Aplikasi akan menggabungkan:
```
{IMAGE_BASE_URL} + "/" + {IMAGE_PATH}
```

**Contoh:**
- Base URL: `https://d2iiwoaj8v8tqz.cloudfront.net`
- Path: `assets/images/enhanced-images/axial/test/AD/image1.png`
- **Final URL:** `https://d2iiwoaj8v8tqz.cloudfront.net/assets/images/enhanced-images/axial/test/AD/image1.png`

---

## 📝 Contoh Lengkap Setup

### **Scenario: Anda punya gambar di folder lokal**

#### **Step 1: Upload ke S3**

```bash
# Upload semua gambar ke S3 dengan struktur yang benar
aws s3 sync ./local-images/ s3://your-bucket/assets/images/ --exclude "*" --include "*.png"
```

#### **Step 2: Generate Image List**

```bash
# List semua file
aws s3 ls s3://your-bucket/assets/images/ --recursive | grep "\.png$" | awk '{print $4}' > /tmp/s3-images.txt

# Generate TypeScript file
cd data-viewer
node scripts/generate-image-list.js
```

#### **Step 3: Setup Base URL**

Buat file `.env`:

```bash
VITE_IMAGE_BASE_URL=https://your-cloudfront-domain.cloudfront.net
```

#### **Step 4: Test**

```bash
npm run dev
```

Buka browser dan cek apakah gambar muncul!

---

## 🔍 Troubleshooting

### **Problem: Gambar tidak muncul**

**Checklist:**
1. ✅ Apakah `.env` file sudah dibuat dan `VITE_IMAGE_BASE_URL` sudah di-set?
2. ✅ Apakah path di `s3-actual-images.ts` sesuai dengan struktur yang diharapkan?
3. ✅ Apakah base URL + path menghasilkan URL yang valid?
4. ✅ Cek browser console untuk error (CORS, 404, dll)

### **Problem: CORS Error**

Jika menggunakan S3 langsung (bukan CloudFront), pastikan CORS sudah di-setup:

```bash
# Run script untuk setup CORS
./scripts/setup-s3-cors.sh
```

Atau manual di AWS Console:
- S3 Bucket → Permissions → CORS
- Tambahkan policy yang allow origin website Anda

### **Problem: Path tidak ter-parse dengan benar**

Pastikan struktur path sesuai format:
```
assets/images/{version}/{plane}/{subset}/{class}/{filename}.png
```

Jika path tidak sesuai, aplikasi akan menggunakan fallback parsing yang mungkin tidak akurat.

### **Problem: File terlalu besar**

Jika `s3-actual-images.ts` terlalu besar (>10MB), pertimbangkan:
- Split menjadi beberapa file
- Load dari API endpoint (perlu modifikasi code)
- Gunakan lazy loading (perlu modifikasi code)

---

## 🎯 Best Practices

1. **Gunakan CloudFront** untuk production (lebih cepat, global CDN)
2. **Struktur path konsisten** - pastikan semua gambar mengikuti format yang sama
3. **Naming convention** - gunakan nama file yang deskriptif
4. **Batch upload** - gunakan `aws s3 sync` untuk upload banyak file sekaligus
5. **Version control** - jangan commit `.env` file (sudah di `.gitignore`)
6. **Cache invalidation** - jika update gambar di CloudFront, invalidate cache jika perlu

---

## 📚 File-file Penting

- **`src/data/s3-actual-images.ts`** - Daftar semua path gambar (auto-generated atau manual)
- **`.env`** - Konfigurasi base URL (tidak di-commit)
- **`src/utils/imageDataUtils.ts`** - Logic untuk parsing dan filtering gambar
- **`scripts/generate-image-list.js`** - Script untuk generate image list dari S3
- **`scripts/generate-s3-file-list.js`** - Script alternatif menggunakan AWS SDK

---

## 🚀 Quick Start (TL;DR)

### **Untuk S3/CloudFront:**

```bash
# 1. Upload gambar ke S3 dengan struktur yang benar
aws s3 sync ./images/ s3://your-bucket/assets/images/

# 2. Generate image list
aws s3 ls s3://your-bucket/assets/images/ --recursive | grep "\.png$" | awk '{print $4}' > /tmp/s3-images.txt
cd data-viewer && node scripts/generate-image-list.js

# 3. Setup base URL
echo "VITE_IMAGE_BASE_URL=https://your-cloudfront.net" > .env

# 4. Run aplikasi
npm run dev
```

### **Untuk Local Images dari Project Directory Lain:**

```bash
# 1. Generate image list dari folder lokal
cd data-viewer
node scripts/setup-local-images.js ../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets

# 2. Start HTTP server untuk serve gambar (terminal baru)
node scripts/start-image-server.js ../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets

# 3. Run aplikasi
npm run dev
```

**Lihat `docs/LOCAL-PATH-SETUP.md` untuk detail lengkap.**

---

## 💡 Tips Tambahan

- **Development:** Bisa menggunakan local server untuk serve gambar (misal: `http-server`)
- **Testing:** Test dengan beberapa gambar dulu sebelum upload semua
- **Performance:** Jika gambar banyak (>1000), pertimbangkan pagination atau lazy loading
- **Metadata:** Pastikan filename mengandung informasi yang berguna untuk filtering

