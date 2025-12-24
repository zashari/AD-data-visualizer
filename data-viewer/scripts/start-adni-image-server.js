#!/usr/bin/env node

/**
 * Script untuk start HTTP server untuk serve gambar ADNI dataset
 * Serve kedua folder (enhanced dan original) dengan port berbeda
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_PATH = path.resolve(__dirname, '../../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets/ADNI_1_5_T');
const PORT = '8080';

console.log('🚀 Starting HTTP server untuk ADNI dataset...\n');

// Check if base folder exists
if (!fs.existsSync(BASE_PATH)) {
  console.error(`❌ Error: Base folder tidak ditemukan: ${BASE_PATH}`);
  process.exit(1);
}

// Check if http-server is installed
let httpServerInstalled = false;
try {
  require.resolve('http-server');
  httpServerInstalled = true;
} catch (e) {
  // Try global install
  try {
    const { execSync } = await import('child_process');
    execSync('http-server --version', { stdio: 'ignore' });
    httpServerInstalled = true;
  } catch (err) {
    // Not installed
  }
}

if (!httpServerInstalled) {
  console.log('⚠️  http-server tidak terinstall. Installing...');
  const { execSync } = await import('child_process');
  try {
    execSync('npm install -g http-server', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Gagal install http-server. Silakan install manual:');
    console.error('   npm install -g http-server');
    process.exit(1);
  }
}

// Start server dari parent folder (serve kedua folder sekaligus)
console.log(`📡 Starting server di port ${PORT}...`);
console.log(`   Serving from: ${BASE_PATH}`);
console.log(`   This will serve both 8_enhanced and 7_cropped folders\n`);

const server = spawn('http-server', [
  BASE_PATH,
  '-p', PORT,
  '--cors'
], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('❌ Error starting server:', err);
  console.error('\nPastikan http-server sudah terinstall:');
  console.error('   npm install -g http-server');
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping server...');
  server.kill();
  process.exit(0);
});

console.log('\n✅ Server started!');
console.log(`   URL: http://localhost:${PORT}`);
console.log(`   Enhanced images: http://localhost:${PORT}/8_enhanced/...`);
console.log(`   Original images: http://localhost:${PORT}/7_cropped/...`);
console.log('\nPress Ctrl+C to stop.');

