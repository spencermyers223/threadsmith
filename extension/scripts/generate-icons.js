const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// X-style: clean white on black
const COLORS = {
  background: '#000000',
  stroke: '#FFFFFF'
};

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Pure black background (no rounded corners for cleaner look)
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, size, size);
  
  // Draw clean X mark - X.com style
  const padding = size * 0.25;
  const strokeWidth = Math.max(1.5, size * 0.08);
  
  ctx.strokeStyle = COLORS.stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  
  // First line (top-left to bottom-right)
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(size - padding, size - padding);
  ctx.stroke();
  
  // Second line (top-right to bottom-left)
  ctx.beginPath();
  ctx.moveTo(size - padding, padding);
  ctx.lineTo(padding, size - padding);
  ctx.stroke();
  
  return canvas.toBuffer('image/png');
}

// Generate all sizes
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'dist', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const buffer = generateIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated ${filePath} (${size}x${size})`);
});

console.log('\nDone! Clean X-style icons generated.');
