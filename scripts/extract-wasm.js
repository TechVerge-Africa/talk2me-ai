const fs = require('fs');
const path = require('path');

const inputPath = path.resolve(__dirname, '../node_modules/@shiguredo/rnnoise-wasm/dist/rnnoise.js');
const outputDir = path.resolve(__dirname, '../public/wasm');
const outputPath = path.join(outputDir, 'rnnoise.wasm');

console.log('Extracting RNNoise WASM...');

try {
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Package @shiguredo/rnnoise-wasm not found at ${inputPath}. Did you run npm install?`);
    process.exit(1);
  }

  const content = fs.readFileSync(inputPath, 'utf8');
  
  // Find the base64 string passed to FA()
  const match = content.match(/return\s+FA\("([A-Za-z0-9+/=\s\r\n]+)"\)/);
  if (!match) {
    console.error('Error: Could not find the embedded base64 WebAssembly string in rnnoise.js');
    process.exit(1);
  }

  // Clean whitespace from the base64 string
  const base64Str = match[1].replace(/[\s\r\n]+/g, '');
  const buffer = Buffer.from(base64Str, 'base64');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully extracted WASM to ${outputPath} (${buffer.length} bytes)`);
} catch (error) {
  console.error('Failed to extract WASM:', error);
  process.exit(1);
}
