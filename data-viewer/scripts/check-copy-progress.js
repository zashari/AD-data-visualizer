#!/usr/bin/env node

/**
 * Script untuk check progress copy images
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEST_ENHANCED = path.join(PROJECT_ROOT, 'public', 'images', '8_enhanced');
const DEST_ORIGINAL = path.join(PROJECT_ROOT, 'public', 'images', '7_cropped');

function countPNGFiles(dir) {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countPNGFiles(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      count++;
    }
  }
  
  return count;
}

const enhancedCount = countPNGFiles(DEST_ENHANCED);
const originalCount = countPNGFiles(DEST_ORIGINAL);
const totalCount = enhancedCount + originalCount;

// Estimated total (from previous runs)
const estimatedTotal = 5904;

console.log('\n📊 Copy Progress:\n');
console.log(`   Enhanced images: ${enhancedCount} files`);
console.log(`   Original images:  ${originalCount} files`);
console.log(`   Total copied:     ${totalCount} files`);
console.log(`   Estimated total:  ~${estimatedTotal} files`);
console.log(`   Progress:         ${Math.round((totalCount / estimatedTotal) * 100)}%\n`);

if (totalCount === 0) {
  console.log('⏳ Copy process belum dimulai atau masih membuat directory...');
} else if (totalCount < estimatedTotal * 0.9) {
  console.log('🔄 Copy process masih berjalan...');
} else {
  console.log('✅ Copy process hampir selesai!');
}

