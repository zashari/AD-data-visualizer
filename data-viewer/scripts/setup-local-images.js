#!/usr/bin/env node

/**
 * Script untuk setup gambar dari project directory lain
 * Usage: node scripts/setup-local-images.js <path-to-images-folder>
 * 
 * Contoh:
 * node scripts/setup-local-images.js ../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesPath = process.argv[2];

if (!imagesPath) {
  console.error('❌ Error: Path ke folder gambar tidak diberikan');
  console.log('\nUsage:');
  console.log('  node scripts/setup-local-images.js <path-to-images-folder>');
  console.log('\nContoh:');
  console.log('  node scripts/setup-local-images.js ../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets');
  console.log('  node scripts/setup-local-images.js D:/workspace/@zaky-ashari/playgrounds/alzheimer-disease/CODE_alzheimer-desease-classification/datasets');
  process.exit(1);
}

const absoluteImagesPath = path.isAbsolute(imagesPath) 
  ? imagesPath 
  : path.resolve(__dirname, '..', imagesPath);

if (!fs.existsSync(absoluteImagesPath)) {
  console.error(`❌ Error: Folder tidak ditemukan: ${absoluteImagesPath}`);
  process.exit(1);
}

console.log(`📁 Menggunakan gambar dari: ${absoluteImagesPath}`);

// Generate list semua PNG files
console.log('\n🔍 Mencari semua file PNG...');
const imageFiles = [];

function findPNGFiles(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      findPNGFiles(fullPath, relativePath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      imageFiles.push(relativePath.replace(/\\/g, '/')); // Normalize path separators
    }
  }
}

findPNGFiles(absoluteImagesPath);
console.log(`✅ Ditemukan ${imageFiles.length} file PNG`);

if (imageFiles.length === 0) {
  console.error('❌ Tidak ada file PNG ditemukan!');
  process.exit(1);
}

// Generate image list file
const outputPath = path.join(__dirname, '..', 'src', 'data', 'local-images.ts');
const dataDir = path.dirname(outputPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Parse paths untuk extract metadata
function parseImagePath(imagePath) {
  const parts = imagePath.split('/');
  const filename = parts[parts.length - 1];
  
  // Try to parse structured path: version/plane/subset/class/filename.png
  if (parts.length >= 5) {
    const version = parts[0].includes('original') ? 'original-images' : 
                    parts[0].includes('enhanced') ? 'enhanced-images' : null;
    const plane = ['axial', 'coronal', 'sagittal'].find(p => parts.some(part => part.includes(p))) || 'axial';
    const subset = ['train', 'test', 'val'].find(s => parts.some(part => part.includes(s))) || 'train';
    const classType = parts.find(p => p === 'AD' || p === 'CN') || 'CN';
    
    if (version) {
      return {
        path: imagePath,
        version,
        plane,
        subset,
        class: classType,
        filename: filename.replace('.png', '')
      };
    }
  }
  
  // Fallback: use filename and default values
  return {
    path: imagePath,
    version: 'enhanced-images',
    plane: 'axial',
    subset: 'train',
    class: 'CN',
    filename: filename.replace('.png', '')
  };
}

const parsedImages = imageFiles.map(parseImagePath);

// Generate TypeScript file
const tsContent = `// Auto-generated list of local images
// Generated on: ${new Date().toISOString()}
// Source: ${absoluteImagesPath}

export const LOCAL_IMAGE_PATHS = [
${parsedImages.map(img => `  '${img.path}'`).join(',\n')}
];

export const TOTAL_LOCAL_IMAGES = ${parsedImages.length};

// Helper function to parse image path to metadata
export function parseLocalImagePath(imagePath: string) {
  const parts = imagePath.split('/');
  const filename = parts[parts.length - 1];
  
  // Try to parse structured path
  const version = parts.some(p => p.includes('original')) ? 'original-images' : 
                  parts.some(p => p.includes('enhanced')) ? 'enhanced-images' : 'enhanced-images';
  const plane = parts.find(p => ['axial', 'coronal', 'sagittal'].includes(p)) || 'axial';
  const subset = parts.find(p => ['train', 'test', 'val'].includes(p)) || 'train';
  const classType = parts.find(p => p === 'AD' || p === 'CN') || 'CN';
  
  return {
    version: version as 'original-images' | 'enhanced-images',
    plane: plane as 'axial' | 'coronal' | 'sagittal',
    subset: subset as 'train' | 'test' | 'val',
    class: classType as 'CN' | 'AD',
    filename: filename.replace('.png', ''),
    fullPath: imagePath
  };
}
`;

fs.writeFileSync(outputPath, tsContent);
console.log(`✅ Generated: ${outputPath}`);

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

// Update or add VITE_IMAGE_BASE_URL
if (envContent.includes('VITE_IMAGE_BASE_URL')) {
  envContent = envContent.replace(
    /VITE_IMAGE_BASE_URL=.*/g,
    'VITE_IMAGE_BASE_URL=http://localhost:8080'
  );
} else {
  envContent += '\nVITE_IMAGE_BASE_URL=http://localhost:8080\n';
}

fs.writeFileSync(envPath, envContent);
console.log(`✅ Updated: ${envPath}`);

console.log('\n📋 Next Steps:');
console.log('1. Start HTTP server untuk serve gambar:');
console.log(`   cd "${absoluteImagesPath}"`);
console.log('   http-server -p 8080 --cors');
console.log('\n2. Update src/utils/imageDataUtils.ts untuk menggunakan LOCAL_IMAGE_PATHS');
console.log('   (Lihat contoh di docs/LOCAL-PATH-SETUP.md)');
console.log('\n3. Start aplikasi:');
console.log('   npm run dev');

