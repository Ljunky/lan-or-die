#!/usr/bin/env bash
# Runs every browser test against a local copy of the game. Usage, from the repo root: bash tests/run.sh
cd "$(dirname "$0")/.." || exit 1
PORT=${PORT:-8123}
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
export LOD_URL="http://127.0.0.1:$PORT/"
fail=0
for t in engine-m1 m2 m2-fixes m3; do
  echo "== $t"
  node "tests/$t.js" || fail=1
done
echo
if [ $fail = 0 ]; then echo "ALL PASSED. Screenshots: tests/out/"; else echo "SOME TESTS FAILED (see FAIL lines above)"; fi
exit $fail
