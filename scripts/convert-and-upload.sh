#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  cat <<USAGE
Usage:
  ./scripts/convert-and-upload.sh <input.svg|input.txt> <output.mp4> <remote_target>

Example:
  ./scripts/convert-and-upload.sh ./samples/elevator.svg elevator.mp4 user@your-server:/var/www/videos/

Environment:
  API_URL              Converter endpoint (default: http://localhost:3000/api/convert)
  WIDTH, HEIGHT        Output resolution (defaults: 1080 x 1920)
  DURATION_SEC, FPS    Render timing defaults (6s @ 30fps)
  CRF                  H.264 quality (default: 20)
USAGE
  exit 1
fi

INPUT_FILE="$1"
OUTPUT_NAME="$2"
REMOTE_TARGET="$3"

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "Input file not found: $INPUT_FILE" >&2
  exit 1
fi

API_URL="${API_URL:-http://localhost:3000/api/convert}"
WIDTH="${WIDTH:-1080}"
HEIGHT="${HEIGHT:-1920}"
DURATION_SEC="${DURATION_SEC:-6}"
FPS="${FPS:-30}"
CRF="${CRF:-20}"

TMP_OUT="$(mktemp -t converted-video).mp4"

echo "Requesting conversion from $API_URL ..."
curl --fail --silent --show-error "$API_URL" \
  -X POST \
  -F "animationFile=@${INPUT_FILE}" \
  -F "fileName=${OUTPUT_NAME}" \
  -F "width=${WIDTH}" \
  -F "height=${HEIGHT}" \
  -F "durationSec=${DURATION_SEC}" \
  -F "fps=${FPS}" \
  -F "crf=${CRF}" \
  --output "$TMP_OUT"

echo "Uploading to ${REMOTE_TARGET} ..."
scp "$TMP_OUT" "$REMOTE_TARGET"
rm -f "$TMP_OUT"

echo "Upload complete: ${OUTPUT_NAME}"
