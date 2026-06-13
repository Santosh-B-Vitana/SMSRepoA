#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Backend API Smoke Test Script
# Validates that key mobile API endpoints are reachable and returning the
# expected HTTP status codes using the demo school credentials.
#
# Usage:
#   bash mobile/scripts/backend-smoke.sh [BASE_URL]
#
# Arguments:
#   BASE_URL  (optional) — API base URL, defaults to https://api.vitanasms.com/api
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
#
# Prerequisites: curl, jq
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE_URL="${1:-https://api.vitanasms.com/api}"

# Demo credentials — these accounts must always exist and never expire
DEMO_PARENT_USER="demo.parent@demo.vitanasms.com"
DEMO_PARENT_PASS="Demo@12345"
DEMO_TEACHER_USER="demo.teacher@demo.vitanasms.com"
DEMO_TEACHER_PASS="Demo@12345"
DEMO_STUDENT_USER="demo.student@demo.vitanasms.com"
DEMO_STUDENT_PASS="Demo@12345"
DEMO_ADMIN_USER="demo.admin@demo.vitanasms.com"
DEMO_ADMIN_PASS="Demo@12345"

PASS_COUNT=0
FAIL_COUNT=0
FAILED_CHECKS=()

# ─────────────────────────────────────────────────────────────────────────────

check() {
  local description="$1"
  local expected_status="$2"
  local actual_status="$3"
  local response_check="${4:-}"

  if [ "$actual_status" -eq "$expected_status" ]; then
    echo "  ✔  ${description} → HTTP ${actual_status}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ✖  ${description} → expected HTTP ${expected_status}, got HTTP ${actual_status}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_CHECKS+=("${description}")
  fi
}

# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Vitana SMS · Backend API Smoke Test"
echo "  Base URL: ${BASE_URL}"
echo "══════════════════════════════════════════════════════════"
echo ""

# ── Section 1: Auth ───────────────────────────────────────────────────────

echo "── Auth ───────────────────────────────────────────────"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${DEMO_PARENT_USER}\",\"password\":\"${DEMO_PARENT_PASS}\"}")

LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n 1)
check "POST /auth/login (demo parent)" 200 "$LOGIN_STATUS"

# Extract token for subsequent calls
ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.token // .data.token // ""' 2>/dev/null || echo "")
REFRESH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.refreshToken // .data.refreshToken // ""' 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "  ⚠  Could not extract access token — skipping authenticated checks"
  echo ""
else
  # ── Section 2: Mobile API endpoints ──────────────────────────────────────

  echo ""
  echo "── Mobile API (authenticated as parent) ──────────────"

  APP_CONFIG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${BASE_URL}/mobile/app-config")
  check "GET /mobile/app-config" 200 "$APP_CONFIG_STATUS"

  DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${BASE_URL}/mobile/dashboard")
  check "GET /mobile/dashboard" 200 "$DASHBOARD_STATUS"

  NOTIF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${BASE_URL}/mobile/notifications?page=1&pageSize=20")
  check "GET /mobile/notifications" 200 "$NOTIF_STATUS"

  # ── Section 3: Teacher login ──────────────────────────────────────────────

  echo ""
  echo "── Auth — other demo accounts ────────────────────────"

  TEACHER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${DEMO_TEACHER_USER}\",\"password\":\"${DEMO_TEACHER_PASS}\"}")
  check "POST /auth/login (demo teacher)" 200 "$TEACHER_STATUS"

  STUDENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${DEMO_STUDENT_USER}\",\"password\":\"${DEMO_STUDENT_PASS}\"}")
  check "POST /auth/login (demo student)" 200 "$STUDENT_STATUS"

  ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${DEMO_ADMIN_USER}\",\"password\":\"${DEMO_ADMIN_PASS}\"}")
  check "POST /auth/login (demo admin)" 200 "$ADMIN_STATUS"

  # ── Section 4: Logout ─────────────────────────────────────────────────────

  echo ""
  echo "── Auth — logout ─────────────────────────────────────"

  if [ -n "$REFRESH_TOKEN" ]; then
    LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/auth/logout" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -d "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")
    check "POST /auth/logout" 204 "$LOGOUT_STATUS"
  else
    echo "  ⚠  Skipping logout check (no refresh token)"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Summary: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"

if [ "${FAIL_COUNT}" -gt 0 ]; then
  echo ""
  echo "  Failed checks:"
  for check_name in "${FAILED_CHECKS[@]}"; do
    echo "    ✖ ${check_name}"
  done
  echo "══════════════════════════════════════════════════════════"
  echo ""
  exit 1
else
  echo "  ✅  All backend smoke checks passed"
  echo "══════════════════════════════════════════════════════════"
  echo ""
fi
