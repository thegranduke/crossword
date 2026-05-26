/**
 * Copies @tensorflow/tfjs-tflite WASM/JS runtime files into public/tfjs-wasm/
 * so Expo web serves them at /tfjs-wasm/* (fixes 404 on localhost:8081).
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../node_modules/@tensorflow/tfjs-tflite/wasm');
const destDir = path.join(__dirname, '../public/tfjs-wasm');

if (!fs.existsSync(srcDir)) {
  console.warn('[copy-tflite-wasm] wasm source not found, skip');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
for (const name of fs.readdirSync(srcDir)) {
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
}
console.log('[copy-tflite-wasm] copied to public/tfjs-wasm/');
