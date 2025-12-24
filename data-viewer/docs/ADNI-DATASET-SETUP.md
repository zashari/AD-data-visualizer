# Setup ADNI Dataset - Quick Guide

## 📁 Dataset Paths

- **Enhanced**: `D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets\ADNI_1_5_T\8_enhanced`
- **Original**: `D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets\ADNI_1_5_T\7_cropped`

## 🚀 Quick Setup (3 Langkah)

### **Step 1: Generate Image List**

```bash
cd data-viewer
node scripts/setup-adni-dataset.js
```

Script ini akan:
- ✅ Scan semua gambar dari kedua folder (enhanced & original)
- ✅ Generate `src/data/local-images.ts` dengan semua path
- ✅ Update `.env` dengan konfigurasi yang benar

### **Step 2: Start HTTP Server**

**Opsi A: Serve dari parent folder (Recommended - Lebih Simple)**

```bash
cd D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets\ADNI_1_5_T
http-server -p 8080 --cors
```

**Opsi B: Serve kedua folder terpisah (Port berbeda)**

```bash
# Terminal 1: Enhanced images
cd D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets\ADNI_1_5_T\8_enhanced
http-server -p 8080 --cors

# Terminal 2: Original images  
cd D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets\ADNI_1_5_T\7_cropped
http-server -p 8081 --cors
```

**Note:** Jika menggunakan Opsi B, perlu setup proxy di `vite.config.ts` (lihat bagian Advanced Setup).

### **Step 3: Update Code untuk Menggunakan Local Images**

Copy isi dari `docs/EXAMPLE-LOCAL-IMAGE-UTILS.ts` ke `src/utils/imageDataUtils.ts`, atau merge dengan code yang sudah ada.

**Atau modify `imageDataUtils.ts` secara manual:**

```typescript
// Tambahkan import di bagian atas
import { LOCAL_IMAGE_PATHS, parseLocalImagePath, TOTAL_LOCAL_IMAGES } from '../data/local-images';

// Modify getImageBaseUrl untuk support local
const getImageBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_IMAGE_BASE_URL;
  
  // Support untuk local development
  if (envUrl === 'local' || envUrl?.startsWith('http://localhost')) {
    return envUrl || 'http://localhost:8080';
  }
  
  // ... rest of code
};

// Modify untuk menggunakan LOCAL_IMAGE_PATHS jika VITE_USE_LOCAL_IMAGES=true
const USE_LOCAL_IMAGES = import.meta.env.VITE_USE_LOCAL_IMAGES === 'true' || IMAGE_BASE_URL.includes('localhost');

if (USE_LOCAL_IMAGES) {
  LOCAL_IMAGE_PATHS.forEach(path => {
    const url = `${IMAGE_BASE_URL}/${path}`;
    allImages[path] = url;
  });
} else {
  // Use S3 images (default)
  S3_IMAGE_PATHS.forEach(path => {
    const url = `${IMAGE_BASE_URL}/${path}`;
    allImages[path] = url;
  });
}
```

### **Step 4: Run Aplikasi**

```bash
npm run dev
```

---

## 🔧 Advanced Setup: Proxy untuk Dual Server

Jika Anda menggunakan **Opsi B** (dua server terpisah), perlu setup proxy di Vite:

### **Update `vite.config.ts`:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/enhanced-images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/enhanced-images/, '')
      },
      '/original-images': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/original-images/, '')
      }
    }
  }
})
```

**Tapi ini lebih kompleks. Lebih baik gunakan Opsi A (satu server dari parent folder).**

---

## 📝 Struktur Path yang Dihasilkan

Script akan generate path dengan format (sesuai dengan struktur folder yang di-serve):

```
8_enhanced/{plane}/{subset}/{class}/{filename}.png
7_cropped/{plane}/{subset}/{class}/{filename}.png
```

**Contoh:**
- `8_enhanced/axial/test/AD/002_S_1018_m06_axial_x116.png`
- `7_cropped/coronal/train/CN/100_S_0035_m06_coronal_y95.png`

**Base URL:** `http://localhost:8080`

**Final URL:**
- `http://localhost:8080/8_enhanced/axial/test/AD/002_S_1018_m06_axial_x116.png`
- `http://localhost:8080/7_cropped/coronal/train/CN/100_S_0035_m06_coronal_y95.png`

**Note:** Script akan otomatis parse folder name (`8_enhanced` = `enhanced-images`, `7_cropped` = `original-images`) untuk metadata filtering.

---

## ✅ Checklist

- [ ] Run `node scripts/setup-adni-dataset.js`
- [ ] Start HTTP server (Opsi A atau B)
- [ ] Update `src/utils/imageDataUtils.ts` untuk menggunakan local images
- [ ] Check `.env` file sudah berisi:
  ```
  VITE_IMAGE_BASE_URL=http://localhost:8080
  VITE_USE_LOCAL_IMAGES=true
  ```
- [ ] Run `npm run dev`
- [ ] Test aplikasi di browser

---

## 🔍 Troubleshooting

### **Problem: Gambar tidak muncul**

1. **Cek HTTP server running:**
   ```bash
   # Test di browser
   http://localhost:8080/enhanced-images/axial/test/AD/002_S_1018_m06_axial_x116.png
   ```

2. **Cek .env file:**
   ```bash
   cat .env
   # Should show:
   # VITE_IMAGE_BASE_URL=http://localhost:8080
   # VITE_USE_LOCAL_IMAGES=true
   ```

3. **Cek browser console** untuk error CORS atau 404

4. **Restart dev server** setelah update .env:
   ```bash
   # Stop dengan Ctrl+C, lalu:
   npm run dev
   ```

### **Problem: CORS Error**

Pastikan HTTP server menggunakan flag `--cors`:
```bash
http-server -p 8080 --cors
```

### **Problem: Path tidak ter-parse**

Cek struktur path di `src/data/local-images.ts`. Pastikan format:
```
enhanced-images/{plane}/{subset}/{class}/{filename}.png
```

---

## 💡 Tips

1. **Untuk development:** Gunakan Opsi A (satu server dari parent folder) - lebih simple
2. **Untuk testing:** Test URL langsung di browser sebelum run aplikasi
3. **Performance:** Jika gambar banyak, pertimbangkan menggunakan CloudFront untuk production
4. **Hot reload:** HTTP server akan auto-reload jika file berubah

---

## 📚 Related Files

- `scripts/setup-adni-dataset.js` - Script untuk generate image list
- `scripts/start-adni-image-server.js` - Script untuk start HTTP servers
- `docs/EXAMPLE-LOCAL-IMAGE-UTILS.ts` - Contoh code untuk modify imageDataUtils.ts
- `docs/LOCAL-PATH-SETUP.md` - Panduan lengkap untuk local images

