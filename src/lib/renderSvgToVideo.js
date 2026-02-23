const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

function buildHtml(svgContent, width, height, backgroundColor) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: ${backgroundColor};
      }
      .frame {
        width: ${width}px;
        height: ${height}px;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .frame > svg {
        width: ${width}px;
        height: ${height}px;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="frame">${svgContent}</div>
  </body>
</html>`;
}

function runFfmpeg(args, ffmpegPath, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { cwd });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start ffmpeg: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg failed with exit code ${code}\n${stderr.slice(-4000)}`));
    });
  });
}

async function setAnimationTime(page, timeSeconds) {
  await page.evaluate((timestamp) => {
    const svgs = Array.from(document.querySelectorAll("svg"));
    if (!svgs.length) {
      throw new Error("No SVG element found in the page.");
    }

    for (const svg of svgs) {
      if (typeof svg.pauseAnimations === "function") {
        svg.pauseAnimations();
      }
      if (typeof svg.setCurrentTime === "function") {
        svg.setCurrentTime(timestamp);
      }
    }
  }, timeSeconds);
}

async function waitForPaint(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => resolve(true));
      })
  );
}

async function renderSvgToMp4({
  svgContent,
  outputPath,
  width,
  height,
  durationSec,
  fps,
  crf,
  backgroundColor,
  ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg",
}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "svgvid-"));
  const framesDir = path.join(tempRoot, "frames");
  const htmlPath = path.join(tempRoot, "scene.html");
  const tempVideoPath = path.join(tempRoot, "out.mp4");

  await fs.mkdir(framesDir, { recursive: true });
  await fs.writeFile(htmlPath, buildHtml(svgContent, width, height, backgroundColor), "utf8");

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-gpu", "--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
    await page.waitForTimeout(50);

    const totalFrames = Math.max(1, Math.floor(durationSec * fps));

    for (let frame = 0; frame < totalFrames; frame += 1) {
      const frameTimeSec = frame / fps;
      await setAnimationTime(page, frameTimeSec);
      await waitForPaint(page);

      const framePath = path.join(framesDir, `frame-${String(frame + 1).padStart(6, "0")}.png`);
      await page.screenshot({
        path: framePath,
        type: "png",
      });
    }

    await context.close();

    await runFfmpeg(
      [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        "frame-%06d.png",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-crf",
        String(crf),
        tempVideoPath,
      ],
      ffmpegPath,
      framesDir
    );

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.copyFile(tempVideoPath, outputPath);
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

module.exports = {
  renderSvgToMp4,
};
