#!/usr/bin/env node
/**
 * Copy static files to dist directory
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');
const distDir = join(rootDir, 'dist');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Files to copy
const filesToCopy = [
  { src: join(srcDir, 'manifest.json'), dest: join(distDir, 'manifest.json') },
  {
    src: join(srcDir, 'styles', 'content.css'),
    dest: join(distDir, 'styles', 'content.css'),
  },
  {
    src: join(rootDir, 'icons', 'icon-16.png'),
    dest: join(distDir, 'icons', 'icon-16.png'),
  },
  {
    src: join(rootDir, 'icons', 'icon-48.png'),
    dest: join(distDir, 'icons', 'icon-48.png'),
  },
  {
    src: join(rootDir, 'icons', 'icon-128.png'),
    dest: join(distDir, 'icons', 'icon-128.png'),
  },
];

// Ensure subdirectories exist and copy files
for (const file of filesToCopy) {
  const destDir = dirname(file.dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  try {
    copyFileSync(file.src, file.dest);
    console.log(`Copied: ${file.src} -> ${file.dest}`);
  } catch (error) {
    console.error(`Error copying ${file.src}:`, error.message);
    process.exit(1);
  }
}

console.log(' Static files copied successfully');
