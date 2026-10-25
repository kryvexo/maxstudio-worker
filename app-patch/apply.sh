#!/usr/bin/env bash
# Usage: ./apply.sh /path/to/MAX-STUDIO-v1.5 your-domain.com
# Ek hi domain sab ke liye (ws, share links, invite, canvas): jaise maxstudio.fun ya maxstudio.<name>.workers.dev
set -euo pipefail
ROOT="${1:?project root do}"
D="${2:?domain do (bina https://)}"
KT="$ROOT/app/src/main/kotlin/com/music/echo"

# 1) Listen Together default server
sed -i \
  -e "s#wss://metroserverx.meowery.eu/ws#wss://$D/ws#g" \
  -e 's#name = "Metrolist Server"#name = "MAX STUDIO Server"#' \
  -e 's#location = "Poland"#location = "Global"#' \
  -e 's#operator = "Metrolist"#operator = "MAX STUDIO"#' \
  -e "s#wss://devilmi-vivi-music-listen-together.hf.space#wss://$D/ws#" \
  "$KT/listentogether/ListenTogetherServers.kt"

# 2) Invite links
sed -i "s#https://metroserverx.meowery.eu/listen?code=#https://$D/listen?code=#g" \
  "$KT/ui/menu/PlayerMenu.kt" "$KT/ui/screens/ListenTogetherScreen.kt"
sed -i "s#android:host=\"metroserverx.meowery.eu\"#android:host=\"$D\"#" "$ROOT/app/src/main/AndroidManifest.xml"

# 3) Share links (share.maxstudio.fun -> tumhara domain) - app, innertube, core, manifest
grep -rlZ "share.maxstudio.fun" "$ROOT/app/src" "$ROOT/innertube/src" "$ROOT/core/src" --include=*.kt --include=AndroidManifest.xml \
  | xargs -0 -r sed -i "s#share\.maxstudio\.fun#$D#g"

# 4) Canvas
sed -i "s#https://canvas.maxstudio.fun/canvas.json#https://$D/canvas.json#" \
  "$ROOT/echomusiccanvas/src/main/kotlin/com/music/echo/echomusiccanvas/EchoMusicCanvasProvider.kt"

# 5) server.json (app GitHub se yahi fetch karta hai)
cat > "$ROOT/app/server.json" <<JSON
{
  "name": "MAX STUDIO Server",
  "region": "Global",
  "serverUrl": "wss://$D/ws"
}
JSON

echo "Done. server.json ko GitHub main branch par push karna mat bhoolo, phir app build karo."
