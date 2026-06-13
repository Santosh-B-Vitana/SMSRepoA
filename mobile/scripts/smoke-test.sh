#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Mobile Smoke Test Script
# Runs TypeScript check, ESLint, and Jest with coverage in sequence.
# Exits non-zero on the first failure so CI can surface the exact failing step.
#
# Usage:
#   bash mobile/scripts/smoke-test.sh
#   # Or from the workspace root:
#   bash mobile/scripts/smoke-test.sh
#
# Prerequisites: Node.js 22, pnpm 9, workspace dependencies installed.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Vitana SMS · Mobile Smoke Test"
echo "══════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Build shared packages ──────────────────────────────────────────
echo "▶  Building shared-types..."
pnpm --filter @vitana/shared-types build

echo "▶  Building shared-utils..."
pnpm --filter @vitana/shared-utils build

echo ""

# ── Step 2: TypeScript ─────────────────────────────────────────────────────
echo "▶  TypeScript check..."
if ! pnpm --filter @vitana/mobile typecheck; then
  echo ""
  echo "✖  FAILED: TypeScript errors found."
  exit 1
fi
echo "✔  TypeScript: 0 errors"
echo ""

# ── Step 3: ESLint ─────────────────────────────────────────────────────────
echo "▶  ESLint..."
if ! pnpm --filter @vitana/mobile lint; then
  echo ""
  echo "✖  FAILED: ESLint warnings/errors found."
  exit 1
fi
echo "✔  ESLint: 0 warnings"
echo ""

# ── Step 4: Jest with coverage ─────────────────────────────────────────────
echo "▶  Running unit tests with coverage..."
if ! pnpm --filter @vitana/mobile test --ci --coverage --coverageReporters=text --coverageReporters=lcov; then
  echo ""
  echo "✖  FAILED: Unit tests failed or coverage thresholds not met."
  exit 1
fi
echo "✔  Unit tests: all passed, coverage thresholds met"
echo ""

# ── Done ───────────────────────────────────────────────────────────────────
echo "══════════════════════════════════════════════════════════"
echo "  ✅  All smoke checks passed"
echo "══════════════════════════════════════════════════════════"
echo ""
