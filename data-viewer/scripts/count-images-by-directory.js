#!/usr/bin/env node

/**
 * Script untuk menghitung jumlah images di setiap directory secara detail
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const IMAGES_BASE = path.join(PROJECT_ROOT, 'public', 'images');

// Structure untuk menyimpan statistik
const stats = {
  total: 0,
  byVersion: {},
  byPlane: {},
  bySubset: {},
  byClass: {},
  byDirectory: {}
};

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

function scanDirectory(dir, relativePath = '', depth = 0) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const newRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      // Count PNG files in this directory
      const count = countPNGFiles(fullPath);
      
      if (count > 0) {
        // Store by directory path
        stats.byDirectory[newRelativePath] = count;
        stats.total += count;
        
        // Parse path structure: version/plane/subset/class
        const parts = newRelativePath.split('/');
        
        if (parts.length >= 1) {
          const version = parts[0]; // 8_enhanced or 7_cropped
          if (!stats.byVersion[version]) {
            stats.byVersion[version] = 0;
          }
          stats.byVersion[version] += count;
        }
        
        if (parts.length >= 2) {
          const plane = parts[1]; // axial, coronal, sagittal
          if (!stats.byPlane[plane]) {
            stats.byPlane[plane] = 0;
          }
          stats.byPlane[plane] += count;
        }
        
        if (parts.length >= 3) {
          const subset = parts[2]; // train, test, val
          if (!stats.bySubset[subset]) {
            stats.bySubset[subset] = 0;
          }
          stats.bySubset[subset] += count;
        }
        
        if (parts.length >= 4) {
          const classType = parts[3]; // AD, CN
          if (!stats.byClass[classType]) {
            stats.byClass[classType] = 0;
          }
          stats.byClass[classType] += count;
        }
      }
      
      // Recursively scan subdirectories
      scanDirectory(fullPath, newRelativePath, depth + 1);
    }
  }
}

console.log('📊 Scanning images directory structure...\n');
console.log(`Base directory: ${IMAGES_BASE}\n`);

scanDirectory(IMAGES_BASE);

// Display results
console.log('='.repeat(80));
console.log('📈 DETAILED IMAGE STATISTICS');
console.log('='.repeat(80));

console.log(`\n📁 TOTAL IMAGES: ${stats.total.toLocaleString()}\n`);

// By Version
console.log('─'.repeat(80));
console.log('📦 BY VERSION:');
console.log('─'.repeat(80));
for (const [version, count] of Object.entries(stats.byVersion).sort((a, b) => b[1] - a[1])) {
  const percentage = ((count / stats.total) * 100).toFixed(2);
  console.log(`   ${version.padEnd(20)} : ${count.toString().padStart(6)} files (${percentage}%)`);
}

// By Plane
console.log('\n─'.repeat(80));
console.log('🔄 BY PLANE:');
console.log('─'.repeat(80));
for (const [plane, count] of Object.entries(stats.byPlane).sort((a, b) => b[1] - a[1])) {
  const percentage = ((count / stats.total) * 100).toFixed(2);
  console.log(`   ${plane.padEnd(20)} : ${count.toString().padStart(6)} files (${percentage}%)`);
}

// By Subset
console.log('\n─'.repeat(80));
console.log('📂 BY SUBSET:');
console.log('─'.repeat(80));
for (const [subset, count] of Object.entries(stats.bySubset).sort((a, b) => b[1] - a[1])) {
  const percentage = ((count / stats.total) * 100).toFixed(2);
  console.log(`   ${subset.padEnd(20)} : ${count.toString().padStart(6)} files (${percentage}%)`);
}

// By Class
console.log('\n─'.repeat(80));
console.log('🏷️  BY CLASS:');
console.log('─'.repeat(80));
for (const [classType, count] of Object.entries(stats.byClass).sort((a, b) => b[1] - a[1])) {
  const percentage = ((count / stats.total) * 100).toFixed(2);
  console.log(`   ${classType.padEnd(20)} : ${count.toString().padStart(6)} files (${percentage}%)`);
}

// Detailed by Directory
console.log('\n─'.repeat(80));
console.log('📋 DETAILED BY DIRECTORY:');
console.log('─'.repeat(80));

// Group by version first
const versions = ['8_enhanced', '7_cropped'];
for (const version of versions) {
  console.log(`\n   📁 ${version}:`);
  console.log('   ' + '─'.repeat(76));
  
  // Get all directories for this version
  const versionDirs = Object.keys(stats.byDirectory)
    .filter(dir => dir.startsWith(version))
    .sort();
  
  for (const dir of versionDirs) {
    const count = stats.byDirectory[dir];
    const relativePath = dir.replace(`${version}/`, '');
    const indent = '      ';
    console.log(`${indent}${relativePath.padEnd(60)} : ${count.toString().padStart(6)} files`);
  }
  
  const versionTotal = versionDirs.reduce((sum, dir) => sum + stats.byDirectory[dir], 0);
  console.log(`   ${'─'.repeat(76)}`);
  console.log(`   ${'Total'.padEnd(60)} : ${versionTotal.toString().padStart(6)} files`);
}

// Combined statistics
console.log('\n─'.repeat(80));
console.log('🔀 COMBINED STATISTICS:');
console.log('─'.repeat(80));

// Version + Plane
console.log('\n   📦 Version × Plane:');
for (const version of versions) {
  for (const plane of ['axial', 'coronal', 'sagittal']) {
    const dirs = Object.keys(stats.byDirectory).filter(dir => 
      dir.startsWith(`${version}/${plane}`)
    );
    if (dirs.length > 0) {
      const count = dirs.reduce((sum, dir) => sum + stats.byDirectory[dir], 0);
      console.log(`      ${version}/${plane.padEnd(10)} : ${count.toString().padStart(6)} files`);
    }
  }
}

// Version + Plane + Subset
console.log('\n   📦 Version × Plane × Subset:');
for (const version of versions) {
  for (const plane of ['axial', 'coronal', 'sagittal']) {
    for (const subset of ['train', 'test', 'val']) {
      const dirs = Object.keys(stats.byDirectory).filter(dir => 
        dir.startsWith(`${version}/${plane}/${subset}`)
      );
      if (dirs.length > 0) {
        const count = dirs.reduce((sum, dir) => sum + stats.byDirectory[dir], 0);
        console.log(`      ${version}/${plane}/${subset.padEnd(5)} : ${count.toString().padStart(6)} files`);
      }
    }
  }
}

// Version + Plane + Subset + Class (most detailed)
console.log('\n   📦 Version × Plane × Subset × Class (FULL PATH):');
for (const version of versions) {
  for (const plane of ['axial', 'coronal', 'sagittal']) {
    for (const subset of ['train', 'test', 'val']) {
      for (const classType of ['AD', 'CN']) {
        const dir = `${version}/${plane}/${subset}/${classType}`;
        if (stats.byDirectory[dir]) {
          const count = stats.byDirectory[dir];
          console.log(`      ${dir.padEnd(50)} : ${count.toString().padStart(6)} files`);
        }
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ Scan complete!');
console.log('='.repeat(80) + '\n');

