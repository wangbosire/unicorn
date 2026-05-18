#!/usr/bin/env bash

set -euo pipefail

export LANG=C
export LC_ALL=C

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"
MEMBER_LOGIN_CODE="${MEMBER_LOGIN_CODE:-m4-acceptance-demo-code}"
ENABLE_MEMBER_FREEZE_CHECK="${ENABLE_MEMBER_FREEZE_CHECK:-0}"

TMP_DIR="$(mktemp -d)"
ADMIN_TOKEN=""
MEMBER_TOKEN=""
MEMBER_ID=""
FROZEN_MEMBER_ID=""

cleanup() {
  if [[ -n "${FROZEN_MEMBER_ID}" && -n "${ADMIN_TOKEN}" ]]; then
    curl -sS \
      -X PATCH \
      "${API_BASE_URL}/admin-api/members/${FROZEN_MEMBER_ID}/unfreeze" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      >/dev/null || true
  fi

  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

json_get() {
  local file="$1"
  local path="$2"

  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const path = process.argv[2].split(".");
    let value = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const part of path) {
      if (part.length === 0) continue;
      const key = /^\d+$/.test(part) ? Number(part) : part;
      value = value?.[key];
    }
    if (value === undefined || value === null) {
      process.exit(2);
    }
    process.stdout.write(typeof value === "string" ? value : JSON.stringify(value));
  ' "${file}" "${path}"
}

assert_http_code() {
  local actual="$1"
  shift

  for expected in "$@"; do
    if [[ "${actual}" == "${expected}" ]]; then
      return 0
    fi
  done

  echo "unexpected http status: ${actual} (expected one of: $*)" >&2
  exit 1
}

assert_json_code() {
  local file="$1"
  local expected="$2"
  local actual

  actual="$(json_get "${file}" "code")"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "unexpected business code: ${actual} (expected: ${expected})" >&2
    cat "${file}" >&2
    exit 1
  fi
}

assert_body_contains() {
  local file="$1"
  local expected="$2"

  if ! grep -Fq "${expected}" "${file}"; then
    echo "response does not contain expected text: ${expected}" >&2
    cat "${file}" >&2
    exit 1
  fi
}

request_json() {
  local method="$1"
  local url="$2"
  local output_file="$3"
  local body="${4:-}"
  local auth_token="${5:-}"
  local http_code
  local -a curl_args

  curl_args=(
    -sS
    -o "${output_file}"
    -w "%{http_code}"
    -X "${method}"
    "${url}"
    -H "Content-Type: application/json"
  )

  if [[ -n "${auth_token}" ]]; then
    curl_args+=(-H "Authorization: Bearer ${auth_token}")
  fi

  if [[ -n "${body}" ]]; then
    curl_args+=(-d "${body}")
  fi

  http_code="$(curl "${curl_args[@]}")"
  echo "${http_code}"
}

log_step() {
  echo
  echo "==> $1"
}

require_command curl
require_command node

health_status="$(
  curl -sS -o "${TMP_DIR}/health.json" -w "%{http_code}" \
    "${API_BASE_URL}/admin-api/health"
)"
assert_http_code "${health_status}" "200"
assert_json_code "${TMP_DIR}/health.json" "OK"

log_step "Admin login"
admin_login_body="${TMP_DIR}/admin-login.json"
admin_login_status="$(
  request_json \
    "POST" \
    "${API_BASE_URL}/admin-api/auth/login" \
    "${admin_login_body}" \
    "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}"
)"
assert_http_code "${admin_login_status}" "200" "201"
assert_json_code "${admin_login_body}" "OK"
ADMIN_TOKEN="$(json_get "${admin_login_body}" "data.accessToken")"
echo "admin login ok"

log_step "Admin me"
admin_me_body="${TMP_DIR}/admin-me.json"
admin_me_status="$(
  request_json \
    "GET" \
    "${API_BASE_URL}/admin-api/auth/me" \
    "${admin_me_body}" \
    "" \
    "${ADMIN_TOKEN}"
)"
assert_http_code "${admin_me_status}" "200"
assert_json_code "${admin_me_body}" "OK"
assert_body_contains "${admin_me_body}" "\"username\":\"${ADMIN_USERNAME}\""
echo "admin me ok"

log_step "Dashboard overview"
dashboard_body="${TMP_DIR}/dashboard.json"
dashboard_status="$(
  request_json \
    "GET" \
    "${API_BASE_URL}/admin-api/dashboard/overview" \
    "${dashboard_body}" \
    "" \
    "${ADMIN_TOKEN}"
)"
assert_http_code "${dashboard_status}" "200"
assert_json_code "${dashboard_body}" "OK"
json_get "${dashboard_body}" "data.membersTotal" >/dev/null
json_get "${dashboard_body}" "data.pendingManualCommentsTotal" >/dev/null
echo "dashboard overview ok"

log_step "Notifications overview"
notifications_body="${TMP_DIR}/notifications.json"
notifications_status="$(
  request_json \
    "GET" \
    "${API_BASE_URL}/admin-api/notifications/overview" \
    "${notifications_body}" \
    "" \
    "${ADMIN_TOKEN}"
)"
assert_http_code "${notifications_status}" "200"
assert_json_code "${notifications_body}" "OK"
assert_body_contains "${notifications_body}" "CONTENT_TAKEDOWN"
assert_body_contains "${notifications_body}" "COMMENT_REVIEW_RESULT"
echo "notifications overview ok"

log_step "Transfers list"
transfers_body="${TMP_DIR}/transfers.json"
transfers_status="$(
  request_json \
    "GET" \
    "${API_BASE_URL}/admin-api/transfers?page=1&pageSize=20" \
    "${transfers_body}" \
    "" \
    "${ADMIN_TOKEN}"
)"
assert_http_code "${transfers_status}" "200"
assert_json_code "${transfers_body}" "OK"
assert_body_contains "${transfers_body}" "TR-SEED-0001"
assert_body_contains "${transfers_body}" "TR-SEED-0004"
echo "transfers list ok"

log_step "Member miniapp login"
member_login_body="${TMP_DIR}/member-login.json"
member_login_status="$(
  request_json \
    "POST" \
    "${API_BASE_URL}/member-api/auth/wechat-miniapp" \
    "${member_login_body}" \
    "{\"code\":\"${MEMBER_LOGIN_CODE}\"}"
)"
assert_http_code "${member_login_status}" "200" "201"
assert_json_code "${member_login_body}" "OK"
MEMBER_TOKEN="$(json_get "${member_login_body}" "data.accessToken")"
MEMBER_ID="$(json_get "${member_login_body}" "data.member.id")"
echo "member login ok"

log_step "Member auth me"
member_me_body="${TMP_DIR}/member-me.json"
member_me_status="$(
  request_json \
    "GET" \
    "${API_BASE_URL}/member-api/auth/me" \
    "${member_me_body}" \
    "" \
    "${MEMBER_TOKEN}"
)"
assert_http_code "${member_me_status}" "200"
assert_json_code "${member_me_body}" "OK"
assert_body_contains "${member_me_body}" "\"id\":\"${MEMBER_ID}\""
echo "member auth me ok"

if [[ "${ENABLE_MEMBER_FREEZE_CHECK}" == "1" ]]; then
  log_step "Freeze member and verify MEMBER_ACCOUNT_FROZEN"
  freeze_body="${TMP_DIR}/member-freeze.json"
  freeze_status="$(
    request_json \
      "PATCH" \
      "${API_BASE_URL}/admin-api/members/${MEMBER_ID}/freeze" \
      "${freeze_body}" \
      "" \
      "${ADMIN_TOKEN}"
  )"
  assert_http_code "${freeze_status}" "200"
  assert_json_code "${freeze_body}" "OK"
  FROZEN_MEMBER_ID="${MEMBER_ID}"

  frozen_me_body="${TMP_DIR}/member-me-frozen.json"
  frozen_me_status="$(
    request_json \
      "GET" \
      "${API_BASE_URL}/member-api/auth/me" \
      "${frozen_me_body}" \
      "" \
      "${MEMBER_TOKEN}"
  )"
  assert_http_code "${frozen_me_status}" "400"
  assert_json_code "${frozen_me_body}" "MEMBER_ACCOUNT_FROZEN"

  unfreeze_body="${TMP_DIR}/member-unfreeze.json"
  unfreeze_status="$(
    request_json \
      "PATCH" \
      "${API_BASE_URL}/admin-api/members/${MEMBER_ID}/unfreeze" \
      "${unfreeze_body}" \
      "" \
      "${ADMIN_TOKEN}"
  )"
  assert_http_code "${unfreeze_status}" "200"
  assert_json_code "${unfreeze_body}" "OK"
  FROZEN_MEMBER_ID=""

  recovered_me_body="${TMP_DIR}/member-me-recovered.json"
  recovered_me_status="$(
    request_json \
      "GET" \
      "${API_BASE_URL}/member-api/auth/me" \
      "${recovered_me_body}" \
      "" \
      "${MEMBER_TOKEN}"
  )"
  assert_http_code "${recovered_me_status}" "200"
  assert_json_code "${recovered_me_body}" "OK"
  echo "member freeze rollback ok"
fi

echo
echo "M4 smoke passed"
