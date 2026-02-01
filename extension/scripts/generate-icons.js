const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// xthread brand colors (matching website)
const COLORS = {
  background: '#0A0A0A',
  gold: '#C9B896',
  goldLight: '#E8D5B7',
  goldDark: '#B8956A'
};

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background with rounded corners
  const radius = size * 0.1875; // ~6px at 32px size
  ctx.fillStyle = COLORS.background;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // Draw X mark
  const padding = size * 0.28;
  const strokeWidth = size * 0.125;
  
  // Create gradient for the X
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, COLORS.goldLight);
  gradient.addColorStop(1, COLORS.goldDark);
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  
  // First line of X (top-left to bottom-right)
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(size - padding, size - padding);
  ctx.stroke();
  
  // Second line of X (top-right to bottom-left)
  ctx.beginPath();
  ctx.moveTo(size - padding, padding);
  ctx.lineTo(padding, size - padding);
  ctx.stroke();
  
  return canvas.toBuffer('image/png');
}

// Generate all icon sizes
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'dist', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const buffer = generateIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated ${filePath}`);
});

console.log('Done! All icons generated.');
