const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// xthread brand colors
const COLORS = {
  background: '#0F0F0F',
  gold: '#C9B896',
  goldLight: '#D4C4A8'
};

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background with rounded corners
  const radius = size * 0.22;
  ctx.fillStyle = COLORS.background;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // Subtle border
  ctx.strokeStyle = 'rgba(201, 184, 150, 0.2)';
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.beginPath();
  ctx.roundRect(size * 0.03, size * 0.03, size * 0.94, size * 0.94, radius * 0.9);
  ctx.stroke();
  
  // Draw "xt" text logo
  const fontSize = size * 0.52;
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Gold gradient for text
  const gradient = ctx.createLinearGradient(size * 0.2, size * 0.3, size * 0.8, size * 0.7);
  gradient.addColorStop(0, COLORS.goldLight);
  gradient.addColorStop(1, COLORS.gold);
  ctx.fillStyle = gradient;
  
  // Draw "xt" centered
  ctx.fillText('xt', size / 2, size / 2 + size * 0.02);
  
  return canvas.toBuffer('image/png');
}

// Generate all icon sizes
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

console.log('\nDone! "xt" logo icons generated.');
