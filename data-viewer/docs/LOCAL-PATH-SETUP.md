# Setup Path Images dari Project Directory Lain

## 🎯 Overview

Aplikasi ini bisa menggunakan gambar dari project directory lain di workspace Anda. Ada beberapa cara untuk melakukan ini.

---

## ✅ Solusi 1: Menggunakan Local HTTP Server (Paling Mudah)

Cara termudah adalah menggunakan local HTTP server untuk serve gambar dari directory lain.

### **Step 1: Install HTTP Server**

```bash
# Install http-server secara global
npm install -g http-server

# ATAU install lokal di project
cd data-viewer
npm install --save-dev http-server
```

### **Step 2: Serve Gambar dari Directory Lain**

Buka terminal baru dan jalankan:

```bash
# Contoh: serve gambar dari alzheimer-disease project
cd D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets
http-server -p 8080 --cors

# ATAU jika gambar ada di folder lain
cd D:\path\to\your\images
http-server -p 8080 --cors
```

**Note:** Flag `--cors` penting untuk mengatasi CORS error.

### **Step 3: Setup Base URL di .env**

Buat/update file `.env` di `data-viewer`:

```bash
VITE_IMAGE_BASE_URL=http://localhost:8080
```

### **Step 4: Update Image Paths**

Edit `src/data/s3-actual-images.ts` dan sesuaikan path dengan struktur folder yang di-serve:

```typescript
export const S3_IMAGE_PATHS = [
  // Sesuaikan dengan struktur folder yang di-serve
  'path/to/image1.png',
  'path/to/image2.png',
  // ...
];
```

**Keuntungan:**
- ✅ Tidak perlu modify code
- ✅ Bisa serve dari folder manapun
- ✅ Support hot reload
- ✅ CORS sudah di-handle

**Kekurangan:**
- ❌ Perlu run server terpisah
- ❌ Hanya untuk development

---

## ✅ Solusi 2: Menggunakan Vite Static File Serving (Recommended untuk Development)

Vite bisa serve static files dari directory lain menggunakan alias dan static file serving.

### **Step 1: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow serving files from outside project root
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      '@external-images': path.resolve(__dirname, '../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets')
    }
  },
  // Serve static files from external directory
  publicDir: false, // Disable default public dir
  // Add custom middleware to serve external images
  configureServer(server) {
    server.middlewares.use('/external-images', (req, res, next) => {
      const filePath = path.join(
        __dirname,
        '../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets',
        req.url || ''
      )
      // Serve file using Vite's static middleware
      server.ssrLoadModule(filePath).catch(next)
    })
  }
})
```

**Tapi cara ini agak kompleks. Lebih baik gunakan Solusi 3.**

---

## ✅ Solusi 3: Symlink ke Public Folder (Simple & Efektif)

Buat symlink dari folder gambar ke `public` folder di data-viewer.

### **Windows (PowerShell as Administrator):**

```powershell
cd D:\workspace\@zaky-ashari\playgrounds\AD-data-visualizer\data-viewer\public

# Buat symlink ke folder gambar
New-Item -ItemType SymbolicLink -Path "images" -Target "D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets"
```

### **Linux/Mac:**

```bash
cd data-viewer/public
ln -s ../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets images
```

### **Setup Base URL:**

```bash
# .env
VITE_IMAGE_BASE_URL=/images
```

### **Update Image Paths:**

```typescript
// src/data/s3-actual-images.ts
export const S3_IMAGE_PATHS = [
  'images/path/to/image1.png',
  'images/path/to/image2.png',
  // ...
];
```

**Keuntungan:**
- ✅ Simple, tidak perlu server terpisah
- ✅ Gambar langsung accessible via Vite dev server
- ✅ Tidak perlu copy file

**Kekurangan:**
- ❌ Perlu symlink (tidak semua OS support dengan baik)
- ❌ Path harus relatif dari public folder

---

## ✅ Solusi 4: Copy Gambar ke Public Folder (Paling Simple)

Copy folder gambar ke `public` folder di data-viewer.

### **Windows:**

```powershell
# Copy folder gambar ke public
Copy-Item -Path "D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets" -Destination "D:\workspace\@zaky-ashari\playgrounds\AD-data-visualizer\data-viewer\public\images" -Recurse
```

### **Linux/Mac:**

```bash
cp -r ../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets public/images
```

### **Setup Base URL:**

```bash
# .env
VITE_IMAGE_BASE_URL=/images
```

**Keuntungan:**
- ✅ Paling simple, tidak perlu setup apapun
- ✅ Langsung work dengan Vite

**Kekurangan:**
- ❌ Duplikasi file (makan space)
- ❌ Perlu sync manual jika gambar update

---

## ✅ Solusi 5: Modify Code untuk Support Absolute Paths (Advanced)

Modify code untuk support path absolut dari filesystem (hanya untuk development).

### **Step 1: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readdirSync, statSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin untuk serve external images
    {
      name: 'external-images',
      configureServer(server) {
        server.middlewares.use('/external-images', (req, res, next) => {
          const imagePath = path.join(
            'D:/workspace/@zaky-ashari/playgrounds/alzheimer-disease/CODE_alzheimer-desease-classification/datasets',
            req.url || ''
          )
          
          // Check if file exists
          if (statSync(imagePath).isFile()) {
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Access-Control-Allow-Origin', '*')
            const fs = require('fs')
            const file = fs.readFileSync(imagePath)
            res.end(file)
          } else {
            next()
          }
        })
      }
    }
  ],
  server: {
    fs: {
      allow: ['..']
    }
  }
})
```

### **Step 2: Update imageDataUtils.ts**

```typescript
// Support untuk local development dengan path absolut
const getImageBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_IMAGE_BASE_URL;
  
  // Jika menggunakan local path, return empty string
  if (envUrl?.startsWith('/external-images') || envUrl === 'local') {
    return '';
  }
  
  if (!envUrl) {
    console.error('VITE_IMAGE_BASE_URL environment variable is not set.');
    throw new Error('Image base URL is not configured.');
  }
  
  return envUrl;
};
```

**Keuntungan:**
- ✅ Fleksibel, bisa dari folder manapun
- ✅ Tidak perlu copy atau symlink

**Kekurangan:**
- ❌ Perlu modify code
- ❌ Hanya untuk development (tidak work di production)

---

## 🎯 Rekomendasi

### **Untuk Development:**
- **Gunakan Solusi 1 (HTTP Server)** - Paling mudah dan fleksibel
- Atau **Solusi 3 (Symlink)** - Jika symlink support di OS Anda

### **Untuk Production:**
- Upload gambar ke S3/CloudFront seperti setup original
- Atau copy ke public folder dan deploy bersama aplikasi

---

## 📝 Contoh Lengkap: Menggunakan Gambar dari alzheimer-disease Project

### **Metode: HTTP Server (Paling Mudah)**

```bash
# Terminal 1: Serve gambar
cd D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets
http-server -p 8080 --cors

# Terminal 2: Setup .env
cd D:\workspace\@zaky-ashari\playgrounds\AD-data-visualizer\data-viewer
echo "VITE_IMAGE_BASE_URL=http://localhost:8080" > .env

# Terminal 2: Update image paths di s3-actual-images.ts
# Sesuaikan path dengan struktur folder yang di-serve
# Contoh: jika folder structure adalah:
# datasets/
#   enhanced-images/
#     axial/
#       test/
#         AD/
#           image1.png

# Maka path di s3-actual-images.ts:
export const S3_IMAGE_PATHS = [
  'enhanced-images/axial/test/AD/image1.png',
  // ...
];

# Terminal 2: Run aplikasi
npm run dev
```

---

## 🔍 Troubleshooting

### **CORS Error:**
- Pastikan HTTP server menggunakan flag `--cors`
- Atau gunakan symlink/copy ke public folder

### **404 Not Found:**
- Cek path di `s3-actual-images.ts` sesuai dengan struktur folder
- Cek base URL di `.env` sudah benar
- Test URL langsung di browser: `http://localhost:8080/path/to/image.png`

### **Path tidak ter-parse:**
- Pastikan struktur path mengikuti format yang diharapkan:
  ```
  {version}/{plane}/{subset}/{class}/{filename}.png
  ```
- Atau modify `parseS3Path` function di `s3-actual-images.ts` untuk support struktur custom

---

## 💡 Tips

1. **Gunakan script untuk generate path list:**
   ```bash
   # Generate list semua PNG files dari folder
   find D:/path/to/images -name "*.png" -type f > image-list.txt
   ```

2. **Batch update paths:**
   - Buat script untuk convert absolute paths ke relative paths
   - Atau modify `generate-image-list.js` untuk support local paths

3. **Development vs Production:**
   - Development: Gunakan local HTTP server atau symlink
   - Production: Upload ke S3/CloudFront atau bundle dengan aplikasi

