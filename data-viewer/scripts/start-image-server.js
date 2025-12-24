#!/usr/bin/env node

/**
 * Script untuk start HTTP server untuk serve gambar dari project directory lain
 * Usage: node scripts/start-image-server.js <path-to-images-folder> [port]
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesPath = process.argv[2] || '../../alzheimer-disease/CODE_alzheimer-desease-classification/datasets';
const port = process.argv[3] || '8080';

const absoluteImagesPath = path.isAbsolute(imagesPath)
  ? imagesPath
  : path.resolve(__dirname, '..', imagesPath);

if (!fs.existsSync(absoluteImagesPath)) {
  console.error(`❌ Error: Folder tidak ditemukan: ${absoluteImagesPath}`);
  process.exit(1);
}

console.log(`🚀 Starting HTTP server untuk serve gambar dari: ${absoluteImagesPath}`);
console.log(`📡 Server akan berjalan di: http://localhost:${port}`);

// Check if http-server is installed
try {
  require.resolve('http-server');
} catch (e) {
  console.log('\n⚠️  http-server tidak terinstall. Installing...');
  const { execSync } = await import('child_process');
  try {
    execSync('npm install -g http-server', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Gagal install http-server. Silakan install manual:');
    console.error('   npm install -g http-server');
    process.exit(1);
  }
}

// Start http-server
const server = spawn('http-server', [absoluteImagesPath, '-p', port, '--cors'], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('❌ Error starting server:', err);
  console.error('\nPastikan http-server sudah terinstall:');
  console.error('   npm install -g http-server');
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Server stopped with code ${code}`);
  }
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping server...');
  server.kill();
  process.exit(0);
});

console.log('\n✅ Server started! Press Ctrl+C to stop.');

