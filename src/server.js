const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs/promises");
const { execSync } = require("node:child_process");
const express = require("express");
const multer = require("multer");
const { randomUUID } = require("node:crypto");
const { renderSvgToMp4 } = require("./lib/renderSvgToVideo");
const { analyzeSvgText, extractSvg, parseConvertOptions, stripSvgTextElements } = require("./lib/options");

const app = express();
const port = Number.parseInt(process.env.PORT || "3000", 10);
const maxUploadMb = Number.parseInt(process.env.MAX_UPLOAD_MB || "10", 10);
const repoRoot = path.join(__dirname, "..");

function resolveAppVersion() {
  if (process.env.APP_VERSION && process.env.APP_VERSION.trim()) {
    return process.env.APP_VERSION.trim();
  }

  try {
    return execSync("git rev-parse --short HEAD", { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString("utf8")
      .trim();
  } catch {
    return "unknown";
  }
}

const appVersion = resolveAppVersion();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
});

app.use(express.json({ limit: `${maxUploadMb}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${maxUploadMb}mb` }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "animation-video-converter" });
});

app.get("/api/version", (_req, res) => {
  res.json({ version: appVersion });
});

function readAnimationCode(req) {
  if (typeof req.body.animationCode === "string" && req.body.animationCode.trim().length > 0) {
    return req.body.animationCode;
  }
  if (req.file?.buffer?.length) {
    return req.file.buffer.toString("utf8");
  }
  return "";
}

app.post("/api/convert", upload.single("animationFile"), async (req, res) => {
  const jobId = randomUUID();
  const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), `svg2mp4-${jobId}-`));

  try {
    const rawAnimationCode = readAnimationCode(req);
    const originalSvgContent = extractSvg(rawAnimationCode);
    const options = parseConvertOptions(req.body || {});
    const textAnalysis = analyzeSvgText(originalSvgContent);

    let svgContent = originalSvgContent;
    let removedTextBlocks = 0;
    if (options.stripText) {
      const stripped = stripSvgTextElements(originalSvgContent);
      svgContent = stripped.svgContent;
      removedTextBlocks = stripped.removedTextBlocks;
    }

    const outputPath = path.join(workRoot, options.outputFileName);

    await renderSvgToMp4({
      svgContent,
      outputPath,
      width: options.width,
      height: options.height,
      durationSec: options.durationSec,
      fps: options.fps,
      crf: options.crf,
      backgroundColor: options.backgroundColor,
    });

    res.setHeader("X-Detected-Text-Blocks", String(textAnalysis.textBlockCount));
    res.setHeader("X-Removed-Text-Blocks", String(removedTextBlocks));

    res.download(outputPath, options.outputFileName, async (error) => {
      await fs.rm(workRoot, { recursive: true, force: true }).catch(() => undefined);

      if (error && !res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    });
  } catch (error) {
    await fs.rm(workRoot, { recursive: true, force: true }).catch(() => undefined);

    const message = error instanceof Error ? error.message : "Conversion failed.";
    const statusCode = /must contain one <svg>|No animation code provided/i.test(message) ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: `Upload too large. Max size is ${maxUploadMb} MB.` });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`animation-video-converter listening on http://localhost:${port}`);
});
