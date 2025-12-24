#!/usr/bin/env node

/**
 * Script untuk copy images dari directory eksternal ke project directory
 * Ini akan mempercepat loading karena images berada di dalam project
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path source (dari directory eksternal)
const SOURCE_BASE = 'D:\\workspace\\@zaky-ashari\\playgrounds\\alzheimer-disease\\CODE_alzheimer-desease-classification\\datasets\\ADNI_1_5_T';
const SOURCE_ENHANCED = path.join(SOURCE_BASE, '8_enhanced');
const SOURCE_ORIGINAL = path.join(SOURCE_BASE, '7_cropped');

// Path destination (di dalam project)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEST_BASE = path.join(PROJECT_ROOT, 'public', 'images');
const DEST_ENHANCED = path.join(DEST_BASE, '8_enhanced');
const DEST_ORIGINAL = path.join(DEST_BASE, '7_cropped');

console.log('📁 Copy Images to Project Directory\n');
console.log('Source:');
console.log(`  Enhanced: ${SOURCE_ENHANCED}`);
console.log(`  Original: ${SOURCE_ORIGINAL}\n`);
console.log('Destination:');
console.log(`  Enhanced: ${DEST_ENHANCED}`);
console.log(`  Original: ${DEST_ORIGINAL}\n`);

// Check if source exists
if (!fs.existsSync(SOURCE_ENHANCED)) {
  console.error(`❌ Error: Source enhanced folder tidak ditemukan: ${SOURCE_ENHANCED}`);
  process.exit(1);
}

if (!fs.existsSync(SOURCE_ORIGINAL)) {
  console.error(`❌ Error: Source original folder tidak ditemukan: ${SOURCE_ORIGINAL}`);
  process.exit(1);
}

// Create destination directories
if (!fs.existsSync(DEST_BASE)) {
  fs.mkdirSync(DEST_BASE, { recursive: true });
  console.log(`✅ Created directory: ${DEST_BASE}`);
}

// Function to copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let copiedFiles = 0;
  let skippedFiles = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      const result = copyDirectory(srcPath, destPath);
      copiedFiles += result.copied;
      skippedFiles += result.skipped;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      // Check if file already exists and has same size
      if (fs.existsSync(destPath)) {
        const srcStat = fs.statSync(srcPath);
        const destStat = fs.statSync(destPath);
        if (srcStat.size === destStat.size) {
          skippedFiles++;
          continue;
        }
      }

      // Copy file
      fs.copyFileSync(srcPath, destPath);
      copiedFiles++;
      
      // Progress indicator
      if (copiedFiles % 100 === 0) {
        process.stdout.write(`\r  Copied ${copiedFiles} files...`);
      }
    }
  }

  return { copied: copiedFiles, skipped: skippedFiles };
}

// Copy enhanced images
console.log('📋 Copying enhanced images...');
const enhancedResult = copyDirectory(SOURCE_ENHANCED, DEST_ENHANCED);
console.log(`\r✅ Enhanced: ${enhancedResult.copied} copied, ${enhancedResult.skipped} skipped`);

// Copy original images
console.log('📋 Copying original images...');
const originalResult = copyDirectory(SOURCE_ORIGINAL, DEST_ORIGINAL);
console.log(`\r✅ Original: ${originalResult.copied} copied, ${originalResult.skipped} skipped`);

const totalCopied = enhancedResult.copied + originalResult.copied;
const totalSkipped = enhancedResult.skipped + originalResult.skipped;

console.log(`\n📊 Summary:`);
console.log(`   Total copied: ${totalCopied} files`);
console.log(`   Total skipped: ${totalSkipped} files (already exist)`);
console.log(`   Total: ${totalCopied + totalSkipped} files`);

// Update setup script to use local images
console.log('\n📝 Updating setup script...');
const setupScriptPath = path.join(__dirname, 'setup-adni-dataset.js');
if (fs.existsSync(setupScriptPath)) {
  let setupContent = fs.readFileSync(setupScriptPath, 'utf-8');
  
  // Update paths to use local project directory
  const newBasePath = path.join(PROJECT_ROOT, 'public', 'images').replace(/\\/g, '/');
  const newEnhancedPath = path.join(newBasePath, '8_enhanced').replace(/\\/g, '/');
  const newOriginalPath = path.join(newBasePath, '7_cropped').replace(/\\/g, '/');
  
  // Update BASE_PATH in setup script
  setupContent = setupContent.replace(
    /const BASE_PATH = .*;/,
    `const BASE_PATH = path.resolve(__dirname, '..', 'public', 'images');`
  );
  
  fs.writeFileSync(setupScriptPath, setupContent);
  console.log(`✅ Updated: ${setupScriptPath}`);
}

// Update .env to use local images from public folder
console.log('\n📝 Updating .env file...');
const envPath = path.join(PROJECT_ROOT, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
} else {
  envContent = '';
}

// Update VITE_IMAGE_BASE_URL to use Vite's public folder (relative path)
// Vite serves public folder at root, so /images/... will work
if (envContent.includes('VITE_IMAGE_BASE_URL')) {
  envContent = envContent.replace(
    /VITE_IMAGE_BASE_URL=.*/g,
    'VITE_IMAGE_BASE_URL=/images'
  );
} else {
  envContent += '\nVITE_IMAGE_BASE_URL=/images\n';
}

// Ensure USE_LOCAL_IMAGES is true
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

console.log('\n✅ Setup Complete!\n');
console.log('📋 Next Steps:');
console.log('1. Regenerate image list:');
console.log('   npm run setup-adni-dataset');
console.log('\n2. Start dev server (no need for separate HTTP server):');
console.log('   npm run dev');
console.log('\n3. Images akan di-serve langsung dari Vite dev server (lebih cepat!)');
console.log('   URL: http://localhost:8000/images/8_enhanced/...');

