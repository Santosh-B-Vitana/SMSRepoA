#!/usr/bin/env node
/**
 * inject-school-config.js
 *
 * Usage:
 *   node scripts/inject-school-config.js <schoolId>
 *   pnpm --filter @vitana/mobile inject:school <schoolId>
 *
 * What it does:
 *   1. Validates that <schoolId> exists in school-configs.json
 *   2. Creates assets/school-assets/<schoolId>/ if it doesn't exist
 *   3. Copies missing required assets from vitana/ defaults
 *   4. Writes a config.json marker with build metadata
 *
 * Required asset files in assets/school-assets/<schoolId>/:
 *   app-icon-1024.png      — 1024×1024 px, store icon
 *   adaptive-icon.png      — 1024×1024 px, Android adaptive foreground
 *   splash-screen.png      — 2048×2048 px, splash image
 *   notification-icon.png  — 96×96 px, monochrome white on transparent
 *
 * For production: replace the copy-from-defaults step by downloading
 * from S3 using @aws-sdk/client-s3:
 *   s3://vitana-assets/schools/<schoolId>/branding/<filename>
 */

const path = require('path');
const fs = require('fs');

const schoolId = process.argv[2];

if (!schoolId) {
  console.error('[inject-school-config] Error: schoolId argument is required.');
  console.error('Usage: node scripts/inject-school-config.js <schoolId>');
  process.exit(1);
}

// ── Load configs ─────────────────────────────────────────────────────────────

const configsPath = path.join(__dirname, 'school-configs.json');
if (!fs.existsSync(configsPath)) {
  console.error('[inject-school-config] school-configs.json not found at', configsPath);
  process.exit(1);
}

const configs = JSON.parse(fs.readFileSync(configsPath, 'utf8'));
const school = configs[schoolId];

if (!school) {
  console.error(`[inject-school-config] School "${schoolId}" not found in school-configs.json.`);
  console.error('Available schools:', Object.keys(configs).join(', '));
  process.exit(1);
}

// ── Resolve paths ─────────────────────────────────────────────────────────────

const mobileRoot = path.join(__dirname, '..');
const assetsDir = path.join(mobileRoot, 'assets', 'school-assets', schoolId);
const defaultDir = path.join(mobileRoot, 'assets', 'school-assets', 'vitana');

const REQUIRED_ASSETS = [
  'app-icon-1024.png',
  'adaptive-icon.png',
  'splash-screen.png',
  'notification-icon.png',
];

// ── Create target directory ───────────────────────────────────────────────────

fs.mkdirSync(assetsDir, { recursive: true });
console.log(`\n[inject-school-config] Preparing assets for: ${school.appName} (${schoolId})`);

// ── Copy / verify required assets ────────────────────────────────────────────

let missing = 0;
REQUIRED_ASSETS.forEach((file) => {
  const targetPath = path.join(assetsDir, file);
  if (fs.existsSync(targetPath)) {
    console.log(`  [ok]   ${file}`);
    return;
  }

  const defaultPath = path.join(defaultDir, file);
  if (fs.existsSync(defaultPath)) {
    fs.copyFileSync(defaultPath, targetPath);
    console.log(`  [copy] ${file}  (copied from vitana defaults)`);
  } else {
    console.warn(`  [miss] ${file}  — not found in vitana defaults either. Add manually to: ${assetsDir}`);
    missing++;
  }
});

// ── Write config marker ───────────────────────────────────────────────────────

const marker = {
  ...school,
  injectedAt: new Date().toISOString(),
  injectedBy: 'inject-school-config.js',
  assetsDirectory: assetsDir,
};
fs.writeFileSync(path.join(assetsDir, 'config.json'), JSON.stringify(marker, null, 2));

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
console.log(`  School   : ${school.appName}`);
console.log(`  Package  : ${school.androidPackage}`);
console.log(`  Bundle   : ${school.iosBundleId}`);
console.log(`  Primary  : ${school.colors.primary}`);
console.log(`  Assets   : ${assetsDir}`);

if (missing > 0) {
  console.warn(`\n  WARNING: ${missing} asset(s) missing. The build will fail until they are added.`);
} else {
  console.log('\n  All required assets are in place.');
}

console.log('\n  Next steps:');
console.log(`    Start dev:  SCHOOL_ID=${schoolId} pnpm --filter @vitana/mobile start`);
console.log(`    Build:      SCHOOL_ID=${schoolId} eas build --profile school-production`);
console.log('─'.repeat(60) + '\n');
