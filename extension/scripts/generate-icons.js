// Generate placeholder PNG icons for the extension
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Simple 1x1 purple PNG as base64 (we'll use this as placeholder)
// In production, replace with proper icons
const sizes = [16, 32, 48, 128];

// Create a simple PNG with a purple circle
function createSimplePNG(size) {
  // PNG header + IHDR + IDAT + IEND for a simple purple square
  // This is a minimal valid PNG
  
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#7c3aed');
  gradient.addColorStop(1, '#6366f1');
  
  // Draw circle
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw "X" letter
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('X', size / 2, size / 2);
  
  return canvas.toBuffer('image/png');
}

// Try to use canvas, fall back to placeholder
async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'dist', 'icons');
  
  try {
    // Try to import canvas
    require('canvas');
    
    for (const size of sizes) {
      const buffer = createSimplePNG(size);
      fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
      console.log(`Created icon${size}.png`);
    }
  } catch (err) {
    console.log('canvas not available, creating placeholder icons');
    
    // Create minimal valid 1x1 purple PNG and copy for all sizes
    // This is a real minimal PNG (1x1 purple pixel)
    const minimalPNG = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, // IHDR length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width = 1
      0x00, 0x00, 0x00, 0x01, // height = 1
      0x08, 0x02, // 8-bit RGB
      0x00, 0x00, 0x00, // compression, filter, interlace
      0x90, 0x77, 0x53, 0xde, // CRC
      0x00, 0x00, 0x00, 0x0c, // IDAT length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0xd7, 0x63, 0x78, 0x5e, 0x6a, 0xf8, 0x0f, 0x00, 0x03, 0x8e, 0x01, 0x7e, // compressed purple pixel
      0x91, 0x45, 0x7d, 0x1f, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND length
      0x49, 0x45, 0x4e, 0x44, // IEND
      0xae, 0x42, 0x60, 0x82  // CRC
    ]);
    
    for (const size of sizes) {
      fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), minimalPNG);
      console.log(`Created placeholder icon${size}.png`);
    }
    
    console.log('\n⚠️  These are placeholder icons. Replace with proper branded icons before publishing.');
  }
}

generateIcons();
