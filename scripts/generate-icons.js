#!/usr/bin/env node
/**
 * Generate PNG icons from SVG source
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'icons');

const sizes = [16, 48, 128];
const svgPath = join(iconsDir, 'icon.svg');

async function generateIcons() {
  console.log('Generating PNG icons from SVG...');

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated: icon-${size}.png (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Error generating icon-${size}.png:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✓ All icons generated successfully!');
}

generateIcons();
