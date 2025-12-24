#!/usr/bin/env node

/**
 * Script untuk mengurangi dataset sesuai pattern yang diminta:
 * Train: AD=100, CN=100
 * Test: AD=50, CN=50
 * Val: AD=50, CN=50
 * 
 * Per version (8_enhanced dan 7_cropped) dan per plane (axial, coronal, sagittal)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const IMAGES_BASE = path.join(PROJECT_ROOT, 'public', 'images');

// Target counts per category
const TARGET_COUNTS = {
  train: { AD: 100, CN: 100 },
  test: { AD: 50, CN: 50 },
  val: { AD: 50, CN: 50 }
};

// Backup directory untuk menyimpan images yang akan dihapus
const BACKUP_DIR = path.join(PROJECT_ROOT, 'public', 'images_backup');

// Statistics
const stats = {
  kept: 0,
  removed: 0,
  byCategory: {}
};

/**
 * Shuffle array menggunakan Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get all PNG files in a directory
 */
function getPNGFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push({
        name: entry.name,
        path: path.join(dir, entry.name),
        fullPath: path.join(dir, entry.name)
      });
    }
  }
  
  return files;
}

/**
 * Reduce images in a specific directory
 */
function reduceImagesInDirectory(dir, subset, classType, targetCount) {
  const files = getPNGFiles(dir);
  
  if (files.length === 0) {
    return { kept: 0, removed: 0 };
  }
  
  // Shuffle untuk random selection
  const shuffled = shuffleArray(files);
  
  // Keep only target count
  const toKeep = shuffled.slice(0, targetCount);
  const toRemove = shuffled.slice(targetCount);
  
  // Create backup directory structure
  const relativePath = path.relative(IMAGES_BASE, dir);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  
  // Remove files that exceed target count
  for (const file of toRemove) {
    try {
      // Create backup directory if needed
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      // Move to backup (instead of delete, for safety)
      const backupFile = path.join(backupPath, file.name);
      fs.renameSync(file.path, backupFile);
      stats.removed++;
    } catch (error) {
      console.error(`Error moving file ${file.path}:`, error.message);
    }
  }
  
  stats.kept += toKeep.length;
  const categoryKey = `${path.basename(path.dirname(path.dirname(dir)))}/${path.basename(path.dirname(path.dirname(path.dirname(dir))))}/${subset}/${classType}`;
  if (!stats.byCategory[categoryKey]) {
    stats.byCategory[categoryKey] = { kept: 0, removed: 0 };
  }
  stats.byCategory[categoryKey].kept += toKeep.length;
  stats.byCategory[categoryKey].removed += toRemove.length;
  
  return { kept: toKeep.length, removed: toRemove.length };
}

/**
 * Process all directories
 */
function processDirectories() {
  const versions = ['8_enhanced', '7_cropped'];
  const planes = ['axial', 'coronal', 'sagittal'];
  const subsets = Object.keys(TARGET_COUNTS);
  
  console.log('🔄 Processing directories...\n');
  
  for (const version of versions) {
    for (const plane of planes) {
      for (const subset of subsets) {
        for (const [classType, targetCount] of Object.entries(TARGET_COUNTS[subset])) {
          const dir = path.join(IMAGES_BASE, version, plane, subset, classType);
          
          if (fs.existsSync(dir)) {
            const beforeCount = getPNGFiles(dir).length;
            const result = reduceImagesInDirectory(dir, subset, classType, targetCount);
            const afterCount = getPNGFiles(dir).length;
            
            console.log(`   ${version}/${plane}/${subset}/${classType}:`);
            console.log(`      Before: ${beforeCount} files`);
            console.log(`      After:  ${afterCount} files (target: ${targetCount})`);
            console.log(`      Removed: ${result.removed} files\n`);
          } else {
            console.log(`   ⚠️  Directory not found: ${dir}\n`);
          }
        }
      }
    }
  }
}

/**
 * Clean up empty directories
 */
function cleanupEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      cleanupEmptyDirectories(fullPath);
      
      // Check if directory is empty
      const subEntries = fs.readdirSync(fullPath);
      if (subEntries.length === 0) {
        try {
          fs.rmdirSync(fullPath);
          console.log(`   Removed empty directory: ${fullPath}`);
        } catch (error) {
          // Directory might not be empty or permission issue
        }
      }
    }
  }
}

// Main execution
console.log('='.repeat(80));
console.log('📊 DATASET REDUCTION SCRIPT');
console.log('='.repeat(80));
console.log('\nTarget counts per category:');
console.log('   Train: AD=100, CN=100');
console.log('   Test:  AD=50,  CN=50');
console.log('   Val:   AD=50,  CN=50');
console.log('\nThis will be applied to:');
console.log('   - Each version (8_enhanced, 7_cropped)');
console.log('   - Each plane (axial, coronal, sagittal)');
console.log('\n⚠️  Images will be moved to backup directory, not deleted.');
console.log(`   Backup location: ${BACKUP_DIR}\n`);

// Confirm (in production, you might want to add a prompt)
console.log('Starting reduction process...\n');

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ Created backup directory: ${BACKUP_DIR}\n`);
}

// Process all directories
processDirectories();

// Clean up empty directories
console.log('\n🧹 Cleaning up empty directories...');
cleanupEmptyDirectories(IMAGES_BASE);

// Summary
console.log('\n' + '='.repeat(80));
console.log('📈 SUMMARY');
console.log('='.repeat(80));
console.log(`\n   Total kept:    ${stats.kept.toLocaleString()} files`);
console.log(`   Total removed: ${stats.removed.toLocaleString()} files`);
console.log(`   Backup location: ${BACKUP_DIR}\n`);

console.log('\n📋 By Category:');
for (const [category, counts] of Object.entries(stats.byCategory)) {
  console.log(`   ${category}:`);
  console.log(`      Kept: ${counts.kept}, Removed: ${counts.removed}`);
}

console.log('\n✅ Reduction complete!');
console.log('\n📝 Next steps:');
console.log('   1. Regenerate image list: npm run setup-adni-dataset');
console.log('   2. Test the application: npm run dev');
console.log('   3. If everything works, you can delete backup:');
console.log(`      rm -rf "${BACKUP_DIR}"`);
console.log('\n' + '='.repeat(80) + '\n');

