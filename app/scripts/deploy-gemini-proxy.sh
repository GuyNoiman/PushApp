#!/usr/bin/env bash
#
# deploy-gemini-proxy — move the Gemini key off the device and onto the server, in one run.
#
# WHY A SCRIPT AND NOT A CHECKLIST: everything here except signing in is mechanical, and a
# checklist of ten steps is a checklist with a forgotten step in it. The one that gets forgotten is
# always the last one, which is also the only one that actually closes the hole.
#
# WHAT IT NEVER DOES: print the API key. It is read out of `.env.local` and handed to
# `supabase secrets set` without ever reaching the terminal, a log, or this script's output.
#
# Usage:   ./scripts/deploy-gemini-proxy.sh <your-supabase-user-id>
# The user id is the one the 2 MB per-user cap SKIPS — yours. Supabase dashboard → Authentication
# → Users → copy the id of your row.

set -euo pipefail
cd "$(dirname "$0")/.."

die() { printf '\n✗ %s\n' "$1" >&2; exit 1; }
step() { printf '\n▸ %s\n' "$1"; }

UID_ARG="${1:-}"
[ -n "$UID_ARG" ] || die "Missing your Supabase user id.
    Dashboard → Authentication → Users → copy the id of your row, then:
    ./scripts/deploy-gemini-proxy.sh <that-id>"

# ── Preconditions we cannot do for you ────────────────────────────────────────
command -v supabase >/dev/null 2>&1 || die "The Supabase CLI is not installed. Run:
    brew install supabase/tap/supabase"

# AUTH WITHOUT THE KEYCHAIN. `supabase login` stores its token in the macOS keychain, and every
# command that reads it back can raise a system password prompt — which on some machines reappears
# on a loop and blocks the run entirely. An access token in the environment bypasses the keychain
# completely, so prefer it and treat the keychain path as the fallback.
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  supabase projects list >/dev/null 2>&1 || die "Not signed in, and no access token set.
    The reliable way (no keychain prompts):
      1. Open  https://supabase.com/dashboard/account/tokens
      2. Generate a token, then run:
         export SUPABASE_ACCESS_TOKEN=<the-token>
      3. Re-run this script.
    Or sign in the interactive way:  supabase login"
fi

# ── Read the config out of the env files, so nothing is typed twice ───────────
[ -f .env ] || die "app/.env not found — run this from the repo."
SUPABASE_URL="$(grep -m1 '^EXPO_PUBLIC_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")"
[ -n "$SUPABASE_URL" ] || die "EXPO_PUBLIC_SUPABASE_URL is not set in app/.env"

# https://<ref>.supabase.co → <ref>
PROJECT_REF="$(printf '%s' "$SUPABASE_URL" | sed -E 's#^https?://##; s#\..*$##')"
[ -n "$PROJECT_REF" ] || die "Could not read the project ref out of EXPO_PUBLIC_SUPABASE_URL."

# The key is read from the git-ignored local env and never echoed.
KEY=""
for f in .env.local .env; do
  [ -f "$f" ] || continue
  KEY="$(grep -m1 -E '^(EXPO_PUBLIC_)?GEMINI_API_KEY=' "$f" | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  [ -n "$KEY" ] && break
done
[ -n "$KEY" ] || die "No Gemini key found in app/.env.local — nothing to move to the server."

printf 'Project: %s\nUnmetered user: %s\nKey: found (not shown)\n' "$PROJECT_REF" "$UID_ARG"

# NO `supabase link`. Linking exists to save typing a project ref, and it is the command that
# hammers the keychain hardest — it also asks for the DATABASE password, which nothing below needs.
# Every command here takes `--project-ref` instead, so the script has no persistent local state and
# can be re-run from anywhere.

step "Storing the key as a server secret"
supabase secrets set "GEMINI_API_KEY=$KEY" --project-ref "$PROJECT_REF" >/dev/null
printf '  stored (value not printed)\n'

step "Exempting you from the 2 MB cap"
supabase secrets set "UNMETERED_UIDS=$UID_ARG" --project-ref "$PROJECT_REF" >/dev/null

step "Deploying the function"
supabase functions deploy gemini-proxy --project-ref "$PROJECT_REF"

# ── Switch the app off the direct path ────────────────────────────────────────
step "Turning off the temporary direct path"
if grep -q '^EXPO_PUBLIC_LLM_DIRECT=' .env.local 2>/dev/null; then
  # Drop the flag AND the two comment lines that explain it, so nothing stale is left behind.
  sed -i '' '/TEMPORARY (2026-08-18): forces the DIRECT Gemini path/d; /Remove this line after/d; /^EXPO_PUBLIC_LLM_DIRECT=/d' .env.local
  printf '  removed from .env.local — restart the dev server\n'
else
  printf '  already off\n'
fi

# ── The last step, which is the whole point ───────────────────────────────────
step "Removing the key from the cloud build environment"
printf '  This is the step that actually closes the hole: while the key is in the EAS\n'
printf '  environment, every build you make still embeds it.\n\n'
read -r -p '  Remove it now? [y/N] ' answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
  npx eas-cli@latest env:delete --variable-name EXPO_PUBLIC_GEMINI_API_KEY --environment development || \
    printf '  Could not remove it automatically — do it in the EAS dashboard.\n'
else
  printf '  Skipped. Existing development builds keep working; NEW builds still embed the key.\n'
fi

cat <<'DONE'

✓ Function deployed.

ONE THING LEFT, and it needs the dashboard rather than this script: the usage table.
`supabase db push` would need your DATABASE password and a linked project — more moving parts than
one table is worth. Instead:

    1. Open the Supabase dashboard → SQL Editor
    2. Paste the contents of  supabase/migrations/0002_llm_usage.sql
    3. Run it

Without that table the function still forwards requests, but the per-user cap cannot be enforced —
so do it before anyone else gets a build.

To confirm it actually went through the proxy: open the Coach, send a message, then run this in
the Supabase SQL editor —

    select user_id, bytes, requests, last_at from public.llm_usage order by last_at desc limit 5;

A row means the call went through your server. No row means it went direct.
DONE
