const path = require("node:path");

const DEFAULT_OPTIONS = {
  width: 1080,
  height: 1920,
  durationSec: 6,
  fps: 30,
  crf: 20,
  backgroundColor: "#ffffff",
  outputFileName: "animation.mp4",
};

function parseNumber(value, fallback, min, max, integer = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = integer ? Number.parseInt(String(value), 10) : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return integer ? Math.round(parsed) : parsed;
}

function isHexColor(value) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function sanitizeFileName(inputName) {
  const fallback = DEFAULT_OPTIONS.outputFileName;
  if (!inputName) return fallback;

  const cleaned = String(inputName)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+/, "");

  if (!cleaned) return fallback;
  const normalized = cleaned.toLowerCase().endsWith(".mp4") ? cleaned : `${cleaned}.mp4`;
  return path.basename(normalized);
}

function extractSvg(rawInput) {
  if (!rawInput || typeof rawInput !== "string") {
    throw new Error("No animation code provided.");
  }

  let candidate = rawInput.trim();

  const fencedMatch = candidate.match(/```(?:svg|xml|html)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    candidate = fencedMatch[1].trim();
  }

  const svgMatch = candidate.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) {
    throw new Error("Input must contain one <svg>...</svg> animation.");
  }

  return svgMatch[0];
}

function parseConvertOptions(input) {
  const options = {
    width: parseNumber(input.width, DEFAULT_OPTIONS.width, 256, 4096, true),
    height: parseNumber(input.height, DEFAULT_OPTIONS.height, 256, 4096, true),
    durationSec: parseNumber(input.durationSec ?? input.duration, DEFAULT_OPTIONS.durationSec, 1, 180, false),
    fps: parseNumber(input.fps, DEFAULT_OPTIONS.fps, 1, 60, true),
    crf: parseNumber(input.crf, DEFAULT_OPTIONS.crf, 12, 35, true),
    backgroundColor: isHexColor(String(input.backgroundColor || ""))
      ? String(input.backgroundColor)
      : DEFAULT_OPTIONS.backgroundColor,
    outputFileName: sanitizeFileName(input.fileName || input.outputFileName),
  };

  return options;
}

module.exports = {
  DEFAULT_OPTIONS,
  extractSvg,
  parseConvertOptions,
  sanitizeFileName,
};
