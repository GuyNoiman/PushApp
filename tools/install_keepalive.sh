#!/usr/bin/env bash
#
# install_keepalive.sh — install (or refresh) the weekly Supabase keep-alive agent.
#
# Why this wrapper exists: macOS TCC will not let a launchd agent execute a script
# stored under ~/Documents — it fails with "Operation not permitted". So the
# scheduled copy has to live outside Documents. This script keeps that copy in sync
# with the repo version, so tools/supabase_keepalive.sh stays the single source of
# truth and you never edit the installed copy by hand.
#
#   ./tools/install_keepalive.sh            # install / refresh
#   ./tools/install_keepalive.sh --uninstall
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.pushapp.supabase-keepalive"
AGENT="$HOME/Library/LaunchAgents/$LABEL.plist"
DEST_DIR="$HOME/Library/Application Support/PushApp"
DEST="$DEST_DIR/supabase_keepalive.sh"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl unload "$AGENT" 2>/dev/null
  rm -f "$AGENT" "$DEST"
  echo "[install] removed the keep-alive agent."
  exit 0
fi

mkdir -p "$DEST_DIR" "$HOME/Library/LaunchAgents"
cp "$REPO/tools/supabase_keepalive.sh" "$DEST"
chmod +x "$DEST"
cp "$REPO/tools/$LABEL.plist" "$AGENT"

# TCC also blocks the agent from READING app/.env under ~/Documents, so mirror just
# the two values it needs into a file it can reach. These are the PUBLISHABLE
# (client-safe) values that already ship inside the app bundle — no secret key is
# ever copied here. Re-run this installer after rotating keys to resync.
SRC_ENV="$REPO/app/.env"
MIRROR="$DEST_DIR/keepalive.env"
if [[ -f "$SRC_ENV" ]]; then
  URL=$(grep -E '^[[:space:]]*EXPO_PUBLIC_SUPABASE_URL=' "$SRC_ENV" | tail -1)
  KEY=$(grep -E '^[[:space:]]*EXPO_PUBLIC_SUPABASE_ANON_KEY=' "$SRC_ENV" | tail -1)
  if [[ -n "$URL" && -n "$KEY" ]]; then
    umask 077
    printf '%s\n%s\n' "$URL" "$KEY" > "$MIRROR"
    chmod 600 "$MIRROR"
    echo "[install] mirrored publishable Supabase config -> $MIRROR (0600)"
  else
    echo "[install] WARNING: Supabase is not configured (or commented out) in $SRC_ENV."
  fi
else
  echo "[install] WARNING: no $SRC_ENV found."
fi

launchctl unload "$AGENT" 2>/dev/null
launchctl load "$AGENT" 2>&1

sleep 3
echo "[install] agent:"
launchctl list | grep -F "$LABEL" || echo "  (not registered — check $AGENT)"
echo "[install] first run output:"
sed 's/^/  /' /tmp/pushapp-keepalive.log 2>/dev/null | tail -5 || echo "  (no log yet)"
