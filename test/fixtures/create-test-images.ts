/**
 * Script to create test images for integration testing
 *
 * This script creates various test images with different formats and sizes
 * for testing image processing functionality.
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const fixturesDir = path.join(__dirname, 'images');

// Ensure fixtures directory exists
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

async function createTestImages() {
  console.log('Creating test images...');

  // 1. Create a small JPEG image using sharp
  const smallJpeg = await sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'small-jpeg.jpg'), smallJpeg);

  // 2. Create a PNG image
  const pngBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'test-png.png'), pngBuffer);

  // 3. Create a WebP image
  const webpBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .webp()
    .toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'test-webp.webp'), webpBuffer);

  // 4. Create a larger JPEG image (for performance testing)
  const largeJpeg = await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'large-jpeg.jpg'), largeJpeg);

  // 5. Create a portrait image
  const portraitBuffer = await sharp({
    create: {
      width: 800,
      height: 1200,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .jpeg()
    .toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'portrait.jpg'), portraitBuffer);

  // 6. Create a landscape image
  const landscapeBuffer = await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 200, g: 150, b: 100 },
    },
  })
    .jpeg()
    .toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'landscape.jpg'), landscapeBuffer);

  // 7. Create a medium-sized image (for processing tests)
  const mediumBuffer = await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 50, g: 100, b: 150 },
    },
  })
    .jpeg({ quality: 85 })
    .toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'medium-test.jpg'), mediumBuffer);

  console.log('Test images created successfully!');
  console.log('Images created:');
  const files = fs.readdirSync(fixturesDir);
  files.forEach((file) => {
    const filePath = path.join(fixturesDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  - ${file} (${sizeKB} KB)`);
  });
}

createTestImages().catch(console.error);
