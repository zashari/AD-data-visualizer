#!/usr/bin/env node

/**
 * Script khusus untuk setup dataset ADNI dari path yang diberikan
 * Enhanced: D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets\ADNI_1_5_T\8_enhanced
 * Original: D:\workspace\@zaky-ashari\playgrounds\alzheimer-disease\CODE_alzheimer-desease-classification\datasets\ADNI_1_5_T\7_cropped
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if images are in project directory first (faster)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PROJECT_IMAGES_BASE = path.join(PROJECT_ROOT, 'public', 'images');
const PROJECT_ENHANCED = path.join(PROJECT_IMAGES_BASE, '8_enhanced');
const PROJECT_ORIGINAL = path.join(PROJECT_IMAGES_BASE, '7_cropped');

// Fallback to external directory
const EXTERNAL_BASE = path.resolve(__dirname, '../../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets/ADNI_1_5_T');
const EXTERNAL_ENHANCED = path.join(EXTERNAL_BASE, '8_enhanced');
const EXTERNAL_ORIGINAL = path.join(EXTERNAL_BASE, '7_cropped');

// Determine which path to use (prefer project directory)
let ENHANCED_PATH, ORIGINAL_PATH, BASE_PATH;

if (fs.existsSync(PROJECT_ENHANCED) && fs.existsSync(PROJECT_ORIGINAL)) {
  console.log('✅ Found images in project directory (faster!)');
  ENHANCED_PATH = PROJECT_ENHANCED;
  ORIGINAL_PATH = PROJECT_ORIGINAL;
  BASE_PATH = PROJECT_IMAGES_BASE;
} else if (fs.existsSync(EXTERNAL_ENHANCED) && fs.existsSync(EXTERNAL_ORIGINAL)) {
  console.log('⚠️  Using external directory (slower, consider copying to project)');
  console.log('   Run: npm run copy-images-to-project');
  ENHANCED_PATH = EXTERNAL_ENHANCED;
  ORIGINAL_PATH = EXTERNAL_ORIGINAL;
  BASE_PATH = EXTERNAL_BASE;
} else {
  console.error('❌ Error: Image folders tidak ditemukan!');
  console.error(`   Checked project: ${PROJECT_ENHANCED}`);
  console.error(`   Checked external: ${EXTERNAL_ENHANCED}`);
  process.exit(1);
}

console.log('📁 Scanning dataset folders...');
console.log(`   Enhanced: ${ENHANCED_PATH}`);
console.log(`   Original: ${ORIGINAL_PATH}\n`);

// Function to find all PNG files and preserve structure
// Path format: {version}/{plane}/{subset}/{class}/{filename}.png
function findPNGFiles(basePath, versionPrefix) {
  const imageFiles = [];
  
  function scanDir(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const newRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        scanDir(fullPath, newRelativePath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
        // Path format: {version}/{plane}/{subset}/{class}/{filename}.png
        const finalPath = `${versionPrefix}/${newRelativePath}`;
        imageFiles.push(finalPath.replace(/\\/g, '/')); // Normalize path separators
      }
    }
  }
  
  scanDir(basePath);
  return imageFiles;
}

// Scan both folders
// Note: Path harus sesuai dengan struktur yang di-serve oleh HTTP server
// Jika serve dari ADNI_1_5_T, path harus: 8_enhanced/{plane}/... atau 7_cropped/{plane}/...
console.log('🔍 Scanning enhanced images...');
const enhancedImages = findPNGFiles(ENHANCED_PATH, '8_enhanced');
console.log(`   Found ${enhancedImages.length} enhanced images`);

console.log('🔍 Scanning original images...');
const originalImages = findPNGFiles(ORIGINAL_PATH, '7_cropped');
console.log(`   Found ${originalImages.length} original images`);

const allImages = [...enhancedImages, ...originalImages];
console.log(`\n✅ Total images: ${allImages.length}`);

if (allImages.length === 0) {
  console.error('❌ Tidak ada file PNG ditemukan!');
  process.exit(1);
}

// Parse paths untuk extract metadata
function parseImagePath(imagePath) {
  // Format: 8_enhanced/{plane}/{subset}/{class}/{filename}.png
  // Format: 7_cropped/{plane}/{subset}/{class}/{filename}.png
  const parts = imagePath.split('/');
  
  if (parts.length >= 5) {
    const folderName = parts[0]; // 8_enhanced or 7_cropped
    const version = folderName === '8_enhanced' ? 'enhanced-images' : 'original-images';
    const plane = parts[1]; // axial, coronal, sagittal
    const subset = parts[2]; // train, test, val
    const classType = parts[3]; // AD, CN
    const filename = parts[4].replace('.png', '');
    
    return {
      path: imagePath,
      version,
      plane,
      subset,
      class: classType,
      filename
    };
  }
  
  // Fallback
  const filename = parts[parts.length - 1].replace('.png', '');
  return {
    path: imagePath,
    version: 'enhanced-images',
    plane: 'axial',
    subset: 'train',
    class: 'CN',
    filename
  };
}

const parsedImages = allImages.map(parseImagePath);

// Generate TypeScript file
const outputPath = path.join(__dirname, '..', 'src', 'data', 'local-images.ts');
const dataDir = path.dirname(outputPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const tsContent = `// Auto-generated list of local ADNI dataset images
// Generated on: ${new Date().toISOString()}
// Enhanced: ${ENHANCED_PATH}
// Original: ${ORIGINAL_PATH}

export const LOCAL_IMAGE_PATHS = [
${parsedImages.map(img => `  '${img.path}'`).join(',\n')}
];

export const TOTAL_LOCAL_IMAGES = ${parsedImages.length};

// Helper function to parse image path to metadata
export function parseLocalImagePath(imagePath: string) {
  const parts = imagePath.split('/');
  
  if (parts.length >= 5) {
    const folderName = parts[0]; // 8_enhanced or 7_cropped
    const version = folderName === '8_enhanced' ? 'enhanced-images' : 'original-images';
    const plane = parts[1] as 'axial' | 'coronal' | 'sagittal';
    const subset = parts[2] as 'train' | 'test' | 'val';
    const classType = parts[3] as 'CN' | 'AD';
    const filename = parts[4].replace('.png', '');
    
    return {
      version: version as 'original-images' | 'enhanced-images',
      plane,
      subset,
      class: classType,
      filename,
      fullPath: imagePath
    };
  }
  
  // Fallback
  const filename = parts[parts.length - 1].replace('.png', '');
  return {
    version: 'enhanced-images' as 'original-images' | 'enhanced-images',
    plane: 'axial' as 'axial' | 'coronal' | 'sagittal',
    subset: 'train' as 'train' | 'test' | 'val',
    class: 'CN' as 'CN' | 'AD',
    filename,
    fullPath: imagePath
  };
}
`;

fs.writeFileSync(outputPath, tsContent);
console.log(`✅ Generated: ${outputPath}`);

// Update .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

// Update or add VITE_IMAGE_BASE_URL
// Use /images if images are in project, otherwise use http://localhost:8080
const imageBaseUrl = BASE_PATH === PROJECT_IMAGES_BASE 
  ? '/images'  // Vite public folder (faster)
  : 'http://localhost:8080';  // External HTTP server

if (envContent.includes('VITE_IMAGE_BASE_URL')) {
  envContent = envContent.replace(
    /VITE_IMAGE_BASE_URL=.*/g,
    `VITE_IMAGE_BASE_URL=${imageBaseUrl}`
  );
} else {
  envContent += `\nVITE_IMAGE_BASE_URL=${imageBaseUrl}\n`;
}

// Add flag untuk use local images
if (!envContent.includes('VITE_USE_LOCAL_IMAGES')) {
  envContent += 'VITE_USE_LOCAL_IMAGES=true\n';
} else {
  envContent = envContent.replace(
    /VITE_USE_LOCAL_IMAGES=.*/g,
    'VITE_USE_LOCAL_IMAGES=true'
  );
}

fs.writeFileSync(envPath, envContent);
console.log(`✅ Updated: ${envPath}`);

console.log('\n📊 Summary:');
console.log(`   Enhanced images: ${enhancedImages.length}`);
console.log(`   Original images: ${originalImages.length}`);
console.log(`   Total: ${allImages.length}`);

console.log('\n📋 Next Steps:');
if (BASE_PATH === PROJECT_IMAGES_BASE) {
  console.log('✅ Images sudah di project directory - langsung start aplikasi:');
  console.log('   npm run dev');
  console.log('\n   Images akan di-serve langsung oleh Vite (lebih cepat!)');
} else {
  console.log('1. Copy images ke project directory untuk performa lebih baik:');
  console.log('   npm run copy-images-to-project');
  console.log('\n   ATAU start HTTP server untuk serve gambar dari external folder:');
  console.log(`   cd "${BASE_PATH}"`);
  console.log('   http-server -p 8080 --cors');
  console.log('\n   Install http-server jika belum ada:');
  console.log('   npm install -g http-server');
  console.log('\n2. Start aplikasi:');
  console.log('   npm run dev');
}

