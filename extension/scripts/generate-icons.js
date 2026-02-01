const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// xthread brand colors (matching website)
const COLORS = {
  background: '#0F0F0F',
  gold: '#C9B896',
  goldLight: '#D4C4A8',
  goldDark: '#A8967A'
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
  
  // Add subtle inner border/glow
  ctx.strokeStyle = 'rgba(201, 184, 150, 0.15)';
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.beginPath();
  ctx.roundRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92, radius * 0.85);
  ctx.stroke();
  
  // Draw stylized "x" - thicker, more balanced
  const padding = size * 0.26;
  const strokeWidth = size * 0.11;
  
  // Create gradient for the X
  const gradient = ctx.createLinearGradient(padding, padding, size - padding, size - padding);
  gradient.addColorStop(0, COLORS.goldLight);
  gradient.addColorStop(0.5, COLORS.gold);
  gradient.addColorStop(1, COLORS.goldDark);
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
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
  
  // Add subtle thread accent (small diagonal line extending from X)
  const threadSize = size * 0.12;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = Math.max(1.5, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(size - padding + threadSize * 0.3, padding - threadSize * 0.3);
  ctx.lineTo(size - padding + threadSize, padding - threadSize);
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
  console.log(`Generated ${filePath} (${size}x${size})`);
});

console.log('\nDone! All icons generated with professional styling.');
