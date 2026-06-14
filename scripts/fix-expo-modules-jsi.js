#!/usr/bin/env node
/**
 * Fixes Swift 6 incompatibility in expo-modules-jsi@56.0.9.
 *
 * Problem: 15 Swift source files use `weak let runtime: JavaScriptRuntime?`
 * Swift 6 (Xcode 26+) requires `weak var` because weak references can
 * become nil at runtime via ARC. This is tracked in:
 * https://github.com/expo/expo/issues/46242
 *
 * This script is invoked via `postinstall` in the root package.json so it
 * runs automatically after every `pnpm install` — including on EAS Build.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function findExpoModulesJsiSources() {
  // pnpm stores packages in node_modules/.pnpm/<name>@<ver>_.../node_modules/<name>
  // We search for the Sources directory under any matching path
  const root = path.resolve(__dirname, '..');

  const candidates = [
    // pnpm virtual store (root-level)
    path.join(root, 'node_modules', '.pnpm'),
    // mobile workspace node_modules (if hoisted)
    path.join(root, 'mobile', 'node_modules', '.pnpm'),
  ];

  const found = [];
  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    // Find all expo-modules-jsi packages
    for (const entry of fs.readdirSync(base)) {
      if (!entry.startsWith('expo-modules-jsi@56')) continue;
      const srcDir = path.join(base, entry, 'node_modules', 'expo-modules-jsi', 'apple', 'Sources');
      if (fs.existsSync(srcDir)) found.push(srcDir);
    }
  }
  return found;
}

const dirs = findExpoModulesJsiSources();
if (dirs.length === 0) {
  console.log('[fix-expo-modules-jsi] Package not found — skipping');
  process.exit(0);
}

let totalFixed = 0;
for (const srcDir of dirs) {
  // Use perl for reliable in-place replacement (BSD and GNU compatible)
  try {
    const result = execSync(
      `find "${srcDir}" -name "*.swift" -print0 | xargs -0 perl -i -pe 's/\\bweak let\\b/weak var/g'`,
      { stdio: 'pipe' }
    );
    // Count how many files have weak var now
    const count = execSync(`grep -rl "weak var" "${srcDir}" | wc -l`, { stdio: 'pipe' }).toString().trim();
    totalFixed += parseInt(count, 10);
  } catch (e) {
    console.warn('[fix-expo-modules-jsi] Warning during patch:', e.message);
  }
}

console.log(`[fix-expo-modules-jsi] Applied weak let -> weak var in ${totalFixed} Swift files (Swift 6 fix)`);
