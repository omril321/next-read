#!/usr/bin/env node
/**
 * Build script for Next Read Chrome Extension
 * Uses esbuild to bundle TypeScript modules
 */
import { build } from 'esbuild';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// No environment variables needed for Goodreads scraping

// Bundle content script
async function bundleContentScript() {
  try {
    await build({
      entryPoints: [join(rootDir, 'src', 'content', 'content.ts')],
      bundle: true,
      outfile: join(distDir, 'content', 'content.js'),
      format: 'iife', // Immediately Invoked Function Expression - works in browsers
      target: 'es2020',
      platform: 'browser',
      sourcemap: true,
      minify: false, // Keep readable for debugging
    });
    console.log('✅ Content script bundled successfully');
  } catch (error) {
    console.error('Error bundling content script:', error);
    process.exit(1);
  }
}

// Bundle background service worker
async function bundleBackgroundScript() {
  try {
    await build({
      entryPoints: [join(rootDir, 'src', 'background', 'background.ts')],
      bundle: true,
      outfile: join(distDir, 'background', 'background.js'),
      format: 'iife', // Service workers use IIFE format
      target: 'es2020',
      platform: 'browser',
      sourcemap: true,
      minify: false,
    });
    console.log('✅ Background service worker bundled successfully');
  } catch (error) {
    console.error('Error bundling background script:', error);
    process.exit(1);
  }
}

// Run builds
async function buildAll() {
  await bundleContentScript();
  await bundleBackgroundScript();
}

buildAll();
