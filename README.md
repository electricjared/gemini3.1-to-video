# Animation Video Converter

Convert animated SVG code (like your `ai_studio_code.txt`) into MP4 video files.

This project includes:
- Web UI (`/`) for upload + conversion + download
- Text scanner + one-click text removal (`<text>` blocks)
- HTTP API (`POST /api/convert`) for automation
- CLI (`npm run convert`) for local/batch use
- Docker deployment for hosting on your server

## 1. Quick start (local)

```bash
cd /Users/jaredebersole/animation-video-converter
npm install
npx playwright install chromium
npm start
```

Open: [http://localhost:3000](http://localhost:3000)

## 2. Convert your sample animation

CLI example with your included sample:

```bash
npm run convert -- \
  --input ./samples/elevator.svg \
  --output ./output/elevator.mp4 \
  --width 1080 \
  --height 1920 \
  --durationSec 6 \
  --fps 30 \
  --stripText true
```

## 3. API usage (for scripts/automation)

```bash
curl -X POST http://localhost:3000/api/convert \
  -F "animationFile=@/Users/jaredebersole/Downloads/ai_studio_code.txt" \
  -F "fileName=elevator.mp4" \
  -F "width=1080" \
  -F "height=1920" \
  -F "durationSec=6" \
  -F "fps=30" \
  -F "crf=20" \
  -F "stripText=true" \
  -o ./output/elevator.mp4
```

You can also send `animationCode` as raw text (instead of file upload).

## 3b. Remove text overlays

- In the web UI:
  - `Check Text in SVG` shows detected text snippets.
  - `Check + Remove Text` removes all SVG `<text>` blocks from code in the editor.
  - `Remove text during conversion` applies server-side stripping on export.
- In CLI/API:
  - Use `--stripText true` (CLI) or `stripText=true` (API form field).

## 4. Deploy on your server (public use)

### Option A: Docker Compose (recommended)

```bash
git clone <your-new-repo-url>
cd animation-video-converter
docker compose up -d --build
```

Service will run on port `3000`.

### Option B: Direct node process

Install `ffmpeg` on the host, then:

```bash
npm install
npx playwright install chromium
PORT=3000 npm start
```

### Option C: Vercel (works with limits)

If you deploy on Vercel and see:
`browserType.launch: Executable doesn't exist ... please run npx playwright install`

do this:

1. Use this repo version that includes a `postinstall` hook to run `playwright install chromium` during build.
2. In Vercel project settings, set environment variable:
   - `PLAYWRIGHT_BROWSERS_PATH=0` (for Build + Runtime)
3. Redeploy.

Notes:
- This app is CPU-heavy (frame rendering + video encode). Large/long jobs may exceed Vercel function limits.
- `ffmpeg-static` is included as a fallback when system `ffmpeg` is not present.

## 5. New animation workflow (generation -> export -> upload)

### Repeatable creator workflow

1. Generate animation in AI Studio.
2. Save/export the SVG code to a file (example: `./incoming/my-scene.svg`).
3. Convert it:

```bash
npm run convert -- --input ./incoming/my-scene.svg --output ./output/my-scene.mp4 --durationSec 6 --fps 30
```

4. Upload to your server/CDN:

```bash
./scripts/convert-and-upload.sh ./incoming/my-scene.svg my-scene.mp4 user@your-server:/var/www/videos/
```

This gives a single command for conversion + upload.

To auto-strip captions with this script:

```bash
STRIP_TEXT=true ./scripts/convert-and-upload.sh ./incoming/my-scene.svg my-scene.mp4 user@your-server:/var/www/videos/
```

## 6. Create and manage this as a new git repo

Already initialized locally at:
- `/Users/jaredebersole/animation-video-converter`

Suggested next commands:

```bash
cd /Users/jaredebersole/animation-video-converter
git branch -m main
git checkout -b codex/bootstrap
git add .
git commit -m "Initial animation-to-video converter"
git remote add origin <your-github-repo-url>
git push -u origin codex/bootstrap
```

Then open a PR to `main`.

## 7. Production hardening checklist

- Put behind Nginx/Caddy with HTTPS
- Add request rate limiting
- Add auth if not fully public
- Set file-size limits (`MAX_UPLOAD_MB`)
- Run in container isolation
- Add monitoring/log shipping

## Environment variables

- `PORT` (default `3000`)
- `MAX_UPLOAD_MB` (default `10`)
- `FFMPEG_PATH` (default `ffmpeg`)
- `PLAYWRIGHT_BROWSERS_PATH` (`0` recommended for Vercel)
- `PLAYWRIGHT_EXECUTABLE_PATH` (optional explicit Chromium path)

## Notes on animation compatibility

The renderer targets SVG/SMIL animations (`<animate>`, `<animateTransform>`, etc.).
It captures deterministic frames by setting animation time on the SVG before each screenshot.
