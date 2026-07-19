#!/usr/bin/env bash
#
# supabase_keepalive.sh — keep the Free-tier Supabase project from being paused.
#
# WHY: Supabase pauses a Free-tier project after a stretch of no API activity, and
# eventually removes it. That is exactly what happened to the PushApp project on
# 2026-07-19 — the host stopped resolving (DNS NXDOMAIN) and the app surfaced an
# unhandled "Network request failed" at startup. This script makes one cheap
# request so the project always looks active.
#
# It reads the SAME .env the app uses, so there is one source of truth and no
# credentials are duplicated. It sends only the publishable (client-safe) key —
# never a service/secret key.
#
# USAGE
#   ./tools/supabase_keepalive.sh          # probe once, print the result
#   ./tools/supabase_keepalive.sh --quiet  # for schedulers: log only on failure
#
# SCHEDULING (pick one — see docs in the repo README section for this file):
#   macOS launchd  : load tools/com.pushapp.supabase-keepalive.plist (runs weekly, $0)
#   GitHub Actions : a weekly cron workflow (uses CI minutes — see cost note below)
#
# COST: this script itself is free. A weekly GitHub Actions run costs ~1 CI minute
# per month, which is inside the free allowance, but it is NOT zero on a private
# repo — the launchd option costs nothing at all.

set -uo pipefail

# Defaults to the .env next to this script's repo checkout. Overridable via
# PUSHAPP_ENV_FILE because macOS TCC refuses to let a launchd agent EXECUTE a script
# stored under ~/Documents ("Operation not permitted"), so the scheduled copy lives
# in ~/Library/Application Support and must be told where the repo's .env is.
ENV_FILE="${PUSHAPP_ENV_FILE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/app/.env}"
QUIET=0
[[ "${1:-}" == "--quiet" ]] && QUIET=1

log() { [[ $QUIET -eq 1 ]] || echo "$@"; }
fail() { echo "[keepalive] $*" >&2; }

if [[ ! -f "$ENV_FILE" ]]; then
  fail "no .env at $ENV_FILE — nothing to keep alive."
  exit 1
fi

# Read the values WITHOUT sourcing the file (avoids executing arbitrary content).
# Commented-out lines are ignored, so a disabled backend is correctly treated as
# "not configured" rather than silently probing a dead host.
URL=$(grep -E '^[[:space:]]*EXPO_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"'"'"' \r')
KEY=$(grep -E '^[[:space:]]*EXPO_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"'"'"' \r')

if [[ -z "$URL" || -z "$KEY" ]]; then
  fail "Supabase is not configured (or is commented out) in $ENV_FILE — skipping."
  exit 0
fi

HOST=$(echo "$URL" | sed -E 's#https?://##' | cut -d/ -f1)

# 1) DNS first: a deleted project stops resolving entirely, which is a different
#    (and more final) failure than a paused one.
if ! host "$HOST" >/dev/null 2>&1 && ! nslookup "$HOST" >/dev/null 2>&1; then
  fail "DNS does not resolve for $HOST — the project looks DELETED, not merely paused."
  fail "Create a new Supabase project and update $ENV_FILE."
  exit 2
fi

# 2) A real authenticated REST call. /auth/v1/health proves the project resolves,
#    but a request carrying the anon key is what actually registers as activity.
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 20 \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" \
  "$URL/rest/v1/" 2>/dev/null)

STAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 4xx means the ORIGIN answered and simply refused this particular request (e.g.
# "secret API key required" on /rest/v1/) — the project is up, which is all we need.
#
# 5xx must NOT be treated as healthy. Observed 2026-07-19 while restoring a paused
# project: DNS resolved and Cloudflare's edge returned 401/521, so an earlier version
# of this script reported OK for a project whose origin was still booting. Cloudflare
# 52x in particular means "edge is fine, origin is down" — precisely the paused/
# restoring state we are trying to detect.
if [[ "$CODE" =~ ^4[0-9][0-9]$ || "$CODE" == "200" ]]; then
  log "[keepalive] $STAMP OK — $HOST origin responded ($CODE)."
  exit 0
fi

if [[ "$CODE" =~ ^5[0-9][0-9]$ ]]; then
  fail "$STAMP ORIGIN DOWN — $HOST returned $CODE (Cloudflare 52x = origin not running)."
  fail "The project is paused, still restoring, or erroring. Retry in a few minutes."
  exit 3
fi

fail "$STAMP UNREACHABLE — $HOST returned '$CODE' (no usable HTTP response)."
exit 3
